import db from '../utils/db.js';
import { initiateSTKPush } from '../services/daraja.js';

const VERIFY_LEASE_SQL = `
  SELECT
    l.id           AS lease_id,
    l.tenant_id,
    l.monthly_rent,
    u.phone        AS tenant_phone,
    u.full_name    AS tenant_name,
    un.unit_number,
    p.name         AS property_name
  FROM leases l
  JOIN users      u  ON u.id  = l.tenant_id
  JOIN units      un ON un.id = l.unit_id
  JOIN properties p  ON p.id  = un.property_id
  WHERE l.id        = $1
    AND p.owner_id  = $2
    AND l.status    = 'active'
`;

const INSERT_PAYMENT_SQL = `
  INSERT INTO payments (lease_id, tenant_id, amount, phone_number, checkout_request_id, status)
  VALUES ($1, $2, $3, $4, $5, 'pending')
  RETURNING id, lease_id, tenant_id, amount, phone_number, checkout_request_id, status, created_at
`;

export async function initiate(req, res) {
  try {
    const lease_id = Number(req.body?.lease_id);
    if (!lease_id || !Number.isInteger(lease_id) || lease_id < 1) {
      return res.status(400).json({ error: 'lease_id is required and must be a positive integer.' });
    }

    const { rows } = await db.query(VERIFY_LEASE_SQL, [lease_id, req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Lease not found.' });
    }

    const { tenant_id, monthly_rent, tenant_phone, unit_number } = rows[0];
    const amount = Math.round(Number(monthly_rent));
    const accountReference = `${unit_number}`.substring(0, 12);

    let dResp;
    try {
      dResp = await initiateSTKPush({
        phone:            tenant_phone,
        amount,
        accountReference,
        transactionDesc:  `Rent for ${unit_number}`,
      });
    } catch (darajaErr) {
      console.error('daraja error:', darajaErr.message);
      return res.status(502).json({ error: 'M-Pesa service unavailable. Please try again.' });
    }

    const insert = await db.query(INSERT_PAYMENT_SQL, [
      lease_id,
      tenant_id,
      amount,
      tenant_phone,
      dResp.CheckoutRequestID,
    ]);

    return res.status(200).json({
      payment: insert.rows[0],
      message: 'STK Push sent. Tenant should receive a prompt on their phone.',
    });

  } catch (err) {
    if (err.code === '23505') {
      console.error('checkout_request_id collision:', err.detail);
      return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
    console.error('payments.initiate error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}

function extractField(metadata, name) {
  if (!metadata?.Item) return null;
  const found = metadata.Item.find(i => i.Name === name);
  return found?.Value ?? null;
}

async function markProcessed(id) {
  await db.query(`UPDATE mpesa_callbacks SET processed = true WHERE id = $1`, [id]);
}

export async function callback(req, res) {
  const SAFE_OK = (desc = 'Accepted') =>
    res.json({ ResultCode: 0, ResultDesc: desc });

  // Step 1: log raw body — always first, even if body is garbage
  const body = req.body;
  const checkoutId = body?.Body?.stkCallback?.CheckoutRequestID ?? null;
  let callbackDbId;

  try {
    const { rows } = await db.query(
      `INSERT INTO mpesa_callbacks (checkout_request_id, raw_body)
       VALUES ($1, $2) RETURNING id`,
      [checkoutId, JSON.stringify(body)]
    );
    callbackDbId = rows[0].id;
  } catch (logErr) {
    console.error('callback: failed to log raw body:', logErr);
    return SAFE_OK('Log error');
  }

  try {
    // Step 2: validate structure
    const cb = body?.Body?.stkCallback;
    if (!cb) {
      console.warn('callback: bad structure, db id', callbackDbId);
      return SAFE_OK('Ignored - bad structure');
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = cb;

    // Step 3: look up payment
    const { rows: payRows } = await db.query(
      `SELECT id, status, mpesa_receipt FROM payments WHERE checkout_request_id = $1`,
      [CheckoutRequestID]
    );

    if (!payRows.length) {
      console.warn('callback: unknown CheckoutRequestID:', CheckoutRequestID);
      return SAFE_OK('Unknown request');
    }

    const payment = payRows[0];

    // Step 4: already processed?
    if (payment.mpesa_receipt) {
      await markProcessed(callbackDbId);
      return SAFE_OK('Duplicate - already processed');
    }

    // Step 5: branch on ResultCode
    if (ResultCode === 0) {
      const receipt = extractField(CallbackMetadata, 'MpesaReceiptNumber');
      try {
        await db.query(
          `UPDATE payments
           SET status = 'completed', mpesa_receipt = $1, paid_at = now()
           WHERE checkout_request_id = $2`,
          [receipt, CheckoutRequestID]
        );
      } catch (err) {
        if (err.code === '23505') {
          console.warn('callback: duplicate receipt number:', receipt);
        } else {
          throw err;
        }
      }
    } else {
      console.warn(`callback: payment failed — ResultCode ${ResultCode}: ${ResultDesc}`);
      await db.query(
        `UPDATE payments SET status = 'failed'
         WHERE checkout_request_id = $1 AND status = 'pending'`,
        [CheckoutRequestID]
      );
    }

    await markProcessed(callbackDbId);
    return SAFE_OK();

  } catch (err) {
    console.error('callback: unexpected error:', err);
    // callbackDbId row stays processed=false — visible in audit log
    return SAFE_OK('Internal error');
  }
}

export async function list(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT
         pay.id,
         pay.amount,
         pay.phone_number,
         pay.status,
         pay.mpesa_receipt,
         pay.paid_at,
         pay.created_at,
         pay.checkout_request_id,
         l.id          AS lease_id,
         u.id          AS tenant_id,
         u.full_name   AS tenant_name,
         u.email       AS tenant_email,
         un.unit_number,
         p.id          AS property_id,
         p.name        AS property_name
       FROM payments pay
       JOIN leases     l  ON l.id   = pay.lease_id
       JOIN users      u  ON u.id   = pay.tenant_id
       JOIN units      un ON un.id  = l.unit_id
       JOIN properties p  ON p.id   = un.property_id
       WHERE p.owner_id = $1
       ORDER BY pay.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      payments: rows.map(r => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (err) {
    console.error('payments.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

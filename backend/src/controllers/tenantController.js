import db from '../utils/db.js';

export async function me(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT
         l.id                AS lease_id,
         l.status            AS lease_status,
         l.monthly_rent,
         l.start_date,
         l.end_date,
         un.id               AS unit_id,
         un.unit_number,
         un.bedrooms,
         un.bathrooms,
         un.size_sqm,
         un.description      AS unit_description,
         p.id                AS property_id,
         p.name              AS property_name,
         p.address           AS property_address,
         owner.full_name     AS landlord_name,
         owner.email         AS landlord_email,
         owner.phone         AS landlord_phone
       FROM leases l
       JOIN units      un    ON un.id    = l.unit_id
       JOIN properties p     ON p.id     = un.property_id
       JOIN users      owner ON owner.id = p.owner_id
       WHERE l.tenant_id = $1
         AND l.status    = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "You don't have an active lease at the moment. Please contact your landlord.",
      });
    }

    const row = rows[0];
    return res.json({
      lease: {
        lease_id:     row.lease_id,
        lease_status: row.lease_status,
        monthly_rent: Number(row.monthly_rent),
        start_date:   row.start_date,
        end_date:     row.end_date,
        unit: {
          id:          row.unit_id,
          unit_number: row.unit_number,
          bedrooms:    row.bedrooms,
          bathrooms:   row.bathrooms,
          size_sqm:    row.size_sqm ? Number(row.size_sqm) : null,
          description: row.unit_description,
        },
        property: {
          id:      row.property_id,
          name:    row.property_name,
          address: row.property_address,
        },
        landlord: {
          name:  row.landlord_name,
          email: row.landlord_email,
          phone: row.landlord_phone,
        },
      },
    });
  } catch (err) {
    console.error('tenant.me error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function payments(req, res) {
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
         un.unit_number,
         p.name          AS property_name,
         owner.full_name AS landlord_name
       FROM payments pay
       JOIN leases     l     ON l.id     = pay.lease_id
       JOIN units      un    ON un.id    = l.unit_id
       JOIN properties p     ON p.id     = un.property_id
       JOIN users      owner ON owner.id = p.owner_id
       WHERE pay.tenant_id = $1
       ORDER BY pay.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      payments: rows.map(r => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (err) {
    console.error('tenant.payments error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

const VALID_CATEGORIES = ['repair', 'maintenance', 'complaint', 'other'];

export async function listRequests(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.category, r.subject, r.description, r.status, r.manager_response,
              r.created_at, r.updated_at,
              un.unit_number, p.name AS property_name
       FROM requests r
       JOIN leases     l  ON l.id  = r.lease_id
       JOIN units      un ON un.id = l.unit_id
       JOIN properties p  ON p.id  = un.property_id
       WHERE r.tenant_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    return res.json({ requests: rows });
  } catch (err) {
    console.error('tenant.listRequests error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function createRequest(req, res) {
  const { category, subject, description } = req.body ?? {};

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "category must be one of: repair, maintenance, complaint, other." });
  }
  if (!subject?.trim()) {
    return res.status(400).json({ error: 'subject is required.' });
  }
  if (subject.trim().length > 200) {
    return res.status(400).json({ error: 'subject must be 200 characters or fewer.' });
  }
  if (!description?.trim()) {
    return res.status(400).json({ error: 'description is required.' });
  }

  try {
    const leaseRes = await db.query(
      `SELECT id FROM leases WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [req.user.id]
    );
    if (!leaseRes.rows.length) {
      return res.status(400).json({ error: 'You need an active lease to file a request.' });
    }
    const leaseId = leaseRes.rows[0].id;

    const { rows } = await db.query(
      `INSERT INTO requests (tenant_id, lease_id, category, subject, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, leaseId, category, subject.trim(), description.trim()]
    );
    return res.status(201).json({ request: rows[0] });
  } catch (err) {
    console.error('tenant.createRequest error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function availableUnits(req, res) {
  try {
    const leaseRes = await db.query(
      `SELECT p.owner_id AS landlord_id, un.id AS current_unit_id
       FROM leases l
       JOIN units      un ON un.id = l.unit_id
       JOIN properties p  ON p.id  = un.property_id
       WHERE l.tenant_id = $1 AND l.status = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    if (!leaseRes.rows.length) {
      return res.json({ units: [] });
    }

    const { landlord_id, current_unit_id } = leaseRes.rows[0];

    const { rows } = await db.query(
      `SELECT un.id, un.unit_number, un.monthly_rent, un.bedrooms, un.bathrooms,
              un.size_sqm, un.description,
              p.id AS property_id, p.name AS property_name, p.address AS property_address
       FROM units      un
       JOIN properties p ON p.id = un.property_id
       WHERE p.owner_id = $1
         AND un.status  = 'vacant'
         AND un.id     != $2
       ORDER BY p.name, un.unit_number`,
      [landlord_id, current_unit_id]
    );

    return res.json({
      units: rows.map(r => ({
        ...r,
        monthly_rent: Number(r.monthly_rent),
        size_sqm:     r.size_sqm ? Number(r.size_sqm) : null,
      })),
    });
  } catch (err) {
    console.error('tenant.availableUnits error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function applyForUnit(req, res) {
  const target_unit_id = Number(req.body?.target_unit_id);
  if (!target_unit_id || !Number.isInteger(target_unit_id) || target_unit_id < 1) {
    return res.status(400).json({ error: 'target_unit_id is required and must be a positive integer.' });
  }

  try {
    const { rows } = await db.query(
      `WITH tenant_lease AS (
         SELECT l.id AS lease_id, p.owner_id AS landlord_id, un.id AS current_unit_id
         FROM leases l
         JOIN units      un ON un.id = l.unit_id
         JOIN properties p  ON p.id  = un.property_id
         WHERE l.tenant_id = $1 AND l.status = 'active'
         LIMIT 1
       )
       SELECT tl.lease_id, tl.landlord_id, tl.current_unit_id,
              tu.id          AS target_id,
              tu.status      AS target_status,
              tp.owner_id    AS target_owner_id
       FROM tenant_lease tl
       LEFT JOIN units      tu ON tu.id  = $2
       LEFT JOIN properties tp ON tp.id  = tu.property_id`,
      [req.user.id, target_unit_id]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'You need an active lease to apply.' });
    }
    const row = rows[0];
    if (row.target_id === null) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    if (String(row.target_owner_id) !== String(row.landlord_id)) {
      return res.status(404).json({ error: 'Unit not found.' });
    }
    if (row.target_id === row.current_unit_id) {
      return res.status(400).json({ error: "You're already in this unit." });
    }
    if (row.target_status !== 'vacant') {
      return res.status(400).json({ error: 'That unit is no longer available.' });
    }

    const insert = await db.query(
      `INSERT INTO unit_applications (tenant_id, current_lease_id, target_unit_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, row.lease_id, target_unit_id, req.body.message?.trim() ?? null]
    );
    return res.status(201).json({ application: insert.rows[0] });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already have a pending application for this unit.' });
    }
    console.error('tenant.applyForUnit error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function listApplications(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.status, a.message, a.manager_response, a.created_at, a.decided_at,
              un.id AS unit_id, un.unit_number, un.monthly_rent,
              p.name AS property_name
       FROM unit_applications a
       JOIN units      un ON un.id = a.target_unit_id
       JOIN properties p  ON p.id  = un.property_id
       WHERE a.tenant_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    return res.json({ applications: rows.map(r => ({ ...r, monthly_rent: Number(r.monthly_rent) })) });
  } catch (err) {
    console.error('tenant.listApplications error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function withdrawApplication(req, res) {
  try {
    const { rows, rowCount } = await db.query(
      `UPDATE unit_applications
       SET status = 'withdrawn', decided_at = now()
       WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Application not found or cannot be withdrawn.' });
    }
    return res.json({ application: rows[0] });
  } catch (err) {
    console.error('tenant.withdrawApplication error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

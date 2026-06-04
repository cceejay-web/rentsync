import bcrypt           from 'bcryptjs';
import db               from '../utils/db.js';

// ── Validation ───────────────────────────────────────────────────────────────

function validateCreate({ full_name, phone, email, password, unit_id, monthly_rent, start_date, end_date }) {
  if (!email?.trim())
    return 'email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return 'email must be a valid email address.';
  if (!full_name?.trim())
    return 'full_name is required.';
  if (full_name.trim().length > 255)
    return 'full_name must be 255 characters or fewer.';
  if (!phone)
    return 'phone is required.';
  if (!/^254[0-9]{9}$/.test(phone))
    return 'phone must be in Kenyan format (254XXXXXXXXX).';
  if (!unit_id)
    return 'unit_id is required.';
  if (monthly_rent == null)
    return 'monthly_rent is required.';
  const rent = Number(monthly_rent);
  if (!Number.isFinite(rent) || rent <= 0)
    return 'monthly_rent must be a positive number.';
  if (!start_date)
    return 'start_date is required.';
  if (isNaN(Date.parse(start_date)))
    return 'start_date must be a valid ISO date (YYYY-MM-DD).';
  if (end_date != null) {
    if (isNaN(Date.parse(end_date)))
      return 'end_date must be a valid ISO date (YYYY-MM-DD).';
    if (new Date(end_date) <= new Date(start_date))
      return 'end_date must be after start_date.';
  }
  if (!password || typeof password !== 'string')
    return 'Password is required.';
  if (password.length < 8)
    return 'Password must be at least 8 characters.';
  return null;
}

function validateUpdate({ full_name, phone, monthly_rent, end_date }) {
  if (full_name !== undefined) {
    if (!full_name?.trim())            return 'full_name cannot be empty.';
    if (full_name.trim().length > 255) return 'full_name must be 255 characters or fewer.';
  }
  if (phone !== undefined) {
    if (!/^254[0-9]{9}$/.test(phone)) return 'phone must be in Kenyan format (254XXXXXXXXX).';
  }
  if (monthly_rent !== undefined) {
    const rent = Number(monthly_rent);
    if (!Number.isFinite(rent) || rent <= 0) return 'monthly_rent must be a positive number.';
  }
  if (end_date !== undefined && end_date !== null) {
    if (isNaN(Date.parse(end_date))) return 'end_date must be a valid ISO date (YYYY-MM-DD).';
    // > start_date cross-field check happens inside the handler once we have
    // start_date from the DB — it cannot be done here without a query.
  }
  return null;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function list(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT
         u.id            AS tenant_id,
         u.full_name,
         u.email,
         u.phone,
         u.created_at    AS tenant_created_at,
         l.id            AS lease_id,
         l.status        AS lease_status,
         l.monthly_rent,
         l.start_date,
         l.end_date,
         un.id           AS unit_id,
         un.unit_number,
         p.id            AS property_id,
         p.name          AS property_name
       FROM users u
       JOIN leases     l  ON  l.tenant_id   = u.id
       JOIN units      un ON  un.id         = l.unit_id
       JOIN properties p  ON  p.id          = un.property_id
       WHERE p.owner_id = $1
         AND u.role     = 'tenant'
       ORDER BY u.full_name`,
      [req.user.id]
    );
    return res.json({ tenants: rows });
  } catch (err) {
    console.error('tenants.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function create(req, res) {
  const { full_name, phone, email, password, unit_id, monthly_rent, start_date, end_date } = req.body ?? {};

  const validationError = validateCreate({ full_name, phone, email, password, unit_id, monthly_rent, start_date, end_date });
  if (validationError) return res.status(400).json({ error: validationError });

  // Hash before opening the transaction — bcrypt is CPU work, not a DB
  // operation. Doing it here keeps the transaction window as short as possible.
  const password_hash = await bcrypt.hash(password, 10);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify the unit exists, belongs to this manager, and is currently vacant.
    const unitCheck = await client.query(
      `SELECT un.id
       FROM units      un
       JOIN properties p  ON  p.id      = un.property_id
       WHERE un.id      = $1
         AND p.owner_id = $2
         AND un.status  = 'vacant'`,
      [unit_id, req.user.id]
    );
    if (!unitCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Unit not found, not yours, or already occupied.' });
    }

    // 2. Insert the tenant user. A duplicate email fires error code 23505 on
    //    the users_email_key constraint, caught and translated to a 409 below.
    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'tenant')
       RETURNING id`,
      [email.toLowerCase().trim(), password_hash, full_name.trim(), phone]
    );
    const tenantId = userInsert.rows[0].id;

    // 3. Insert the lease.
    await client.query(
      `INSERT INTO leases (tenant_id, unit_id, monthly_rent, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [tenantId, unit_id, Number(monthly_rent), start_date, end_date ?? null]
    );

    // 4. Mark the unit occupied.
    await client.query(
      `UPDATE units SET status = 'occupied' WHERE id = $1`,
      [Number(unit_id)]
    );

    // 5. Re-read the full record inside the transaction so the response shape
    //    matches getOne. Doing this before COMMIT means a read failure rolls
    //    back cleanly — nothing is half-committed.
    const { rows } = await client.query(
      `SELECT
         u.id            AS tenant_id,
         u.full_name,
         u.email,
         u.phone,
         u.created_at    AS tenant_created_at,
         l.id            AS lease_id,
         l.status        AS lease_status,
         l.monthly_rent,
         l.start_date,
         l.end_date,
         un.id           AS unit_id,
         un.unit_number,
         p.id            AS property_id,
         p.name          AS property_name
       FROM users u
       JOIN leases     l  ON  l.tenant_id   = u.id
       JOIN units      un ON  un.id         = l.unit_id
       JOIN properties p  ON  p.id          = un.property_id
       WHERE u.id = $1`,
      [tenantId]
    );

    await client.query('COMMIT');
    return res.status(201).json({ tenant: rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      if (err.constraint === 'one_active_lease_per_tenant') {
        return res.status(409).json({ error: 'This tenant already has an active lease.' });
      }
      if (err.constraint === 'users_email_key') {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }
      throw err;  // unexpected unique violation — surface as 500
    }
    console.error('tenants.create error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  } finally {
    client.release();
  }
}

export async function getOne(req, res) {
  try {
    const { tenantId } = req.params;
    const { rows } = await db.query(
      `SELECT
         u.id            AS tenant_id,
         u.full_name,
         u.email,
         u.phone,
         u.created_at    AS tenant_created_at,
         l.id            AS lease_id,
         l.status        AS lease_status,
         l.monthly_rent,
         l.start_date,
         l.end_date,
         un.id           AS unit_id,
         un.unit_number,
         p.id            AS property_id,
         p.name          AS property_name
       FROM users u
       JOIN leases     l  ON  l.tenant_id   = u.id
       JOIN units      un ON  un.id         = l.unit_id
       JOIN properties p  ON  p.id          = un.property_id
       WHERE u.id       = $1
         AND p.owner_id = $2
         AND u.role     = 'tenant'`,
      [tenantId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant not found.' });
    return res.json({ tenant: rows[0] });
  } catch (err) {
    console.error('tenants.getOne error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function update(req, res) {
  const { tenantId } = req.params;
  const { full_name, phone, monthly_rent, end_date } = req.body ?? {};

  if (
    full_name    === undefined &&
    phone        === undefined &&
    monthly_rent === undefined &&
    end_date     === undefined
  ) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const validationError = validateUpdate({ full_name, phone, monthly_rent, end_date });
  if (validationError) return res.status(400).json({ error: validationError });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Ownership check + fetch start_date for the end_date cross-field validation.
    // Filtering l.status = 'active' ensures we only update the live lease.
    const ownerCheck = await client.query(
      `SELECT u.id AS user_id, l.id AS lease_id, l.start_date
       FROM users u
       JOIN leases     l  ON  l.tenant_id  = u.id
       JOIN units      un ON  un.id        = l.unit_id
       JOIN properties p  ON  p.id         = un.property_id
       WHERE u.id       = $1
         AND p.owner_id = $2
         AND u.role     = 'tenant'
         AND l.status   = 'active'`,
      [tenantId, req.user.id]
    );
    if (!ownerCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const { user_id, lease_id, start_date } = ownerCheck.rows[0];

    // Cross-field date validation — needs start_date fetched above.
    if (end_date !== undefined && end_date !== null) {
      if (new Date(end_date) <= new Date(start_date)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'end_date must be after start_date.' });
      }
    }

    // Update users table only if user-level fields were provided.
    if (full_name !== undefined || phone !== undefined) {
      const setClauses = [];
      const values    = [];
      if (full_name !== undefined) {
        setClauses.push(`full_name = $${values.length + 1}`);
        values.push(full_name.trim());
      }
      if (phone !== undefined) {
        setClauses.push(`phone = $${values.length + 1}`);
        values.push(phone);
      }
      values.push(user_id);
      await client.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }

    // Update leases table only if lease-level fields were provided.
    if (monthly_rent !== undefined || end_date !== undefined) {
      const setClauses = [];
      const values    = [];
      if (monthly_rent !== undefined) {
        setClauses.push(`monthly_rent = $${values.length + 1}`);
        values.push(Number(monthly_rent));
      }
      if (end_date !== undefined) {
        setClauses.push(`end_date = $${values.length + 1}`);
        values.push(end_date ?? null);  // null clears an existing end_date
      }
      values.push(lease_id);
      await client.query(
        `UPDATE leases SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }

    // Re-read inside the transaction — sees the uncommitted writes from this
    // session and returns the same shape as getOne.
    const { rows } = await client.query(
      `SELECT
         u.id            AS tenant_id,
         u.full_name,
         u.email,
         u.phone,
         u.created_at    AS tenant_created_at,
         l.id            AS lease_id,
         l.status        AS lease_status,
         l.monthly_rent,
         l.start_date,
         l.end_date,
         un.id           AS unit_id,
         un.unit_number,
         p.id            AS property_id,
         p.name          AS property_name
       FROM users u
       JOIN leases     l  ON  l.tenant_id   = u.id
       JOIN units      un ON  un.id         = l.unit_id
       JOIN properties p  ON  p.id          = un.property_id
       WHERE u.id = $1
         AND l.id = $2`,
      [user_id, lease_id]
    );

    await client.query('COMMIT');
    return res.json({ tenant: rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('tenants.update error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  } finally {
    client.release();
  }
}

export async function terminate(req, res) {
  const { tenantId } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Single SELECT does double duty: finds the active lease AND verifies
    // ownership via the join chain. Zero rows means not found, wrong manager,
    // or no active lease — all return 404 so callers cannot enumerate tenants.
    const leaseCheck = await client.query(
      `SELECT l.id AS lease_id, l.unit_id
       FROM leases     l
       JOIN units      un ON  un.id  = l.unit_id
       JOIN properties p  ON  p.id   = un.property_id
       WHERE l.tenant_id = $1
         AND l.status    = 'active'
         AND p.owner_id  = $2`,
      [tenantId, req.user.id]
    );
    if (!leaseCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active lease found for this tenant.' });
    }

    const { lease_id, unit_id } = leaseCheck.rows[0];

    await client.query(
      `UPDATE leases SET status = 'terminated' WHERE id = $1`,
      [lease_id]
    );

    await client.query(
      `UPDATE units SET status = 'vacant' WHERE id = $1`,
      [unit_id]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Lease terminated.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('tenants.terminate error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  } finally {
    client.release();
  }
}

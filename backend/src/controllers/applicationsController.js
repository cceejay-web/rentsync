import db from '../utils/db.js';

export async function list(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.status, a.message, a.manager_response, a.created_at, a.decided_at,
              tenant.id         AS tenant_id,
              tenant.full_name  AS tenant_name,
              tenant.email      AS tenant_email,
              tenant.phone      AS tenant_phone,
              curr_un.unit_number       AS current_unit_number,
              curr_prop.name            AS current_property_name,
              targ_un.id                AS target_unit_id,
              targ_un.unit_number       AS target_unit_number,
              targ_un.monthly_rent,
              targ_un.bedrooms,
              targ_un.bathrooms,
              targ_un.size_sqm,
              targ_un.description       AS target_description,
              targ_prop.name            AS target_property_name
       FROM unit_applications a
       JOIN users      tenant    ON tenant.id       = a.tenant_id
       JOIN leases     curr_lease ON curr_lease.id  = a.current_lease_id
       JOIN units      curr_un   ON curr_un.id      = curr_lease.unit_id
       JOIN properties curr_prop ON curr_prop.id    = curr_un.property_id
       JOIN units      targ_un   ON targ_un.id      = a.target_unit_id
       JOIN properties targ_prop ON targ_prop.id    = targ_un.property_id
       WHERE targ_prop.owner_id = $1
       ORDER BY
         CASE a.status
           WHEN 'pending'   THEN 1
           WHEN 'approved'  THEN 2
           WHEN 'rejected'  THEN 3
           WHEN 'withdrawn' THEN 4
         END,
         a.created_at DESC`,
      [req.user.id]
    );
    return res.json({
      applications: rows.map(r => ({
        ...r,
        monthly_rent: Number(r.monthly_rent),
        size_sqm:     r.size_sqm ? Number(r.size_sqm) : null,
      })),
    });
  } catch (err) {
    console.error('applications.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function decide(req, res) {
  const { id } = req.params;
  const { decision, manager_response, start_date } = req.body ?? {};

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approve' or 'reject'." });
  }
  if (decision === 'reject' && !manager_response?.trim()) {
    return res.status(400).json({ error: 'manager_response is required when rejecting.' });
  }
  if (decision === 'approve') {
    if (!start_date) return res.status(400).json({ error: 'start_date is required when approving.' });
    if (isNaN(Date.parse(start_date))) return res.status(400).json({ error: 'start_date must be a valid ISO date.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Ownership + state check — also fetches fields needed for the approve path
    const { rows } = await client.query(
      `SELECT a.id, a.status, a.tenant_id, a.current_lease_id, a.target_unit_id,
              curr_un.id             AS current_unit_id,
              curr_lease.status      AS current_lease_status,
              targ_un.status         AS target_status,
              targ_un.monthly_rent   AS target_monthly_rent
       FROM unit_applications a
       JOIN leases     curr_lease ON curr_lease.id = a.current_lease_id
       JOIN units      curr_un    ON curr_un.id    = curr_lease.unit_id
       JOIN units      targ_un    ON targ_un.id    = a.target_unit_id
       JOIN properties targ_prop  ON targ_prop.id  = targ_un.property_id
       WHERE a.id = $1 AND targ_prop.owner_id = $2`,
      [id, req.user.id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found.' });
    }

    const app = rows[0];

    if (app.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Application is not pending.' });
    }

    // ── REJECT path ────────────────────────────────────────────────────────────
    if (decision === 'reject') {
      const { rows: updated } = await client.query(
        `UPDATE unit_applications
         SET status = 'rejected', manager_response = $1, decided_at = now()
         WHERE id = $2
         RETURNING *`,
        [manager_response.trim(), id]
      );
      await client.query('COMMIT');
      return res.json({ application: updated[0] });
    }

    // ── APPROVE path ───────────────────────────────────────────────────────────

    // Defensive: verify current lease is still active
    if (app.current_lease_status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "Tenant's current lease is no longer active." });
    }

    // FOR UPDATE — locks the target unit row; blocks any concurrent approval
    const lockRes = await client.query(
      `SELECT status FROM units WHERE id = $1 FOR UPDATE`,
      [app.target_unit_id]
    );
    if (lockRes.rows[0].status !== 'vacant') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Target unit is no longer available. Another application may have been approved first.' });
    }

    // 1. Terminate old lease
    await client.query(
      `UPDATE leases SET status = 'terminated', end_date = now() WHERE id = $1`,
      [app.current_lease_id]
    );

    // 2. Free old unit
    await client.query(
      `UPDATE units SET status = 'vacant' WHERE id = $1`,
      [app.current_unit_id]
    );

    // 3. Create new lease
    const newLease = await client.query(
      `INSERT INTO leases (tenant_id, unit_id, monthly_rent, start_date, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [app.tenant_id, app.target_unit_id, app.target_monthly_rent, start_date]
    );

    // 4. Occupy new unit
    await client.query(
      `UPDATE units SET status = 'occupied' WHERE id = $1`,
      [app.target_unit_id]
    );

    // 5. Approve the application
    const { rows: finalApp } = await client.query(
      `UPDATE unit_applications
       SET status = 'approved',
           manager_response = COALESCE($1, manager_response),
           decided_at = now()
       WHERE id = $2
       RETURNING *`,
      [manager_response?.trim() ?? null, id]
    );

    await client.query('COMMIT');
    return res.json({
      application:  finalApp[0],
      new_lease_id: newLease.rows[0].id,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      console.error('applications.decide 23505:', err.detail);
      return res.status(409).json({ error: 'Tenant already has an active lease.' });
    }
    console.error('applications.decide error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  } finally {
    client.release();
  }
}

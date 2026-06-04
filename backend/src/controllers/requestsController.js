import db from '../utils/db.js';

const VALID_STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export async function list(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT r.*,
              u.full_name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone,
              un.unit_number, p.name AS property_name, p.id AS property_id
       FROM requests r
       JOIN users      u  ON u.id  = r.tenant_id
       JOIN leases     l  ON l.id  = r.lease_id
       JOIN units      un ON un.id = l.unit_id
       JOIN properties p  ON p.id  = un.property_id
       WHERE p.owner_id = $1
       ORDER BY
         CASE r.status
           WHEN 'open'         THEN 1
           WHEN 'acknowledged' THEN 2
           WHEN 'in_progress'  THEN 3
           WHEN 'resolved'     THEN 4
           WHEN 'closed'       THEN 5
         END,
         r.created_at DESC`,
      [req.user.id]
    );
    return res.json({ requests: rows });
  } catch (err) {
    console.error('requests.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, manager_response } = req.body ?? {};

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status must be one of: open, acknowledged, in_progress, resolved, closed.' });
  }

  try {
    const ownerCheck = await db.query(
      `SELECT r.id
       FROM requests r
       JOIN leases     l  ON l.id  = r.lease_id
       JOIN units      un ON un.id = l.unit_id
       JOIN properties p  ON p.id  = un.property_id
       WHERE r.id = $1 AND p.owner_id = $2`,
      [id, req.user.id]
    );
    if (!ownerCheck.rows.length) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const { rows } = await db.query(
      `UPDATE requests
       SET status           = $1,
           manager_response = COALESCE($2, manager_response),
           updated_at       = now()
       WHERE id = $3
       RETURNING *`,
      [status, manager_response ?? null, id]
    );
    return res.json({ request: rows[0] });
  } catch (err) {
    console.error('requests.updateStatus error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

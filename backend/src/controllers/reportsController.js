import db from '../utils/db.js';

const OCCUPANCY_SQL = `
  SELECT
    p.id   AS property_id,
    p.name AS property_name,
    COUNT(u.id) FILTER (WHERE u.status = 'occupied') AS occupied,
    COUNT(u.id) FILTER (WHERE u.status = 'vacant')   AS vacant,
    COUNT(u.id)                                       AS total
  FROM properties p
  LEFT JOIN units u ON u.property_id = p.id
  WHERE p.owner_id = $1
  GROUP BY p.id, p.name
  ORDER BY p.name
`;

const REVENUE_SQL = `
  SELECT
    p.id   AS property_id,
    p.name AS property_name,
    COALESCE(SUM(l.monthly_rent) FILTER (WHERE l.status = 'active'), 0) AS revenue
  FROM properties p
  LEFT JOIN units  u ON u.property_id = p.id
  LEFT JOIN leases l ON l.unit_id     = u.id
  WHERE p.owner_id = $1
  GROUP BY p.id, p.name
  ORDER BY p.name
`;

const LEASE_STATUS_SQL = `
  WITH all_statuses AS (
    SELECT unnest(ARRAY['active', 'expired', 'terminated']) AS status
  ),
  manager_leases AS (
    SELECT l.id, l.status
    FROM leases l
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_id = $1
  )
  SELECT s.status, COUNT(ml.id) AS count
  FROM all_statuses s
  LEFT JOIN manager_leases ml ON ml.status = s.status
  GROUP BY s.status
  ORDER BY CASE s.status
    WHEN 'active'     THEN 1
    WHEN 'expired'    THEN 2
    WHEN 'terminated' THEN 3
  END
`;

export async function summary(req, res) {
  try {
    const [occupancyRes, revenueRes, leaseStatusRes] = await Promise.all([
      db.query(OCCUPANCY_SQL,    [req.user.id]),
      db.query(REVENUE_SQL,      [req.user.id]),
      db.query(LEASE_STATUS_SQL, [req.user.id]),
    ]);

    return res.json({
      occupancy_by_property:  occupancyRes.rows.map(r => ({
        property_id:   r.property_id,
        property_name: r.property_name,
        occupied:      Number(r.occupied),
        vacant:        Number(r.vacant),
        total:         Number(r.total),
      })),
      revenue_by_property: revenueRes.rows.map(r => ({
        property_id:   r.property_id,
        property_name: r.property_name,
        revenue:       Number(r.revenue).toFixed(2),
      })),
      lease_status_breakdown: leaseStatusRes.rows.map(r => ({
        status: r.status,
        count:  Number(r.count),
      })),
    });

  } catch (err) {
    console.error('reports.summary error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

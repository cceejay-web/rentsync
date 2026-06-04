import db from '../utils/db.js';

const ACTIVITY_SQL = `
  (
    SELECT
      'property_added'                 AS type,
      'Property created: ' || p.name   AS description,
      p.created_at                     AS timestamp
    FROM properties p
    WHERE p.owner_id = $1
  )
  UNION ALL
  (
    SELECT
      'unit_added',
      'Unit ' || u.unit_number || ' added to ' || p.name,
      u.created_at
    FROM units      u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_id = $1
  )
  UNION ALL
  (
    SELECT
      'tenant_added',
      usr.full_name || ' added to ' || p.name || ' / ' || un.unit_number,
      l.created_at
    FROM leases     l
    JOIN users      usr ON usr.id = l.tenant_id
    JOIN units      un  ON un.id  = l.unit_id
    JOIN properties p   ON p.id   = un.property_id
    WHERE p.owner_id = $1
  )
  ORDER BY timestamp DESC
  LIMIT 5
`;

export async function summary(req, res) {
  try {
    const [propsRes, unitsRes, leasesRes, activityRes] = await Promise.all([

      // total_properties
      db.query(
        `SELECT COUNT(*) AS total_properties
         FROM properties
         WHERE owner_id = $1`,
        [req.user.id]
      ),

      // total_units, occupied_units, vacant_units — one pass with FILTER
      db.query(
        `SELECT
           COUNT(*)                                       AS total_units,
           COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
           COUNT(*) FILTER (WHERE u.status = 'vacant')   AS vacant_units
         FROM units      u
         JOIN properties p ON p.id = u.property_id
         WHERE p.owner_id = $1`,
        [req.user.id]
      ),

      // active_tenants + monthly_revenue_potential — same join, one pass
      db.query(
        `SELECT
           COUNT(*)                         AS active_tenants,
           COALESCE(SUM(l.monthly_rent), 0) AS monthly_revenue_potential
         FROM leases     l
         JOIN units      u ON u.id = l.unit_id
         JOIN properties p ON p.id = u.property_id
         WHERE p.owner_id = $1
           AND l.status   = 'active'`,
        [req.user.id]
      ),

      // recent activity — UNION ALL across three event sources
      db.query(ACTIVITY_SQL, [req.user.id]),
    ]);

    const p = propsRes.rows[0];
    const u = unitsRes.rows[0];
    const l = leasesRes.rows[0];

    return res.json({
      stats: {
        total_properties:          Number(p.total_properties),
        total_units:               Number(u.total_units),
        occupied_units:            Number(u.occupied_units),
        vacant_units:              Number(u.vacant_units),
        active_tenants:            Number(l.active_tenants),
        monthly_revenue_potential: Number(l.monthly_revenue_potential).toFixed(2),
      },
      recent_activity: activityRes.rows,
    });

  } catch (err) {
    console.error('dashboard.summary error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

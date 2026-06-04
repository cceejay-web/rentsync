import db from '../utils/db.js';

export async function listVacant(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT
         un.id            AS unit_id,
         un.unit_number,
         un.monthly_rent,
         p.id             AS property_id,
         p.name           AS property_name
       FROM units      un
       JOIN properties p  ON  p.id      = un.property_id
       WHERE p.owner_id = $1
         AND un.status  = 'vacant'
       ORDER BY p.name, un.unit_number`,
      [req.user.id]
    );
    return res.json({ units: rows });
  } catch (err) {
    console.error('units.listVacant error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

function validate({ unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description }) {
  if (!unit_number?.trim())                return 'unit_number is required.';
  if (unit_number.trim().length > 50)      return 'unit_number must be 50 characters or fewer.';
  if (monthly_rent == null)                return 'monthly_rent is required.';
  const rent = Number(monthly_rent);
  if (!Number.isFinite(rent) || rent <= 0) return 'monthly_rent must be a positive number.';
  if (status !== undefined && !['vacant', 'occupied'].includes(status))
    return "status must be 'vacant' or 'occupied'.";
  if (bedrooms  != null && (!Number.isInteger(Number(bedrooms))  || Number(bedrooms)  < 0))
    return 'bedrooms must be a non-negative integer.';
  if (bathrooms != null && (!Number.isInteger(Number(bathrooms)) || Number(bathrooms) < 0))
    return 'bathrooms must be a non-negative integer.';
  if (size_sqm  != null && (!Number.isFinite(Number(size_sqm))  || Number(size_sqm)  <= 0))
    return 'size_sqm must be a positive number.';
  if (description != null && typeof description !== 'string')
    return 'description must be a string.';
  return null;
}

async function verifyProperty(propertyId, userId) {
  const { rows } = await db.query(
    'SELECT id FROM properties WHERE id = $1 AND owner_id = $2',
    [propertyId, userId]
  );
  return rows.length > 0;
}

export async function list(req, res) {
  try {
    const { propertyId } = req.params;
    if (!await verifyProperty(propertyId, req.user.id)) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    const { rows } = await db.query(
      `SELECT id, unit_number, monthly_rent, status,
              bedrooms, bathrooms, size_sqm, description, created_at
       FROM units
       WHERE property_id = $1
       ORDER BY unit_number`,
      [propertyId]
    );
    return res.json({ units: rows });
  } catch (err) {
    console.error('units.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function create(req, res) {
  try {
    const { propertyId } = req.params;
    if (!await verifyProperty(propertyId, req.user.id)) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    const { unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description } = req.body ?? {};
    const validationError = validate({ unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description });
    if (validationError) return res.status(400).json({ error: validationError });

    const { rows } = await db.query(
      `INSERT INTO units (property_id, unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description, created_at`,
      [propertyId, unit_number.trim(), Number(monthly_rent), status ?? 'vacant',
       bedrooms ?? null, bathrooms ?? null, size_sqm ?? null, description?.trim() ?? null]
    );
    return res.status(201).json({ unit: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A unit with that number already exists in this property.' });
    }
    console.error('units.create error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function getOne(req, res) {
  try {
    const { propertyId, unitId } = req.params;
    const { rows } = await db.query(
      `SELECT u.id, u.unit_number, u.monthly_rent, u.status,
              u.bedrooms, u.bathrooms, u.size_sqm, u.description, u.created_at
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE u.id = $1
         AND u.property_id = $2
         AND p.owner_id = $3`,
      [unitId, propertyId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Unit not found.' });
    return res.json({ unit: rows[0] });
  } catch (err) {
    console.error('units.getOne error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function update(req, res) {
  try {
    const { propertyId, unitId } = req.params;
    const { unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description } = req.body ?? {};
    const validationError = validate({ unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description });
    if (validationError) return res.status(400).json({ error: validationError });

    const { rows } = await db.query(
      `UPDATE units
       SET unit_number  = $1,
           monthly_rent = $2,
           status       = $3,
           bedrooms     = COALESCE($4, bedrooms),
           bathrooms    = COALESCE($5, bathrooms),
           size_sqm     = COALESCE($6, size_sqm),
           description  = COALESCE($7, description)
       WHERE id = $8
         AND property_id = $9
         AND EXISTS (SELECT 1 FROM properties WHERE id = $9 AND owner_id = $10)
       RETURNING id, unit_number, monthly_rent, status, bedrooms, bathrooms, size_sqm, description, created_at`,
      [unit_number.trim(), Number(monthly_rent), status,
       bedrooms ?? null, bathrooms ?? null, size_sqm ?? null, description?.trim() ?? null,
       unitId, propertyId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Unit not found.' });
    return res.json({ unit: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A unit with that number already exists in this property.' });
    }
    console.error('units.update error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function remove(req, res) {
  try {
    const { propertyId, unitId } = req.params;
    const result = await db.query(
      `DELETE FROM units
       WHERE id = $1
         AND property_id = $2
         AND EXISTS (SELECT 1 FROM properties WHERE id = $2 AND owner_id = $3)`,
      [unitId, propertyId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Unit not found.' });
    return res.json({ message: 'Unit deleted.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete a unit that has active leases.' });
    }
    console.error('units.remove error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

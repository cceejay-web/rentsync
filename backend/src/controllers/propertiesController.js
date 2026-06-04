import db from '../utils/db.js';

function validate({ name, address }) {
  if (!name?.trim())                return 'name is required.';
  if (name.trim().length > 255)     return 'name must be 255 characters or fewer.';
  if (!address?.trim())             return 'address is required.';
  if (address.trim().length > 1000) return 'address must be 1000 characters or fewer.';
  return null;
}

export async function list(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, address, created_at
       FROM properties
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ properties: rows });
  } catch (err) {
    console.error('properties.list error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function create(req, res) {
  try {
    const { name, address } = req.body ?? {};
    const validationError = validate({ name, address });
    if (validationError) return res.status(400).json({ error: validationError });

    const { rows } = await db.query(
      `INSERT INTO properties (owner_id, name, address)
       VALUES ($1, $2, $3)
       RETURNING id, name, address, created_at`,
      [req.user.id, name.trim(), address.trim()]
    );
    return res.status(201).json({ property: rows[0] });
  } catch (err) {
    console.error('properties.create error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function getOne(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, address, created_at
       FROM properties
       WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found.' });
    return res.json({ property: rows[0] });
  } catch (err) {
    console.error('properties.getOne error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function update(req, res) {
  try {
    const { name, address } = req.body ?? {};
    const validationError = validate({ name, address });
    if (validationError) return res.status(400).json({ error: validationError });

    const { rows } = await db.query(
      `UPDATE properties
       SET name = $1, address = $2
       WHERE id = $3 AND owner_id = $4
       RETURNING id, name, address, created_at`,
      [name.trim(), address.trim(), req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found.' });
    return res.json({ property: rows[0] });
  } catch (err) {
    console.error('properties.update error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

export async function remove(req, res) {
  try {
    const result = await db.query(
      `DELETE FROM properties
       WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Property not found.' });
    return res.json({ message: 'Property deleted.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Cannot delete a property that has units. Remove all units first.',
      });
    }
    console.error('properties.remove error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

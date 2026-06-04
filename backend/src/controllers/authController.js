import bcrypt from 'bcryptjs';
import db from '../utils/db.js';
import { signToken } from '../utils/jwt.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(req, res) {
  try {
    const { email, password, full_name, phone, role } = req.body ?? {};

    if (!full_name?.trim()) {
      return res.status(400).json({ error: 'full_name is required.' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!['manager', 'tenant'].includes(role)) {
      return res.status(400).json({ error: "role must be 'manager' or 'tenant'." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, phone, role, created_at`,
      [email.toLowerCase().trim(), password_hash, full_name.trim(), phone ?? null, role]
    );

    const user = rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('signup error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const { rows } = await db.query(
      `SELECT id, email, password_hash, full_name, phone, role, created_at
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    const match = user && await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { password_hash: _, ...safeUser } = user;
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}

export async function me(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, email, full_name, phone, role, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

import { verifyToken } from '../utils/jwt.js';

export default function requireAuth(req, res, next) {
  try {
    const { authorization } = req.headers;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authorization.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

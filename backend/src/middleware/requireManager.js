import requireAuth from './requireAuth.js';

function checkManager(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager role required.' });
  }
  next();
}

export default [requireAuth, checkManager];

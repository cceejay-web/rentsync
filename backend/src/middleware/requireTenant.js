import requireAuth from './requireAuth.js';

function checkTenant(req, res, next) {
  if (req.user.role !== 'tenant') {
    return res.status(403).json({ error: 'Tenant access required.' });
  }
  next();
}

export default [requireAuth, checkTenant];

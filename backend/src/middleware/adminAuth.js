const config = require('../../config');

function adminAuth(req, res, next) {
  const auth = req.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const token = auth.slice('Bearer '.length).trim();
  if (!token || token !== config.adminApiToken) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

module.exports = adminAuth;

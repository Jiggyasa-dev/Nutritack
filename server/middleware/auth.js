const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'nutritrack-dev-secret-change-in-prod';

/**
 * Verifies the Bearer JWT and sets req.userId.
 * Allows guest access when no token is present (userId = 1).
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    req.userId = 1; // legacy guest fallback
    return next();
  }

  const token = header.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;

const rateLimit = require('express-rate-limit');

const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { adminApiLimiter, publicLimiter };

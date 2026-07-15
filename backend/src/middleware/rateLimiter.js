const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Stricter limits for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  handler: (req, res, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded on auth route');
    res.status(429).json(options.message);
  }
});

// More relaxed limits for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  handler: (req, res, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded on API route');
    res.status(429).json(options.message);
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};

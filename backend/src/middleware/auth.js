const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development_12345';

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ path: req.path }, 'Auth middleware: No token provided');
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn({ error: error.message, path: req.path }, 'Auth middleware: Invalid token');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

module.exports = auth;

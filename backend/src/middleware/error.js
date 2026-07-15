const logger = require('../config/logger');

// Centralized error handling middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.error({
    err: {
      message: err.message,
      stack: isProduction ? undefined : err.stack
    },
    req: {
      method: req.method,
      url: req.url,
      ip: req.ip
    }
  }, 'Unhandled exception caught');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack })
  });
};

module.exports = errorHandler;

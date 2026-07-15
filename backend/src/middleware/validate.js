const logger = require('../config/logger');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn({ errors, path: req.path }, 'Validation failed');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace req.body or req.query with parsed and transformed data
    if (source === 'query') {
      req.query = result.data;
    } else {
      req.body = result.data;
    }
    
    next();
  };
};

module.exports = validate;

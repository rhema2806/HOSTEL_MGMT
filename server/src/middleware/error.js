const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = details[0];
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    message = `A record with the same ${fields.join(', ') || 'value'} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body contains invalid JSON';
  } else if (!err.status) {
    console.error(err);
    if (env.isProd) message = 'Internal server error';
  }

  const body = { success: false, message };
  if (err.code && typeof err.code === 'string') body.code = err.code;
  if (details) body.errors = details;
  if (!env.isProd && status === 500) body.stack = err.stack;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };

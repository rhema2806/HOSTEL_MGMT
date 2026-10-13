const ApiError = require('../utils/ApiError');
const { isObjectId } = require('../utils/helpers');

const PHONE = /^[+]?[\d\s-]{7,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Tiny declarative body validator.
 * rules: { field: { required, type: string|email|phone|date|int|number|boolean|id|array|enum, values, min, max, minLength, maxLength } }
 * On PATCH/PUT, "required" only applies to fields that are present.
 */
function validate(rules) {
  return (req, _res, next) => {
    const errors = [];
    const partial = req.method === 'PATCH' || req.method === 'PUT';
    for (const [field, r] of Object.entries(rules)) {
      const v = req.body[field];
      const empty = v === undefined || v === null || v === '';
      if (empty) {
        if (r.required && (!partial || v !== undefined)) errors.push(`${field} is required`);
        continue;
      }
      switch (r.type) {
        case 'email': if (!EMAIL.test(v)) errors.push(`${field} must be a valid email address`); break;
        case 'phone': if (!PHONE.test(v)) errors.push(`${field} must be a valid phone number`); break;
        case 'date': if (!DATE.test(v)) errors.push(`${field} must be a date in the format YYYY-MM-DD`); break;
        case 'id': if (!isObjectId(v)) errors.push(`${field} is not a valid id`); break;
        case 'boolean': if (typeof v !== 'boolean') errors.push(`${field} must be true or false`); break;
        case 'array': if (!Array.isArray(v)) errors.push(`${field} must be a list`); break;
        case 'enum': if (!r.values.includes(v)) errors.push(`${field} must be one of: ${r.values.join(', ')}`); break;
        case 'int':
        case 'number': {
          const n = Number(v);
          if (Number.isNaN(n) || (r.type === 'int' && !Number.isInteger(n))) errors.push(`${field} must be a ${r.type === 'int' ? 'whole ' : ''}number`);
          else if (r.min !== undefined && n < r.min) errors.push(`${field} must be at least ${r.min}`);
          else if (r.max !== undefined && n > r.max) errors.push(`${field} must be at most ${r.max}`);
          break;
        }
        default:
          if (typeof v !== 'string') errors.push(`${field} must be text`);
          else if (r.maxLength && v.length > r.maxLength) errors.push(`${field} must be at most ${r.maxLength} characters`);
          else if (r.minLength && v.length < r.minLength) errors.push(`${field} must be at least ${r.minLength} characters`);
      }
    }
    if (errors.length) return next(ApiError.badRequest(errors[0], errors));
    next();
  };
}

const passwordRule = { type: 'string', minLength: 8, maxLength: 72 };

module.exports = { validate, passwordRule };

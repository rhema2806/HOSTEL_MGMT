const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+]?[\d\s-]{7,15}$/;

/** rules: { field: { label, required, email, phone, min, max, minLength } } -> { field: message } */
export function validateForm(values, rules) {
  const errors = {};
  for (const [field, r] of Object.entries(rules)) {
    const v = values[field];
    const empty = v === undefined || v === null || String(v).trim() === '';
    const label = r.label || field;
    if (empty) { if (r.required) errors[field] = `${label} is required`; continue; }
    if (r.email && !EMAIL.test(v)) errors[field] = 'Enter a valid email address';
    else if (r.phone && !PHONE.test(v)) errors[field] = 'Enter a valid phone number';
    else if (r.minLength && String(v).length < r.minLength) errors[field] = `${label} must be at least ${r.minLength} characters`;
    else if (r.min !== undefined && Number(v) < r.min) errors[field] = `${label} must be at least ${r.min}`;
    else if (r.max !== undefined && Number(v) > r.max) errors[field] = `${label} must be at most ${r.max}`;
  }
  return errors;
}

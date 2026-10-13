const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validators');

function run(rules, body, method = 'POST') {
  const req = { method, body };
  let error = null;
  validate(rules)(req, {}, (err) => { error = err; });
  return error;
}

test('rejects invalid email', () => {
  const err = run({ email: { required: true, type: 'email' } }, { email: 'not-an-email' });
  assert.ok(err && /valid email/.test(err.message));
});

test('accepts valid email', () => {
  const err = run({ email: { required: true, type: 'email' } }, { email: 'a@b.com' });
  assert.strictEqual(err, undefined);
});

test('required field missing fails on POST', () => {
  const err = run({ name: { required: true } }, {});
  assert.ok(err);
});

test('required field can be omitted on PATCH', () => {
  const err = run({ name: { required: true } }, {}, 'PATCH');
  assert.strictEqual(err, undefined);
});

test('enum rejects values outside the list', () => {
  const err = run({ status: { type: 'enum', values: ['a', 'b'] } }, { status: 'c' });
  assert.ok(err);
});

test('number range is enforced', () => {
  const err = run({ year: { type: 'int', min: 1, max: 4 } }, { year: 5 });
  assert.ok(err);
});

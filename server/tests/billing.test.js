const test = require('node:test');
const assert = require('node:assert');
const { deriveStatus, recalc } = require('../src/services/billing.service');

test('bill with no payment and future due date is pending', () => {
  const bill = { mealCharges: 1000, otherCharges: 0, discount: 0, paidAmount: 0, dueDate: new Date(Date.now() + 86400000) };
  recalc(bill);
  assert.strictEqual(bill.finalAmount, 1000);
  assert.strictEqual(bill.status, 'pending');
});

test('partial payment before due date is partially_paid', () => {
  const bill = { finalAmount: 1000, paidAmount: 400, dueDate: new Date(Date.now() + 86400000) };
  assert.strictEqual(deriveStatus(bill), 'partially_paid');
});

test('full payment is paid even after due date', () => {
  const bill = { finalAmount: 1000, paidAmount: 1000, dueDate: new Date(Date.now() - 86400000) };
  assert.strictEqual(deriveStatus(bill), 'paid');
});

test('unpaid bill past due date is overdue', () => {
  const bill = { finalAmount: 1000, paidAmount: 0, dueDate: new Date(Date.now() - 86400000) };
  assert.strictEqual(deriveStatus(bill), 'overdue');
});

test('discount reduces the final amount', () => {
  const bill = { mealCharges: 1000, otherCharges: 100, discount: 200, paidAmount: 0, dueDate: new Date(Date.now() + 86400000) };
  recalc(bill);
  assert.strictEqual(bill.finalAmount, 900);
});

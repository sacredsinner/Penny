import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailToTransaction, suggestCategory } from '../utils/gmailParser.js';

test('Chase bank alert extracts amount, merchant, and ignores balance', () => {
  const email = {
    id: 'msg_chase_1',
    sender: 'no-reply@alertspbx.chase.com',
    subject: 'Your debit card was used for $48.25 at TRADER JOE\'S',
    body: 'Account ending in 4102. Your debit card was used for $48.25 at TRADER JOE\'S on Nov 3, 2026. Ref #CH-8829103. Note: Available Balance: $3,210.45.',
    date: '2026-11-03T14:20:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed, 'Transaction should be parsed');
  assert.equal(parsed.amount, 48.25, 'Amount should be 48.25, NOT account balance of 3210.45');
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.type, 'expense');
  assert.equal(parsed.category, 'Groceries');
  assert.equal(parsed.referenceNumber, 'CH-8829103');
  assert.ok(parsed.merchant.toLowerCase().includes('trader joe'));
});

test('PayPal payment extracts amount, merchant, and currency', () => {
  const email = {
    id: 'msg_paypal_1',
    sender: 'service@paypal.com',
    subject: 'Receipt for your payment of $14.99 USD to Spotify',
    body: 'You sent a payment of $14.99 USD to Spotify AB. Transaction ID: 8PJ902341829. Current balance: $50.00.',
    date: '2026-11-02T08:15:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed);
  assert.equal(parsed.amount, 14.99);
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.type, 'expense');
  assert.equal(parsed.category, 'Subscriptions & Software');
  assert.equal(parsed.referenceNumber, '8PJ902341829');
});

test('Direct deposit payroll is classified as Income', () => {
  const email = {
    id: 'msg_income_1',
    sender: 'no-reply@alertspbx.chase.com',
    subject: 'Direct deposit of $3,500.00 credited to checking',
    body: 'Direct deposit of $3,500.00 from ACME TECH CORP was credited to your checking account on Oct 30, 2026. Ref #PAY-99201.',
    date: '2026-10-30T06:00:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed);
  assert.equal(parsed.amount, 3500.00);
  assert.equal(parsed.type, 'income');
  assert.equal(parsed.category, 'Income & Salary');
});

test('Refund email is classified as Refund', () => {
  const email = {
    id: 'msg_refund_1',
    sender: 'service@paypal.com',
    subject: 'Refund from Target Stores for $34.50 USD',
    body: 'Target Stores has issued a refund of $34.50 USD to your account for Order #TGT-44910. Transaction ID: REF-990214.',
    date: '2026-10-28T16:10:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed);
  assert.equal(parsed.amount, 34.50);
  assert.equal(parsed.type, 'refund');
});

test('Internal transfer is classified as Transfer', () => {
  const email = {
    id: 'msg_transfer_1',
    sender: 'alerts@chase.com',
    subject: 'Transfer of $500.00 to Savings Account',
    body: 'Automatic internal transfer of $500.00 between your accounts was completed on Oct 25, 2026. Ref #TRF-11029.',
    date: '2026-10-25T11:00:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed);
  assert.equal(parsed.amount, 500.00);
  assert.equal(parsed.type, 'transfer');
});

test('OTPs and verification codes are completely ignored', () => {
  const email = {
    id: 'msg_otp_1',
    sender: 'security@chase.com',
    subject: 'Your one-time security code is 849201',
    body: 'Use code 849201 to verify your identity. Do not share this code with anyone.',
    date: '2026-11-04T09:00:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.equal(parsed, null, 'OTP should return null');
});

test('Declined and failed payments are completely ignored', () => {
  const email = {
    id: 'msg_failed_1',
    sender: 'alerts@wellsfargo.com',
    subject: 'Transaction Declined at Best Buy',
    body: 'A transaction of $499.00 was declined because insufficient funds were available on your card.',
    date: '2026-11-04T10:00:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.equal(parsed, null, 'Failed payment should return null');
});

test('Pending authorization holds are ignored', () => {
  const email = {
    id: 'msg_hold_1',
    sender: 'alerts@chase.com',
    subject: 'Pre-authorization hold at Shell Gas',
    body: 'A temporary hold of $1.00 was placed on your card at Shell Gas Station.',
    date: '2026-11-04T11:00:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.equal(parsed, null, 'Hold should return null');
});

test('Ambiguous matches route to needs_review status', () => {
  const email = {
    id: 'msg_ambiguous_1',
    sender: 'alerts@unknownbank.com',
    subject: 'Debit Notice',
    body: 'Amount: $55.00 was debited. POS DEBIT.',
    date: '2026-10-24T18:30:00Z'
  };

  const parsed = parseEmailToTransaction(email);
  assert.ok(parsed);
  assert.equal(parsed.status, 'needs_review', 'Should route to review queue');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUser,
  findUserById,
  createTransaction,
  getTransactions,
  batchCreateTransactions,
  updateTransaction,
  deleteTransaction
} from '../utils/db.js';
import { encryptData, decryptData } from '../utils/crypto.js';

test('Encryption and Decryption for stored OAuth tokens', () => {
  const tokenPayload = {
    accessToken: 'ya29.test-access-token-12345',
    refreshToken: '1//0g-test-refresh-token-67890',
    expiresAt: Date.now() + 3600000
  };

  const encrypted = encryptData(tokenPayload);
  assert.ok(encrypted, 'Encrypted string should exist');
  assert.notEqual(encrypted, JSON.stringify(tokenPayload), 'Ciphertext must not be plaintext');
  assert.equal(encrypted.includes('ya29'), false, 'Sensitive token must not be visible in ciphertext');

  const decrypted = decryptData(encrypted);
  assert.deepEqual(decrypted, tokenPayload, 'Decrypted token payload must match original');
});

test('Strict User Ownership: User A cannot see or mutate User B data', () => {
  const userA = createUser({ email: 'alice@example.com', passwordHash: 'hashA', name: 'Alice' });
  const userB = createUser({ email: 'bob@example.com', passwordHash: 'hashB', name: 'Bob' });

  // Create transaction for User A
  const txA = createTransaction(userA.id, {
    amount: 150,
    currency: 'USD',
    merchant: 'Apple Store',
    category: 'Shopping'
  });

  // User B queries transactions
  const userBTxs = getTransactions(userB.id);
  assert.equal(userBTxs.some(t => t.id === txA.id), false, 'User B must NOT see User A transaction');

  // User B tries to update User A's transaction
  const unauthorizedUpdate = updateTransaction(userB.id, txA.id, { amount: 999 });
  assert.equal(unauthorizedUpdate, null, 'User B cannot update User A transaction');

  // User B tries to delete User A's transaction
  const unauthorizedDelete = deleteTransaction(userB.id, txA.id);
  assert.equal(unauthorizedDelete, false, 'User B cannot delete User A transaction');

  // Verify User A's transaction is unmodified
  const userATxs = getTransactions(userA.id);
  const found = userATxs.find(t => t.id === txA.id);
  assert.ok(found);
  assert.equal(found.amount, 150);
});

test('Duplicate prevention and fuzzy duplicate flagging', () => {
  const user = createUser({ email: 'duptest@example.com', passwordHash: 'hash', name: 'Dup Tester' });

  const tx1 = {
    amount: 25.00,
    currency: 'USD',
    merchant: 'Chipotle',
    date: '2026-11-01',
    referenceNumber: 'REF-CHIP-001',
    gmailMessageId: 'gmail_msg_001'
  };

  const batch1 = batchCreateTransactions(user.id, [tx1]);
  assert.equal(batch1.length, 1);

  // Exact duplicate with same gmailMessageId should be dropped
  const batch2 = batchCreateTransactions(user.id, [tx1]);
  assert.equal(batch2.length, 0, 'Exact gmail message ID duplicate must be prevented');

  // Same reference number with different gmailMessageId should also be prevented
  const txDuplicateRef = {
    amount: 25.00,
    currency: 'USD',
    merchant: 'Chipotle',
    date: '2026-11-01',
    referenceNumber: 'REF-CHIP-001',
    gmailMessageId: 'gmail_msg_002'
  };
  const batch3 = batchCreateTransactions(user.id, [txDuplicateRef]);
  assert.equal(batch3.length, 0, 'Exact reference number duplicate must be prevented');

  // Fuzzy duplicate without reference number (same amount, merchant, date, currency)
  const txFuzzy = {
    amount: 25.00,
    currency: 'USD',
    merchant: 'Chipotle',
    date: '2026-11-01',
    referenceNumber: null,
    gmailMessageId: 'gmail_msg_003'
  };
  const batch4 = batchCreateTransactions(user.id, [txFuzzy]);
  assert.equal(batch4.length, 1);
  assert.equal(batch4[0].isPossibleDuplicate, true, 'Fuzzy duplicate must be flagged');
  assert.equal(batch4[0].status, 'needs_review', 'Fuzzy duplicate must be sent to review queue');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../api.js';

test('End-to-End API Workflow: Auth, Gmail Mock Sync, Anti-Duplication, Goals & Reports', async () => {
  // 1. Register a test user
  const email = `testuser_${Date.now()}@example.com`;
  const registerEvent = {
    httpMethod: 'POST',
    path: '/api/auth/register',
    headers: {},
    body: JSON.stringify({
      email,
      password: 'SuperSecretPassword123!',
      name: 'Integration Tester'
    })
  };

  const regRes = await handler(registerEvent, {});
  assert.equal(regRes.statusCode, 201);
  const regData = JSON.parse(regRes.body);
  assert.ok(regData.token, 'Should return JWT token');
  const token = regData.token;

  // 2. Unauthenticated request must fail with 401
  const unauthRes = await handler({
    httpMethod: 'GET',
    path: '/api/transactions',
    headers: {}
  }, {});
  assert.equal(unauthRes.statusCode, 401, 'Unauthenticated request must be rejected');

  // 3. Check Gmail Status
  const statusRes = await handler({
    httpMethod: 'GET',
    path: '/api/gmail/status',
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(statusRes.statusCode, 200);
  const statusData = JSON.parse(statusRes.body);
  assert.equal(statusData.isConnected, false);
  assert.ok(statusData.setupDocumentation, 'Should include setup documentation');

  // 4. Run Mock Gmail Sync (Demo Mode)
  const syncRes = await handler({
    httpMethod: 'POST',
    path: '/api/gmail/mock-sync',
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(syncRes.statusCode, 200);
  const syncData = JSON.parse(syncRes.body);
  assert.equal(syncData.isDemoData, true);
  assert.ok(syncData.transactionsImported > 0);
  assert.ok(syncData.ignoredEmails >= 3, 'OTPs, failed transactions, and holds must be ignored');

  // 5. Fetch transactions and verify parsing results
  const txsRes = await handler({
    httpMethod: 'GET',
    path: '/api/transactions',
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(txsRes.statusCode, 200);
  const { transactions } = JSON.parse(txsRes.body);
  assert.ok(transactions.length > 0);

  // Check Chase Trader Joe's amount: $48.25 (NOT account balance $3,210.45)
  const traderJoes = transactions.find(t => t.merchant.toLowerCase().includes('trader joe'));
  assert.ok(traderJoes, 'Trader Joe transaction should exist');
  assert.equal(traderJoes.amount, 48.25, 'Must be transaction amount, not account balance');
  assert.equal(traderJoes.category, 'Groceries');

  // Check Spotify PayPal receipt
  const spotify = transactions.find(t => t.merchant.toLowerCase().includes('spotify'));
  assert.ok(spotify);
  assert.equal(spotify.amount, 14.99);
  assert.equal(spotify.category, 'Subscriptions & Software');

  // Check Salary direct deposit classified as Income
  const salary = transactions.find(t => t.type === 'income');
  assert.ok(salary);
  assert.equal(salary.amount, 3500.00);

  // Check Refund from Target classified as Refund
  const refund = transactions.find(t => t.type === 'refund');
  assert.ok(refund);
  assert.equal(refund.amount, 34.50);

  // Check Transfer classified as Transfer
  const transfer = transactions.find(t => t.type === 'transfer');
  assert.ok(transfer);
  assert.equal(transfer.amount, 500.00);

  // Check Ambiguous transaction routed to needs_review
  const reviewItem = transactions.find(t => t.status === 'needs_review');
  assert.ok(reviewItem, 'Uncertain match must be routed to needs_review');

  // 6. Approve review transaction
  const approveRes = await handler({
    httpMethod: 'POST',
    path: `/api/transactions/${reviewItem.id}/approve`,
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(approveRes.statusCode, 200);
  const approvedData = JSON.parse(approveRes.body);
  assert.equal(approvedData.transaction.status, 'confirmed');

  // 7. Test Anti-Duplication: Running sync again does not create duplicate entries
  const secondSync = await handler({
    httpMethod: 'POST',
    path: '/api/gmail/mock-sync',
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(secondSync.statusCode, 200);
  const secondSyncData = JSON.parse(secondSync.body);
  assert.equal(secondSyncData.transactionsImported, 0, 'Exact duplicates must be prevented');

  // 8. Create manual transaction
  const manualRes = await handler({
    httpMethod: 'POST',
    path: '/api/transactions',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount: 12.50,
      currency: 'USD',
      merchant: 'Starbucks Coffee',
      date: '2026-11-05',
      type: 'expense'
    })
  }, {});
  assert.equal(manualRes.statusCode, 201);
  const manualData = JSON.parse(manualRes.body);
  assert.equal(manualData.transaction.category, 'Dining & Food');

  // 9. Save and calculate budget goals
  const goalRes = await handler({
    httpMethod: 'POST',
    path: '/api/budget-goals',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      monthlyIncome: 4500,
      essentialExpenses: 2200,
      savingsTarget: 6000,
      currentSavings: 1500,
      deadline: '2027-04-30'
    })
  }, {});
  assert.equal(goalRes.statusCode, 200);
  const { goal } = JSON.parse(goalRes.body);
  assert.equal(goal.remainingSavingsNeeded, 4500);
  assert.ok(goal.monthlySavingsNeeded > 0);
  assert.equal(goal.isUnaffordable, false);
  assert.ok(goal.suggestedLimits.Groceries > 0);

  // 10. Fetch Reports and check currency isolation & transfer exclusion
  const repRes = await handler({
    httpMethod: 'GET',
    path: '/api/reports',
    headers: { Authorization: `Bearer ${token}` }
  }, {});
  assert.equal(repRes.statusCode, 200);
  const repData = JSON.parse(repRes.body);
  assert.ok(repData.reports.USD);
  assert.equal(repData.reports.USD.totalTransfers, 500);
  assert.ok(repData.reports.USD.totalExpenses > 0);
  assert.ok(repData.reports.USD.totalIncome >= 3500);
});

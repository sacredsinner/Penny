import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGoalMetrics, aggregateReports } from '../utils/budgetCalculations.js';

test('Goal metrics calculate savings per month and discretionary budget', () => {
  const goalData = {
    monthlyIncome: 5000,
    essentialExpenses: 2500,
    savingsTarget: 10000,
    currentSavings: 4000,
    // Set deadline 6 months in future
    deadline: new Date(Date.now() + 6 * 30 * 24 * 3600 * 1000).toISOString()
  };

  const metrics = calculateGoalMetrics(goalData);
  assert.equal(metrics.remainingSavingsNeeded, 6000);
  assert.ok(metrics.monthsRemaining >= 5 && metrics.monthsRemaining <= 7);
  assert.ok(metrics.monthlySavingsNeeded > 0);
  assert.equal(metrics.isUnaffordable, false, 'Goal should be affordable');
  assert.ok(metrics.remainingDiscretionaryBudget > 0);
});

test('Goal metrics warns when goal is unaffordable', () => {
  const goalData = {
    monthlyIncome: 3000,
    essentialExpenses: 2800, // Discretionary is only $200
    savingsTarget: 10000,
    currentSavings: 1000,   // Needs $9,000
    deadline: new Date(Date.now() + 3 * 30 * 24 * 3600 * 1000).toISOString() // in 3 months = $3,000/mo needed
  };

  const metrics = calculateGoalMetrics(goalData);
  assert.equal(metrics.isUnaffordable, true, 'Goal must be marked unaffordable');
  assert.ok(metrics.monthlyDeficit > 0, 'Deficit must be calculated');
});

test('Report aggregation distinguishes expenses, income, refunds, and transfers', () => {
  const transactions = [
    { id: '1', amount: 100, currency: 'USD', type: 'expense', category: 'Shopping', status: 'confirmed', date: '2026-11-01' },
    { id: '2', amount: 50, currency: 'USD', type: 'expense', category: 'Dining & Food', status: 'confirmed', date: '2026-11-02' },
    { id: '3', amount: 2000, currency: 'USD', type: 'income', category: 'Income & Salary', status: 'confirmed', date: '2026-11-01' },
    { id: '4', amount: 20, currency: 'USD', type: 'refund', category: 'Shopping', status: 'confirmed', date: '2026-11-03' }, // Reduces expense to 80
    { id: '5', amount: 500, currency: 'USD', type: 'transfer', category: 'Transfers & Repayments', status: 'confirmed', date: '2026-11-04' }, // Must NOT count as expense or income
    { id: '6', amount: 30, currency: 'USD', type: 'expense', category: 'General', status: 'needs_review', date: '2026-11-05' } // Must NOT be in official report
  ];

  const reports = aggregateReports(transactions);
  const usdReport = reports.USD;

  assert.ok(usdReport, 'USD report should exist');
  // Total expenses = 100 + 50 - 20 (refund) = 130
  assert.equal(usdReport.totalExpenses, 130);
  assert.equal(usdReport.totalIncome, 2000);
  assert.equal(usdReport.totalRefunds, 20);
  assert.equal(usdReport.totalTransfers, 500);
  // Net cash flow = 2000 - 130 = 1870
  assert.equal(usdReport.netCashFlow, 1870);
  // Shopping category should be 100 - 20 = 80
  assert.equal(usdReport.byCategory['Shopping'], 80);
});

test('Report aggregation keeps different currencies strictly isolated', () => {
  const transactions = [
    { id: '1', amount: 100, currency: 'USD', type: 'expense', category: 'Shopping', status: 'confirmed', date: '2026-11-01' },
    { id: '2', amount: 80, currency: 'EUR', type: 'expense', category: 'Dining & Food', status: 'confirmed', date: '2026-11-02' }
  ];

  const reports = aggregateReports(transactions);
  assert.ok(reports.USD);
  assert.ok(reports.EUR);
  assert.equal(reports.USD.totalExpenses, 100);
  assert.equal(reports.EUR.totalExpenses, 80);
});

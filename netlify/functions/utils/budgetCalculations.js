/**
 * Financial reports and budget goals calculations
 */

/**
 * Calculates budget goal metrics:
 * - Months to deadline
 * - Savings remaining
 * - Required savings per month
 * - Discretionary spending budget
 * - Affordability warning
 * - Suggested category budget breakdown
 */
export function calculateGoalMetrics(goalData, transactions = []) {
  const monthlyIncome = parseFloat(goalData.monthlyIncome) || 0;
  const essentialExpenses = parseFloat(goalData.essentialExpenses) || 0;
  const savingsTarget = parseFloat(goalData.savingsTarget) || 0;
  const currentSavings = parseFloat(goalData.currentSavings) || 0;
  const deadline = goalData.deadline ? new Date(goalData.deadline) : null;

  const now = new Date();
  let monthsRemaining = 1;

  if (deadline && !isNaN(deadline.getTime())) {
    const diffYears = deadline.getFullYear() - now.getFullYear();
    const diffMonths = (diffYears * 12) + (deadline.getMonth() - now.getMonth());
    // If deadline is this month, treat as 1 month. Otherwise count diffMonths.
    monthsRemaining = Math.max(1, diffMonths <= 0 ? 1 : diffMonths);
  }

  const remainingSavingsNeeded = Math.max(0, savingsTarget - currentSavings);
  const monthlySavingsNeeded = Math.round((remainingSavingsNeeded / monthsRemaining) * 100) / 100;

  // Discretionary income before savings
  const baselineDiscretionary = monthlyIncome - essentialExpenses;

  // Remaining spending budget after goal savings
  const remainingDiscretionaryBudget = Math.round((baselineDiscretionary - monthlySavingsNeeded) * 100) / 100;

  // Affordability check:
  // If baselineDiscretionary < 0, or if monthlySavingsNeeded > baselineDiscretionary,
  // the goal is unaffordable!
  const isUnaffordable = (monthlyIncome > 0 && monthlySavingsNeeded > baselineDiscretionary) || baselineDiscretionary < 0;
  const monthlyDeficit = isUnaffordable ? Math.max(0, Math.round((monthlySavingsNeeded - baselineDiscretionary) * 100) / 100) : 0;

  // Suggested category allocation based on remaining discretionary budget
  // Standard recommended percentages for discretionary categories:
  const defaultAllocations = [
    { category: 'Groceries', pct: 0.30 },
    { category: 'Dining & Food', pct: 0.20 },
    { category: 'Shopping', pct: 0.20 },
    { category: 'Subscriptions & Software', pct: 0.15 },
    { category: 'Transport & Fuel', pct: 0.15 }
  ];

  const suggestedLimits = {};
  const effectiveDiscretionary = Math.max(0, remainingDiscretionaryBudget);

  defaultAllocations.forEach(item => {
    suggestedLimits[item.category] = Math.round(effectiveDiscretionary * item.pct);
  });

  return {
    monthlyIncome,
    essentialExpenses,
    savingsTarget,
    currentSavings,
    deadline: goalData.deadline || null,
    monthsRemaining,
    remainingSavingsNeeded,
    monthlySavingsNeeded,
    baselineDiscretionary,
    remainingDiscretionaryBudget,
    isUnaffordable,
    monthlyDeficit,
    suggestedLimits,
    savedCategoryLimits: goalData.categoryLimits || suggestedLimits
  };
}

/**
 * Aggregates transactions by month, category, and currency.
 * Distinguishes:
 * - Expenses (counted towards spending)
 * - Income (counted towards earnings)
 * - Refunds (deducted from spending)
 * - Transfers (excluded from spending/income to prevent double counting)
 * Keeps currencies strictly isolated!
 */
export function aggregateReports(transactions = []) {
  // Group by currency first to maintain currency isolation
  const reportsByCurrency = {};

  for (const tx of transactions) {
    if (tx.status === 'needs_review') {
      // Exclude unreviewed transactions from official reports
      continue;
    }

    const currency = tx.currency || 'USD';
    if (!reportsByCurrency[currency]) {
      reportsByCurrency[currency] = {
        currency,
        totalExpenses: 0,
        totalIncome: 0,
        totalRefunds: 0,
        totalTransfers: 0,
        netCashFlow: 0,
        byCategory: {},
        monthlyTrends: {},
        transactionCount: 0
      };
    }

    const rep = reportsByCurrency[currency];
    const amount = tx.amount || 0;
    const monthKey = tx.date ? tx.date.slice(0, 7) : 'Unknown'; // YYYY-MM
    const category = tx.category || 'General';

    if (!rep.monthlyTrends[monthKey]) {
      rep.monthlyTrends[monthKey] = {
        month: monthKey,
        expenses: 0,
        income: 0,
        refunds: 0,
        net: 0
      };
    }

    rep.transactionCount++;

    if (tx.type === 'expense') {
      rep.totalExpenses += amount;
      rep.byCategory[category] = (rep.byCategory[category] || 0) + amount;
      rep.monthlyTrends[monthKey].expenses += amount;
    } else if (tx.type === 'income') {
      rep.totalIncome += amount;
      rep.monthlyTrends[monthKey].income += amount;
    } else if (tx.type === 'refund') {
      rep.totalRefunds += amount;
      // Refunds reduce overall expense and category expense
      rep.totalExpenses = Math.max(0, rep.totalExpenses - amount);
      if (rep.byCategory[category]) {
        rep.byCategory[category] = Math.max(0, rep.byCategory[category] - amount);
      }
      rep.monthlyTrends[monthKey].refunds += amount;
      rep.monthlyTrends[monthKey].expenses = Math.max(0, rep.monthlyTrends[monthKey].expenses - amount);
    } else if (tx.type === 'transfer') {
      // Transfers are isolated and not counted towards income or expenses
      rep.totalTransfers += amount;
    }
  }

  // Calculate net cash flows and round numbers
  for (const curr of Object.keys(reportsByCurrency)) {
    const rep = reportsByCurrency[curr];
    rep.totalExpenses = Math.round(rep.totalExpenses * 100) / 100;
    rep.totalIncome = Math.round(rep.totalIncome * 100) / 100;
    rep.totalRefunds = Math.round(rep.totalRefunds * 100) / 100;
    rep.totalTransfers = Math.round(rep.totalTransfers * 100) / 100;
    rep.netCashFlow = Math.round((rep.totalIncome - rep.totalExpenses) * 100) / 100;

    // Round category totals
    for (const cat of Object.keys(rep.byCategory)) {
      rep.byCategory[cat] = Math.round(rep.byCategory[cat] * 100) / 100;
    }

    // Sort trends chronologically
    const sortedTrends = Object.values(rep.monthlyTrends)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(trend => ({
        ...trend,
        expenses: Math.round(trend.expenses * 100) / 100,
        income: Math.round(trend.income * 100) / 100,
        net: Math.round((trend.income - trend.expenses) * 100) / 100
      }));

    rep.monthlyTrends = sortedTrends;
  }

  return reportsByCurrency;
}

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import { formatDate } from '../utils/formatters';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export function Dashboard({
  transactions,
  reports,
  goal,
  onOpenAddModal,
  onOpenGmailModal,
  onOpenReviewTab,
  onOpenGoalsTab,
  onEditTx,
  loading
}) {
  const { activeCurrency } = useAuth();

  // Find report matching active currency
  const currencyReport = reports?.[activeCurrency] || {
    totalExpenses: 0,
    totalIncome: 0,
    netCashFlow: 0,
    totalRefunds: 0,
    totalTransfers: 0
  };

  // Transactions for active currency
  const currencyTxs = transactions.filter(t => (t.currency || 'USD') === activeCurrency);
  const confirmedTxs = currencyTxs.filter(t => t.status === 'confirmed');
  const reviewTxs = currencyTxs.filter(t => t.status === 'needs_review');
  const recentTxs = confirmedTxs.slice(0, 7);

  return (
    <div className="space-y-6 pb-20">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Cash Flow */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Net Cash Flow</span>
            <div className={`p-1.5 rounded-lg ${currencyReport.netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
            <span className={currencyReport.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatMoney(currencyReport.netCashFlow, activeCurrency)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {currencyReport.netCashFlow >= 0 ? 'Surplus this period' : 'Deficit this period'}
          </span>
        </div>

        {/* Total Expenses */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-400 tracking-tight">
            {formatMoney(currencyReport.totalExpenses, activeCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {currencyReport.totalRefunds > 0 ? `Net after ${formatMoney(currencyReport.totalRefunds, activeCurrency)} refunds` : 'Active spending'}
          </span>
        </div>

        {/* Total Income */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Income</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
            {formatMoney(currencyReport.totalIncome, activeCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Deposits & earnings
          </span>
        </div>

        {/* Savings Goal Status */}
        <div
          onClick={onOpenGoalsTab}
          className="glass-card p-4 rounded-2xl cursor-pointer hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Discretionary Budget</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-400 tracking-tight">
            {goal?.remainingDiscretionaryBudget !== undefined
              ? formatMoney(goal.remainingDiscretionaryBudget, activeCurrency)
              : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            {goal?.isUnaffordable ? '⚠️ Goal exceeds income' : `${goal?.monthsRemaining || 0} mos remaining`}
          </span>
        </div>
      </div>

      {/* Affordability Warning Banner (if goal is unaffordable) */}
      {goal?.isUnaffordable && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold text-rose-200">Budget Warning: Savings Goal is Unaffordable</span>
            <p className="text-rose-300/80 mt-1 leading-relaxed">
              Your monthly savings target ({formatMoney(goal.monthlySavingsNeeded, activeCurrency)}/mo) plus essential expenses ({formatMoney(goal.essentialExpenses, activeCurrency)}) exceeds your monthly income ({formatMoney(goal.monthlyIncome, activeCurrency)}) by <strong className="text-rose-100">{formatMoney(goal.monthlyDeficit, activeCurrency)}/month</strong>.
            </p>
            <button
              onClick={onOpenGoalsTab}
              className="mt-2 text-rose-200 hover:text-white underline font-semibold"
            >
              Adjust your deadline or savings target in Goals →
            </button>
          </div>
        </div>
      )}

      {/* Review Queue Alert Card */}
      {reviewTxs.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-200">
                {reviewTxs.length} Transaction{reviewTxs.length > 1 ? 's' : ''} Need Review
              </span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Uncertain merchant alerts or potential duplicates require your confirmation.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenReviewTab}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Recent Activity ({activeCurrency})</h2>
            <p className="text-[11px] text-slate-400">Transactions from Gmail imports and manual entries</p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No transactions recorded yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Sync transactions automatically from your Gmail bank alerts or add a manual transaction.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onOpenGmailModal}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Sync Gmail
              </button>
              <button
                onClick={onOpenAddModal}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Add Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentTxs.map((tx) => {
              const isIncome = tx.type === 'income';
              const isRefund = tx.type === 'refund';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTx(tx)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 rounded-xl px-2 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isIncome
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isRefund
                        ? 'bg-amber-500/10 text-amber-400'
                        : isTransfer
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {isIncome || isRefund ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {tx.merchant}
                        </span>
                        {tx.source === 'demo' && (
                          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded">
                            Demo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CategoryBadge category={tx.category} size="xs" />
                        <span className="text-[11px] text-slate-400">
                          {formatDate(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs sm:text-sm font-extrabold ${
                      isIncome
                        ? 'text-emerald-400'
                        : isRefund
                        ? 'text-amber-400'
                        : isTransfer
                        ? 'text-sky-400'
                        : 'text-rose-400'
                    }`}>
                      {isIncome || isRefund ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                    </div>
                    {isTransfer && (
                      <span className="text-[10px] text-sky-400/80">Transfer</span>
                    )}
                    {isRefund && (
                      <span className="text-[10px] text-amber-400/80">Refund</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Coverage Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Notice:</strong> Reports reflect imported emails and manually recorded transactions. Cash transactions, unlinked bank accounts, or alerts outside your import filters may not be included.
        </p>
      </div>
    </div>
  );
}

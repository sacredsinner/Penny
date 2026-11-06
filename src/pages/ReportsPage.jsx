import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import { formatMonthYear } from '../utils/formatters';
import { exportTransactionsToCsv } from '../utils/exportCsv';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Info,
  Calendar,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const CHART_COLORS = [
  '#10B981', // emerald
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#A855F7', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F43F5E', // rose
  '#84CC16', // lime
  '#64748B'  // slate
];

export function ReportsPage({ reports, transactions }) {
  const { activeCurrency, setActiveCurrency } = useAuth();

  const currenciesAvailable = Object.keys(reports || {});
  const currentCurrency = currenciesAvailable.includes(activeCurrency)
    ? activeCurrency
    : (currenciesAvailable[0] || 'USD');

  const rep = reports?.[currentCurrency] || {
    totalExpenses: 0,
    totalIncome: 0,
    netCashFlow: 0,
    totalRefunds: 0,
    totalTransfers: 0,
    byCategory: {},
    monthlyTrends: []
  };

  // Prepare monthly trends chart data
  const trendLabels = (rep.monthlyTrends || []).map(t => formatMonthYear(t.month));
  const trendExpenses = (rep.monthlyTrends || []).map(t => t.expenses);
  const trendIncome = (rep.monthlyTrends || []).map(t => t.income);

  const trendsChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ['Current Month'],
    datasets: [
      {
        label: 'Expenses',
        data: trendExpenses.length > 0 ? trendExpenses : [rep.totalExpenses],
        backgroundColor: '#F43F5E',
        borderRadius: 6
      },
      {
        label: 'Income',
        data: trendIncome.length > 0 ? trendIncome : [rep.totalIncome],
        backgroundColor: '#10B981',
        borderRadius: 6
      }
    ]
  };

  const trendsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94A3B8', font: { size: 11, weight: '600' } }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${formatMoney(context.raw, currentCurrency)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94A3B8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#94A3B8',
          font: { size: 10 },
          callback: (value) => formatMoney(value, currentCurrency)
        }
      }
    }
  };

  // Prepare Category Doughnut Data
  const categoryEntries = Object.entries(rep.byCategory || {})
    .filter(([_, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  const categoryLabels = categoryEntries.map(([cat]) => cat);
  const categoryValues = categoryEntries.map(([_, amt]) => amt);

  const doughnutData = {
    labels: categoryLabels.length > 0 ? categoryLabels : ['No Expenses Recorded'],
    datasets: [
      {
        data: categoryValues.length > 0 ? categoryValues : [1],
        backgroundColor: categoryValues.length > 0 ? CHART_COLORS.slice(0, categoryLabels.length) : ['#334155'],
        borderWidth: 2,
        borderColor: '#0F172A'
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94A3B8',
          boxWidth: 12,
          padding: 12,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${formatMoney(context.raw, currentCurrency)}`
        }
      }
    },
    cutout: '72%'
  };

  const handleExport = () => {
    const curTxs = transactions.filter(t => (t.currency || 'USD') === currentCurrency && t.status === 'confirmed');
    exportTransactionsToCsv(curTxs);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">Spending Reports & Analytics</h1>
          <p className="text-xs text-slate-400">
            Monthly cash flows, category breakdowns, and spending trends
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Isolation Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {['USD', 'EUR', 'GBP', 'AUD', 'CAD'].map((curr) => (
              <button
                key={curr}
                onClick={() => setActiveCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentCurrency === curr
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Expenses */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Total Net Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-rose-400">
            {formatMoney(rep.totalExpenses, currentCurrency)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {rep.totalRefunds > 0 ? `Includes -${formatMoney(rep.totalRefunds, currentCurrency)} refunds` : 'All categorized expenses'}
          </span>
        </div>

        {/* Total Income */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Total Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            {formatMoney(rep.totalIncome, currentCurrency)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Payroll & deposits
          </span>
        </div>

        {/* Net Cash Flow */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Net Cash Flow</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-xl font-extrabold ${rep.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(rep.netCashFlow, currentCurrency)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Income minus expenses
          </span>
        </div>

        {/* Transfers (Separate from Spending) */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Transfers & Offsets</span>
            <ArrowRightLeft className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-sky-400">
            {formatMoney(rep.totalTransfers, currentCurrency)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Not double-counted as spending
          </span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Spending Trends (2 Columns) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Monthly Spending Trends</h2>
              <p className="text-[11px] text-slate-400">Comparing income and expenses over time</p>
            </div>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="h-64 sm:h-72">
            <Bar data={trendsChartData} options={trendsOptions} />
          </div>
        </div>

        {/* Category Breakdown (1 Column) */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Category Breakdown</h2>
              <p className="text-[11px] text-slate-400">Distribution of spending</p>
            </div>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="h-64 sm:h-72 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Detailed Category Table */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">Expenses by Category ({currentCurrency})</h2>
        {categoryEntries.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No categorized expenses recorded in this currency.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {categoryEntries.map(([cat, amt]) => {
              const pct = rep.totalExpenses > 0 ? Math.round((amt / rep.totalExpenses) * 100) : 0;
              return (
                <div key={cat} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CategoryBadge category={cat} size="sm" />
                    <span className="text-slate-400 text-[11px] font-medium">{pct}% of total</span>
                  </div>
                  <span className="font-bold text-slate-200">
                    {formatMoney(amt, currentCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prominent Coverage Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Coverage Notice:</strong> Reports cover imported and manually recorded transactions, not necessarily all spending. Cash purchases, unlinked bank accounts, or financial transactions outside your imported email senders are not included. Keep different currencies separated to ensure accurate financial figures.
        </p>
      </div>
    </div>
  );
}

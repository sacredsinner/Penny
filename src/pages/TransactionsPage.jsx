import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import { formatDate } from '../utils/formatters';
import { exportTransactionsToCsv } from '../utils/exportCsv';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Groceries',
  'Dining & Food',
  'Utilities & Bills',
  'Subscriptions & Software',
  'Transport & Fuel',
  'Shopping',
  'Health & Fitness',
  'Travel',
  'Income & Salary',
  'Transfers & Repayments',
  'Fees & Banking',
  'General'
];

export function TransactionsPage({
  transactions,
  onOpenAddModal,
  onEditTx,
  onDeleteTx
}) {
  const { activeCurrency } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState(activeCurrency);
  const [statusFilter, setStatusFilter] = useState('confirmed');

  // Filtered list
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      // Currency match
      if (currencyFilter !== 'ALL' && t.currency !== currencyFilter) {
        return false;
      }
      // Status match (confirmed vs needs_review)
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      // Type match
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }
      // Category match
      if (categoryFilter !== 'All Categories' && t.category !== categoryFilter) {
        return false;
      }
      // Search match
      if (search) {
        const q = search.toLowerCase();
        const matchesMerchant = t.merchant && t.merchant.toLowerCase().includes(q);
        const matchesRef = t.referenceNumber && t.referenceNumber.toLowerCase().includes(q);
        const matchesNotes = t.notes && t.notes.toLowerCase().includes(q);
        const matchesCategory = t.category && t.category.toLowerCase().includes(q);
        if (!matchesMerchant && !matchesRef && !matchesNotes && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, search, categoryFilter, typeFilter, currencyFilter, statusFilter]);

  const handleExport = () => {
    exportTransactionsToCsv(filteredTxs);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header with Title & Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">Transactions</h1>
          <p className="text-xs text-slate-400">
            Search, filter, categorize, and manage your expenses & receipts
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Manual
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by merchant, note, or reference #..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Type Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="refund">Refunds Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Currency Isolation Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Currency</label>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="ALL">All Currencies</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="confirmed">Confirmed Only</option>
              <option value="needs_review">Needs Review</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''}</span>
          {currencyFilter !== 'ALL' && (
            <span className="font-semibold text-emerald-400">Currency: {currencyFilter}</span>
          )}
        </div>

        {filteredTxs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Filter className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No matching transactions</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search, category, or currency filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTxs.map((tx) => {
              const isIncome = tx.type === 'income';
              const isRefund = tx.type === 'refund';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left: icon & details */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {tx.merchant}
                        </span>
                        {tx.source === 'demo' && (
                          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                            Demo
                          </span>
                        )}
                        {tx.source === 'gmail' && (
                          <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                            Gmail
                          </span>
                        )}
                        {tx.status === 'needs_review' && (
                          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                            Review Required
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <CategoryBadge category={tx.category} size="xs" />
                        <span className="text-[11px] text-slate-400">
                          {formatDate(tx.date)}
                        </span>
                        {tx.referenceNumber && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ref: {tx.referenceNumber}
                          </span>
                        )}
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: amount & quick action buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className={`text-sm sm:text-base font-extrabold ${
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

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => onEditTx(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                        title="Edit transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete transaction for ${tx.merchant} (${formatMoney(tx.amount, tx.currency)})?`)) {
                            onDeleteTx(tx.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

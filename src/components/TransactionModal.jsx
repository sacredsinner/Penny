import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

const CATEGORIES = [
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

export function TransactionModal({ isOpen, onClose, onSave, editingTx, defaultCurrency = 'USD' }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('General');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTx) {
      setAmount(editingTx.amount || '');
      setCurrency(editingTx.currency || defaultCurrency);
      setMerchant(editingTx.merchant || '');
      setDate(editingTx.date || new Date().toISOString().split('T')[0]);
      setType(editingTx.type || 'expense');
      setCategory(editingTx.category || 'General');
      setReferenceNumber(editingTx.referenceNumber || '');
      setNotes(editingTx.notes || '');
    } else {
      setAmount('');
      setCurrency(defaultCurrency);
      setMerchant('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategory('General');
      setReferenceNumber('');
      setNotes('');
    }
  }, [editingTx, defaultCurrency, isOpen]);

  // Quick auto-suggest category when typing merchant
  const handleMerchantChange = (e) => {
    const val = e.target.value;
    setMerchant(val);
    const lower = val.toLowerCase();
    if (lower.includes('trader joe') || lower.includes('whole foods') || lower.includes('safeway') || lower.includes('kroger') || lower.includes('aldi')) {
      setCategory('Groceries');
    } else if (lower.includes('starbucks') || lower.includes('mcdonald') || lower.includes('uber eats') || lower.includes('doordash') || lower.includes('cafe') || lower.includes('pizza') || lower.includes('chipotle')) {
      setCategory('Dining & Food');
    } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('apple') || lower.includes('github') || lower.includes('openai') || lower.includes('prime')) {
      setCategory('Subscriptions & Software');
    } else if (lower.includes('shell') || lower.includes('chevron') || lower.includes('uber') || lower.includes('lyft') || lower.includes('gas') || lower.includes('transit')) {
      setCategory('Transport & Fuel');
    } else if (lower.includes('amazon') || lower.includes('target') || lower.includes('walmart') || lower.includes('best buy') || lower.includes('zara')) {
      setCategory('Shopping');
    } else if (lower.includes('cvs') || lower.includes('walgreens') || lower.includes('gym') || lower.includes('pharmacy')) {
      setCategory('Health & Fitness');
    } else if (lower.includes('payroll') || lower.includes('salary') || lower.includes('direct deposit')) {
      setCategory('Income & Salary');
      setType('income');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        merchant: merchant.trim() || 'Manual Entry',
        date,
        type,
        category,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      alert(`Error saving transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold">
            {editingTx ? 'Edit Transaction' : 'Record Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Transaction Type</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-1.5 rounded-lg transition-all ${
                  type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-1.5 rounded-lg transition-all ${
                  type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType('refund')}
                className={`py-1.5 rounded-lg transition-all ${
                  type === 'refund' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`py-1.5 rounded-lg transition-all ${
                  type === 'transfer' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Merchant / Payee</label>
            <input
              type="text"
              required
              value={merchant}
              onChange={handleMerchantChange}
              placeholder="e.g. Trader Joe's, Netflix, Shell"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Reference / Auth # (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TXN-10294 or Order ID"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Saving...' : editingTx ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

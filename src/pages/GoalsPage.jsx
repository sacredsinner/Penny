import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatMoney } from '../utils/currency';
import {
  Target,
  AlertTriangle,
  CheckCircle,
  Sliders,
  DollarSign,
  Calendar,
  Sparkles,
  Info,
  Save
} from 'lucide-react';

export function GoalsPage({ goal, onSaveGoal, loading }) {
  const { activeCurrency } = useAuth();

  const [monthlyIncome, setMonthlyIncome] = useState(goal?.monthlyIncome || 4500);
  const [essentialExpenses, setEssentialExpenses] = useState(goal?.essentialExpenses || 2200);
  const [savingsTarget, setSavingsTarget] = useState(goal?.savingsTarget || 8000);
  const [currentSavings, setCurrentSavings] = useState(goal?.currentSavings || 2000);
  const [deadline, setDeadline] = useState(goal?.deadline || '2027-06-30');
  const [categoryLimits, setCategoryLimits] = useState(goal?.savedCategoryLimits || {});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (goal) {
      setMonthlyIncome(goal.monthlyIncome || 0);
      setEssentialExpenses(goal.essentialExpenses || 0);
      setSavingsTarget(goal.savingsTarget || 0);
      setCurrentSavings(goal.currentSavings || 0);
      setDeadline(goal.deadline || '');
      setCategoryLimits(goal.savedCategoryLimits || goal.suggestedLimits || {});
    }
  }, [goal]);

  // Client-side dynamic preview calculations as user adjusts inputs
  const now = new Date();
  const targetDate = deadline ? new Date(deadline) : null;
  let monthsRemaining = 1;
  if (targetDate && !isNaN(targetDate.getTime())) {
    const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    monthsRemaining = Math.max(1, diffMonths <= 0 ? 1 : diffMonths);
  }

  const remainingSavingsNeeded = Math.max(0, (parseFloat(savingsTarget) || 0) - (parseFloat(currentSavings) || 0));
  const monthlySavingsNeeded = Math.round((remainingSavingsNeeded / monthsRemaining) * 100) / 100;
  const baselineDiscretionary = (parseFloat(monthlyIncome) || 0) - (parseFloat(essentialExpenses) || 0);
  const remainingDiscretionaryBudget = Math.round((baselineDiscretionary - monthlySavingsNeeded) * 100) / 100;

  const isUnaffordable = (parseFloat(monthlyIncome) > 0 && monthlySavingsNeeded > baselineDiscretionary) || baselineDiscretionary < 0;
  const monthlyDeficit = isUnaffordable ? Math.max(0, Math.round((monthlySavingsNeeded - baselineDiscretionary) * 100) / 100) : 0;

  const handleLimitChange = (cat, val) => {
    setCategoryLimits({
      ...categoryLimits,
      [cat]: parseFloat(val) || 0
    });
  };

  const handleApplySuggested = () => {
    if (goal?.suggestedLimits) {
      setCategoryLimits(goal.suggestedLimits);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveGoal({
        monthlyIncome: parseFloat(monthlyIncome) || 0,
        essentialExpenses: parseFloat(essentialExpenses) || 0,
        savingsTarget: parseFloat(savingsTarget) || 0,
        currentSavings: parseFloat(currentSavings) || 0,
        deadline,
        categoryLimits
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Failed to save goal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white">Savings Goals & Budget Planner</h1>
        <p className="text-xs text-slate-400 mt-1">
          Set your financial targets, calculate monthly required savings, and get suggested category limits.
        </p>
      </div>

      {/* Affordability Warning Alert */}
      {isUnaffordable && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Warning: Goal is Unaffordable with Current Income</span>
          </div>
          <p className="text-xs leading-relaxed text-rose-200">
            To reach <strong className="text-white">{formatMoney(savingsTarget, activeCurrency)}</strong> by {deadline ? new Date(deadline).toLocaleDateString() : 'your deadline'}, you need to save <strong className="text-white">{formatMoney(monthlySavingsNeeded, activeCurrency)}/month</strong>. However, your discretionary income after essential expenses is only <strong className="text-white">{formatMoney(baselineDiscretionary, activeCurrency)}/month</strong>.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950/40 text-xs font-semibold text-rose-300">
            Monthly Deficit: <span className="text-white font-mono text-sm">{formatMoney(monthlyDeficit, activeCurrency)}</span> / month.
            <p className="font-normal text-[11px] text-rose-300/80 mt-0.5">
              💡 Suggested action: Extend your deadline by at least {Math.ceil(remainingSavingsNeeded / Math.max(1, baselineDiscretionary)) - monthsRemaining} months, or adjust your target down.
            </p>
          </div>
        </div>
      )}

      {/* Main Budget Calculator Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Income, Essentials & Target
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Income */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Monthly Net Income
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Take-home salary & regular earnings</p>
            </div>

            {/* Essential Expenses */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Monthly Essential Expenses
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={essentialExpenses}
                onChange={(e) => setEssentialExpenses(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Rent, mortgage, groceries, utilities, debt minimums</p>
            </div>

            {/* Savings Target */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Savings Target Goal
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Target emergency fund, down payment, or big purchase</p>
            </div>

            {/* Current Savings */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Amount Saved
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Funds currently allocated to this goal</p>
            </div>

            {/* Target Deadline */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Deadline Date
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full sm:w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Target achievement date ({monthsRemaining} months remaining)</p>
            </div>
          </div>
        </div>

        {/* Calculated Results Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 block font-medium">Remaining to Save</span>
            <div className="text-lg font-extrabold text-white mt-1">
              {formatMoney(remainingSavingsNeeded, activeCurrency)}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 block font-medium">Months Remaining</span>
            <div className="text-lg font-extrabold text-white mt-1">
              {monthsRemaining} mo{monthsRemaining !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 block font-medium">Monthly Savings Needed</span>
            <div className={`text-lg font-extrabold mt-1 ${isUnaffordable ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatMoney(monthlySavingsNeeded, activeCurrency)}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 block font-medium">Remaining Discretionary</span>
            <div className={`text-lg font-extrabold mt-1 ${remainingDiscretionaryBudget < 0 ? 'text-rose-400' : 'text-indigo-400'}`}>
              {formatMoney(remainingDiscretionaryBudget, activeCurrency)}
            </div>
          </div>
        </div>

        {/* Suggested Category Limits */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Suggested Discretionary Category Limits
              </h2>
              <p className="text-[11px] text-slate-400">
                Recommended monthly limits based on your remaining spending budget. You can customize them freely.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplySuggested}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Reset to Recommendations
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              'Groceries',
              'Dining & Food',
              'Shopping',
              'Subscriptions & Software',
              'Transport & Fuel'
            ].map((cat) => (
              <div key={cat} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">{cat}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={categoryLimits[cat] !== undefined ? categoryLimits[cat] : ''}
                    onChange={(e) => handleLimitChange(cat, e.target.value)}
                    placeholder="0"
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Goal saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Goals & Budget'}
          </button>
        </div>
      </form>

      {/* Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Note:</strong> Budget comparisons and spending reports cover imported and manually recorded transactions, not necessarily all spending. Review your transactions regularly to ensure complete coverage.
        </p>
      </div>
    </div>
  );
}

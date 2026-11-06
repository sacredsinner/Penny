import React from 'react';

const CATEGORY_STYLES = {
  'Groceries': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Dining & Food': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Utilities & Bills': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Subscriptions & Software': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Transport & Fuel': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Shopping': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Health & Fitness': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Travel': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Income & Salary': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Transfers & Repayments': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Fees & Banking': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'General': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};

export function CategoryBadge({ category, size = 'sm' }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES['General'];
  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${style} ${sizeClasses}`}>
      {category || 'General'}
    </span>
  );
}

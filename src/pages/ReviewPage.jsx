import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import { formatDate } from '../utils/formatters';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  AlertCircle,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function ReviewPage({
  transactions,
  onApproveTx,
  onEditTx,
  onDeleteTx
}) {
  const { activeCurrency } = useAuth();
  const [processingId, setProcessingId] = useState(null);

  const reviewItems = transactions.filter(t => t.status === 'needs_review');

  const handleApprove = async (tx) => {
    setProcessingId(tx.id);
    try {
      await onApproveTx(tx.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (tx) => {
    if (confirm(`Dismiss and remove this alert for ${tx.merchant} (${formatMoney(tx.amount, tx.currency)})?`)) {
      setProcessingId(tx.id);
      try {
        await onDeleteTx(tx.id);
      } finally {
        setProcessingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Review Queue</h1>
          {reviewItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {reviewItems.length} Pending
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Review uncertain bank alerts, ambiguous merchant names, and possible duplicates before adding them to reports.
        </p>
      </div>

      {reviewItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">Review Queue is Clear!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All imported Gmail transactions and manual entries have been confirmed. Any ambiguous alerts in future syncs will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewItems.map((tx) => {
            const isProcessing = processingId === tx.id;
            return (
              <div
                key={tx.id}
                className="glass-card rounded-2xl p-4 sm:p-5 border-amber-500/30 space-y-3 relative overflow-hidden"
              >
                {/* Flag Notice */}
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {tx.isPossibleDuplicate
                      ? 'Flagged: Possible duplicate transaction detected'
                      : 'Flagged: Ambiguous merchant or alert details require verification'}
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white">{tx.merchant}</span>
                      <CategoryBadge category={tx.category} size="xs" />
                      <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
                    </div>

                    {tx.rawSubject && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-md">{tx.rawSubject}</span>
                      </p>
                    )}

                    {tx.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        {tx.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-white">
                      {formatMoney(tx.amount, tx.currency)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Type: {tx.type}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleReject(tx)}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                  <button
                    onClick={() => onEditTx(tx)}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => handleApprove(tx)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isProcessing ? 'Confirming...' : 'Approve & Confirm'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

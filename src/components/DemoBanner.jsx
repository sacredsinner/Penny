import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export function DemoBanner({ onClearDemo, onDismiss }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-amber-300">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded mr-2">
              DEMO DATA — NOT A REAL GMAIL IMPORT
            </span>
            <span className="text-xs text-amber-300/90 hidden md:inline">
              Simulated banking alerts used to test rule-based parsing and reports without live Google OAuth.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {onClearDemo && (
            <button
              onClick={onClearDemo}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Demo Data
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-400"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

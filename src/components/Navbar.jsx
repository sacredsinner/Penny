import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Mail, LogOut, Wallet, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

export function Navbar({ onOpenGmailModal, onOpenSmsModal, onOpenDemoSync, hasDemoData, syncing }) {
  const { user, logout, activeCurrency, setActiveCurrency } = useAuth();

  const isConnected = user?.gmailConfig?.isConnected;

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-white text-lg">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">Penny</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Smart Expense & Gmail Sync</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Currency Switcher */}
          <select
            value={activeCurrency}
            onChange={(e) => setActiveCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            title="Active currency for reports and lists"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="CAD">CAD (C$)</option>
          </select>

          {/* SMS Import Button */}
          <button
            onClick={onOpenSmsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all"
            title="Import transactions from SMS"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SMS Import</span>
            <span className="sm:hidden">SMS</span>
          </button>

          {/* Gmail Status / Sync Button */}
          <button
            onClick={onOpenGmailModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isConnected
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isConnected ? 'Gmail Synced' : 'Connect Gmail'}
            </span>
            <span className="sm:hidden">
              {isConnected ? 'Synced' : 'Gmail'}
            </span>
          </button>

          {/* User & Logout */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
            <span className="text-xs text-slate-400 hidden md:inline truncate max-w-[120px]">
              {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

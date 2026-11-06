import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Mail,
  ShieldCheck,
  Trash2,
  RefreshCw,
  ExternalLink,
  Lock,
  Database,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function SettingsPage({
  onOpenGmailModal,
  onResetData,
  onTriggerDemoSync
}) {
  const { user, logout, refreshUser } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);

  const isConnected = user?.gmailConfig?.isConnected;

  const handleClearImported = async () => {
    if (!confirm('Are you sure you want to delete all transactions imported from Gmail? Manually entered transactions will remain.')) return;
    setClearing(true);
    try {
      await api.gmail.deleteData('gmail');
      if (onResetData) onResetData();
      alert('Gmail imported transactions deleted.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!confirm('Delete all simulated demo data?')) return;
    setClearingDemo(true);
    try {
      await api.gmail.deleteData('demo');
      if (onResetData) onResetData();
      alert('Demo data removed.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setClearingDemo(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('CAUTION: This will delete ALL transactions (both manual and imported). This action cannot be undone!')) return;
    setClearing(true);
    try {
      await api.transactions.clearAll();
      if (onResetData) onResetData();
      alert('All transactions cleared.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white">Settings & Privacy</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your Gmail connection, privacy controls, and data storage
        </p>
      </div>

      {/* Account Info */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Account & Authentication
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-200">{user?.name || 'User'}</p>
            <p className="text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Gmail Connection Controls */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          Gmail Connection Settings
        </h2>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Connection:</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected ({user?.gmailConfig?.email})
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Not Connected
                </span>
              )}
            </div>
            {user?.gmailConfig?.lastSync && (
              <p className="text-[11px] text-slate-400 mt-1">
                Last sync: {new Date(user.gmailConfig.lastSync).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGmailModal}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              {isConnected ? 'Manage Sync' : 'Connect Gmail'}
            </button>
          </div>
        </div>

        {/* Demo Mode Trigger */}
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-indigo-300">Simulate Gmail Imports (Demo Data)</span>
            <p className="text-slate-400 text-[11px]">
              Load realistic bank alerts from Chase, PayPal, Apple, etc., to test the rule-based parser without Google OAuth.
            </p>
          </div>
          <button
            onClick={onTriggerDemoSync}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Run Demo Sync
          </button>
        </div>
      </div>

      {/* Data Management & Deletion */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Data Management & Deletion
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <p className="font-semibold text-slate-200">Delete Gmail Imported Data</p>
              <p className="text-[11px] text-slate-400">Erases transactions imported from Gmail. Manual entries are kept.</p>
            </div>
            <button
              onClick={handleClearImported}
              disabled={clearing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {clearing ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <p className="font-semibold text-slate-200">Delete Demo Data</p>
              <p className="text-[11px] text-slate-400">Removes all simulated demo transactions.</p>
            </div>
            <button
              onClick={handleClearDemoData}
              disabled={clearingDemo}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {clearingDemo ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <div>
              <p className="font-semibold text-rose-300">Reset All Transactions</p>
              <p className="text-[11px] text-slate-400">Permanently clears all transactions from your account.</p>
            </div>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Architecture Summary */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Technical & Privacy Architecture
        </h2>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>No Password Storage:</strong> Penny authenticates via official Google OAuth 2.0 with strict read-only permissions (<code className="text-emerald-400">gmail.readonly</code>). Your Google password is never requested or stored.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Token Protection:</strong> OAuth tokens are encrypted at rest using AES-256-GCM encryption.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Zero Raw Body Storage:</strong> Full email contents are discarded immediately after rule-based parsing. Only metadata (amount, merchant, date) is saved.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Strict User Ownership:</strong> Every backend request validates your JWT and isolates data strictly by user ID. Cross-user access is impossible.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Mail,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Check,
  ExternalLink,
  Info,
  Sliders,
  HelpCircle
} from 'lucide-react';

const COMMON_BANK_SENDERS = [
  { id: 'chase', label: 'Chase Bank', email: 'no-reply@alertspbx.chase.com' },
  { id: 'boa', label: 'Bank of America', email: 'bankofamerica.com' },
  { id: 'wellsfargo', label: 'Wells Fargo', email: 'alerts@wellsfargo.com' },
  { id: 'amex', label: 'American Express', email: 'americanexpress.com' },
  { id: 'capitalone', label: 'Capital One', email: 'capitalone.com' },
  { id: 'paypal', label: 'PayPal', email: 'service@paypal.com' },
  { id: 'stripe', label: 'Stripe Receipts', email: 'receipts@stripe.com' },
  { id: 'apple', label: 'Apple Receipts', email: 'no_reply@email.apple.com' },
  { id: 'monzo', label: 'Monzo / Revolut', email: 'monzo.com' }
];

export function GmailConnectModal({ isOpen, onClose, onSyncComplete }) {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  // Configuration state
  const [selectedSenders, setSelectedSenders] = useState([]);
  const [label, setLabel] = useState('INBOX');
  const [dateRange, setDateRange] = useState('30d');
  const [customSender, setCustomSender] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.gmail.getStatus();
      setStatus(res);
      setSelectedSenders(res.senders || []);
      setLabel(res.label || 'INBOX');
      setDateRange(res.dateRange || '30d');
    } catch (e) {
      console.error('Failed to load Gmail status:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSender = (senderEmail) => {
    if (selectedSenders.includes(senderEmail)) {
      setSelectedSenders(selectedSenders.filter(s => s !== senderEmail));
    } else {
      setSelectedSenders([...selectedSenders, senderEmail]);
    }
  };

  const handleAddCustomSender = (e) => {
    e.preventDefault();
    if (customSender && !selectedSenders.includes(customSender)) {
      setSelectedSenders([...selectedSenders, customSender.trim()]);
      setCustomSender('');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.gmail.saveConfig({
        senders: selectedSenders,
        label,
        dateRange
      });
      await refreshUser();
      await loadStatus();
    } catch (err) {
      alert(`Failed to save filters: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      const res = await api.gmail.getAuthUrl();
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err) {
      alert(`Cannot initiate Google OAuth: ${err.message}\n\nPlease check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured in your environment.`);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.gmail.sync();
      setSyncResult(res);
      await refreshUser();
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleMockSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.gmail.mockSync();
      setSyncResult(res);
      await refreshUser();
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      alert(`Demo sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? Stored credentials will be permanently erased.')) return;
    try {
      await api.gmail.disconnect();
      await refreshUser();
      await loadStatus();
      setSyncResult(null);
    } catch (err) {
      alert(`Failed to disconnect: ${err.message}`);
    }
  };

  const isConnected = status?.isConnected;
  const isOAuthConfigured = status?.oauthConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-6 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gmail Transaction Sync</h2>
              <p className="text-xs text-slate-400">Import bank alerts and payment receipts securely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transparent Privacy & Scope Notice */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Privacy & Security Guarantee</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Google OAuth grants <strong className="text-slate-200">read-only access</strong>. Although this permission allows broader mailbox access under Google's standard permissions, <strong className="text-slate-200">Penny scans ONLY emails from your selected bank and payment senders</strong>.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li>Never asks for or stores your Gmail password.</li>
            <li>OAuth tokens are encrypted at rest with AES-256-GCM.</li>
            <li>Email bodies are <strong className="text-slate-200">never stored or logged</strong>; only parsed transaction details (amount, merchant, date) are retained.</li>
          </ul>
        </div>

        {/* Connection Status Card */}
        <div className="mb-5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected ({status?.connectedEmail})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Not Connected
                </span>
              )}
            </div>
            {status?.lastSync && (
              <p className="text-[11px] text-slate-400 mt-1">
                Last synced: {new Date(status.lastSync).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                {isOAuthConfigured ? (
                  <button
                    onClick={handleConnectOAuth}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Connect with Google
                  </button>
                ) : (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                    Google OAuth keys not configured in environment.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Demo Mode Action (Always Available) */}
        <div className="mb-5 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-indigo-300">Test Rule-Based Parser (Demo Mode)</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Parse realistic sample alerts (Chase, PayPal, Stripe, Apple, OTP rejection, duplicate detection) without connecting Google.
            </p>
          </div>
          <button
            onClick={handleMockSync}
            disabled={syncing}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {syncing ? 'Simulating...' : 'Run Demo Sync'}
          </button>
        </div>

        {/* Sync Result Feedback */}
        {syncResult && (
          <div className="mb-5 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Sync completed successfully!</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scanned: {syncResult.emailsScanned} emails | Imported: {syncResult.transactionsImported} transactions | Ignored (OTPs/non-transactions): {syncResult.ignoredEmails}
            </p>
            {syncResult.isDemoData && (
              <span className="inline-block mt-1 text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                DEMO DATA — NOT A REAL GMAIL IMPORT
              </span>
            )}
          </div>
        )}

        {/* Filters Configuration */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Import Filters & Senders
            </h3>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {savingConfig ? 'Saving...' : 'Save Filters'}
            </button>
          </div>

          {/* Date Range & Label */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Import Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days (Default)</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Available</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Gmail Label / Folder</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. INBOX, Receipts, Finance"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Senders Preset Selection */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">
              Active Financial Senders ({selectedSenders.length} selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_BANK_SENDERS.map((bank) => {
                const isSelected = selectedSenders.includes(bank.email);
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => toggleSender(bank.email)}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors border ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate mr-1">{bank.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Sender Input */}
          <form onSubmit={handleAddCustomSender} className="flex gap-2">
            <input
              type="text"
              value={customSender}
              onChange={(e) => setCustomSender(e.target.value)}
              placeholder="Add custom bank sender (e.g. alerts@mybank.com)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!customSender}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold"
            >
              Add
            </button>
          </form>
        </div>

        {/* Google Cloud Setup Documentation Accordion */}
        <div className="mt-5 pt-3 border-t border-slate-800">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 font-medium py-1"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              Google Cloud OAuth Setup & Verification Guide
            </span>
            <span>{showDocs ? '▲ Hide' : '▼ Expand'}</span>
          </button>

          {showDocs && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-white">To connect a real Gmail account:</p>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Google Cloud Console</a> and create a project.</li>
                <li>Enable the <strong className="text-slate-200">Gmail API</strong> under APIs & Services.</li>
                <li>Configure the <strong className="text-slate-200">OAuth Consent Screen</strong>: Choose External, set App Name to "Penny".</li>
                <li>Add Scope: <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">https://www.googleapis.com/auth/gmail.readonly</code></li>
                <li><strong>Testing Mode / Test Users:</strong> While your Google Cloud app is unverified in Testing status, you MUST add your Gmail address under <strong className="text-slate-200">Test Users</strong> to authorize access.</li>
                <li>Create <strong className="text-slate-200">OAuth 2.0 Client ID</strong> (Web application).</li>
                <li>Set Authorized Redirect URI to: <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">http://localhost:8888/api/gmail/callback</code> or your production Netlify URL.</li>
                <li>Add environment variables in Netlify or <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">.env</code>:
                  <pre className="mt-1 p-2 bg-slate-950 rounded text-[11px] text-slate-300 font-mono overflow-x-auto">
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8888/api/gmail/callback
                  </pre>
                </li>
              </ol>
              <p className="text-[11px] text-slate-400 pt-1">
                Full instructions with verification requirements are in <code className="text-emerald-400">GOOGLE_CLOUD_SETUP.md</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

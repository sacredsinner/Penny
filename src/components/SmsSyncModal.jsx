import React, { useState } from 'react';
import { smsService, isNative } from '../services/smsService';
import {
  X,
  MessageSquare,
  ShieldCheck,
  Check,
  Smartphone,
  RefreshCw,
  Send,
  AlertTriangle
} from 'lucide-react';

const SAMPLE_BANK_SMS = [
  {
    sender: 'CHASE',
    body: 'Chase Alert: Your card ending in 4102 was charged $35.40 at WHOLE FOODS on 05-Nov. Avail Bal: $1,240.50. Ref: CH99201',
    date: Date.now() - 3600000
  },
  {
    sender: 'WELLSFARGO',
    body: 'WF Alert: A purchase of $64.10 at CHEVRON was made with card ending 9876. Bal: $890.00',
    date: Date.now() - 7200000
  },
  {
    sender: 'BANK',
    body: 'Your a/c no. XX1029 is credited with USD 2,500.00 on 04-Nov by SALARY. Ref #PAY-11029',
    date: Date.now() - 86400000
  },
  {
    sender: 'CHASE_SEC',
    body: 'Your Chase verification code is 591024. Do not share this code with anyone.',
    date: Date.now() - 100000
  }
];

export function SmsSyncModal({ isOpen, onClose, onSyncComplete }) {
  const [loading, setLoading] = useState(false);
  const [pastedSms, setPastedSms] = useState('');
  const [senderName, setSenderName] = useState('BANK ALERT');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleScanDeviceSms = async () => {
    setLoading(true);
    setResult(null);
    try {
      const messages = await smsService.readInbox(150);
      const res = await smsService.syncSmsMessages(messages);
      setResult(res);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      alert(`SMS Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPasted = async (e) => {
    e.preventDefault();
    if (!pastedSms.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await smsService.syncSmsMessages([
        {
          id: `paste_${Date.now()}`,
          sender: senderName.trim() || 'BANK',
          body: pastedSms.trim(),
          date: Date.now()
        }
      ]);
      setResult(res);
      setPastedSms('');
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSamples = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await smsService.syncSmsMessages(SAMPLE_BANK_SMS);
      setResult(res);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      alert(`Sample import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">SMS Transaction Import</h2>
              <p className="text-xs text-slate-400">Detect expenses directly from bank SMS alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device vs Web Status */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sky-400">
            <Smartphone className="w-4 h-4" />
            <span>{isNative ? 'Android APK Mode Active' : 'Web & Simulator Mode'}</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            {isNative
              ? 'Penny has native access to incoming bank SMS. Tapping Scan will query your inbox and extract financial transactions using privacy-first rules.'
              : 'In web mode, you can paste bank SMS text directly or test sample bank SMS alerts to verify parsing before compiling to your APK.'}
          </p>
        </div>

        {/* Native Scan Button (If running on APK) */}
        {isNative && (
          <div className="mb-4">
            <button
              onClick={handleScanDeviceSms}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Reading Device SMS...' : 'Scan Android SMS Inbox'}
            </button>
          </div>
        )}

        {/* Result Feedback */}
        {result && (
          <div className="mb-4 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Check className="w-4 h-4" />
              <span>SMS processed successfully!</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scanned: {result.scanned} | Imported: {result.imported} new transactions | Ignored (OTPs / balances): {result.ignored}
            </p>
          </div>
        )}

        {/* Paste or Sample SMS Tester */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Paste SMS Alert</span>
            <button
              type="button"
              onClick={handleLoadSamples}
              disabled={loading}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
            >
              Test with Sample Bank SMS
            </button>
          </div>

          <form onSubmit={handleImportPasted} className="space-y-2">
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Sender (e.g. CHASE, WELLS, HDFC)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <textarea
              rows={3}
              value={pastedSms}
              onChange={(e) => setPastedSms(e.target.value)}
              placeholder="e.g. A/c *1234 debited by USD 45.20 at WALMART on 05-Nov. Avail Bal: USD 2,410.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading || !pastedSms.trim()}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Processing...' : 'Parse & Import SMS'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

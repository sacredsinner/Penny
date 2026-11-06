import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DemoBanner } from './components/DemoBanner';
import { GmailConnectModal } from './components/GmailConnectModal';
import { SmsSyncModal } from './components/SmsSyncModal';
import { TransactionModal } from './components/TransactionModal';
import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReviewPage } from './pages/ReviewPage';
import { ReportsPage } from './pages/ReportsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { Plus, LayoutDashboard, Receipt, AlertCircle, PieChart, Target, Settings } from 'lucide-react';

export function App() {
  const { user, loading: authLoading, activeCurrency } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState(null);
  const [goal, setGoal] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Modals state
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [hideDemoBanner, setHideDemoBanner] = useState(false);

  // Check for OAuth callback code in URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && user) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOAuthCallback(code);
    }
  }, [user]);

  const handleOAuthCallback = async (code) => {
    try {
      await api.gmail.sendCallbackCode(code);
      alert('Google account successfully linked!');
      refreshAllData();
    } catch (err) {
      alert(`OAuth callback failed: ${err.message}`);
    }
  };

  const refreshAllData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [txRes, repRes, goalRes] = await Promise.all([
        api.transactions.list({ currency: 'ALL' }),
        api.reports.get(),
        api.goals.get()
      ]);
      setTransactions(txRes.transactions || []);
      setReports(repRes.reports || null);
      setGoal(goalRes.goal || null);
    } catch (err) {
      console.error('Failed to load user financial data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Loading Penny...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const reviewCount = transactions.filter(t => t.status === 'needs_review').length;
  const hasDemoData = transactions.some(t => t.source === 'demo');

  // Transaction Actions
  const handleSaveTx = async (txData) => {
    if (editingTx) {
      await api.transactions.update(editingTx.id, txData);
    } else {
      await api.transactions.create(txData);
    }
    setEditingTx(null);
    await refreshAllData();
  };

  const handleDeleteTx = async (txId) => {
    await api.transactions.delete(txId);
    await refreshAllData();
  };

  const handleApproveTx = async (txId) => {
    await api.transactions.approve(txId);
    await refreshAllData();
  };

  const handleSaveGoal = async (goalData) => {
    const res = await api.goals.save(goalData);
    setGoal(res.goal);
  };

  const handleClearDemoData = async () => {
    await api.gmail.deleteData('demo');
    await refreshAllData();
  };

  const desktopTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'review', label: 'Review Queue', icon: AlertCircle, badge: reviewCount },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenGmailModal={() => setIsGmailModalOpen(true)}
        onOpenSmsModal={() => setIsSmsModalOpen(true)}
        onOpenDemoSync={() => setIsGmailModalOpen(true)}
        hasDemoData={hasDemoData}
      />

      {/* Demo Mode Notice Banner (Prompt requirement: clearly labeled demo data) */}
      {hasDemoData && !hideDemoBanner && (
        <DemoBanner
          onClearDemo={handleClearDemoData}
          onDismiss={() => setHideDemoBanner(true)}
        />
      )}

      {/* Desktop Secondary Navigation Bar */}
      <nav className="hidden sm:block border-b border-slate-800/60 bg-slate-900/40 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-1 py-1">
          {desktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-16">
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            reports={reports}
            goal={goal}
            onOpenAddModal={() => {
              setEditingTx(null);
              setIsAddTxModalOpen(true);
            }}
            onOpenGmailModal={() => setIsGmailModalOpen(true)}
            onOpenReviewTab={() => setActiveTab('review')}
            onOpenGoalsTab={() => setActiveTab('goals')}
            onEditTx={(tx) => {
              setEditingTx(tx);
              setIsAddTxModalOpen(true);
            }}
            loading={dataLoading}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsPage
            transactions={transactions}
            onOpenAddModal={() => {
              setEditingTx(null);
              setIsAddTxModalOpen(true);
            }}
            onEditTx={(tx) => {
              setEditingTx(tx);
              setIsAddTxModalOpen(true);
            }}
            onDeleteTx={handleDeleteTx}
          />
        )}

        {activeTab === 'review' && (
          <ReviewPage
            transactions={transactions}
            onApproveTx={handleApproveTx}
            onEditTx={(tx) => {
              setEditingTx(tx);
              setIsAddTxModalOpen(true);
            }}
            onDeleteTx={handleDeleteTx}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPage
            reports={reports}
            transactions={transactions}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsPage
            goal={goal}
            onSaveGoal={handleSaveGoal}
            loading={dataLoading}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            onOpenGmailModal={() => setIsGmailModalOpen(true)}
            onResetData={refreshAllData}
            onTriggerDemoSync={() => setIsGmailModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => {
          setEditingTx(null);
          setIsAddTxModalOpen(true);
        }}
        className="fixed right-4 bottom-20 z-40 sm:hidden p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/30 touch-press"
        title="Add transaction"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reviewCount={reviewCount}
      />

      {/* Modals */}
      <GmailConnectModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onSyncComplete={refreshAllData}
      />

      <SmsSyncModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        onSyncComplete={refreshAllData}
      />

      <TransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => {
          setIsAddTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTx}
        editingTx={editingTx}
        defaultCurrency={activeCurrency}
      />
    </div>
  );
}
export default App;

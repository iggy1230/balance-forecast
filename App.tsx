import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, FinancialSummary, BackupData, FirebaseConfig, UserInfo } from './types';
import { BalanceCard } from './components/BalanceCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { AiAdvisor } from './components/AiAdvisor';
import { ChartSection } from './components/ChartSection';
import { DataSyncModal } from './components/DataSyncModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { initFirebase, subscribeToAuth, subscribeToUserData, saveUserData, fetchUserData } from './services/firebase';
import { staticFirebaseConfig } from './firebaseConfig';
import { LayoutDashboard, ArrowRightLeft, Cloud, CheckCircle2, Loader2, AlertTriangle, RefreshCw, AlertCircle, Wallet, TrendingDown, TrendingUp } from 'lucide-react';

const STORAGE_KEY_TRANSACTIONS = 'balance-app-transactions';
const STORAGE_KEY_START_BALANCE = 'balance-app-start-balance';
const STORAGE_KEY_MONTH_OVERRIDES = 'balance-app-month-overrides';
const STORAGE_KEY_FIREBASE_CONFIG = 'balance-app-firebase-config';

const DEFAULT_CANDIDATES = ["給与", "家賃", "食費", "光熱費", "通信費", "日用品", "交通費", "娯楽費", "保険", "賞与"];

const App: React.FC = () => {
  const [baseStartBalance, setBaseStartBalance] = useState<number>(0);
  const [monthOverrides, setMonthOverrides] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'idle'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const isReceivingCloudData = useRef(false);
  const isFirstFetchDone = useRef(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const savedBalance = localStorage.getItem(STORAGE_KEY_START_BALANCE);
    const savedOverrides = localStorage.getItem(STORAGE_KEY_MONTH_OVERRIDES);
    
    let configToUse: FirebaseConfig | null = staticFirebaseConfig;
    if (!configToUse || configToUse.apiKey.includes("ここに")) {
      configToUse = null;
      const savedConfig = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (savedConfig) {
        try { configToUse = JSON.parse(savedConfig); } catch(e) {}
      }
    }

    if (configToUse) {
      setFirebaseConfig(configToUse);
      initFirebase(configToUse);
    }

    if (savedTransactions) {
      try { setTransactions(JSON.parse(savedTransactions)); } catch (e) {}
    }
    if (savedBalance) setBaseStartBalance(parseInt(savedBalance) || 0);
    if (savedOverrides) {
      try { setMonthOverrides(JSON.parse(savedOverrides)); } catch (e) {}
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!firebaseConfig) return;
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
        setSyncStatus('idle');
        isFirstFetchDone.current = false;
      }
    });
    return () => unsubscribe();
  }, [firebaseConfig]);

  useEffect(() => {
    if (!user) return;
    const checkAndInitCloud = async () => {
       try {
         const cloudData = await fetchUserData(user.uid);
         if (!cloudData) {
            setSyncStatus('saving');
            await saveUserData(user.uid, { startBalance: baseStartBalance, transactions, monthOverrides });
            setSyncStatus('synced');
         }
         isFirstFetchDone.current = true;
       } catch (err: any) {
         setSyncStatus('error');
         setLastError('通信エラーが発生しました。');
       }
    };
    checkAndInitCloud();

    const unsubscribe = subscribeToUserData(user.uid, (data) => {
      if (data) {
        isReceivingCloudData.current = true;
        setBaseStartBalance(data.startBalance);
        setTransactions(data.transactions);
        setMonthOverrides(data.monthOverrides || {});
        setSyncStatus('synced');
        setLastError(null);
        isFirstFetchDone.current = true;
        setTimeout(() => { isReceivingCloudData.current = false; }, 300);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEY_START_BALANCE, baseStartBalance.toString());
    localStorage.setItem(STORAGE_KEY_MONTH_OVERRIDES, JSON.stringify(monthOverrides));

    if (user && !isReceivingCloudData.current && isFirstFetchDone.current) {
      setSyncStatus('saving');
      const timer = setTimeout(async () => {
         try {
           await saveUserData(user.uid, { startBalance: baseStartBalance, transactions, monthOverrides });
           setSyncStatus('synced');
         } catch (err: any) {
           setSyncStatus('error');
         }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [transactions, baseStartBalance, monthOverrides, isInitialized, user]);

  const summary: FinancialSummary = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const sortedAll = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const earliestDate = sortedAll.length > 0 ? new Date(sortedAll[0].date) : viewDate;
    let rollingBalance = baseStartBalance;
    let currentProcessDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const targetProcessDate = new Date(year, month, 1);

    if (targetProcessDate < currentProcessDate) {
      const startBalance = monthOverrides[currentMonthKey] ?? baseStartBalance;
      const currentMonthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const income = currentMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { startBalance, totalIncome: income, totalExpense: expense, projectedBalance: startBalance + income - expense, isManualOverride: monthOverrides[currentMonthKey] !== undefined };
    }

    while (currentProcessDate < targetProcessDate) {
      const pYear = currentProcessDate.getFullYear();
      const pMonth = currentProcessDate.getMonth();
      const pKey = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;
      if (monthOverrides[pKey] !== undefined) rollingBalance = monthOverrides[pKey];
      const monthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === pYear && d.getMonth() === pMonth;
      });
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      rollingBalance = rollingBalance + income - expense;
      currentProcessDate.setMonth(currentProcessDate.getMonth() + 1);
    }

    const targetStartBalance = monthOverrides[currentMonthKey] !== undefined ? monthOverrides[currentMonthKey] : rollingBalance;
    const currentMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const income = currentMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      startBalance: targetStartBalance,
      totalIncome: income,
      totalExpense: expense,
      projectedBalance: targetStartBalance + income - expense,
      isCarryOver: monthOverrides[currentMonthKey] === undefined && targetProcessDate > new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1),
      isManualOverride: monthOverrides[currentMonthKey] !== undefined
    };
  }, [baseStartBalance, transactions, viewDate, monthOverrides]);

  const filteredTransactions = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [transactions, viewDate]);

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = { ...newTx, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, transaction]);
  };

  const defaultFormDate = useMemo(() => {
    const today = new Date();
    if (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
      return today.toISOString().split('T')[0];
    }
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
    return d.toISOString().split('T')[0];
  }, [viewDate]);

  // 支出割合の計算
  const spendingRatio = useMemo(() => {
    const totalResource = summary.startBalance + summary.totalIncome;
    if (totalResource <= 0) return summary.totalExpense > 0 ? 100 : 0;
    return Math.min(100, Math.round((summary.totalExpense / totalResource) * 100));
  }, [summary]);

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen pb-20 bg-[#F8FAFC]">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight tracking-tight">残高予測マネージャー</h1>
              <div className="flex items-center gap-1">
                {user ? (
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${syncStatus === 'error' ? 'text-rose-500' : 'text-indigo-500'}`}>
                    {syncStatus === 'saving' ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                    <span>{syncStatus === 'saving' ? '保存中...' : 'クラウド同期済み'}</span>
                  </div>
                ) : (
                   <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Local Mode</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowCloudModal(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Cloud size={20} /></button>
            <button onClick={() => setShowSyncModal(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><ArrowRightLeft size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 月末予想サマリー */}
        <div className="relative overflow-hidden bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-200">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">今月末の予想残高</p>
                <p className="text-4xl font-black">¥{summary.projectedBalance.toLocaleString()}</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border border-white/20 ${summary.projectedBalance >= 0 ? 'bg-white/20' : 'bg-rose-500/40'}`}>
                {summary.projectedBalance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {summary.projectedBalance >= 0 ? '黒字予想' : '赤字注意'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end text-xs font-bold">
                <span className="text-indigo-100">資金消化率</span>
                <span>{spendingRatio}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`progress-bar-fill h-full rounded-full ${spendingRatio > 90 ? 'bg-rose-400' : spendingRatio > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                  style={{ width: `${spendingRatio}%` }}
                />
              </div>
              <p className="text-[10px] text-indigo-100/70 font-medium">※（月初残高＋収入）に対する支出予定の割合</p>
            </div>
          </div>
          
          {/* 装飾用背景 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        </div>

        <BalanceCard 
          summary={summary} 
          onStartBalanceChange={(val) => {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (val === null) {
              const newOverrides = { ...monthOverrides };
              delete newOverrides[key];
              setMonthOverrides(newOverrides);
            } else {
              setMonthOverrides(prev => ({ ...prev, [key]: val }));
            }
          }} 
          currentDate={viewDate}
          onMonthChange={(offset) => {
            const d = new Date(viewDate);
            d.setMonth(d.getMonth() + offset);
            setViewDate(d);
          }}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <TransactionForm 
              onAdd={handleAddTransaction} 
              historyCandidates={Array.from(new Set([...DEFAULT_CANDIDATES, ...transactions.map(t => t.description)]))}
              allTransactions={transactions}
              defaultDate={defaultFormDate}
            />
            <ChartSection transactions={filteredTransactions} />
          </div>
          <div className="space-y-6">
            <TransactionList 
              transactions={filteredTransactions} 
              onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))}
              onUpdate={(updated) => setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t))}
            />
            <AiAdvisor transactions={filteredTransactions} summary={summary} />
          </div>
        </div>
      </main>

      <DataSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} currentData={{ startBalance: baseStartBalance, transactions, monthOverrides }} onImport={(d) => { setBaseStartBalance(d.startBalance); setTransactions(d.transactions); setMonthOverrides(d.monthOverrides || {}); }} />
      <CloudSyncModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} user={user} onConfigSave={(cfg) => { setFirebaseConfig(cfg); localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(cfg)); initFirebase(cfg); }} hasConfig={!!firebaseConfig} onClearConfig={() => { setFirebaseConfig(null); setUser(null); localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG); }} currentConfig={firebaseConfig} isStatic={!!staticFirebaseConfig} />
    </div>
  );
};

export default App;

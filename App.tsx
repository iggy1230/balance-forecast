

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
// Added AlertCircle to imports
import { LayoutDashboard, ArrowRightLeft, Cloud, CheckCircle2, Loader2, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';

const STORAGE_KEY_TRANSACTIONS = 'balance-app-transactions';
const STORAGE_KEY_START_BALANCE = 'balance-app-start-balance';
const STORAGE_KEY_MONTH_OVERRIDES = 'balance-app-month-overrides';
const STORAGE_KEY_FIREBASE_CONFIG = 'balance-app-firebase-config';

const DEFAULT_CANDIDATES = ["食費", "日用品", "交通費", "家賃", "水道光熱費", "通信費", "娯楽費", "外食", "給与", "賞与"];

const App: React.FC = () => {
  // State initialization
  const [baseStartBalance, setBaseStartBalance] = useState<number>(0);
  const [monthOverrides, setMonthOverrides] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // View Month State
  const [viewDate, setViewDate] = useState(new Date());

  // Modals
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  // Firebase State
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  
  // Sync Status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'idle'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const isReceivingCloudData = useRef(false);
  const isFirstFetchDone = useRef(false);

  // 1. Initial Load
  useEffect(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const savedBalance = localStorage.getItem(STORAGE_KEY_START_BALANCE);
    const savedOverrides = localStorage.getItem(STORAGE_KEY_MONTH_OVERRIDES);
    
    let configToUse: FirebaseConfig | null = staticFirebaseConfig;
    if (!configToUse) {
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

  // 2. Firebase Auth Listener
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

  // 3. Firestore Data Listener
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
         console.error("Cloud fetch error:", err);
         setSyncStatus('error');
         setLastError(err.message?.includes('permission-denied') ? 'データベースの保存期限切れ、または権限エラーです。設定を確認してください。' : 'サーバーとの通信に失敗しました。');
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

  // 4. Save to LocalStorage AND Cloud
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
           setLastError(null);
         } catch (err: any) {
           console.error("Save failed:", err);
           setSyncStatus('error');
           if (err.message?.includes('permission-denied')) {
             setLastError('保存権限がありません。Firestoreのルール設定を確認してください。');
           } else {
             setLastError('データの保存中にエラーが発生しました。');
           }
         }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [transactions, baseStartBalance, monthOverrides, isInitialized, user]);

  const handleRetrySync = async () => {
    if (!user) return;
    setSyncStatus('saving');
    setLastError(null);
    try {
      const cloudData = await fetchUserData(user.uid);
      if (cloudData) {
        setBaseStartBalance(cloudData.startBalance);
        setTransactions(cloudData.transactions);
        setMonthOverrides(cloudData.monthOverrides || {});
      } else {
        await saveUserData(user.uid, { startBalance: baseStartBalance, transactions, monthOverrides });
      }
      setSyncStatus('synced');
    } catch (err: any) {
      setSyncStatus('error');
      setLastError('再試行に失敗しました。');
    }
  };

  // Monthly Rolling Logic
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

  const historyCandidates = useMemo(() => {
    const historyDescriptions = transactions.map(t => t.description).filter(d => d.trim() !== '');
    return Array.from(new Set([...DEFAULT_CANDIDATES, ...historyDescriptions]));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [transactions, viewDate]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleStartBalanceUpdate = (newVal: number | null) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const sortedAll = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const earliestMonth = sortedAll.length > 0 ? new Date(sortedAll[0].date) : viewDate;
    const isFirstMonth = year === earliestMonth.getFullYear() && month === earliestMonth.getMonth();
    if (newVal === null) {
      const newOverrides = { ...monthOverrides };
      delete newOverrides[key];
      setMonthOverrides(newOverrides);
    } else {
      if (isFirstMonth) {
          setBaseStartBalance(newVal);
          const newOverrides = { ...monthOverrides };
          delete newOverrides[key];
          setMonthOverrides(newOverrides);
      } else {
          setMonthOverrides(prev => ({ ...prev, [key]: newVal }));
      }
    }
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = { ...newTx, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, transaction]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImportData = (data: BackupData) => {
    if (window.confirm('現在のデータは上書きされます。よろしいですか？')) {
      setBaseStartBalance(data.startBalance);
      setTransactions(data.transactions);
      setMonthOverrides(data.monthOverrides || {});
    }
  };

  const defaultFormDate = useMemo(() => {
    const today = new Date();
    if (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
      return today.toISOString().split('T')[0];
    }
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
    return d.toISOString().split('T')[0];
  }, [viewDate]);

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800 leading-tight">Balance Forecast</h1>
              <div className="flex items-center gap-1">
                {user ? (
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${syncStatus === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                    {syncStatus === 'saving' && <Loader2 size={10} className="animate-spin" />}
                    {syncStatus === 'synced' && <CheckCircle2 size={10} />}
                    {syncStatus === 'error' && <AlertTriangle size={10} />}
                    <span>{syncStatus === 'saving' ? '同期中...' : syncStatus === 'error' ? '同期エラー' : 'クラウド同期済み'}</span>
                    {syncStatus === 'error' && (
                      <button 
                        onClick={handleRetrySync}
                        className="ml-1 bg-red-100 p-0.5 rounded hover:bg-red-200 transition-colors"
                        title="再試行"
                      >
                        <RefreshCw size={8} />
                      </button>
                    )}
                  </div>
                ) : (
                   <span className="text-[10px] text-gray-400 font-bold tracking-tight">ローカル保存モード</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button 
                onClick={() => setShowCloudModal(true)}
                className={`p-2 rounded-xl transition-all flex items-center gap-2 relative ${
                    user 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 shadow-sm border border-blue-100' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100 border border-transparent'
                }`}
                title="クラウド同期設定"
            >
                <Cloud size={20} />
                {user?.photoURL && (
                   <img src={user.photoURL} className="w-5 h-5 rounded-full ring-2 ring-white" alt="Account" />
                )}
            </button>
            <button 
                onClick={() => setShowSyncModal(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent"
                title="データバックアップ"
            >
                <ArrowRightLeft size={20} />
            </button>
          </div>
        </div>
        {lastError && (
          <div className="bg-red-50 text-red-600 text-[10px] py-1 px-4 text-center font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-1">
            <AlertCircle size={10} /> {lastError}
            <button onClick={() => setShowCloudModal(true)} className="underline font-bold">設定を確認</button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <BalanceCard 
          summary={summary} 
          onStartBalanceChange={handleStartBalanceUpdate} 
          currentDate={viewDate}
          onMonthChange={handleMonthChange}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:order-2">
            <TransactionForm 
              onAdd={handleAddTransaction} 
              historyCandidates={historyCandidates}
              allTransactions={transactions}
              defaultDate={defaultFormDate}
            />
            <ChartSection transactions={filteredTransactions} />
          </div>
          <div className="md:order-1">
            <TransactionList 
              transactions={filteredTransactions} 
              onDelete={handleDeleteTransaction}
              onUpdate={handleUpdateTransaction}
            />
          </div>
        </div>

        <AiAdvisor transactions={filteredTransactions} summary={summary} />
      </main>

      <DataSyncModal 
        isOpen={showSyncModal} 
        onClose={() => setShowSyncModal(false)}
        currentData={{ startBalance: baseStartBalance, transactions, monthOverrides }}
        onImport={handleImportData}
      />

      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        user={user}
        onConfigSave={(cfg) => {
          setFirebaseConfig(cfg);
          localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(cfg));
          initFirebase(cfg);
        }}
        hasConfig={!!firebaseConfig}
        onClearConfig={() => {
          setFirebaseConfig(null);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
          setShowCloudModal(false);
        }}
        currentConfig={firebaseConfig}
        isStatic={!!staticFirebaseConfig}
      />
    </div>
  );
};

export default App;
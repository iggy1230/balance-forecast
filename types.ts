
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
}

export interface FinancialSummary {
  startBalance: number;
  totalIncome: number;
  totalExpense: number;
  projectedBalance: number;
  isCarryOver?: boolean;
  isManualOverride?: boolean;
}

export interface AnalysisResult {
  advice: string;
  loading: boolean;
  error: string | null;
}

export interface BackupData {
  startBalance: number;
  monthOverrides?: Record<string, number>;
  transactions: Transaction[];
  version: number;
  exportedAt: string;
  firebaseConfig?: FirebaseConfig;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface UserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

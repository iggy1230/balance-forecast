
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc, Firestore } from 'firebase/firestore';
import { FirebaseConfig, Transaction } from '../types';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Initialize Firebase with dynamic config
export const initFirebase = (config: FirebaseConfig): boolean => {
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0]; // Use existing app if already initialized
    }
    auth = getAuth(app);
    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return false;
  }
};

export const isFirebaseInitialized = () => !!app;

// Auth
export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  return signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

// Firestore Data Sync
export const subscribeToUserData = (
  uid: string, 
  onData: (data: { startBalance: number, transactions: Transaction[], monthOverrides?: Record<string, number> } | null) => void
) => {
  if (!db) return () => {};
  
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      // Ensure data structure matches expected types
      const cleanData = {
        startBalance: typeof data.startBalance === 'number' ? data.startBalance : 0,
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        monthOverrides: data.monthOverrides || {}
      };
      onData(cleanData);
    } else {
      onData(null); // Document doesn't exist yet
    }
  });
};

export const saveUserData = async (
  uid: string, 
  data: { startBalance: number, transactions: Transaction[], monthOverrides?: Record<string, number> }
) => {
  if (!db) return;
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const fetchUserData = async (uid: string) => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as { startBalance: number, transactions: Transaction[], monthOverrides?: Record<string, number> };
  }
  return null;
};

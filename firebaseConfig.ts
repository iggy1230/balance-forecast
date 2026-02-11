
import { FirebaseConfig } from "./types";

/**
 * Firebaseコンソールで取得した設定をここに貼り付けてください。
 * 
 * 設定方法:
 * 1. Firebase Console > プロジェクト設定 > マイアプリ > Webアプリ 
 * 2. firebaseConfig オブジェクトの内容を以下に反映
 */
export const staticFirebaseConfig: FirebaseConfig | null = {
  apiKey: "ここにAPI_KEYを貼り付け",
  authDomain: "プロジェクトID.firebaseapp.com",
  projectId: "プロジェクトID",
  storageBucket: "プロジェクトID.firebasestorage.app",
  messagingSenderId: "数値ID",
  appId: "1:数値ID:web:識別子",
  measurementId: "G-XXXXXXXXXX" // 任意
};

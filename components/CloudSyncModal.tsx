
import React, { useState, useEffect } from 'react';
import { FirebaseConfig, UserInfo } from '../types';
import { loginWithGoogle, logout } from '../services/firebase';
import { Cloud, X, LogIn, LogOut, Check, AlertCircle, Save, Settings, CircleHelp, ChevronDown, ExternalLink, Database, Key, QrCode, Smartphone, Globe, Copy, ListChecks, ShieldAlert } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  onConfigSave: (config: FirebaseConfig) => void;
  hasConfig: boolean;
  onClearConfig: () => void;
  currentConfig: FirebaseConfig | null;
  isStatic: boolean;
}

const getRobustDomain = () => {
  try {
    if (window.location.hostname) return window.location.hostname;
    if (window.location.host) return window.location.host;
    if (window.location.origin && window.location.origin !== 'null') {
       return window.location.origin.replace(/^https?:\/\//, '');
    }
    return '';
  } catch (e) {
    return '';
  }
};

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onConfigSave,
  hasConfig,
  onClearConfig,
  currentConfig,
  isStatic
}) => {
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [mode, setMode] = useState<'status' | 'config'>('status');
  const [showQr, setShowQr] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState(() => getRobustDomain());
  const [showGuide, setShowGuide] = useState(false);
  const [manualDomain, setManualDomain] = useState('');

  useEffect(() => {
    if (!hasConfig && !isStatic) {
      setMode('config');
      setShowGuide(true);
    } else {
      setMode('status');
      setShowGuide(false);
    }
    if (isOpen) {
      const dom = getRobustDomain();
      setDetectedDomain(dom);
      setManualDomain(dom || 'generativelanguage.googleapis.com');
    }
  }, [hasConfig, isStatic, isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    try {
      let input = configInput.trim();
      const firstBrace = input.indexOf('{');
      const lastBrace = input.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        input = input.substring(firstBrace, lastBrace + 1);
      }
      const parseConfig = new Function(`return ${input}`);
      const config = parseConfig();
      if (!config || typeof config !== 'object') throw new Error("解析失敗");
      if (!config.apiKey || !config.projectId) throw new Error("必須項目不足");
      onConfigSave(config as FirebaseConfig);
      setError(null);
      setErrorCode(null);
      setMode('status');
      setShowGuide(false);
    } catch (e) {
      setError("設定の解析に失敗しました。正しいConfigコードを入力してください。");
      setErrorCode("config_error");
    }
  };

  const handleLogin = async () => {
    setError(null);
    setErrorCode(null);
    if (window.location.protocol === 'file:') {
      setError("ローカルファイルからはログインできません。http(s)でアクセスしてください。");
      return;
    }
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error("Login Error:", e);
      let msg = "ログインに失敗しました。";
      let code = e.code || "unknown";
      if (e.code === 'auth/unauthorized-domain') {
        msg = `ドメイン未許可: Firebase Consoleで現在のドメインを許可してください。`;
      } else if (e.code === 'auth/popup-blocked') {
        msg = "ポップアップがブロックされました。";
      }
      setError(msg);
      setErrorCode(code);
      setShowGuide(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  let qrCodeUrl = "";
  if (currentConfig) {
    try {
      const configStr = btoa(JSON.stringify(currentConfig));
      const url = new URL(window.location.href);
      url.searchParams.set('sync_setup', configStr);
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url.toString())}`;
    } catch (e) {}
  }

  const renderGuide = () => (
    <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm mb-4 animate-in slide-in-from-top-2 fade-in">
        <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
             <span className="flex items-center gap-2 text-sm font-bold text-blue-800">
                <ListChecks size={18} /> 同期が動かない時のチェック
            </span>
            <button onClick={() => setShowGuide(false)} className="text-blue-400 hover:text-blue-600">
                <X size={16} />
            </button>
        </div>
        <div className="p-4 text-xs text-gray-600 space-y-6 bg-white max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
                <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">1</span>
                    承認済みドメインの追加
                </h5>
                <div className="pl-6 space-y-2">
                    <p>Firebase Console &gt; Authentication &gt; 設定 &gt; 承認済みドメイン に以下を追加しましたか？</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={manualDomain}
                            className="bg-gray-50 px-2 py-1.5 border border-blue-200 rounded text-blue-600 font-mono text-[10px] w-full"
                        />
                        <button onClick={() => { navigator.clipboard.writeText(manualDomain); alert("コピーしました"); }} className="p-1.5 bg-blue-50 text-blue-600 rounded border border-blue-200">
                            <Copy size={12} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                    <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">2</span>
                    セキュリティルールの確認
                </h5>
                <div className="pl-6 bg-red-50 p-3 rounded border border-red-100 space-y-2">
                    <p className="font-bold text-red-700">これが一番多い原因です！</p>
                    <p>Firestore Database &gt; ルール タブ を開き、読み書きを許可していますか？</p>
                    <pre className="bg-white p-2 text-[9px] rounded border border-red-100 font-mono text-gray-500">
{`allow read, write: if request.auth != null;`}
                    </pre>
                    <p className="text-[10px] text-red-500 font-bold italic">※テストモード（30日間）は期限が切れると動かなくなります。</p>
                </div>
            </div>

            <div className="space-y-2">
                <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="bg-gray-800 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">3</span>
                    Googleログインの有効化
                </h5>
                <p className="pl-6">Authentication &gt; ログイン方法 で「Google」が<strong className="text-blue-600">有効</strong>になっていますか？</p>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Cloud size={22} className="text-blue-500" />
            クラウド同期
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {showGuide && renderGuide()}

          {mode === 'config' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Firebase Config オブジェクト</label>
                <textarea
                  value={configInput}
                  onChange={(e) => setConfigInput(e.target.value)}
                  placeholder={`const firebaseConfig = { ... };`}
                  className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-xs"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</div>}
              <div className="flex gap-2">
                <button onClick={handleSaveConfig} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"><Save size={18} /> 設定を保存</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {user ? (
                <div className="text-center py-4">
                  <img src={user.photoURL || ''} alt="User" className="w-16 h-16 rounded-full mx-auto mb-3 ring-4 ring-green-50" />
                  <h4 className="font-bold text-lg text-gray-800">{user.displayName}</h4>
                  <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                  <div className="inline-flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 py-2 px-4 rounded-full text-sm font-bold">
                    <Check size={16} /> クラウド同期中
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                   <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600"><Cloud size={32} /></div>
                   <h4 className="font-bold text-lg text-gray-800 mb-2">Googleアカウントで同期</h4>
                   {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-2 text-xs mb-4 text-left border border-red-100"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
                   <button onClick={handleLogin} className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                    <LogIn size={18} /> Googleでログイン
                   </button>
                </div>
              )}

              {hasConfig && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <button onClick={() => setShowQr(!showQr)} className="w-full flex items-center justify-between text-gray-700 font-bold text-sm">
                        <span className="flex items-center gap-2"><Smartphone size={18} /> スマホと連携する</span>
                        <ChevronDown size={18} className={showQr ? 'rotate-180' : ''} />
                    </button>
                    {showQr && <div className="mt-4 flex flex-col items-center animate-in fade-in"><img src={qrCodeUrl} className="w-32 h-32 mb-2" alt="QR" /><p className="text-[10px] text-gray-400">スマホで読み取ると設定がコピーされます</p></div>}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <button onClick={() => setShowGuide(true)} className="w-full py-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><CircleHelp size={16} /> 接続トラブル解決ガイド</button>
                {user && <button onClick={handleLogout} className="w-full py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><LogOut size={16} /> ログアウト</button>}
                {!isStatic && <button onClick={() => setMode('config')} className="w-full py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"><Settings size={14} /> 接続設定を変更</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

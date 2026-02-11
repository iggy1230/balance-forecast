
import React, { useState } from 'react';
import { Transaction, BackupData } from '../types';
import { X, Copy, Upload, Check, AlertCircle, Smartphone, Laptop } from 'lucide-react';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: {
    startBalance: number;
    transactions: Transaction[];
    monthOverrides?: Record<string, number>;
  };
  onImport: (data: BackupData) => void;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({ isOpen, onClose, currentData, onImport }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportData: BackupData = {
    ...currentData,
    version: 2,
    exportedAt: new Date().toISOString(),
  };

  const exportString = JSON.stringify(exportData);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      if (!importString.trim()) {
        setError("データが入力されていません。");
        return;
      }

      const parsed: any = JSON.parse(importString);

      // Simple validation
      if (typeof parsed.startBalance !== 'number' || !Array.isArray(parsed.transactions)) {
        throw new Error("データの形式が正しくありません。");
      }

      onImport(parsed as BackupData);
      setImportString('');
      setError(null);
      onClose();
    } catch (e) {
      setError("データの読み込みに失敗しました。コードが正しいか確認してください。");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
              <Laptop size={20} className="inline" />
              <span className="text-gray-400 mx-1">/</span>
              <Smartphone size={20} className="inline" />
            </span>
            データ引き継ぎ
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setActiveTab('export'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            書き出し (保存)
          </button>
          <button
            onClick={() => { setActiveTab('import'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            取り込み (復元)
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                現在のデータを他の端末に移行するためのコードです。<br/>
                下のボタンでコピーし、移行先の端末で「取り込み」を行ってください。
              </p>
              
              <div className="relative">
                <textarea
                  readOnly
                  value={exportString}
                  className="w-full h-32 p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono text-gray-600 focus:outline-none resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} /> コピーしました
                  </>
                ) : (
                  <>
                    <Copy size={18} /> コードをコピー
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <p className="text-sm text-gray-600 leading-relaxed">
                別の端末で書き出したコードをここに貼り付けてください。<br/>
                <span className="text-red-500 font-bold text-xs">※ 現在のデータは上書きされます。</span>
              </p>

              <textarea
                value={importString}
                onChange={(e) => setImportString(e.target.value)}
                placeholder='ここにコードを貼り付け...'
                className="w-full h-32 p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleImport}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Upload size={18} /> データを取り込む
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

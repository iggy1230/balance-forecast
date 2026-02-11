import React, { useState } from 'react';
import { FinancialSummary, Transaction } from '../types';
import { analyzeFinances } from '../services/geminiService';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiAdvisorProps {
  transactions: Transaction[];
  summary: FinancialSummary;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ transactions, summary }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (transactions.length === 0) {
      setError("分析するには少なくとも1つの取引を追加してください。");
      return;
    }
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const result = await analyzeFinances(transactions, summary);
      setAdvice(result);
    } catch (e) {
      setError("AI分析に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={20} />
          AI 家計診断
        </h3>
        {!loading && !advice && (
          <button
            onClick={handleAnalyze}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-full transition-shadow shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Sparkles size={14} />
            診断する
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-6 text-indigo-600 animate-pulse">
          <Loader2 size={32} className="animate-spin mb-2" />
          <p className="text-sm">Geminiが収支を分析中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {advice && (
        <div className="prose prose-indigo prose-sm max-w-none bg-white/60 p-4 rounded-xl shadow-sm">
           <ReactMarkdown>{advice}</ReactMarkdown>
           <button 
             onClick={() => setAdvice(null)} 
             className="mt-4 text-xs text-indigo-400 hover:text-indigo-600 underline"
           >
             閉じる
           </button>
        </div>
      )}
      
      {!loading && !advice && !error && (
        <p className="text-sm text-indigo-700/70">
          ボタンを押すと、現在の収支状況に基づいて、Gemini AIが節約アドバイスや資金繰りのヒントを提供します。
        </p>
      )}
    </div>
  );
};

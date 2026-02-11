
import React from 'react';
import { FinancialSummary } from '../types';
import { ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, RotateCcw, Edit3 } from 'lucide-react';

interface BalanceCardProps {
  summary: FinancialSummary;
  onStartBalanceChange: (val: number | null) => void;
  currentDate: Date;
  onMonthChange: (offset: number) => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  summary, 
  onStartBalanceChange, 
  currentDate, 
  onMonthChange 
}) => {
  const handleStartBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value);
    if (val === null || !isNaN(val)) {
      onStartBalanceChange(val);
    }
  };

  const isPositive = summary.projectedBalance >= 0;
  const monthName = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <button 
          onClick={() => onMonthChange(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          title="前月"
        >
          <ChevronLeft size={24} className="text-gray-400 group-hover:text-blue-600" />
        </button>
        <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">{monthName}</h2>
            <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Monthly Forecast</p>
        </div>
        <button 
          onClick={() => onMonthChange(1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          title="翌月"
        >
          <ChevronRight size={24} className="text-gray-400 group-hover:text-blue-600" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">月初残高</label>
                {summary.isManualOverride ? (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 shadow-sm">
                    <Edit3 size={10} /> 手入力
                  </span>
                ) : summary.isCarryOver ? (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                    前月から繰越
                  </span>
                ) : null}
            </div>
            
            {summary.isManualOverride && (
              <button 
                onClick={() => onStartBalanceChange(null)}
                className="text-[10px] text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded"
                title="自動計算に戻す"
              >
                <RotateCcw size={10} /> 自動計算に戻す
              </button>
            )}
          </div>
          
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">¥</span>
            <input
              type="number"
              value={summary.startBalance === 0 ? '' : summary.startBalance}
              onChange={handleStartBalanceChange}
              placeholder="0"
              className={`w-full pl-10 pr-4 py-4 border-2 rounded-2xl focus:outline-none transition-all text-2xl font-black ${
                summary.isManualOverride 
                ? 'border-amber-200 bg-amber-50/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 text-amber-900' 
                : 'border-gray-100 bg-gray-50/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-gray-800'
              }`}
            />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-end p-5 bg-gray-900 rounded-2xl shadow-inner relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl -mr-10 -mt-10"></div>
          </div>
          
          <p className="text-xs text-gray-400 font-bold mb-1 relative z-10">月末予想残高</p>
          <p className={`text-3xl font-black relative z-10 ${isPositive ? 'text-blue-400' : 'text-red-400'}`}>
            ¥{summary.projectedBalance.toLocaleString()}
          </p>
          <div className={`h-1 w-12 rounded-full mt-2 ${isPositive ? 'bg-blue-500' : 'bg-red-500'}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100 shadow-sm hover:border-green-100 transition-colors">
          <div className="flex items-center gap-2 mb-1 text-green-600">
            <ArrowUpCircle size={18} />
            <span className="text-xs font-bold uppercase">収入合計</span>
          </div>
          <span className="text-xl font-black text-gray-800">
            +¥{summary.totalIncome.toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100 shadow-sm hover:border-red-100 transition-colors">
          <div className="flex items-center gap-2 mb-1 text-red-500">
            <ArrowDownCircle size={18} />
            <span className="text-xs font-bold uppercase">支出予定</span>
          </div>
          <span className="text-xl font-black text-gray-800">
            -¥{summary.totalExpense.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

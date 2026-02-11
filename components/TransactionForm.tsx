
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { PlusCircle, MinusCircle, Calendar, Tag } from 'lucide-react';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  historyCandidates?: string[];
  allTransactions?: Transaction[];
  defaultDate?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAdd, 
  historyCandidates = [], 
  allTransactions = [],
  defaultDate
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);

  // Update date if defaultDate changes (when switching months)
  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  // Amount auto-completion logic
  useEffect(() => {
    if (description) {
      // Find the last transaction with this description to suggest the amount
      const matching = [...allTransactions]
        .reverse()
        .find(t => t.description === description);
      
      if (matching && !amount) {
        setAmount(matching.amount.toString());
        setType(matching.type);
      }
    }
  }, [description]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onAdd({
      description,
      amount: parseInt(amount),
      type,
      date,
    });

    setDescription('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        予定を追加
      </h3>
      
      <div className="flex gap-3 mb-5">
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all ${
            type === 'income' 
              ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' 
              : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
          }`}
        >
          <PlusCircle size={20} /> 収入
        </button>
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all ${
            type === 'expense' 
              ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' 
              : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
          }`}
        >
          <MinusCircle size={20} /> 支出
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">日付</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">項目名</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 家賃、食費"
              list="description-history"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium text-lg"
              required
              autoComplete="off"
            />
            <datalist id="description-history">
              {historyCandidates.map((item, index) => (
                <option key={index} value={item} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
           <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">金額</label>
           <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-bold">¥</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-10 pr-4 py-4 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-gray-900 font-bold text-2xl"
              required
              min="0"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition-all shadow-md active:scale-[0.98]"
        >
          追加
        </button>
      </div>
    </form>
  );
};

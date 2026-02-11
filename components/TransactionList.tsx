import React, { useState } from 'react';
import { Transaction } from '../types';
import { Trash2, Pencil, Check, X, Calendar, Tag, JapaneseYen } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    description: string;
    amount: string;
    date: string;
  }>({ description: '', amount: '', date: '' });

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 bg-white rounded-2xl shadow-sm border border-gray-100">
        <p>取引履歴がありません</p>
      </div>
    );
  }

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditForm({
      description: t.description,
      amount: t.amount.toString(),
      date: t.date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ description: '', amount: '', date: '' });
  };

  const saveEdit = (original: Transaction) => {
    if (!editForm.description || !editForm.amount || !editForm.date) return;

    onUpdate({
      ...original,
      description: editForm.description,
      amount: parseInt(editForm.amount),
      date: editForm.date,
    });
    setEditingId(null);
  };

  // Sort by date (descending)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-700 text-sm">今月の明細一覧</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedTransactions.map((t) => {
          const isEditing = editingId === t.id;

          if (isEditing) {
            return (
              <div key={t.id} className="p-4 bg-blue-50/50 block">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="col-span-1">
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">日付</label>
                        <div className="relative">
                           <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full pl-2 pr-2 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                          />
                        </div>
                     </div>
                     <div className="col-span-1">
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">金額</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="w-full pl-2 pr-2 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                          />
                        </div>
                     </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">項目名</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium"
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                      <X size={16} /> キャンセル
                    </button>
                    <button
                      onClick={() => saveEdit(t)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm"
                    >
                      <Check size={16} /> 保存
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={t.id} className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex flex-col gap-1.5 flex-grow min-w-0 pr-3">
                <span className="text-gray-900 font-bold text-base leading-snug break-words whitespace-normal">
                  {t.description || "(名称なし)"}
                </span>
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                   <Calendar size={12} className="text-gray-400" /> {t.date}
                </span>
              </div>
              
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`font-bold whitespace-nowrap text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                </span>
                <div className="flex items-center gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                   <button
                    onClick={() => startEdit(t)}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                    aria-label="編集"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
                    aria-label="削除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
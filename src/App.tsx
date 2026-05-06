/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ICONS
} from './icons';
import { Transaction, TransactionType, DEFAULT_CATEGORIES } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

// Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const IconButton = ({ 
  icon: Icon, 
  onClick, 
  active = false, 
  label 
}: { 
  icon: any; 
  onClick: () => void; 
  active?: boolean;
  label: string;
}) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 transition-all ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);

const CategoryIcon = ({ id, className = "w-10 h-10" }: { id: string, className?: string }) => {
  const category = DEFAULT_CATEGORIES.find(c => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
  const Icon = (ICONS as any)[category.icon];
  
  return (
    <div className={`${category.color} ${className} rounded-xl flex items-center justify-center text-white`}>
      <Icon className="w-1/2 h-1/2" />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // State for Add Form
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      // Clientside sort by date as we might not have a composite index yet
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user]);

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  const balance = totals.income - totals.expense;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || isNaN(Number(amount))) return;

    try {
      const newTransaction = {
        amount: Math.abs(Number(amount)),
        type,
        categoryId: category,
        description,
        date,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'transactions'), newTransaction);
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory(DEFAULT_CATEGORIES[0].id);
    setType('expense');
  };

  const deleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const getCategory = (id: string) => DEFAULT_CATEGORIES.find(c => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl shadow-indigo-100 border border-slate-100 text-center"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-6">F</div>
          <h1 className="text-3xl font-black tracking-tight mb-2">FinTrack</h1>
          <p className="text-slate-500 mb-8">Sign in to manage your finances securely with Firebase sync.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
            <span className="text-xl font-bold tracking-tight">FinTrack</span>
          </div>
          <nav className="space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full sidebar-nav-item ${view === 'dashboard' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}`}
            >
              <ICONS.LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={() => setView('history')}
              className={`w-full sidebar-nav-item ${view === 'history' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}`}
            >
              <ICONS.History className="w-4 h-4" />
              Transactions
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`w-full sidebar-nav-item ${view === 'settings' ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}`}
            >
              <ICONS.Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
               {user.photoURL ? (
                 <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-sm font-bold text-slate-500">{(user.displayName || 'U')[0]}</span>
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName || 'User Account'}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">{view.charAt(0).toUpperCase() + view.slice(1)} Summary</h2>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Firebase Realtime
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setType('income'); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
            >
              + ADD INCOME
            </button>
            <button 
              onClick={() => { setType('expense'); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
            >
              - ADD EXPENSE
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Metric Row */}
                <div class="grid grid-cols-3 gap-8">
                  <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Balance</p>
                    <p class="text-3xl font-black text-slate-900 font-mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <div class="mt-3 flex items-center text-xs font-semibold text-emerald-600">
                      <ICONS.ArrowUpRight class="w-3 h-3 mr-1" />
                      Updated just now
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Income</p>
                    <p class="text-3xl font-black text-emerald-600 font-mono">${totals.income.toLocaleString()}</p>
                    <div class="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div class="bg-emerald-500 h-full" style={{ width: `${Math.min((totals.income / (balance || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Expenses</p>
                    <p class="text-3xl font-black text-rose-600 font-mono">${totals.expense.toLocaleString()}</p>
                    <div class="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div class="bg-rose-500 h-full" style={{ width: `${Math.min((totals.expense / (totals.income || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Main Grid */}
                <div class="grid grid-cols-12 gap-8">
                  {/* Recent Transactions */}
                  <div class="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 class="font-bold">Recent Activity</h3>
                      <button onClick={() => setView('history')} class="text-xs text-indigo-600 font-bold hover:underline">View All</button>
                    </div>
                    <div class="overflow-hidden flex-1 min-h-[300px]">
                      <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                          <tr>
                            <th class="px-6 py-4">Merchant/Desc</th>
                            <th class="px-6 py-4">Category</th>
                            <th class="px-6 py-4">Date</th>
                            <th class="px-6 py-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-slate-50">
                          {transactions.slice(0, 6).map((t) => (
                            <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td class="px-6 py-4 font-semibold text-slate-900">{t.description || getCategory(t.categoryId).name}</td>
                              <td class="px-6 py-4">
                                <span class={`px-2 py-1 rounded text-[10px] font-bold ${getCategory(t.categoryId).color} text-white`}>
                                  {getCategory(t.categoryId).name.toUpperCase()}
                                </span>
                              </td>
                              <td class="px-6 py-4 text-slate-500 font-mono text-xs">{t.date}</td>
                              <td class={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {transactions.length === 0 && (
                             <tr>
                               <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No transactions recorded yet.</td>
                             </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sidebar Components */}
                  <div class="col-span-4 space-y-8">
                    {/* Category Breakdown */}
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 class="font-bold mb-6">Spending Breakdown</h3>
                      <div class="space-y-4">
                        {DEFAULT_CATEGORIES.slice(0, 5).map(cat => {
                          const catTotal = transactions
                            .filter(t => t.categoryId === cat.id && t.type === 'expense')
                            .reduce((sum, t) => sum + t.amount, 0);
                          const percentage = totals.expense > 0 ? (catTotal / totals.expense) * 100 : 0;
                          
                          return (
                            <div key={cat.id} className="space-y-1">
                              <div class="flex items-center justify-between text-xs">
                                <span class="flex items-center gap-2"><div class={`w-2 h-2 rounded-full ${cat.color}`}></div> {cat.name}</span>
                                <span class="font-bold text-slate-500">${catTotal.toLocaleString()}</span>
                              </div>
                              <div class="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                <div class={`h-full ${cat.color}`} style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Info Box */}
                    <div class="bg-slate-900 p-6 rounded-xl shadow-lg text-white">
                      <h3 class="font-bold text-sm mb-4">Financial Health</h3>
                      <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Your savings rate is <span className="text-emerald-400 font-bold">{(balance > 0 ? (balance / (totals.income || 1)) * 100 : 0).toFixed(1)}%</span>. 
                          Keep tracking to see long-term trends and optimize your wealth growth.
                        </p>
                        <button 
                          onClick={() => setView('history')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/20"
                        >
                          View Full Reports
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm"
              >
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                   <div className="relative flex-1">
                     <ICONS.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Filter by description..." 
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                     />
                   </div>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {transactions.map((t) => (
                        <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{t.date}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{t.description || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${getCategory(t.categoryId).color} text-white`}>
                              {getCategory(t.categoryId).name.toUpperCase()}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button 
                               onClick={() => deleteTransaction(t.id)}
                               className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                             >
                               <ICONS.Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactions.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                      <p>No transaction history found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-8"
              >
                <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h3 class="font-bold text-lg mb-6">Preferences</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currency</label>
                      <div class="flex gap-2 p-1 bg-slate-100 rounded-lg">
                        <button class="flex-1 bg-white text-indigo-600 shadow-sm border border-slate-200 rounded-md py-2 font-bold text-sm">USD ($)</button>
                        <button class="flex-1 text-slate-500 hover:bg-slate-200 rounded-md py-2 font-bold text-sm transition-colors">EUR (€)</button>
                        <button class="flex-1 text-slate-500 hover:bg-slate-200 rounded-md py-2 font-bold text-sm transition-colors">GBP (£)</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h3 class="font-bold text-lg mb-6">Account</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">You are signed in as <span className="font-bold text-slate-900">{user.email}</span>.</p>
                    <button 
                      onClick={() => signOut(auth)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      Sign Out
                    </button>
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Database Provider</p>
                      <p className="text-sm font-medium text-emerald-600">Enterprise Firestore (europe-west2)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 pointer-events-auto"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl p-8 z-[60] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold tracking-tight">Add New Transaction</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="hover:bg-slate-100 p-2 rounded-full text-slate-400 transition-colors">
                  <ICONS.X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div class="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type</label>
                      <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => setType('expense')}
                          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          Expense
                        </button>
                        <button 
                          type="button"
                          onClick={() => setType('income')}
                          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          Income
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          autoFocus
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-6 text-2xl font-black font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        {DEFAULT_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-bold font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Monthly Rent, Coffee, Stocks..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Confirm Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

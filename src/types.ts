/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Salary', icon: 'Briefcase', color: 'bg-emerald-500' },
  { id: '2', name: 'Groceries', icon: 'ShoppingCart', color: 'bg-amber-500' },
  { id: '3', name: 'Rent', icon: 'Home', color: 'bg-blue-500' },
  { id: '4', name: 'Entertainment', icon: 'Play', color: 'bg-purple-500' },
  { id: '5', name: 'Dining', icon: 'Utensils', color: 'bg-rose-500' },
  { id: '6', name: 'Transport', icon: 'Car', color: 'bg-indigo-500' },
  { id: '7', name: 'Utilities', icon: 'Zap', color: 'bg-yellow-500' },
  { id: '8', name: 'Other', icon: 'Tag', color: 'bg-zinc-500' },
];

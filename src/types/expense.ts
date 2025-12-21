import { accounts, expenses, categories } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Account = InferSelectModel<typeof accounts>;
export type Expense = InferSelectModel<typeof expenses>;
export type Category = InferSelectModel<typeof categories>;

export interface CreateAccountData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateAccountData extends Partial<CreateAccountData> {
  id: number;
}

export interface CreateExpenseData {
  accountId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: number;
}
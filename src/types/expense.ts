import { accounts, expenses, categories, users } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Account = InferSelectModel<typeof accounts>;
export type Expense = InferSelectModel<typeof expenses>;
export type Category = InferSelectModel<typeof categories>;
export type User = InferSelectModel<typeof users>;

export interface CreateAccountData {
  userId: number;
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateAccountData extends Partial<Omit<CreateAccountData, 'userId'>> {
  id: number;
}

export interface CreateExpenseData {
  userId: number;
  accountId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateExpenseData extends Partial<Omit<CreateExpenseData, 'userId'>> {
  id: number;
}

export interface CreateCategoryData {
  userId: number;
  name: string;
  color?: string;
}

export interface UpdateCategoryData extends Partial<Omit<CreateCategoryData, 'userId'>> {
  id: number;
}
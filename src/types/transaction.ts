import { accounts, transactions, categories, users } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

// Base types inferred from schema
export type Account = InferSelectModel<typeof accounts>;
export type Transaction = InferSelectModel<typeof transactions>;
export type Category = InferSelectModel<typeof categories>;
export type User = InferSelectModel<typeof users>;

// Transaction type enum
export type TransactionType = 'Debit' | 'Credit' | 'Transfer';

// Enhanced transaction type with account information for display
export type TransactionWithAccounts = Transaction & {
  sourceAccount?: {
    id: number;
    name: string;
    color: string | null;
  };
  targetAccount?: {
    id: number;
    name: string;
    color: string | null;
  };
};

// Discriminated unions for create operations with type-safe validation
export type CreateDebitData = {
  userId: number;
  transactionType: 'Debit';
  sourceAccountId: number;
  targetAccountId?: number | null;
  description: string;
  amount: number;
  category: string;
  date: string;
};

export type CreateCreditData = {
  userId: number;
  transactionType: 'Credit';
  sourceAccountId?: number | null;
  targetAccountId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
};

export type CreateTransferData = {
  userId: number;
  transactionType: 'Transfer';
  sourceAccountId: number;
  targetAccountId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
};

// Union type for creating any transaction
export type CreateTransactionData = CreateDebitData | CreateCreditData | CreateTransferData;

// Update transaction data (partial updates allowed)
export type UpdateTransactionData = Partial<{
  transactionType: TransactionType;
  sourceAccountId: number | null;
  targetAccountId: number | null;
  description: string;
  amount: number;
  category: string;
  date: string;
}> & {
  id: number;
};

// Account DTOs
export interface CreateAccountData {
  userId: number;
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateAccountData extends Partial<Omit<CreateAccountData, 'userId'>> {
  id: number;
}

// Category DTOs
export interface CreateCategoryData {
  userId: number;
  name: string;
  color?: string;
  defaultTransactionType?: TransactionType;
}

export interface UpdateCategoryData extends Partial<Omit<CreateCategoryData, 'userId'>> {
  id: number;
}

import { accounts, transactions, categories, users, importSources, imports } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

// Base types inferred from schema
export type Account = InferSelectModel<typeof accounts>;
export type Transaction = InferSelectModel<typeof transactions>;
export type Category = InferSelectModel<typeof categories>;
export type User = InferSelectModel<typeof users>;
export type ImportSource = InferSelectModel<typeof importSources>;
export type Import = InferSelectModel<typeof imports>;

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

// Import Source types
export type ImportStatus = 'draft' | 'completed' | 'failed';

export interface ImportSourceConfig {
  startingLine: number;
  fieldMappings: {
    dateColumn: string;
    dateFormat: string;
    descriptionColumn: string;
    debitColumn: string | null;
    creditColumn: string | null;
    referenceColumn?: string;
  };
}

export interface CreateImportSourceData {
  userId: number;
  name: string;
  description?: string;
  config: ImportSourceConfig;
}

export interface UpdateImportSourceData extends Partial<Omit<CreateImportSourceData, 'userId'>> {
  id: number;
}

// Preview transaction type (before import)
export interface PreviewTransaction {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  transactionType: TransactionType;
  sourceAccountId: number | null;
  targetAccountId: number | null;
  rawCsvRow?: Record<string, string>; // Original CSV row data
}

// Preview data stored in imports table
export interface ImportPreviewData {
  transactions: PreviewTransaction[];
  categoryMappings: Record<string, number>; // tempId -> categoryId
}

// Import DTOs
export interface CreateImportData {
  userId: number;
  importSourceId: number | null;
  filename: string;
  defaultAccountId: number | null;
  status: ImportStatus;
  previewData?: ImportPreviewData;
  totalRows: number;
  importedRows: number;
}

export interface UpdateImportData {
  id: number;
  status?: ImportStatus;
  previewData?: ImportPreviewData;
  importedRows?: number;
  completedAt?: Date;
}

// CSV parsing types
export interface ParsedCSVRow {
  date: string;
  description: string;
  debitAmount: number | null;
  creditAmount: number | null;
  rawRow: Record<string, string>;
}

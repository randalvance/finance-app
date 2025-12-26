import { accounts, transactions, categories, users, importSources, imports, importSourceAccounts, transactionLinks, exchangeRates, accountBalances, transactionTypeEnum, type Currency } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

// Base types inferred from schema
export type Account = InferSelectModel<typeof accounts>;
export type Transaction = InferSelectModel<typeof transactions>;
export type Category = InferSelectModel<typeof categories>;
export type User = InferSelectModel<typeof users>;
export type ImportSource = InferSelectModel<typeof importSources>;
export type Import = InferSelectModel<typeof imports>;
export type ImportSourceAccount = InferSelectModel<typeof importSourceAccounts>;
export type TransactionLink = InferSelectModel<typeof transactionLinks>;
export type ExchangeRate = InferSelectModel<typeof exchangeRates>;
export type AccountBalance = InferSelectModel<typeof accountBalances>;

// Transaction type enum - imported from schema as source of truth
export type TransactionType = typeof transactionTypeEnum[number];

// Re-export schema constant for convenience
export const TRANSACTION_TYPES = transactionTypeEnum;

// Display names for transaction types
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  Debit: "Debit",
  TransferOut: "Transfer Out",
  Credit: "Credit",
  TransferIn: "Transfer In",
} as const;

// Enhanced transaction type with account information for display
export type TransactionWithAccounts = Transaction & {
  sourceAccount?: {
    id: number;
    name: string;
    color: string | null;
    currency?: Currency;
  };
  targetAccount?: {
    id: number;
    name: string;
    color: string | null;
    currency?: Currency;
  };
  category?: {
    id: number;
    name: string;
    color: string | null;
  };
};

// Transaction with link information
export type LinkedTransaction = {
  id: number;
  description: string;
  amount: number;
  date: string;
  transactionType: TransactionType;
};

export type TransactionWithLink = TransactionWithAccounts & {
  link?: {
    id: number;
    linkedTransactionId: number;
    linkedTransaction?: LinkedTransaction;
  };
};

// Discriminated unions for create operations with type-safe validation
// Amount sign convention: Debit/TransferOut = negative, Credit/TransferIn = positive
export type CreateDebitData = {
  userId: number;
  transactionType: "Debit";
  sourceAccountId: number;
  targetAccountId?: number | null;
  description: string;
  amount: number; // Should be negative (will be auto-converted)
  categoryId: number;
  date: string;
};

export type CreateTransferOutData = {
  userId: number;
  transactionType: "TransferOut";
  sourceAccountId: number;
  targetAccountId: number;
  description: string;
  amount: number; // Should be negative (will be auto-converted)
  categoryId: number;
  date: string;
};

export type CreateCreditData = {
  userId: number;
  transactionType: "Credit";
  sourceAccountId?: number | null;
  targetAccountId: number;
  description: string;
  amount: number; // Should be positive (will be auto-converted)
  categoryId: number;
  date: string;
};

export type CreateTransferInData = {
  userId: number;
  transactionType: "TransferIn";
  sourceAccountId: number;
  targetAccountId: number;
  description: string;
  amount: number; // Should be positive (will be auto-converted)
  categoryId: number;
  date: string;
};

// Union type for creating any transaction
export type CreateTransactionData = CreateDebitData | CreateTransferOutData | CreateCreditData | CreateTransferInData;

// Update transaction data (partial updates allowed)
export type UpdateTransactionData = Partial<{
  transactionType: TransactionType;
  sourceAccountId: number | null;
  targetAccountId: number | null;
  description: string;
  amount: number;
  categoryId: number;
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
  currency?: Currency;
  isInvestmentAccount?: boolean;
}

export interface UpdateAccountData extends Partial<Omit<CreateAccountData, "userId">> {
  id: number;
}

// Account Balance DTOs
export interface CreateAccountBalanceData {
  userId: number;
  accountId: number;
  date: string;
  currency: Currency;
  amount: number;
}

export interface UpdateAccountBalanceData extends Partial<Omit<CreateAccountBalanceData, "userId" | "accountId">> {
  id: number;
}

// Category DTOs
export interface CreateCategoryData {
  userId: number;
  name: string;
  color?: string;
  defaultTransactionType?: TransactionType;
}

export interface UpdateCategoryData extends Partial<Omit<CreateCategoryData, "userId">> {
  id: number;
}

// Import Source types
export type ImportStatus = "draft" | "completed" | "failed";

// Field mapping types for CSV import
export type TransactionFieldType =
  | "date"
  | "debit"
  | "credit"
  | "description"
  | "reference";

export type FieldDataType = "string" | "date" | "number";

export interface FieldMapping {
  sourceColumn: string;           // CSV header name
  transactionField: TransactionFieldType;  // Which transaction field it maps to
  dataType: FieldDataType;        // Type of data
  required: boolean;              // Whether this mapping is required
  format?: string;                // Optional format (e.g., date format "dd MMM yyyy")
}

export interface ImportSourceConfig {
  startingLine: number;
  fieldMappings: FieldMapping[];  // Array of field mappings
}

// Enhanced import source with account associations
export type ImportSourceWithAccounts = ImportSource & {
  associatedAccounts: Account[];
};

export interface CreateImportSourceData {
  userId: number;
  name: string;
  description?: string;
  config: ImportSourceConfig;
  accountIds?: number[];  // Account IDs to associate with this import source
}

export interface UpdateImportSourceData extends Partial<Omit<CreateImportSourceData, "userId">> {
  id: number;
  accountIds?: number[];  // Account IDs to associate with this import source
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
  categoryId?: number | null; // Category ID selected during preview
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

// Transaction Link DTOs
export interface CreateTransactionLinkData {
  userId: number;
  transaction1Id: number;
  transaction2Id: number;
}

export interface TransactionLinkInfo {
  id: number;
  transaction1Id: number;
  transaction2Id: number;
  createdAt: Date | null;
}
// Exchange Rate DTOs
export interface CreateExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source?: string;
}

export interface ExchangeRateApiResponse {
  result: string;
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

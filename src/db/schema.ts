import { pgTable, serial, varchar, text, date, timestamp, integer, customType, unique, check, index, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom decimal type that returns numbers instead of strings
const numericDecimal = customType<{ data: number; driverData: string }>({
  dataType () {
    return "numeric(10, 2)";
  },
  fromDriver (value: string): number {
    return parseFloat(value);
  },
});

// Users table for Clerk authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueUserAccount: unique().on(table.userId, table.name),
  // Currency check constraint - escape single quotes in currency codes to prevent SQL syntax errors
  // Using .replace(/'/g, "''") follows SQL standard for escaping quotes (defensive coding)
  currencyCheck: check(
    "currency_check",
    sql`${table.currency} IN (${sql.raw(currencyEnum.map(c => `'${c.replace(/'/g, "''")}'`).join(", "))})`
  )
}));

// Transaction types
export const transactionTypeEnum = ["Debit", "TransferOut", "Credit", "TransferIn"] as const;
export type TransactionType = typeof transactionTypeEnum[number];

// Supported currencies
export const currencyEnum = ["USD", "SGD", "EUR", "JPY", "PHP"] as const;
export type Currency = typeof currencyEnum[number];

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceAccountId: integer("source_account_id").references(() => accounts.id, { onDelete: "restrict" }),
  targetAccountId: integer("target_account_id").references(() => accounts.id, { onDelete: "restrict" }),
  transactionType: varchar("transaction_type", { length: 15 }).notNull().default("Debit"),
  description: text("description").notNull(),
  amount: numericDecimal("amount").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "restrict" }),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  importId: integer("import_id").references(() => imports.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Check constraint for valid transaction types
  transactionTypeCheck: check(
    "transaction_type_check",
    sql`${table.transactionType} IN ('Debit', 'TransferOut', 'Credit', 'TransferIn')`
  ),
  // Validation: ensure required accounts based on type
  accountValidation: check(
    "transaction_account_validation",
    sql`
      (${table.transactionType} = 'Debit' AND ${table.sourceAccountId} IS NOT NULL) OR
      (${table.transactionType} = 'TransferOut' AND ${table.sourceAccountId} IS NOT NULL AND ${table.targetAccountId} IS NOT NULL) OR
      (${table.transactionType} = 'Credit' AND ${table.targetAccountId} IS NOT NULL) OR
      (${table.transactionType} = 'TransferIn' AND ${table.sourceAccountId} IS NOT NULL AND ${table.targetAccountId} IS NOT NULL AND ${table.sourceAccountId} != ${table.targetAccountId})
    `
  ),
  // Indexes for performance
  sourceAccountIdx: index("idx_transactions_source_account").on(table.sourceAccountId),
  targetAccountIdx: index("idx_transactions_target_account").on(table.targetAccountId),
  categoryIdx: index("idx_transactions_category_id").on(table.categoryId),
  typeIdx: index("idx_transactions_type").on(table.transactionType),
  userTypeIdx: index("idx_transactions_user_type").on(table.userId, table.transactionType),
  importIdIdx: index("idx_transactions_import_id").on(table.importId)
}));

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  defaultTransactionType: varchar("default_transaction_type", { length: 15 }).default("Debit"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueUserCategory: unique().on(table.userId, table.name),
  // Check constraint for valid default transaction types
  transactionTypeCheck: check(
    "categories_transaction_type_check",
    sql`${table.defaultTransactionType} IN ('Debit', 'TransferOut', 'Credit', 'TransferIn')`
  )
}));

// Import sources for CSV configurations
export const importSources = pgTable("import_sources", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueUserSource: unique().on(table.userId, table.name)
}));

// Junction table for import source to account associations (many-to-many)
export const importSourceAccounts = pgTable("import_source_accounts", {
  importSourceId: integer("import_source_id")
    .notNull()
    .references(() => importSources.id, { onDelete: "cascade" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.importSourceId, table.accountId] }),
  importSourceIdx: index("idx_import_source_accounts_source").on(table.importSourceId),
  accountIdx: index("idx_import_source_accounts_account").on(table.accountId)
}));

// Imports for tracking CSV import batches
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  importSourceId: integer("import_source_id").references(() => importSources.id, { onDelete: "set null" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  defaultAccountId: integer("default_account_id").references(() => accounts.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  previewData: jsonb("preview_data"),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
}, (table) => ({
  userIdIdx: index("idx_imports_user_id").on(table.userId),
  sourceIdIdx: index("idx_imports_source_id").on(table.importSourceId),
  statusIdx: index("idx_imports_status").on(table.status),
  createdAtIdx: index("idx_imports_created_at").on(table.createdAt)
}));

// Transaction links table for bidirectional transaction relationships
export const transactionLinks = pgTable("transaction_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transaction1Id: integer("transaction_1_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  transaction2Id: integer("transaction_2_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Check constraint: prevent self-links
  noSelfLink: check(
    "no_self_link",
    sql`${table.transaction1Id} != ${table.transaction2Id}`
  ),
  // Check constraint: ensure transaction1Id < transaction2Id (canonical ordering)
  // This prevents duplicate links in reverse order
  canonicalOrdering: check(
    "canonical_ordering",
    sql`${table.transaction1Id} < ${table.transaction2Id}`
  ),
  // Indexes for performance
  transaction1Idx: index("idx_transaction_links_t1").on(table.transaction1Id),
  transaction2Idx: index("idx_transaction_links_t2").on(table.transaction2Id),
  userIdIdx: index("idx_transaction_links_user").on(table.userId),
  // Unique constraint: prevent duplicate links
  uniqueLink: unique().on(table.transaction1Id, table.transaction2Id)
}));

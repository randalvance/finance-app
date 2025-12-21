import { pgTable, serial, varchar, text, date, timestamp, integer, customType, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom decimal type that returns numbers instead of strings
const numericDecimal = customType<{ data: number; driverData: string }>({
  dataType() {
    return 'numeric(10, 2)';
  },
  fromDriver(value: string): number {
    return parseFloat(value);
  },
});

// Users table for Clerk authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  uniqueUserAccount: unique().on(table.userId, table.name)
}));

// Transaction types
export const transactionTypeEnum = ['Debit', 'Credit', 'Transfer'] as const;
export type TransactionType = typeof transactionTypeEnum[number];

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceAccountId: integer('source_account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  targetAccountId: integer('target_account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  transactionType: varchar('transaction_type', { length: 10 }).notNull().default('Debit'),
  description: text('description').notNull(),
  amount: numericDecimal('amount').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  date: date('date').notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Check constraint for valid transaction types
  transactionTypeCheck: check(
    'transaction_type_check',
    sql`${table.transactionType} IN ('Debit', 'Credit', 'Transfer')`
  ),
  // Validation: ensure required accounts based on type
  accountValidation: check(
    'transaction_account_validation',
    sql`
      (${table.transactionType} = 'Debit' AND ${table.sourceAccountId} IS NOT NULL) OR
      (${table.transactionType} = 'Credit' AND ${table.targetAccountId} IS NOT NULL) OR
      (${table.transactionType} = 'Transfer' AND ${table.sourceAccountId} IS NOT NULL AND ${table.targetAccountId} IS NOT NULL AND ${table.sourceAccountId} != ${table.targetAccountId})
    `
  )
}));

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  defaultTransactionType: varchar('default_transaction_type', { length: 10 }).default('Debit'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniqueUserCategory: unique().on(table.userId, table.name),
  // Check constraint for valid default transaction types
  transactionTypeCheck: check(
    'categories_transaction_type_check',
    sql`${table.defaultTransactionType} IN ('Debit', 'Credit', 'Transfer')`
  )
}));

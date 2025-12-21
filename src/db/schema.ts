import { pgTable, serial, varchar, text, date, timestamp, integer, customType } from 'drizzle-orm/pg-core';
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

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  description: text('description').notNull(),
  amount: numericDecimal('amount').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  date: date('date').notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow()
});

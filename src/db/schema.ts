import { pgTable, serial, varchar, text, date, timestamp, integer, customType, unique } from 'drizzle-orm/pg-core';
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

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniqueUserCategory: unique().on(table.userId, table.name)
}));

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const connectionString = process.env.DATABASE_URL;

// Create postgres connection
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export default db;
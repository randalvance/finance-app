import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

let databaseUrl = process.env.DATABASE_URL;

// Strip client_min_messages for Neon pooled connections (not supported)
if (databaseUrl.includes('neon.tech') && databaseUrl.includes('pooler')) {
  databaseUrl = databaseUrl.replace(/[?&]options=-c%20client_min_messages%3D\w+/g, '');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: false,
  strict: true,
});

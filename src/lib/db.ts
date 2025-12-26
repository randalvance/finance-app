import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

let connectionString = process.env.DATABASE_URL;

// Strip client_min_messages for Neon pooled connections (not supported)
if (connectionString.includes("neon.tech") && connectionString.includes("pooler")) {
  connectionString = connectionString.replace(/[?&]options=-c%20client_min_messages%3D\w+/g, "");
}

// Determine if SSL is required (for Neon or other cloud databases)
const requiresSSL = connectionString.includes("sslmode=require") ||
                    connectionString.includes("neon.tech") ||
                    connectionString.includes("supabase.co") ||
                    process.env.NODE_ENV === "production";

// Create postgres connection
const client = postgres(connectionString, {
  ssl: requiresSSL ? "require" : undefined,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export default db;

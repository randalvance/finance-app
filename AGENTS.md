# Repository Guidelines

## Project Overview

Expense Tracker is a Next.js 15 application for tracking expenses across multiple accounts with categorization and analytics. Built with TypeScript, PostgreSQL, React, and Tailwind CSS.

## Project Structure & Module Organization
- `src/app/` hosts the Next.js 15 App Router pages and route handlers; API routes live under `src/app/api/`.
- `src/db/schema.ts` defines the database schema using Drizzle ORM (accounts, expenses, categories).
- `src/services/` contains database-facing service classes (ExpenseService, AccountService, CategoryService, UserService).
- `src/lib/db.ts` holds the Drizzle database instance using postgres-js driver.
- `src/types/expense.ts` defines TypeScript models and DTOs for expenses, accounts, and categories (inferred from Drizzle schema).
- `drizzle/` contains database migrations managed by Drizzle Kit.
- `database/schema.sql` is the legacy schema file (migrations now managed via Drizzle).
- `public/` stores static assets; `docker-compose.yml` provisions local PostgreSQL.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `docker-compose up -d` starts PostgreSQL (database auto-initializes with schema from database/schema.sql).
- `npm run dev` runs the app with Turbopack at `http://localhost:3000`.
- `npm run build` creates a production build; `npm start` serves it.
- `npm run lint` runs ESLint (Next.js + TypeScript rules).
- `npm run db:generate` generates migrations from schema changes.
- `npm run db:push` pushes schema changes to database (for development).
- `npm run db:migrate` runs migrations (for production).
- `npm run db:seed` seeds database with default data.
- `npm run db:studio` opens Drizzle Studio (visual database browser).

## Architecture

### Database Layer (Drizzle ORM + PostgreSQL)
- **Schema**: `src/db/schema.ts` defines three main tables using Drizzle ORM with camelCase field names that map to snake_case in the database.
- **Connection**: Drizzle instance in `src/lib/db.ts` using postgres-js driver (auto-managed, no manual connection handling needed).
- **Migrations**: Managed via Drizzle Kit in the `drizzle/` directory.
- **Custom Types**: Uses custom `numericDecimal` type to return amounts as numbers instead of strings.

### Service Layer Pattern
- All database operations encapsulated in service classes (`src/services/`).
- Services use static methods with Drizzle query builder.
- Return typed results based on types inferred from Drizzle schema.

### Type System
- Database entities: `Account`, `Expense`, `Category` (inferred from Drizzle schema using `InferSelectModel`).
- Create/Update DTOs: `CreateExpenseData`, `UpdateExpenseData`, etc.
- Types use camelCase to match Drizzle schema (e.g., `accountId` instead of `account_id`).

## Coding Style & Naming Conventions
- TypeScript + React; 2-space indentation and single quotes are the prevailing style.
- Components use PascalCase, functions/variables use camelCase, files follow kebab-case where applicable.
- Follow the service pattern: static methods using Drizzle query builder.
- Use `@/` path aliases for imports from `src/` (configured in tsconfig.json).
- Field names in code use camelCase but map to snake_case in the database.

## Testing Guidelines
- No automated test runner is configured yet; rely on `npm run lint` and manual checks.
- If adding tests, prefer `*.test.ts(x)` under `src/` and document new scripts in `package.json`.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative subjects (e.g., "Add Admin Page", "Implement Add Account").
- PRs should include a concise summary, testing notes, and screenshots for UI changes.
- Link relevant issues and call out any schema or migration changes.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `NODE_ENV`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
- Local database defaults (user/password/db) are defined in `docker-compose.yml`.

## Important Notes
- Drizzle ORM manages all database connections automatically (no manual connection management needed).
- All expenses queries can be joined with accounts using Drizzle's query builder.
- Default accounts and categories can be seeded using `npm run db:seed`.
- The app uses Turbopack for faster development builds.
- Schema changes require running `npm run db:generate` to create migrations.
- Use `npm run db:push` for quick schema updates during development.
- Decimal amounts are automatically converted to numbers via custom `numericDecimal` type.

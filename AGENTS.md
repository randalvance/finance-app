# Repository Guidelines

## Project Overview

Expense Tracker is a Next.js 15 application for tracking financial transactions across multiple accounts with categorization and analytics. Supports three transaction types: **Debit** (money out), **Credit** (money in), and **Transfer** (between accounts). Built with TypeScript, PostgreSQL, React, and Tailwind CSS.

## Project Structure & Module Organization
- `src/app/` hosts the Next.js 15 App Router pages and route handlers; API routes live under `src/app/api/`.
- `src/db/schema.ts` defines the database schema using Drizzle ORM (users, accounts, transactions, categories).
- `src/services/` contains database-facing service classes (TransactionService, AccountService, CategoryService, UserService).
- `src/lib/db.ts` holds the Drizzle database instance using postgres-js driver.
- `src/types/transaction.ts` defines TypeScript models and DTOs for transactions, accounts, and categories (inferred from Drizzle schema).
- `drizzle/` contains database migrations managed by Drizzle Kit.
- `public/` stores static assets; `docker-compose.yml` provisions local PostgreSQL.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `docker-compose up -d` starts PostgreSQL (run `npm run db:push` after to initialize schema).
- `npm run dev` runs the app with Turbopack at `http://localhost:3000`.
- `npm run build` creates a production build; `npm start` serves it.
- `npm run lint` runs ESLint (Next.js + TypeScript rules).
- `npm run db:generate` generates migrations from schema changes.
- `npm run db:push` pushes schema changes to database (for development).
- `npm run db:migrate` runs migrations (for production).
- `npm run db:seed` seeds database with default data.
- `npm run db:studio` opens Drizzle Studio (visual database browser).
- `ngrok http --domain=your-static-domain.ngrok-free.dev 3000` exposes localhost for Clerk webhooks (development only, requires free ngrok account with static domain).

## Architecture

### Database Layer (Drizzle ORM + PostgreSQL)
- **Schema**: `src/db/schema.ts` defines four main tables using Drizzle ORM with camelCase field names that map to snake_case in the database:
  - `users` - User accounts managed by Clerk authentication
  - `accounts` - Financial accounts with colors and descriptions
  - `transactions` - Individual financial transactions with source/target accounts and type
  - `categories` - Predefined categories with color coding and default transaction types
- **Connection**: Drizzle instance in `src/lib/db.ts` using postgres-js driver (auto-managed, no manual connection handling needed).
- **Migrations**: Managed via Drizzle Kit in the `drizzle/` directory.
- **Custom Types**: Uses custom `numericDecimal` type to return amounts as numbers instead of strings.
- **Field Naming**: Schema uses camelCase (e.g., `accountId`, `createdAt`) which Drizzle maps to snake_case in the database.

### Service Layer Pattern
- All database operations encapsulated in service classes (`src/services/`):
  - `TransactionService` - CRUD for transactions with validation, filtering, includes joins with accounts table
  - `AccountService` - Account management with net balance calculations (credits - debits)
  - `CategoryService` - Category operations including default transaction types
  - `UserService` - User management for Clerk integration
- Services use static methods with Drizzle query builder.
- Return typed results based on types inferred from Drizzle schema in `src/types/transaction.ts`.

### Type System
- Database entities: `Account`, `Transaction`, `Category`, `User` (inferred from Drizzle schema using `InferSelectModel`).
- Transaction types: `TransactionType` = 'Debit' | 'Credit' | 'Transfer'
- Create DTOs use discriminated unions: `CreateDebitData`, `CreateCreditData`, `CreateTransferData`
- Update DTOs: `UpdateTransactionData`, `UpdateAccountData`, `UpdateCategoryData`
- Types use camelCase to match Drizzle schema (e.g., `sourceAccountId` instead of `source_account_id`).

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
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SECRET`.
- Local database defaults (user/password/db) are defined in `docker-compose.yml`.
- For Clerk webhooks in development: use `ngrok http --domain=your-static-domain.ngrok-free.dev 3000` (requires free account) and configure webhook endpoint in Clerk Dashboard.

## Important Notes
- Drizzle ORM manages all database connections automatically (no manual connection management needed).
- All expenses queries can be joined with accounts using Drizzle's query builder.
- Default accounts and categories can be seeded using `npm run db:seed`.
- The app uses Turbopack for faster development builds.
- Schema changes require running `npm run db:generate` to create migrations.
- Use `npm run db:push` for quick schema updates during development.
- Decimal amounts are automatically converted to numbers via custom `numericDecimal` type.
- Clerk webhooks require tunneling in development (ngrok recommended); `src/lib/auth.ts` has a fallback that auto-creates users if webhooks aren't configured.

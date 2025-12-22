# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Finance App is a Next.js 15 application for tracking financial transactions across multiple accounts with categorization and analytics. Supports three transaction types: **Debit** (money out), **Credit** (money in), and **Transfer** (between accounts). Built with TypeScript, PostgreSQL, React, and Tailwind CSS.

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Start PostgreSQL database (Docker required)
docker-compose up -d

# Initialize database schema with Drizzle
npm run db:push
```

### Running the Application
```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Management
```bash
# Generate migration from schema changes
npm run db:generate

# Push schema changes to database (for development)
npm run db:push

# Run migrations (for production)
npm run db:migrate

# Seed database with default data
npm run db:seed

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Connect to PostgreSQL directly
docker exec -it finance_app_db psql -U finance_user -d finance_app

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down
```

### Clerk Webhook Setup (Development)
For Clerk webhooks to work in development, you need to expose localhost using a tunneling service:

```bash
# Install ngrok
brew install ngrok

# Sign up for free account at https://ngrok.com and get auth token
# Add your auth token (one-time setup)
ngrok config add-authtoken <your-token>

# Get a static domain from https://dashboard.ngrok.com/domains
# Free accounts get 1 static domain (e.g., your-name-12345.ngrok-free.dev)

# Start tunnel with your static domain
ngrok http --domain=your-static-domain.ngrok-free.dev 3000
```

**Steps to configure Clerk webhooks:**
1. Start ngrok with your static domain and copy the URL (e.g., `https://your-static-domain.ngrok-free.dev`)
2. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Your App → Webhooks
3. Click "Add Endpoint"
4. Enter webhook URL: `https://your-static-domain.ngrok-free.dev/api/webhooks/clerk`
5. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
6. Copy the "Signing Secret" and add to `.env.local` as `CLERK_WEBHOOK_SECRET`
7. Test by signing up a new user - they should be auto-created in the database

**Note:** The `src/lib/auth.ts` file includes a fallback that auto-creates users if webhooks aren't configured, so the app works without webhooks (but webhooks are recommended for production). Using a static domain means the webhook URL persists across ngrok restarts.

## Architecture

### Database Layer (Drizzle ORM + PostgreSQL)
- **Schema**: `src/db/schema.ts` defines four main tables using Drizzle ORM:
  - `users` - User accounts managed by Clerk authentication
  - `accounts` - Financial accounts with colors and descriptions
  - `transactions` - Individual financial transactions with source/target accounts and type
  - `categories` - Predefined categories with color coding and default transaction types
- **Connection**: Drizzle instance in `src/lib/db.ts` using postgres-js driver
- **Migrations**: Managed via Drizzle Kit in the `drizzle/` directory
- **Custom Types**: Uses custom `numericDecimal` type to return amounts as numbers instead of strings
- **Field Naming**: Schema uses camelCase (e.g., `accountId`, `createdAt`) which Drizzle maps to snake_case in the database

### Service Layer Pattern
All database operations are encapsulated in service classes (`src/services/`):
- `TransactionService` - CRUD for transactions with validation, filtering, includes joins with accounts table
- `AccountService` - Account management with net balance calculations (credits - debits)
- `CategoryService` - Category operations including default transaction types

Services use static methods with Drizzle query builder. They return typed results based on types inferred from the Drizzle schema in `src/types/transaction.ts`.

### API Routes (Next.js App Router)
REST API follows Next.js 15 route handler conventions in `src/app/api/`:
- `/api/transactions` - GET all, POST new transaction
- `/api/transactions/[id]` - GET, PUT, DELETE specific transaction
- `/api/accounts` - Account endpoints (CRUD operations)
- `/api/categories` - Category endpoints (CRUD operations with default transaction types)

All routes call service layer methods and return JSON with appropriate HTTP status codes. Transaction endpoints validate transaction type rules (Debit requires source account, Credit requires target account, Transfer requires both).

### Frontend Structure
- **App Router**: `src/app/` uses Next.js 15 App Router with Server Components
- **Main Page**: `src/app/page.tsx` displays transactions and analytics
- **Admin Page**: `src/app/admin/page.tsx` for managing accounts/categories
- **Styling**: Tailwind CSS 4 with global styles in `src/app/globals.css`

### Type System
All database models and DTOs are defined in `src/types/transaction.ts`:
- Database entities: `Account`, `Transaction`, `Category`, `User` (inferred from Drizzle schema using `InferSelectModel`)
- Transaction types: `TransactionType` = 'Debit' | 'Credit' | 'Transfer'
- Create DTOs use discriminated unions: `CreateDebitData`, `CreateCreditData`, `CreateTransferData`
- Update DTOs: `UpdateTransactionData`, `UpdateAccountData`, `UpdateCategoryData`
- Types use camelCase to match Drizzle schema (e.g., `sourceAccountId` instead of `source_account_id`)

## Configuration

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (from Clerk Dashboard)
- `CLERK_SECRET_KEY` - Clerk secret key (from Clerk Dashboard)
- `CLERK_WEBHOOK_SECRET` - Webhook signing secret (from Clerk Webhook settings, optional for dev)

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json)

## Transaction System

### Transaction Types

The application supports three types of financial transactions:

1. **Debit (Money Out)**
   - Represents spending or money leaving an account
   - **Required**: `sourceAccountId` (where money comes from)
   - **Optional**: `targetAccountId`
   - Examples: Groceries, gas, bills, purchases

2. **Credit (Money In)**
   - Represents income or money entering an account
   - **Required**: `targetAccountId` (where money goes to)
   - **Optional**: `sourceAccountId`
   - Examples: Salary, freelance income, refunds

3. **Transfer (Between Accounts)**
   - Represents money moving between your accounts
   - **Required**: Both `sourceAccountId` and `targetAccountId`
   - **Validation**: Source and target must be different accounts
   - Examples: Moving money to savings, transferring between checking accounts

### Transaction Validation Rules

Enforced at both database level (check constraints) and application level (TransactionService):

```typescript
// Debit: source required
if (type === 'Debit' && !sourceAccountId) throw Error

// Credit: target required
if (type === 'Credit' && !targetAccountId) throw Error

// Transfer: both required, must be different
if (type === 'Transfer' && (!sourceAccountId || !targetAccountId)) throw Error
if (type === 'Transfer' && sourceAccountId === targetAccountId) throw Error
```

### Category Default Transaction Types

Categories have a `defaultTransactionType` field that:
- Pre-selects the expected transaction type when creating transactions
- Can be overridden by the user during transaction entry
- Examples:
  - "Food & Dining" → defaults to Debit
  - "Salary" → defaults to Credit
  - "Savings Transfer" → defaults to Transfer

### Account Balance Calculation

Account balances are calculated as net values:

```
Net Balance = Credits - Debits ± Transfers

Credits (money in):
- Credit transactions where targetAccountId = account
- Transfer transactions where targetAccountId = account

Debits (money out):
- Debit transactions where sourceAccountId = account
- Transfer transactions where sourceAccountId = account
```

This is implemented in `AccountService.getAccountTotalAmount()`.

## Development Best Practices

### Code Quality Checks

**ALWAYS run these commands before committing changes:**

```bash
# Run ESLint to check for code quality issues
npm run lint

# Verify production build succeeds
npm run build
```

**What to check:**
- No ESLint errors or warnings
- No unused imports or variables
- No `any` types (use proper TypeScript types)
- No TypeScript compilation errors
- Production build completes successfully
- All type annotations are explicit and correct

**Common issues to fix:**
- Remove unused imports: `import { unused } from 'package'`
- Replace `any` with proper types: Use discriminated unions, interfaces, or specific types
- Add missing return types to functions
- Ensure all async operations are properly awaited
- Fix TypeScript errors before running build

## Important Notes

- Drizzle ORM manages all database connections automatically (no manual connection management needed)
- All transaction queries can be joined with accounts using Drizzle's query builder
- Default accounts, categories, and sample transactions can be seeded using `npm run db:seed`
- The app uses Turbopack for faster development builds
- Schema changes require running `npm run db:generate` to create migrations
- Use `npm run db:push` for quick schema updates during development
- Decimal amounts are automatically converted to numbers via custom `numericDecimal` type
- Field names in code use camelCase but map to snake_case in the database
- Transaction type validation occurs at three levels: TypeScript types, service layer, and database constraints

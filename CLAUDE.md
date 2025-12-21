# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense Tracker is a Next.js 15 application for tracking expenses across multiple accounts with categorization and analytics. Built with TypeScript, PostgreSQL, React, and Tailwind CSS.

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
docker exec -it expense_tracker_db psql -U expense_user -d expense_tracker

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
- **Schema**: `src/db/schema.ts` defines three main tables using Drizzle ORM:
  - `accounts` - Spending accounts with colors and descriptions
  - `expenses` - Individual transactions linked to accounts and categories
  - `categories` - Predefined categories with color coding
- **Connection**: Drizzle instance in `src/lib/db.ts` using postgres-js driver
- **Migrations**: Managed via Drizzle Kit in the `drizzle/` directory
- **Custom Types**: Uses custom `numericDecimal` type to return amounts as numbers instead of strings
- **Field Naming**: Schema uses camelCase (e.g., `accountId`, `createdAt`) which Drizzle maps to snake_case in the database

### Service Layer Pattern
All database operations are encapsulated in service classes (`src/services/`):
- `ExpenseService` - CRUD for expenses, filtering by date/category, includes joins with accounts table
- `AccountService` - Account management with expense aggregation queries
- `CategoryService` - Category operations

Services use static methods with Drizzle query builder. They return typed results based on types inferred from the Drizzle schema in `src/types/expense.ts`.

### API Routes (Next.js App Router)
REST API follows Next.js 15 route handler conventions in `src/app/api/`:
- `/api/expenses` - GET all, POST new expense
- `/api/expenses/[id]` - GET, PUT, DELETE specific expense
- `/api/accounts` - Account endpoints (same pattern)
- `/api/categories` - Category endpoints (same pattern)

All routes call service layer methods and return JSON with appropriate HTTP status codes.

### Frontend Structure
- **App Router**: `src/app/` uses Next.js 15 App Router with Server Components
- **Main Page**: `src/app/page.tsx` displays transactions and analytics
- **Admin Page**: `src/app/admin/page.tsx` for managing accounts/categories
- **Styling**: Tailwind CSS 4 with global styles in `src/app/globals.css`

### Type System
All database models and DTOs are defined in `src/types/expense.ts`:
- Database entities: `Account`, `Expense`, `Category` (inferred from Drizzle schema using `InferSelectModel`)
- Create/Update DTOs: `CreateExpenseData`, `UpdateExpenseData`, etc.
- Types use camelCase to match Drizzle schema (e.g., `accountId` instead of `account_id`)

## Configuration

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (from Clerk Dashboard)
- `CLERK_SECRET_KEY` - Clerk secret key (from Clerk Dashboard)
- `CLERK_WEBHOOK_SECRET` - Webhook signing secret (from Clerk Webhook settings, optional for dev)

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json)

## Important Notes

- Drizzle ORM manages all database connections automatically (no manual connection management needed)
- All expenses queries can be joined with accounts using Drizzle's query builder
- Default accounts and categories can be seeded using `npm run db:seed`
- The app uses Turbopack for faster development builds
- Schema changes require running `npm run db:generate` to create migrations
- Use `npm run db:push` for quick schema updates during development
- Decimal amounts are automatically converted to numbers via custom `numericDecimal` type
- Field names in code use camelCase but map to snake_case in the database

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

# Database will auto-initialize with schema from database/schema.sql
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
# Connect to PostgreSQL directly
docker exec -it expense_tracker_db psql -U expense_user -d expense_tracker

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down
```

## Architecture

### Database Layer (PostgreSQL)
- **Schema**: `/database/schema.sql` defines three main tables:
  - `accounts` - Spending accounts with colors and descriptions
  - `expenses` - Individual transactions linked to accounts and categories
  - `categories` - Predefined categories with color coding
- **Connection**: Centralized pool in `src/lib/db.ts` using node-postgres
- All service methods follow try/finally pattern to ensure client release

### Service Layer Pattern
All database operations are encapsulated in service classes (`src/services/`):
- `ExpenseService` - CRUD for expenses, filtering by date/category
- `AccountService` - Account management
- `CategoryService` - Category operations

Services use static methods and handle database client acquisition/release. They return typed results based on interfaces in `src/types/expense.ts`.

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
- Database entities: `Account`, `Expense`, `Category`
- Create/Update DTOs: `CreateExpenseData`, `UpdateExpenseData`, etc.

## Configuration

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - development/production
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Application URL

### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json)

## Important Notes

- Database client connections MUST be released in finally blocks
- All expenses are joined with accounts to include account name/color in responses
- Default accounts and categories are auto-created on database initialization
- The app uses Turbopack for faster development builds
- Database schema includes triggers to auto-update `updated_at` timestamps

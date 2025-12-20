# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` hosts the Next.js App Router pages and route handlers; API routes live under `src/app/api/`.
- `src/services/` contains database-facing service classes (Expense, Account, Category).
- `src/lib/` holds shared utilities like the PostgreSQL pool in `src/lib/db.ts`.
- `src/types/` defines TypeScript models and DTOs for expenses, accounts, and categories.
- `database/schema.sql` is the canonical schema and seeds default data.
- `public/` stores static assets; `docker-compose.yml` provisions local PostgreSQL.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `docker-compose up -d` starts PostgreSQL and initializes `database/schema.sql`.
- `npm run dev` runs the app with Turbopack at `http://localhost:3000`.
- `npm run build` creates a production build; `npm start` serves it.
- `npm run lint` runs ESLint (Next.js + TypeScript rules).

## Coding Style & Naming Conventions
- TypeScript + React; 2-space indentation and single quotes are the prevailing style.
- Components use PascalCase, functions/variables use camelCase, files follow kebab-case where applicable.
- Follow the service pattern: static methods with `try/finally` to release DB clients.
- Use `@/` path aliases for imports from `src/`.

## Testing Guidelines
- No automated test runner is configured yet; rely on `npm run lint` and manual checks.
- If adding tests, prefer `*.test.ts(x)` under `src/` and document new scripts in `package.json`.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative subjects (e.g., “Add Admin Page”, “Implement Add Account”).
- PRs should include a concise summary, testing notes, and screenshots for UI changes.
- Link relevant issues and call out any schema or migration changes.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
- Local database defaults (user/password/db) are defined in `docker-compose.yml`.

# Finance App

A modern financial transaction tracking application for managing transactions across multiple accounts with categorization and analytics. Built with Next.js 15, PostgreSQL, Drizzle ORM, and Clerk authentication.

## Features

- 📊 **Multi-Account Tracking**: Track transactions across multiple accounts with custom colors
- 💾 **Drizzle ORM**: Type-safe database operations with automatic migrations
- 🔐 **Clerk Authentication**: Secure user authentication with webhooks
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS 4
- 📈 **Analytics**: View spending patterns and category breakdowns
- 🏷️ **Categories**: Organize transactions with predefined categories
- ⚡ **Turbopack**: Lightning-fast development with Next.js 15

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Development**: Turbopack, Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL)
- ngrok account (for webhook development)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd finance-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Start PostgreSQL**
```bash
docker-compose up -d
```

4. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
- `DATABASE_URL` - PostgreSQL connection string (default works with Docker setup)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk Dashboard
- `CLERK_SECRET_KEY` - From Clerk Dashboard
- `CLERK_WEBHOOK_SECRET` - From Clerk Webhook settings (optional for dev)

5. **Run database migrations**
```bash
npm run db:push
```

6. **Seed the database** (optional)
```bash
npm run db:seed
```

7. **Start the development server**
```bash
npm run dev
```

8. **Set up webhooks for development** (optional but recommended)
```bash
# Install ngrok
brew install ngrok

# Add your auth token from https://ngrok.com
ngrok config add-authtoken <your-token>

# Get a static domain from https://dashboard.ngrok.com/domains

# Start tunnel with your static domain
ngrok http --domain=your-static-domain.ngrok-free.dev 3000
```

Configure webhook in [Clerk Dashboard](https://dashboard.clerk.com):
- Endpoint URL: `https://your-static-domain.ngrok-free.dev/api/webhooks/clerk`
- Subscribe to: `user.created`, `user.updated`, `user.deleted`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Run migrations (production)
- `npm run db:seed` - Seed database with default data
- `npm run db:studio` - Open Drizzle Studio (visual database browser)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin page
│   └── page.tsx           # Main page
├── db/
│   ├── schema.ts          # Drizzle schema definition
│   └── seed.ts            # Database seeding
├── lib/
│   ├── db.ts              # Drizzle database instance
│   └── auth.ts            # Authentication helpers
├── services/              # Database service layer
│   ├── accountService.ts
│   ├── categoryService.ts
│   ├── expenseService.ts
│   └── UserService.ts
└── types/
    └── expense.ts         # TypeScript type definitions
```

## Architecture

- **Database Layer**: Drizzle ORM with PostgreSQL, camelCase fields mapping to snake_case
- **Service Layer**: Static methods with Drizzle query builder for all database operations
- **API Routes**: RESTful endpoints following Next.js 15 conventions
- **Authentication**: Clerk middleware with webhook sync or fallback auto-creation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Clerk Authentication](https://clerk.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## License

MIT

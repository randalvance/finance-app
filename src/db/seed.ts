// Environment variables are automatically loaded by Next.js
// or can be loaded via: tsx --env-file=.env.local src/db/seed.ts

async function seed() {
  console.log('Seeding database...');

  // Import db and schema after env vars are loaded
  const { db } = await import('@/lib/db');
  const { users, accounts, categories, transactions } = await import('./schema');

  // Create a demo user for seeding (you can update this with your Clerk user ID)
  const [demoUser] = await db.insert(users)
    .values({
      clerkId: 'seed_demo_user',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User'
    })
    .onConflictDoNothing()
    .returning();

  if (!demoUser) {
    console.log('Demo user already exists, skipping seed');
    return;
  }

  const userId = demoUser.id;

  // Insert default accounts
  await db.insert(accounts)
    .values([
      { userId, name: 'Personal', description: 'Personal transactions and purchases', color: '#3b82f6' },
      { userId, name: 'Business', description: 'Business-related transactions', color: '#10b981' },
      { userId, name: 'Family', description: 'Family and household transactions', color: '#ec4899' },
    ])
    .onConflictDoNothing();

  // Insert default categories with transaction types
  await db.insert(categories)
    .values([
      { userId, name: 'Food & Dining', color: '#ef4444', defaultTransactionType: 'Debit' },
      { userId, name: 'Transportation', color: '#3b82f6', defaultTransactionType: 'Debit' },
      { userId, name: 'Shopping', color: '#8b5cf6', defaultTransactionType: 'Debit' },
      { userId, name: 'Entertainment', color: '#f59e0b', defaultTransactionType: 'Debit' },
      { userId, name: 'Bills & Utilities', color: '#10b981', defaultTransactionType: 'Debit' },
      { userId, name: 'Healthcare', color: '#ec4899', defaultTransactionType: 'Debit' },
      { userId, name: 'Travel', color: '#14b8a6', defaultTransactionType: 'Debit' },
      { userId, name: 'Education', color: '#6366f1', defaultTransactionType: 'Debit' },
      { userId, name: 'Salary', color: '#10b981', defaultTransactionType: 'Credit' },
      { userId, name: 'Freelance', color: '#14b8a6', defaultTransactionType: 'Credit' },
      { userId, name: 'Refund', color: '#3b82f6', defaultTransactionType: 'Credit' },
      { userId, name: 'Savings Transfer', color: '#f59e0b', defaultTransactionType: 'Transfer' },
      { userId, name: 'Other', color: '#6b7280', defaultTransactionType: 'Debit' },
    ])
    .onConflictDoNothing();

  // Get accounts for sample transactions
  const { eq } = await import('drizzle-orm');
  const accountsList = await db.select().from(accounts).where(eq(accounts.userId, userId));

  if (accountsList.length >= 2) {
    // Insert sample transactions of different types
    await db.insert(transactions)
      .values([
        // Debit transactions (money out)
        {
          userId,
          sourceAccountId: accountsList[0].id,
          targetAccountId: null,
          transactionType: 'Debit',
          description: 'Grocery shopping',
          amount: 85.50,
          category: 'Food & Dining',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago
        },
        {
          userId,
          sourceAccountId: accountsList[0].id,
          targetAccountId: null,
          transactionType: 'Debit',
          description: 'Gas station',
          amount: 45.00,
          category: 'Transportation',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 day ago
        },
        // Credit transaction (money in)
        {
          userId,
          sourceAccountId: null,
          targetAccountId: accountsList[0].id,
          transactionType: 'Credit',
          description: 'Monthly salary',
          amount: 3500.00,
          category: 'Salary',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days ago
        },
        // Transfer transaction (between accounts)
        {
          userId,
          sourceAccountId: accountsList[0].id,
          targetAccountId: accountsList[1].id,
          transactionType: 'Transfer',
          description: 'Transfer to savings',
          amount: 500.00,
          category: 'Savings Transfer',
          date: new Date().toISOString().split('T')[0] // Today
        }
      ])
      .onConflictDoNothing();
  }

  console.log('Seeding complete!');
}

// Run seed
seed()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });

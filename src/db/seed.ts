// Environment variables are automatically loaded by Next.js
// or can be loaded via: tsx --env-file=.env.local src/db/seed.ts

async function seed() {
  console.log('Seeding database...');

  // Import db and schema after env vars are loaded
  const { db } = await import('@/lib/db');
  const { users, accounts, categories } = await import('./schema');

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
      { userId, name: 'Personal', description: 'Personal expenses and purchases', color: '#3b82f6' },
      { userId, name: 'Business', description: 'Business-related expenses', color: '#10b981' },
      { userId, name: 'Family', description: 'Family and household expenses', color: '#ec4899' },
    ])
    .onConflictDoNothing();

  // Insert default categories
  await db.insert(categories)
    .values([
      { userId, name: 'Food & Dining', color: '#ef4444' },
      { userId, name: 'Transportation', color: '#3b82f6' },
      { userId, name: 'Shopping', color: '#8b5cf6' },
      { userId, name: 'Entertainment', color: '#f59e0b' },
      { userId, name: 'Bills & Utilities', color: '#10b981' },
      { userId, name: 'Healthcare', color: '#ec4899' },
      { userId, name: 'Travel', color: '#14b8a6' },
      { userId, name: 'Education', color: '#6366f1' },
      { userId, name: 'Other', color: '#6b7280' },
    ])
    .onConflictDoNothing();

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

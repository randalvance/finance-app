import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE any other imports
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function seed() {
  console.log('Seeding database...');

  // Import db and schema after env vars are loaded
  const { db } = await import('@/lib/db');
  const { accounts, categories } = await import('./schema');

  // Insert default accounts
  await db.insert(accounts)
    .values([
      { name: 'Personal', description: 'Personal expenses and purchases', color: '#3b82f6' },
      { name: 'Business', description: 'Business-related expenses', color: '#10b981' },
      { name: 'Family', description: 'Family and household expenses', color: '#ec4899' },
    ])
    .onConflictDoNothing();

  // Insert default categories
  await db.insert(categories)
    .values([
      { name: 'Food & Dining', color: '#ef4444' },
      { name: 'Transportation', color: '#3b82f6' },
      { name: 'Shopping', color: '#8b5cf6' },
      { name: 'Entertainment', color: '#f59e0b' },
      { name: 'Bills & Utilities', color: '#10b981' },
      { name: 'Healthcare', color: '#ec4899' },
      { name: 'Travel', color: '#14b8a6' },
      { name: 'Education', color: '#6366f1' },
      { name: 'Other', color: '#6b7280' },
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

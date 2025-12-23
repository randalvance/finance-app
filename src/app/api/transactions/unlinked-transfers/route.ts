import { NextResponse } from 'next/server';
import { TransactionLinkService } from '@/services/TransactionLinkService';
import { requireAuth } from '@/lib/auth';
import { accounts } from '@/db/schema';
import { db } from '@/lib/db';
import { inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = await requireAuth();
    const unlinkedTransfers = await TransactionLinkService.getUnlinkedTransfers(userId);

    // Enhance with account information
    const accountIds = new Set<number>();
    unlinkedTransfers.forEach(t => {
      if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
      if (t.targetAccountId) accountIds.add(t.targetAccountId);
    });

    let accountMap = new Map<number, { id: number; name: string; color: string | null }>();
    if (accountIds.size > 0) {
      const accountsData = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          color: accounts.color,
        })
        .from(accounts)
        .where(inArray(accounts.id, Array.from(accountIds)));

      accountMap = new Map(accountsData.map(a => [a.id, a]));
    }

    const enhancedTransfers = unlinkedTransfers.map(t => ({
      ...t,
      sourceAccount: t.sourceAccountId && accountMap.has(t.sourceAccountId) ? {
        id: t.sourceAccountId,
        name: accountMap.get(t.sourceAccountId)!.name,
        color: accountMap.get(t.sourceAccountId)!.color,
      } : undefined,
      targetAccount: t.targetAccountId && accountMap.has(t.targetAccountId) ? {
        id: t.targetAccountId,
        name: accountMap.get(t.targetAccountId)!.name,
        color: accountMap.get(t.targetAccountId)!.color,
      } : undefined,
    }));

    return NextResponse.json(enhancedTransfers);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching unlinked transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unlinked transfers' },
      { status: 500 }
    );
  }
}

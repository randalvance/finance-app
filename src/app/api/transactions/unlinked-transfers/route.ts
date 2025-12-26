import { NextResponse } from "next/server";
import { TransactionLinkService } from "@/services/TransactionLinkService";
import { requireAuth } from "@/lib/auth";
import { accounts, categories } from "@/db/schema";
import { db } from "@/lib/db";
import { inArray } from "drizzle-orm";

export async function GET () {
  try {
    const userId = await requireAuth();
    const unlinkedTransfers = await TransactionLinkService.getUnlinkedTransfers(userId);

    // Enhance with account and category information
    const accountIds = new Set<number>();
    const categoryIds = new Set<number>();
    unlinkedTransfers.forEach(t => {
      if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
      if (t.targetAccountId) accountIds.add(t.targetAccountId);
      if (t.categoryId) categoryIds.add(t.categoryId);
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

    let categoryMap = new Map<number, { id: number; name: string; color: string | null }>();
    if (categoryIds.size > 0) {
      const categoriesData = await db
        .select({
          id: categories.id,
          name: categories.name,
          color: categories.color,
        })
        .from(categories)
        .where(inArray(categories.id, Array.from(categoryIds)));

      categoryMap = new Map(categoriesData.map(c => [c.id, c]));
    }

    const enhancedTransfers = unlinkedTransfers.map(t => ({
      ...t,
      sourceAccount: t.sourceAccountId && accountMap.has(t.sourceAccountId)
        ? {
          id: t.sourceAccountId,
          name: accountMap.get(t.sourceAccountId)!.name,
          color: accountMap.get(t.sourceAccountId)!.color,
        }
        : undefined,
      targetAccount: t.targetAccountId && accountMap.has(t.targetAccountId)
        ? {
          id: t.targetAccountId,
          name: accountMap.get(t.targetAccountId)!.name,
          color: accountMap.get(t.targetAccountId)!.color,
        }
        : undefined,
      category: t.categoryId && categoryMap.has(t.categoryId)
        ? {
          id: t.categoryId,
          name: categoryMap.get(t.categoryId)!.name,
          color: categoryMap.get(t.categoryId)!.color,
        }
        : undefined,
    }));

    return NextResponse.json(enhancedTransfers);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching unlinked transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch unlinked transfers" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { BalanceHistoryService } from "@/services/BalanceHistoryService";
import { AccountService } from "@/services/accountService";
import { requireAuth } from "@/lib/auth";

export async function GET (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; balanceId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id, balanceId } = await params;
    const accountId = parseInt(id);
    const balanceEntryId = parseInt(balanceId);

    if (isNaN(accountId) || isNaN(balanceEntryId)) {
      return NextResponse.json(
        { error: "Invalid account ID or balance ID" },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const account = await AccountService.getAccountById(accountId, userId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const balance = await BalanceHistoryService.getBalanceById(balanceEntryId, userId);
    if (!balance || balance.accountId !== accountId) {
      return NextResponse.json(
        { error: "Balance entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(balance);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance entry" },
      { status: 500 }
    );
  }
}

export async function PUT (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; balanceId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id, balanceId } = await params;
    const accountId = parseInt(id);
    const balanceEntryId = parseInt(balanceId);

    if (isNaN(accountId) || isNaN(balanceEntryId)) {
      return NextResponse.json(
        { error: "Invalid account ID or balance ID" },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const account = await AccountService.getAccountById(accountId, userId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const balance = await BalanceHistoryService.getBalanceById(balanceEntryId, userId);
    if (!balance || balance.accountId !== accountId) {
      return NextResponse.json(
        { error: "Balance entry not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { date, currency, amount } = body;

    // Validate currency if provided
    if (currency) {
      const validCurrencies = ["USD", "SGD", "EUR", "JPY", "PHP"];
      if (!validCurrencies.includes(currency)) {
        return NextResponse.json(
          { error: `Invalid currency. Supported currencies: ${validCurrencies.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updatedBalance = await BalanceHistoryService.updateBalance(
      {
        id: balanceEntryId,
        ...(date && { date }),
        ...(currency && { currency }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
      },
      userId
    );

    if (!updatedBalance) {
      return NextResponse.json(
        { error: "Balance entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBalance);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating balance:", error);
    return NextResponse.json(
      { error: "Failed to update balance entry" },
      { status: 500 }
    );
  }
}

export async function DELETE (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; balanceId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id, balanceId } = await params;
    const accountId = parseInt(id);
    const balanceEntryId = parseInt(balanceId);

    if (isNaN(accountId) || isNaN(balanceEntryId)) {
      return NextResponse.json(
        { error: "Invalid account ID or balance ID" },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const account = await AccountService.getAccountById(accountId, userId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const balance = await BalanceHistoryService.getBalanceById(balanceEntryId, userId);
    if (!balance || balance.accountId !== accountId) {
      return NextResponse.json(
        { error: "Balance entry not found" },
        { status: 404 }
      );
    }

    const deleted = await BalanceHistoryService.deleteBalance(balanceEntryId, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Balance entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Balance entry deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting balance:", error);
    return NextResponse.json(
      { error: "Failed to delete balance entry" },
      { status: 500 }
    );
  }
}

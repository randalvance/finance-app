import { NextRequest, NextResponse } from "next/server";
import { BalanceHistoryService } from "@/services/BalanceHistoryService";
import { AccountService } from "@/services/accountService";
import { requireAuth } from "@/lib/auth";
import { UserService } from "@/services/UserService";
import { currentUser } from "@clerk/nextjs/server";

export async function GET (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get user's display currency
    const dbUser = await UserService.getUserByClerkId(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: "Invalid account ID" },
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

    const balances = await BalanceHistoryService.getAllBalancesConverted(
      accountId,
      userId,
      dbUser.displayCurrency as import("@/db/schema").Currency
    );
    return NextResponse.json(balances);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance history" },
      { status: 500 }
    );
  }
}

export async function POST (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const accountId = parseInt(id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: "Invalid account ID" },
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

    const body = await request.json();
    const { date, currency, amount } = body;

    // Validate required fields
    if (!date || !currency || amount === undefined) {
      return NextResponse.json(
        { error: "Date, currency, and amount are required" },
        { status: 400 }
      );
    }

    // Validate currency
    const validCurrencies = ["USD", "SGD", "EUR", "JPY", "PHP"];
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Supported currencies: ${validCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    const balance = await BalanceHistoryService.createBalance({
      userId,
      accountId,
      date,
      currency,
      amount: parseFloat(amount),
    });

    return NextResponse.json(balance, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating balance:", error);
    return NextResponse.json(
      { error: "Failed to create balance entry" },
      { status: 500 }
    );
  }
}

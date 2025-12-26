import { NextRequest, NextResponse } from "next/server";
import { AccountService } from "@/services/accountService";
import { requireAuth } from "@/lib/auth";

export async function GET () {
  try {
    const userId = await requireAuth();
    const accounts = await AccountService.getAllAccounts(userId);

    // Enrich accounts with transaction counts and totals
    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const transactionCount = await AccountService.getAccountTransactionCount(account.id, userId);
        const totalAmount = await AccountService.getAccountTotalAmount(account.id, userId);
        return {
          ...account,
          transactionCount,
          totalAmount,
        };
      })
    );

    return NextResponse.json(enrichedAccounts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST (request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { name, description, color, currency, is_investment_account } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    const account = await AccountService.createAccount({
      userId,
      name,
      description,
      color,
      currency,
      isInvestmentAccount: is_investment_account,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

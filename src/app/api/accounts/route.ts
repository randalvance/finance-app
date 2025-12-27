import { NextRequest, NextResponse } from "next/server";
import { AccountService } from "@/services/accountService";
import { UserService } from "@/services/UserService";
import { requireAuth } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";

export async function GET () {
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

    const accounts = await AccountService.getAllAccounts(userId);

    // Enrich accounts with transaction counts and converted totals
    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const transactionCount = await AccountService.getAccountTransactionCount(account.id, userId);
        const { amount: totalAmount, originalCurrency } = await AccountService.getAccountTotalAmountConverted(
          account.id,
          userId,
          dbUser.displayCurrency as import("@/db/schema").Currency
        );
        return {
          ...account,
          transactionCount,
          totalAmount,
          originalCurrency,
          displayCurrency: dbUser.displayCurrency,
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

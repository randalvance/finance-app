import { NextRequest, NextResponse } from "next/server";
import { AccountService } from "@/services/accountService";
import { requireAuth } from "@/lib/auth";

export async function GET (
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

    const account = await AccountService.getAccountById(accountId, userId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

export async function PUT (
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

    const body = await request.json();
    const account = await AccountService.updateAccount({ id: accountId, ...body }, userId);

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE (
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

    const deleted = await AccountService.deleteAccount(accountId, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Make sure there are no transactions associated with it." },
      { status: 500 }
    );
  }
}

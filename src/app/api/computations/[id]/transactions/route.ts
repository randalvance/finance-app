import { NextRequest, NextResponse } from "next/server";
import { ComputationService } from "@/services/computationService";
import { requireAuth } from "@/lib/auth";

export async function POST (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { transaction_ids } = body;

    if (!transaction_ids || !Array.isArray(transaction_ids)) {
      return NextResponse.json(
        { error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    await ComputationService.addTransactions(parseInt(id), transaction_ids, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error adding transactions to computation:", error);
    return NextResponse.json(
      { error: "Failed to add transactions" },
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
    const body = await request.json();
    const { transaction_ids } = body;

    if (!transaction_ids || !Array.isArray(transaction_ids)) {
      return NextResponse.json(
        { error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    await ComputationService.removeTransactions(parseInt(id), transaction_ids, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error removing transactions from computation:", error);
    return NextResponse.json(
      { error: "Failed to remove transactions" },
      { status: 500 }
    );
  }
}

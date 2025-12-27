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
    const computationId = parseInt(id);
    const body = await request.json();
    const { transaction_id, is_excluded } = body;

    if (typeof transaction_id !== "number") {
      return NextResponse.json(
        { error: "transaction_id is required and must be a number" },
        { status: 400 }
      );
    }

    if (typeof is_excluded !== "number" || (is_excluded !== 0 && is_excluded !== 1)) {
      return NextResponse.json(
        { error: "is_excluded must be 0 or 1" },
        { status: 400 }
      );
    }

    await ComputationService.toggleTransactionExclusion(
      computationId,
      transaction_id,
      is_excluded === 1,
      userId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Computation not found") {
        return NextResponse.json({ error: "Computation not found" }, { status: 404 });
      }
    }
    console.error("Error toggling transaction exclusion:", error);
    return NextResponse.json(
      { error: "Failed to toggle transaction exclusion" },
      { status: 500 }
    );
  }
}

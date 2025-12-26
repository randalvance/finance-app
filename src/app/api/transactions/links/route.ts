import { NextRequest, NextResponse } from "next/server";
import { TransactionLinkService } from "@/services/TransactionLinkService";
import { requireAuth } from "@/lib/auth";

export async function POST (request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { transaction_1_id, transaction_2_id } = body;

    if (!transaction_1_id || !transaction_2_id) {
      return NextResponse.json(
        { error: "Missing required fields: transaction_1_id, transaction_2_id" },
        { status: 400 }
      );
    }

    const link = await TransactionLinkService.createLink({
      userId,
      transaction1Id: parseInt(transaction_1_id),
      transaction2Id: parseInt(transaction_2_id)
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("already linked") ||
          error.message.includes("not found") ||
          error.message.includes("itself")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}

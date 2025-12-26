import { NextRequest, NextResponse } from "next/server";
import { TransactionLinkService } from "@/services/TransactionLinkService";
import { requireAuth } from "@/lib/auth";

export async function DELETE (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId)) {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400 }
      );
    }

    const deleted = await TransactionLinkService.deleteLink(linkId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Link not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}

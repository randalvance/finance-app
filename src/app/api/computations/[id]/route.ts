import { NextRequest, NextResponse } from "next/server";
import { ComputationService } from "@/services/computationService";
import { requireAuth } from "@/lib/auth";

export async function GET (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const computation = await ComputationService.getComputationById(parseInt(id), userId);

    if (!computation) {
      return NextResponse.json({ error: "Computation not found" }, { status: 404 });
    }

    return NextResponse.json(computation);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching computation:", error);
    return NextResponse.json(
      { error: "Failed to fetch computation" },
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
    const body = await request.json();
    const { name, description, transaction_ids } = body;

    const computation = await ComputationService.updateComputation(
      {
        id: parseInt(id),
        name,
        description,
        transactionIds: transaction_ids,
      },
      userId
    );

    if (!computation) {
      return NextResponse.json({ error: "Computation not found" }, { status: 404 });
    }

    return NextResponse.json(computation);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating computation:", error);
    return NextResponse.json(
      { error: "Failed to update computation" },
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
    const success = await ComputationService.deleteComputation(parseInt(id), userId);

    if (!success) {
      return NextResponse.json({ error: "Computation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting computation:", error);
    return NextResponse.json(
      { error: "Failed to delete computation" },
      { status: 500 }
    );
  }
}

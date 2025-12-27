import { NextRequest, NextResponse } from "next/server";
import { ComputationService } from "@/services/computationService";
import { requireAuth } from "@/lib/auth";

export async function GET () {
  try {
    const userId = await requireAuth();
    const computations = await ComputationService.getAllComputations(userId);
    return NextResponse.json(computations);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching computations:", error);
    return NextResponse.json(
      { error: "Failed to fetch computations" },
      { status: 500 }
    );
  }
}

export async function POST (request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { name, description, transaction_ids } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Computation name is required" },
        { status: 400 }
      );
    }

    const computation = await ComputationService.createComputation({
      userId,
      name,
      description,
      transactionIds: transaction_ids,
    });

    return NextResponse.json(computation);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating computation:", error);
    return NextResponse.json(
      { error: "Failed to create computation" },
      { status: 500 }
    );
  }
}

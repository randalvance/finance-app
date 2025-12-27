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
    const aggregation = await ComputationService.getComputationAggregation(parseInt(id), userId);

    if (!aggregation) {
      return NextResponse.json({ error: "Computation not found" }, { status: 404 });
    }

    return NextResponse.json(aggregation);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching computation aggregation:", error);
    return NextResponse.json(
      { error: "Failed to fetch computation aggregation" },
      { status: 500 }
    );
  }
}

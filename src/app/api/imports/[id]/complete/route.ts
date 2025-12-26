import { NextRequest, NextResponse } from "next/server";
import { ImportService } from "@/services/ImportService";
import { requireAuth } from "@/lib/auth";

export async function POST (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { category_mappings } = body;

    if (!category_mappings) {
      return NextResponse.json(
        { error: "Category mappings are required" },
        { status: 400 }
      );
    }

    // Validate that all categories are mapped (no 0 values)
    const unmappedCount = Object.values(category_mappings).filter(v => v === 0).length;
    if (unmappedCount > 0) {
      return NextResponse.json(
        { error: `${unmappedCount} transactions have unmapped categories` },
        { status: 400 }
      );
    }

    const importRecord = await ImportService.completeImport(id, category_mappings, userId);

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json(importRecord, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error completing import:", error);
    return NextResponse.json({ error: "Failed to complete import" }, { status: 500 });
  }
}

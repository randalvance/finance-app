import { NextResponse } from "next/server";
import { ImportService } from "@/services/ImportService";
import { requireAuth } from "@/lib/auth";

export async function GET () {
  try {
    const userId = await requireAuth();
    const imports = await ImportService.getAllImports(userId);
    return NextResponse.json(imports);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching imports:", error);
    return NextResponse.json({ error: "Failed to fetch imports" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/services/UserService";
import { requireAuth } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";

export async function GET () {
  try {
    await requireAuth();
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const dbUser = await UserService.getUserByClerkId(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    return NextResponse.json({
      displayCurrency: dbUser.displayCurrency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching display currency:", error);
    return NextResponse.json(
      { error: "Failed to fetch display currency" },
      { status: 500 }
    );
  }
}

export async function PUT (request: NextRequest) {
  try {
    await requireAuth();
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const { displayCurrency } = body;

    if (!displayCurrency) {
      return NextResponse.json(
        { error: "displayCurrency is required" },
        { status: 400 }
      );
    }

    const updatedUser = await UserService.updateDisplayCurrency(user.id, displayCurrency);
    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update display currency" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      displayCurrency: updatedUser.displayCurrency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating display currency:", error);
    return NextResponse.json(
      { error: "Failed to update display currency" },
      { status: 500 }
    );
  }
}

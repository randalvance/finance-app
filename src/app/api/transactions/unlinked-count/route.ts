import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { TransactionService } from "@/services/TransactionService";
import { UserService } from "@/services/UserService";

export async function GET () {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await UserService.getUserByClerkId(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const count = await TransactionService.getUnlinkedTransferCount(user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unlinked transfer count:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

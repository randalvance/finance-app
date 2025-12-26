import { currentUser } from "@clerk/nextjs/server";
import { UserService } from "@/services/UserService";

export async function getAuthenticatedUserId (): Promise<number | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  let dbUser = await UserService.getUserByClerkId(clerkUser.id);

  // Auto-create user if authenticated with Clerk but not in database
  // This handles cases where webhooks aren't configured (e.g., development)
  if (!dbUser && clerkUser.id) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUser.id}@unknown.com`;
    dbUser = await UserService.createUser({
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
    });
  }

  return dbUser?.id || null;
}

export async function requireAuth (): Promise<number> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

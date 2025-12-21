import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/types/transaction';

export class UserService {
  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    const result = await db.select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return result[0] || null;
  }

  static async getUserById(id: number): Promise<User | null> {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  }

  static async createUser(data: {
    clerkId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User> {
    const result = await db.insert(users).values({
      clerkId: data.clerkId,
      email: data.email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
    }).returning();
    return result[0];
  }

  static async updateUser(clerkId: string, data: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User | null> {
    const result = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();
    return result[0] || null;
  }

  static async deleteUser(clerkId: string): Promise<boolean> {
    const result = await db.delete(users)
      .where(eq(users.clerkId, clerkId))
      .returning();
    return result.length > 0;
  }
}

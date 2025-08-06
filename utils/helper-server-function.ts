"use server";
import { db } from "@/lib/db";

export async function getUserByEmail(email: string) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return {
      success: false,
      error: "Invalid email format",
      user: null,
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      select:{
        name: true,
        email: true,
        id: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        user: null,
      };
    }

    return {
      success: true,
      user,
      error: null,
    };
  } catch (error: any) {
    console.error("Database error in getUserByEmail:", error);
    return {
      success: false,
      error: "Internal server error",
      user: null,
    };
  }
}

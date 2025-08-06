// actions/register.ts

"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { RegisterSchema } from "@/components/auth-module/schemas";

export async function register(
  values: z.infer<typeof RegisterSchema>
): Promise<{ error?: string; success?: string }> {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { fullName, email, password } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  await db.user.create({
    data: {
      name : fullName,
      email,
      password: hashedPassword,
    },
  });


  // Update success message
  return { success: "Confirmation email sent! Please check your inbox." };
}
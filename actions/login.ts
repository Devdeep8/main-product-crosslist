// actions/login.ts

"use server";

import * as z from "zod";
import { LoginSchema } from "@/components/auth-module/schemas";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
// Explicitly define the return type to match what your form expects
export async function login(
  values: z.infer<typeof LoginSchema>
): Promise<{ error?: string; success?: string }> { // <-- FIX 1: Add explicit return type
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", {
      email,
      password,

      redirect: false, // ✅ Prevent auto redirect
    });

    // FIX 3: This line is now reachable on successful login!
    return { success: "Login successful!" };

  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password!" };
        default:
          return { error: "Something went wrong!" };
      }
    }
    // For non-AuthError types, re-throw it so Next.js can handle it.
    throw error;
  }
}
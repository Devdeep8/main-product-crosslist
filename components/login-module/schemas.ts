import * as z from "zod";

// Define the schema for your login form.
export const LoginSchema = z.object({
  // email must be a string and a valid email format.
  // The error message is customized for when the string is empty.
  email: z.email("Must be a valid email"),
  // password must be a string, at least 8 characters long, and no more than 32 characters.
  // This prevents potential DoS attacks from extremely long password strings.
  password: z.string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .max(32, {
      message: "Password must not exceed 32 characters",
    }),
});

// Infer the TypeScript type from the Zod schema.
// This is a best practice to keep your types in sync with your validation.
export type LoginValues = z.infer<typeof LoginSchema>;
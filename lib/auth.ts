import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" }, // For magic link login
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // --- PATH 1: MAGIC LINK TOKEN AUTHENTICATION ---
        if (credentials.token) {
          try {
            const decoded = jwt.verify(credentials.token, process.env.NEXTAUTH_SECRET!);
            if (typeof decoded === 'string' || !decoded.userId) {
              return null; // Invalid token payload
            }
            const user = await db.user.findUnique({ where: { id: decoded.userId } });
            return user || null;
          } catch (error) {
            console.error("JWT Verification Error:", error);
            return null;
          }
        }

        // --- PATH 2: STANDARD EMAIL & PASSWORD AUTHENTICATION ---
        if (credentials.email && credentials.password) {
          const user = await db.user.findUnique({ where: { email: credentials.email } });
          if (!user || !user.password) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          return user;
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token } ) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/(auth)/sign-in",
    signOut: "/(auth)/sign-out",
    error: "/(auth)/error",
    newUser: "/onboarding",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & NextAuthUser; // Extend the default user type
  }

  // Extend the default User type to include properties from your Prisma model

}


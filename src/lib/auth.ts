import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // load extra fields from DB so the client knows account state
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            username: true,
            image: true,
            phone: true,
            recoveryEmail: true,
            passwordHash: true,
          },
        });
        session.user.username = dbUser?.username ?? null;
        session.user.image = dbUser?.image ?? session.user.image ?? null;
        session.user.phone = dbUser?.phone ?? null;
        session.user.recoveryEmail = dbUser?.recoveryEmail ?? null;
        session.user.hasPassword = !!dbUser?.passwordHash;
      }
      return session;
    },
  },
};

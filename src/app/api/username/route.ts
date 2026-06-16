import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 chars: letters, numbers, underscore." },
      { status: 400 }
    );
  }

  // case-insensitive uniqueness check
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username },
      NOT: { id: session.user.id },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Username is taken." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { username },
    select: { username: true },
  });

  return NextResponse.json({ username: user.username });
}

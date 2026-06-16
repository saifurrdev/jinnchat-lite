import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const PHONE_RE = /^\+?[0-9\s-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  action: "phone" | "recoveryEmail" | "password";
  phone?: string;
  recoveryEmail?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "phone") {
    const phone = (body.phone ?? "").trim();
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    await prisma.user.update({ where: { id: userId }, data: { phone } });
    return NextResponse.json({ phone });
  }

  if (body.action === "recoveryEmail") {
    const recoveryEmail = (body.recoveryEmail ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(recoveryEmail)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    await prisma.user.update({ where: { id: userId }, data: { recoveryEmail } });
    return NextResponse.json({ recoveryEmail });
  }

  if (body.action === "password") {
    const newPassword = body.newPassword ?? "";
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    // If a password already exists, require the current one to change it.
    if (user?.passwordHash) {
      const current = body.currentPassword ?? "";
      if (!verifyPassword(current, user.passwordHash)) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return NextResponse.json({ ok: true, hasPassword: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

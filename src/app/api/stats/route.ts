import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Total registered users. Online count is delivered live over the socket,
// but we expose total here so the homepage has a value on first paint.
export async function GET() {
  const totalUsers = await prisma.user.count();
  return NextResponse.json({ totalUsers });
}

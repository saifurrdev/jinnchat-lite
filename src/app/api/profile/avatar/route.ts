import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 4MB)." }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP or GIF image." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${userId}_${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);

  const url = `/uploads/${filename}`;
  await prisma.user.update({ where: { id: userId }, data: { image: url } });

  return NextResponse.json({ image: url });
}

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Read-only messages of one conversation, only if the user took part in it.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
    select: { partnerName: true, partnerImage: true },
  });
  if (!part) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, text: true, senderId: true, createdAt: true },
  });

  return NextResponse.json({
    partnerName: part.partnerName,
    partnerImage: part.partnerImage,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      mine: m.senderId === userId,
      ts: m.createdAt,
    })),
  });
}

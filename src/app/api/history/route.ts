import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Latest 10 conversations for the signed-in user.
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      conversationId: true,
      partnerName: true,
      partnerImage: true,
      createdAt: true,
      conversation: {
        select: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true },
          },
        },
      },
    },
  });

  const items = parts.map((p) => ({
    conversationId: p.conversationId,
    partnerName: p.partnerName,
    partnerImage: p.partnerImage,
    createdAt: p.createdAt,
    messageCount: p.conversation._count.messages,
    lastMessage: p.conversation.messages[0]?.text ?? null,
  }));

  return NextResponse.json({ items });
}

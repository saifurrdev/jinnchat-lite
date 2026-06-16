// Custom Next.js server that also hosts the Socket.IO realtime layer.
// Handles: presence (online count), random 1v1 matchmaking, and message relay
// (text, reactions, replies, typing indicators, read receipts).

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const HISTORY_LIMIT = 10;

// Keep only the latest N conversations for a user; delete the rest (and their
// messages, via cascade). Runs after a new conversation is created.
async function pruneHistory(userId) {
  try {
    const parts = await prisma.conversationParticipant.findMany({
      where: { userId },
      orderBy: { createdAt: "desc", id: "desc" },
      select: { conversationId: true },
    });
    const stale = parts.slice(HISTORY_LIMIT).map((p) => p.conversationId);
    if (stale.length) {
      await prisma.conversation.deleteMany({ where: { id: { in: stale } } });
    }
  } catch (e) {
    console.error("pruneHistory failed:", e);
  }
}

// Create a Conversation + participant rows for a freshly matched pair.
async function createConversation(a, b) {
  try {
    const convo = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: a.userId, partnerName: b.username, partnerImage: b.image },
            { userId: b.userId, partnerName: a.username, partnerImage: a.image },
          ],
        },
      },
      select: { id: true },
    });
    await pruneHistory(a.userId);
    await pruneHistory(b.userId);
    return convo.id;
  } catch (e) {
    console.error("createConversation failed:", e);
    return null;
  }
}

async function saveMessage(convoId, senderId, id, text) {
  if (!convoId) return;
  try {
    await prisma.message.create({
      data: { id, conversationId: convoId, senderId, text },
    });
  } catch (e) {
    console.error("saveMessage failed:", e);
  }
}

// ---- In-memory realtime state (per process) ----
// socketId -> { userId, username, image, roomId|null }
const users = new Map();
// queue of socketIds waiting for a partner
let waiting = [];
// roomId -> { a: socketId, b: socketId }
const rooms = new Map();

function onlineCount() {
  // distinct userIds currently connected
  const ids = new Set();
  for (const u of users.values()) ids.add(u.userId);
  return ids.size;
}

function broadcastPresence(io) {
  io.emit("presence", { online: onlineCount() });
}

let roomCounter = 0;
function genRoomId(a, b) {
  return `room_${a}_${b}_${++roomCounter}`;
}

function partnerOf(io, socketId) {
  const me = users.get(socketId);
  if (!me || !me.roomId) return null;
  const room = rooms.get(me.roomId);
  if (!room) return null;
  const otherId = room.a === socketId ? room.b : room.a;
  return io.sockets.sockets.get(otherId) || null;
}

function leaveRoom(io, socketId, notifyPartner) {
  const me = users.get(socketId);
  if (!me || !me.roomId) return;
  const roomId = me.roomId;
  const room = rooms.get(roomId);
  if (room) {
    const otherId = room.a === socketId ? room.b : room.a;
    const other = users.get(otherId);
    if (other) {
      other.roomId = null;
      if (notifyPartner) {
        io.to(otherId).emit("partner_left", { roomId });
      }
    }
    if (room.convoId) {
      prisma.conversation
        .update({ where: { id: room.convoId }, data: { endedAt: new Date() } })
        .catch(() => {});
    }
    rooms.delete(roomId);
  }
  me.roomId = null;
}

async function tryMatch(io, socketId) {
  const me = users.get(socketId);
  if (!me) return;

  // already matched
  if (me.roomId) return;

  // remove stale entries / self from queue
  waiting = waiting.filter(
    (id) => id !== socketId && users.has(id) && !users.get(id).roomId
  );

  // find a partner who isn't the same user account
  const partnerIdx = waiting.findIndex(
    (id) => users.get(id)?.userId !== me.userId
  );

  if (partnerIdx === -1) {
    // nobody available — wait
    if (!waiting.includes(socketId)) waiting.push(socketId);
    io.to(socketId).emit("waiting");
    return;
  }

  const partnerId = waiting.splice(partnerIdx, 1)[0];
  const partner = users.get(partnerId);
  if (!partner) return;

  const roomId = genRoomId(socketId, partnerId);
  me.roomId = roomId;
  partner.roomId = roomId;
  rooms.set(roomId, { a: socketId, b: partnerId, convoId: null, pendingMessages: [] });

  io.to(socketId).emit("matched", {
    roomId,
    partner: { username: partner.username, image: partner.image },
  });
  io.to(partnerId).emit("matched", {
    roomId,
    partner: { username: me.username, image: me.image },
  });

  // persist the conversation in the background and attach its id to the room
  const convoId = await createConversation(me, partner);
  const room = rooms.get(roomId);
  if (room) {
    room.convoId = convoId;
    // flush any messages that arrived while conversation was being created
    for (const pm of room.pendingMessages) {
      saveMessage(convoId, pm.senderId, pm.id, pm.text);
    }
    room.pendingMessages = [];
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: { origin: "*" },
    path: "/api/socket",
  });

  io.on("connection", (socket) => {
    // client must identify itself right after connecting
    socket.on("identify", (data) => {
      if (!data || !data.userId || !data.username) {
        socket.emit("error_msg", "Missing identity");
        return;
      }
      users.set(socket.id, {
        userId: String(data.userId),
        username: String(data.username),
        image: data.image || null,
        roomId: null,
      });
      broadcastPresence(io);
    });

    // user pressed "Connect a jinn"
    socket.on("find", () => {
      leaveRoom(io, socket.id, true); // leave any prior room first
      tryMatch(io, socket.id).catch((e) => console.error("tryMatch:", e));
    });

    // user cancels searching
    socket.on("cancel", () => {
      waiting = waiting.filter((id) => id !== socket.id);
      socket.emit("cancelled");
    });

    // user leaves the current chat
    socket.on("leave", () => {
      leaveRoom(io, socket.id, true);
      socket.emit("left");
    });

    // --- message relay ---
    socket.on("message", (msg) => {
      if (!msg || typeof msg.id !== "string" || !msg.id || typeof msg.text !== "string" || !msg.text.trim()) return;
      const text = msg.text.slice(0, 5000);
      const id = msg.id.slice(0, 128);
      const partner = partnerOf(io, socket.id);
      if (!partner) return;
      partner.emit("message", {
        id,
        text,
        replyTo: msg.replyTo || null,
        ts: Date.now(),
      });
      socket.emit("delivered", { id });

      const me = users.get(socket.id);
      const room = me && me.roomId ? rooms.get(me.roomId) : null;
      if (room) {
        if (room.convoId) {
          saveMessage(room.convoId, me.userId, id, text);
        } else {
          // conversation still being created — buffer the message
          room.pendingMessages.push({ senderId: me.userId, id, text });
        }
      }
    });

    socket.on("typing", (isTyping) => {
      const partner = partnerOf(io, socket.id);
      if (partner) partner.emit("typing", !!isTyping);
    });

    socket.on("reaction", (data) => {
      const partner = partnerOf(io, socket.id);
      // data: { messageId, emoji }  (emoji null = removed)
      if (partner) partner.emit("reaction", data);
    });

    socket.on("read", (data) => {
      const partner = partnerOf(io, socket.id);
      if (partner) partner.emit("read", data); // { ids: [...] }
    });

    socket.on("disconnect", () => {
      waiting = waiting.filter((id) => id !== socket.id);
      leaveRoom(io, socket.id, true);
      users.delete(socket.id);
      broadcastPresence(io);
    });
  });

  server.listen(port, () => {
    console.log(`> Gupto Chat ready on http://localhost:${port}`);
  });
});

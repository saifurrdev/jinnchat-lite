# 🧞 JinnChat

Random 1-on-1 chat. Sign in with Google, pick a username, hit **Connect a jinn**,
and you're matched with a random online stranger. Telegram-style chat UI with
replies, emoji reactions, typing indicators, and read receipts — all realtime
over WebSockets.

Built with **Next.js (App Router) + Socket.IO + NextAuth (Google) + Prisma + Tailwind**.

## Features

- Google sign-in (NextAuth) + one-time username setup
- Homepage shows **active jinns** (live online count) and **total users**
- "Connect a jinn" → random 1v1 matchmaking
- Realtime messaging: text, **replies**, **emoji reactions** (double-tap = ❤️),
  **typing…** indicator, delivered/read ticks
- "New jinn" / "Connect a new jinn" to re-roll a partner
- Telegram-clone UI (bubbles, tails, wallpaper, ticks) with Tailwind

## Setup

### 1. Install

```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

Edit `.env`:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
```

**Google OAuth:** Create credentials at
<https://console.cloud.google.com/apis/credentials> → OAuth client ID → Web app.
Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Create the database

```bash
npm run db:push
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. To test matchmaking, open a second account in an
incognito window (matching never pairs you with yourself).

## How it works

- `server.js` is a custom Node server that runs Next.js **and** Socket.IO on the
  same port (`/api/socket`). It keeps presence, a matchmaking queue, and rooms in
  memory and relays all chat events between the two paired sockets.
- Messages are **not persisted** — this is ephemeral 1v1 chat. Only user accounts
  live in the SQLite DB (via Prisma).

## Project structure

```
server.js                       custom Next + Socket.IO server (matching, relay)
prisma/schema.prisma            User/Account/Session models
src/app/page.tsx                homepage → <Lobby/>
src/app/api/auth/[...nextauth]  NextAuth Google handler
src/app/api/username            username claim endpoint
src/app/api/stats               total user count
src/components/Lobby.tsx        login → username → lobby → chat orchestration
src/components/ChatWindow.tsx   Telegram-style chat UI
src/components/SetUsername.tsx  username picker
src/hooks/useSocket.ts          socket.io-client connection + identify
```

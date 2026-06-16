"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { SetUsername } from "./SetUsername";
import { ChatWindow } from "./ChatWindow";
import { Avatar } from "./Avatar";
import { BottomNav, AccountSheet } from "./AccountPanel";
import type { Partner } from "@/types/chat";

type View = "lobby" | "searching" | "chat";
type SheetTab = "profile" | "settings" | "history";

export function Lobby() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<View>("lobby");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [online, setOnline] = useState(0);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetTab | null>(null);

  const identity =
    session?.user?.id && session.user.username
      ? {
          userId: session.user.id,
          username: session.user.username,
          image: session.user.image,
        }
      : null;

  const { socket, connected } = useSocket(identity);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/stats", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setTotalUsers(d.totalUsers))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onPresence = (d: { online: number }) => setOnline(d.online);
    const onMatched = (d: { roomId: string; partner: Partner }) => {
      setPartner(d.partner);
      setRoomId(d.roomId);
      setView("chat");
    };
    const onWaiting = () => setView("searching");

    socket.on("presence", onPresence);
    socket.on("matched", onMatched);
    socket.on("waiting", onWaiting);

    return () => {
      socket.off("presence", onPresence);
      socket.off("matched", onMatched);
      socket.off("waiting", onWaiting);
    };
  }, [socket]);

  function findJinn() {
    if (!socket) return;
    setView("searching");
    socket.emit("find");
  }

  function cancelSearch() {
    socket?.emit("cancel");
    setView("lobby");
  }

  function leaveChat() {
    socket?.emit("leave");
    setPartner(null);
    setRoomId(null);
    setView("lobby");
  }

  function findNew() {
    socket?.emit("leave");
    setPartner(null);
    setRoomId(null);
    findJinn();
  }

  if (status === "loading") {
    return (
      <Center>
        <div className="text-zinc-500 animate-pulse text-sm font-medium tracking-widest uppercase">Loading</div>
      </Center>
    );
  }

  if (!session) {
    return (
      <Center>
        <LandingHero
          online={online}
          totalUsers={totalUsers}
          cta={
            <div className="w-full mt-10 flex justify-center">
              <button
                onClick={() => signIn("google")}
                className="w-full max-w-[260px] flex items-center justify-center gap-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-full px-5 py-3.5 border border-zinc-700/50 transition-all hover:scale-[1.02]"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
          }
        />
      </Center>
    );
  }

  if (!session.user.username) {
    return (
      <Center>
        <SetUsername onDone={() => {}} />
      </Center>
    );
  }

  if (view === "chat" && partner && socket) {
    return (
      <ChatWindow
        socket={socket}
        partner={partner}
        roomId={roomId ?? undefined}
        onLeave={leaveChat}
        onFindNew={findNew}
      />
    );
  }

  return (
    <Center>
      {/* Floating Premium Header (Glassy) */}
      <div className="absolute top-6 w-full px-4 flex justify-center z-50">
        <div className="flex items-center justify-between w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-full py-2 px-3 shadow-2xl">
          <div className="flex items-center gap-2.5">
            <Avatar
              name={session.user.username}
              image={session.user.image}
              size={32}
            />
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">@{session.user.username}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all px-4 py-2 rounded-full border border-zinc-700/50"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Lobby Area (Pure Black, NO CARD) */}
      <div className={`w-full max-w-md px-4 flex flex-col items-center text-center relative z-10 ${view === "searching" ? "mt-0 justify-center h-full" : "mt-12"}`}>

        {view !== "searching" && (
          <div className="animate-fadeUp flex flex-col items-center w-full">
            <JinnLogo />
            <h1 className="text-[36px] font-black text-white tracking-tighter mt-5 leading-none">Gupto Chat</h1>
            <p className="text-zinc-400 mt-2.5 text-[15px] font-medium">
              Ready to talk? Summon a jinn to begin.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-12 mt-10 w-full">
              <div className="flex flex-col items-center">
                <div className="text-[28px] font-bold text-white flex items-center gap-2 tracking-tight">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  {connected ? online : "—"}
                </div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Active Jinns</span>
              </div>
              <div className="w-px h-10 bg-zinc-800/80" />
              <div className="flex flex-col items-center">
                <div className="text-[28px] font-bold text-white tracking-tight">{totalUsers ?? "—"}</div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Total Users</span>
              </div>
            </div>
          </div>
        )}

        <div className={`${view === "searching" ? "mt-0" : "mt-12"} w-full flex justify-center`}>
          {view === "searching" ? (
            <div className="flex flex-col items-center animate-fadeUp">
              {/* Advanced Summoning Animation */}
              <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-t-2 border-white/20 animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border-r-2 border-l-2 border-white/40 animate-[spin_1.5s_linear_infinite_reverse]" />
                <div className="absolute inset-4 rounded-full bg-white/5 animate-pulse shadow-[0_0_30px_rgba(255,255,255,0.1)]" />
                <JinnLogo large />
              </div>
              <p className="text-zinc-300 font-medium tracking-widest uppercase text-xs">Summoning a Jinn...</p>

              {/* Highlighted Cancel Button */}
              <button
                onClick={cancelSearch}
                className="mt-8 px-6 py-2.5 bg-red-500/10 text-red-400 text-[14px] font-bold tracking-wide rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)] active:scale-95"
              >
                Cancel Search
              </button>
            </div>
          ) : (
            <button
              onClick={findJinn}
              disabled={!connected}
              className="w-full max-w-[260px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white disabled:opacity-50 disabled:hover:bg-zinc-800 border border-zinc-700/50 transition-all font-semibold rounded-full py-3.5 text-[15px] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {connected ? (
                <>
                  Connect a jinn
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              ) : (
                "Connecting..."
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom navigation — hidden while searching to keep focus */}
      {view !== "searching" && <BottomNav onOpen={setSheet} />}

      {sheet && <AccountSheet tab={sheet} onClose={() => setSheet(null)} />}
    </Center>
  );
}

function LandingHero({ online, totalUsers, cta }: { online: number; totalUsers: number | null; cta: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm px-4 flex flex-col items-center text-center">
      <div className="flex justify-center mb-6">
        <JinnLogo large />
      </div>
      <h1 className="text-[40px] font-black text-white tracking-tighter leading-[1.1] w-full">
        Anonymous <br />
        <span className="text-zinc-500">Conversations.</span>
      </h1>
      <p className="text-zinc-400 mt-4 text-[15px] font-medium leading-relaxed w-full">
        Connect with a random jinn instantly. <br />
        No history. Total privacy.
      </p>

      <div className="flex items-center justify-center gap-10 mt-10 text-white w-full">
        <div className="flex flex-col items-center">
          <div className="text-[26px] font-bold text-white flex items-center gap-2 tracking-tight">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
            {online || "—"}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-1 font-bold">Active</div>
        </div>
        <div className="w-px h-10 bg-zinc-800" />
        <div className="flex flex-col items-center">
          <div className="text-[26px] font-bold text-white tracking-tight">{totalUsers ?? "—"}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-1 font-bold">Users</div>
        </div>
      </div>

      <div className="w-full flex justify-center mt-12">
        {cta}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-full w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* 2026 Premium Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06)_0%,transparent_50%)] pointer-events-none" />
      <div className="relative z-10 w-full flex justify-center h-full items-center">
        {children}
      </div>
    </main>
  );
}

// Sleek Abstract Logo
function JinnLogo({ large = false }: { large?: boolean }) {
  const size = large ? 64 : 48;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="mx-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.7.436 3.297 1.201 4.692L2 22l5.308-1.201A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="white" fillOpacity="0.05" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="12" r="1.5" fill="white" />
      <circle cx="16" cy="12" r="1.5" fill="white" />
      <path d="M10 16c.6.4 1.4.4 2 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C39.9 35.7 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

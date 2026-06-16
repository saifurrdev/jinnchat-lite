"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Message, Partner, ReplyRef } from "@/types/chat";
import { Avatar } from "./Avatar";

const REACTIONS = ["❤️", "👍", "👎", "🔥", "🥰", "😂", "😮", "😢"];

// Apple (iPhone) style emoji images via the open emoji-datasource-apple set.
const EMOJI_MAP: Record<string, string> = {
  "❤️": "2764-fe0f",
  "👍": "1f44d",
  "👎": "1f44e",
  "🔥": "1f525",
  "🥰": "1f970",
  "😂": "1f602",
  "😮": "1f62e",
  "😢": "1f622",
};

function CustomEmoji({ emoji, size = 24 }: { emoji: string; size?: number }) {
  const code = EMOJI_MAP[emoji];
  if (!code) return <span className="emoji-tg">{emoji}</span>;
  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${code}.png`}
      alt={emoji}
      width={size}
      height={size}
      className="inline-block drop-shadow-md pointer-events-none"
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
}

function uid() {
  return crypto.randomUUID();
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWindow({
  socket,
  partner,
  roomId,
  onLeave,
  onFindNew,
}: {
  socket: Socket;
  partner: Partner;
  roomId?: string;
  onLeave: () => void;
  onFindNew: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyRef>(null);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [reactMenuFor, setReactMenuFor] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (m: {
      id: string;
      text: string;
      replyTo: ReplyRef;
      ts: number;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: m.id,
          text: m.text,
          mine: false,
          ts: m.ts,
          replyTo: m.replyTo,
          myReaction: null,
          theirReaction: null,
          status: "sent",
        },
      ]);
      setPartnerTyping(false);
      socket.emit("read", { ids: [m.id] });
    };

    const onDelivered = ({ id }: { id: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id && msg.status === "sending"
            ? { ...msg, status: "sent" }
            : msg
        )
      );
    };

    const onTyping = (t: boolean) => setPartnerTyping(t);

    const onReaction = ({ messageId, emoji }: { messageId: string; emoji: string | null }) => {
      // partner reacted — only update *their* reaction, never touch mine
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, theirReaction: emoji } : msg))
      );
    };

    const onRead = ({ ids }: { ids: string[] }) => {
      const set = new Set(ids);
      setMessages((prev) =>
        prev.map((msg) => (msg.mine && set.has(msg.id) ? { ...msg, status: "read" } : msg))
      );
    };

    const onPartnerLeft = (data?: { roomId?: string }) => {
      if (data?.roomId && roomId && data.roomId !== roomId) return;
      setPartnerLeft(true);
      setPartnerTyping(false);
    };

    socket.on("message", onMessage);
    socket.on("delivered", onDelivered);
    socket.on("typing", onTyping);
    socket.on("reaction", onReaction);
    socket.on("read", onRead);
    socket.on("partner_left", onPartnerLeft);

    return () => {
      socket.off("message", onMessage);
      socket.off("delivered", onDelivered);
      socket.off("typing", onTyping);
      socket.off("reaction", onReaction);
      socket.off("read", onRead);
      socket.off("partner_left", onPartnerLeft);
    };
  }, [socket, roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, partnerTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  function sendTyping(isTyping: boolean) {
    if (lastTypingSent.current === isTyping) return;
    lastTypingSent.current = isTyping;
    socket.emit("typing", isTyping);
  }

  function handleInputChange(v: string) {
    setInput(v);
    if (partnerLeft) return;
    sendTyping(v.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 1500);
  }

  function send() {
    const text = input.trim();
    if (!text || partnerLeft) return;
    const id = uid();
    const reply: ReplyRef = replyTo
      ? { id: replyTo.id, text: replyTo.text, author: replyTo.author }
      : null;

    setMessages((prev) => [
      ...prev,
      {
        id,
        text,
        mine: true,
        ts: Date.now(),
        replyTo: reply,
        myReaction: null,
        theirReaction: null,
        status: "sending",
      },
    ]);
    socket.emit("message", { id, text, replyTo: reply });
    setInput("");
    setReplyTo(null);
    sendTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }

  function react(messageId: string, emoji: string) {
    setMessages((prev) => {
      const target = prev.find((m) => m.id === messageId);
      const next = target?.myReaction === emoji ? null : emoji;
      socket.emit("reaction", { messageId, emoji: next });
      return prev.map((msg) => (msg.id === messageId ? { ...msg, myReaction: next } : msg));
    });
    setReactMenuFor(null);
  }

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-black shadow-2xl relative">
      {/* Premium Glassy Header */}
      <header className="absolute top-0 w-full flex items-center gap-3 px-3 h-16 bg-[#0c0c0f]/80 backdrop-blur-2xl border-b border-white/[0.08] text-white shrink-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <button
          onClick={onLeave}
          className="text-[#0A7CFF] hover:bg-[#0A7CFF]/10 rounded-full p-2 -ml-1 transition-colors active:scale-90"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="relative shrink-0">
          <Avatar name={partner.username} image={partner.image} size={40} />
          {!partnerLeft && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0c0c0f] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          )}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-semibold text-[16px] truncate tracking-tight">{partner.username}</div>
          <div className="text-[12px] font-medium h-4">
            {partnerLeft ? (
              <span className="text-zinc-500">left the chat</span>
            ) : (
              <span className="text-zinc-400">online</span>
            )}
          </div>
        </div>
        <button
          onClick={onFindNew}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#0A7CFF] bg-[#0A7CFF]/[0.12] hover:bg-[#0A7CFF]/20 transition-colors rounded-full px-3.5 py-2 border border-[#0A7CFF]/20 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          New
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto tg-scroll tg-wallpaper-dark px-3 pt-20 pb-4 sm:px-6"
        onClick={() => setReactMenuFor(null)}
      >
        <div className="flex flex-col gap-1">
          <div className="self-center mb-6 mt-4 flex items-center gap-2 bg-black/40 border border-white/[0.06] text-zinc-400 text-[11px] font-semibold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            End-to-End Encrypted
          </div>

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped = prev && prev.mine === m.mine;
            return (
              <MessageBubble
                key={m.id}
                m={m}
                grouped={!!grouped}
                partner={partner}
                showMenu={reactMenuFor === m.id}
                onOpenMenu={() => setReactMenuFor((cur) => (cur === m.id ? null : m.id))}
                onReact={(emoji) => react(m.id, emoji)}
                onReply={() => setReplyTo({ id: m.id, text: m.text, author: m.mine ? "me" : "them" })}
              />
            );
          })}

          {partnerTyping && !partnerLeft && (
            <div className="flex items-end gap-2 mt-2 animate-fadeUp">
              <div className="bg-white/[0.09] backdrop-blur-xl border border-white/[0.12] rounded-2xl rounded-bl-md px-4 py-3 shadow-lg flex gap-1">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="absolute bottom-[68px] w-full flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-xl border-t border-white/10 animate-fadeUp z-10">
          <div className="w-1 self-stretch bg-[#766ac8] rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="text-[#766ac8] text-[13px] font-bold tracking-tight">
              Reply to {replyTo.author === "me" ? "yourself" : partner.username}
            </div>
            <div className="text-zinc-400 text-[13px] truncate font-medium mt-0.5">{replyTo.text}</div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
            aria-label="Cancel reply"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Composer Footer */}
      <footer className="bg-[#0c0c0f]/85 backdrop-blur-2xl border-t border-white/[0.08] px-3 py-3 flex items-end gap-2.5 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {partnerLeft ? (
          <button
            onClick={onFindNew}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/50 font-semibold transition-all rounded-full py-3.5 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Connect a new jinn
          </button>
        ) : (
          <>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message…"
              className="flex-1 resize-none max-h-32 px-5 py-3 rounded-[1.5rem] bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] text-white placeholder-zinc-500 focus:bg-white/[0.1] focus:border-[#0A7CFF]/60 outline-none text-[15px] font-medium tg-scroll transition-colors shadow-inner"
            />
            <button
              onClick={send}
              onPointerDown={(e) => e.preventDefault()}
              disabled={!input.trim()}
              className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-[#2A97FF] to-[#0A7CFF] hover:from-[#3aa0ff] hover:to-[#1a86ff] disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white transition-all flex items-center justify-center shadow-[0_4px_16px_rgba(10,124,255,0.45)] disabled:shadow-none active:scale-90"
              aria-label="Send"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 11l18-8-8 18-2-7-8-3z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function MessageBubble({
  m,
  grouped,
  partner,
  showMenu,
  onOpenMenu,
  onReact,
  onReply,
}: {
  m: Message;
  grouped: boolean;
  partner: Partner;
  showMenu: boolean;
  onOpenMenu: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  return (
    <div className={`group flex ${m.mine ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-3"} ${m.myReaction || m.theirReaction ? "mb-3" : ""}`}>
      <div className="relative max-w-[82%]">
        {/* reaction menu */}
        {showMenu && (
          <div
            className={`absolute -top-14 z-30 flex flex-nowrap w-max items-center gap-2.5 bg-[#181818]/95 backdrop-blur-xl border border-[#333] rounded-full shadow-2xl px-4 py-2 animate-pop ${
              m.mine ? "right-0" : "left-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="hover:scale-125 transition-transform origin-bottom flex items-center justify-center"
              >
                <CustomEmoji emoji={e} size={26} />
              </button>
            ))}
          </div>
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          onDoubleClick={() => onReact("❤️")}
          className={`relative px-3.5 py-2 cursor-pointer select-none font-medium ${
            m.mine
              ? "bg-gradient-to-b from-[#2A97FF] to-[#0A7CFF] text-white rounded-2xl rounded-br-md shadow-[0_2px_8px_rgba(10,124,255,0.35)]"
              : "bg-white/[0.09] backdrop-blur-xl border border-white/[0.12] text-zinc-50 rounded-2xl rounded-bl-md shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          }`}
        >
          {m.replyTo && (
            <div
              className={`mb-1.5 pl-2.5 border-l-2 rounded-sm text-[13px] py-1 pr-3 flex flex-col ${
                m.mine ? "border-white/60 bg-white/10" : "border-[#2A97FF] bg-[#2A97FF]/10"
              }`}
            >
              <div className={`font-bold tracking-tight ${m.mine ? "text-white" : "text-[#5AB0FF]"}`}>
                {m.replyTo.author === "me" ? (m.mine ? "You" : partner.username) : (m.mine ? partner.username : "You")}
              </div>
              <div className={`truncate ${m.mine ? "text-white/80" : "text-zinc-400"}`}>{m.replyTo.text}</div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-3">
            <span className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</span>
            <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold translate-y-0.5 self-end ${m.mine ? "text-white/70" : "text-zinc-500"}`}>
              {fmtTime(m.ts)}
              {m.mine && <Ticks status={m.status} />}
            </span>
          </div>

          {/* quick reply button on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReply();
            }}
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-[#222] border border-[#333] text-zinc-400 hover:text-white shadow-lg rounded-full p-2 ${
              m.mine ? "-left-12" : "-right-12"
            }`}
            aria-label="Reply"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M10 9V5l-7 7 7 7v-4c5 0 8 1.5 10 5 0-7-3-11-10-11z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* reaction badges — mine and partner's are tracked separately.
            When both react, they overlap iPhone-style (the second one sits on top). */}
        {(m.myReaction || m.theirReaction) && (
          <div
            className={`absolute -bottom-3.5 ${
              m.mine ? "right-3" : "left-3"
            } z-10 flex items-center`}
          >
            {m.theirReaction && (
              <span className="relative z-0">
                <ReactionPill emoji={m.theirReaction} highlighted={false} />
              </span>
            )}
            {m.myReaction && (
              <span className={`relative z-10 ${m.theirReaction ? "-ml-3" : ""}`}>
                <ReactionPill emoji={m.myReaction} highlighted={true} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReactionPill({ emoji, highlighted }: { emoji: string; highlighted: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full pl-1 pr-2 py-1 animate-pop shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-[#0c0c0f] ${
        highlighted
          ? "bg-gradient-to-b from-[#8a7ee0] to-[#766ac8]"
          : "bg-gradient-to-b from-[#2a2a2a] to-[#1c1c1c]"
      }`}
    >
      <CustomEmoji emoji={emoji} size={17} />
      <span
        className={`text-[11px] font-bold leading-none ${
          highlighted ? "text-white" : "text-zinc-300"
        }`}
      >
        1
      </span>
    </div>
  );
}

function Ticks({ status }: { status: Message["status"] }) {
  if (status === "sending") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" className="text-white/50">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={status === "read" ? "text-emerald-400" : "text-white/60"}>
      <path d="M2 12.5l3.5 3.5L13 8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16l1 1L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

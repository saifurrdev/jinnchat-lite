"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function SetUsername({ onDone }: { onDone: () => void }) {
  const { update } = useSession();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      await update(); // refresh session so it now carries the username
      onDone();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-4 flex flex-col items-center text-center relative z-10">
      <div className="flex justify-center mb-6">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="1.5"></circle>
        </svg>
      </div>

      <h1 className="text-[36px] font-black text-white tracking-tighter mt-2 leading-none">Pick a username</h1>
      <p className="text-zinc-400 mt-3 text-[15px] font-medium">
        This is how other jinns will see you.
      </p>

      <div className="mt-10 flex items-center w-full rounded-2xl bg-zinc-900 border border-zinc-800 focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 overflow-hidden transition-all shadow-inner">
        <span className="pl-5 pr-1 text-zinc-500 text-lg font-bold">@</span>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="username"
          maxLength={20}
          className="flex-1 py-4 pr-4 outline-none text-[16px] bg-transparent text-white placeholder:text-zinc-600 font-medium"
        />
      </div>

      {error && <p className="text-red-400 text-sm mt-4 font-medium">{error}</p>}

      <button
        onClick={submit}
        disabled={loading || username.trim().length < 3}
        className="mt-8 w-full max-w-[260px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white disabled:opacity-50 disabled:hover:bg-zinc-800 border border-zinc-700/50 transition-all font-semibold rounded-full py-3.5 text-[15px] hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
      <p className="text-zinc-600 text-[10px] mt-6 text-center font-bold uppercase tracking-widest">
        3–20 chars · Letters, Nums, Underscore
      </p>
    </div>
  );
}

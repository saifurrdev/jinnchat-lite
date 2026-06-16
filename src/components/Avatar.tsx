"use client";

// Telegram-style circular avatar. Falls back to a colored initial.
const COLORS = [
  "bg-gradient-to-b from-[#ff885e] to-[#ff516a]",
  "bg-gradient-to-b from-[#ffcd6a] to-[#ffa85c]",
  "bg-gradient-to-b from-[#82b1ff] to-[#665fff]",
  "bg-gradient-to-b from-[#a0de7e] to-[#54cb68]",
  "bg-gradient-to-b from-[#53edd6] to-[#28c9b7]",
  "bg-gradient-to-b from-[#72d5fd] to-[#2a9ef1]",
  "bg-gradient-to-b from-[#e0a2f3] to-[#d669ed]",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  const initial = (name?.[0] || "?").toUpperCase();
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center text-white font-medium ${colorFor(
        name || "?"
      )}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

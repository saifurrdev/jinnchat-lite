import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          // Telegram palette
          header: "#527da3",
          headerDark: "#3c5b78",
          out: "#effdde", // outgoing bubble
          outDark: "#e3f7c8",
          in: "#ffffff", // incoming bubble
          link: "#168acd",
          bg: "#d6e4ef",
          accent: "#3390ec",
          tick: "#4fae4e",
        },
      },
      fontFamily: {
        tg: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        pop: "pop 0.15s ease-out",
        fadeUp: "fadeUp 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

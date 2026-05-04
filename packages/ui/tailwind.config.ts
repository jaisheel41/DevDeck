import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "'SF Mono'", "'Fira Code'", "'Cascadia Code'",
          "var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace",
        ],
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.45" },
          "50%": { transform: "scale(1.65)", opacity: "0" },
        },
        "pulse-ring-subtle": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.22" },
          "50%": { transform: "scale(1.45)", opacity: "0" },
        },
        "log-in": {
          from: { opacity: "0", transform: "translateX(-3px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-in-out infinite",
        "pulse-ring-subtle": "pulse-ring-subtle 3s ease-in-out infinite",
        "log-in": "log-in 100ms ease-out",
        blink: "blink 0.8s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;

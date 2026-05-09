import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "system-ui", "sans-serif"],
      },
      colors: {
        bg: {
          primary: "rgb(var(--bg-primary-rgb) / <alpha-value>)",
          card: "rgb(var(--bg-card-rgb) / <alpha-value>)",
          "card-hover": "rgb(var(--bg-card-hover-rgb) / <alpha-value>)",
          raised: "rgb(var(--bg-raised-rgb) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-rgb) / <alpha-value>)",
          bright: "rgb(var(--border-bright-rgb) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
          faint: "rgb(var(--text-faint-rgb) / <alpha-value>)",
        },
        accent: {
          info: "rgb(var(--accent-info-rgb) / <alpha-value>)",
          warn: "rgb(var(--accent-warn-rgb) / <alpha-value>)",
          bad: "rgb(var(--accent-bad-rgb) / <alpha-value>)",
          ok: "rgb(var(--accent-ok-rgb) / <alpha-value>)",
        },
        ink: "#ffffff",
        paper: "#050607",
        library: "#8dded7",
        prescription: "#8dded7",
      },
      boxShadow: {
        glass: "0 24px 80px rgb(0 0 0 / 0.38), inset 0 1px 0 rgb(255 255 255 / 0.06)",
        panel: "0 18px 44px rgb(0 0 0 / 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

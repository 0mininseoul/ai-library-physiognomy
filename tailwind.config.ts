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
        card: "var(--card)",
        ring: "var(--ring)",
        input: "var(--input)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        popover: "var(--popover)",
        destructive: "var(--destructive)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        ink: "rgb(var(--text-primary-rgb) / <alpha-value>)",
        paper: "rgb(var(--bg-primary-rgb) / <alpha-value>)",
        library: "rgb(var(--accent-info-rgb) / <alpha-value>)",
      },
      boxShadow: {
        glass: "var(--shadow-glass)",
        panel: "var(--shadow-panel)",
      },
    },
  },
  plugins: [],
};

export default config;

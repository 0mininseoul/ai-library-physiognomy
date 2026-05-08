import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1d1b20",
        paper: "#fbfaf7",
        library: "#244c46",
        prescription: "#d55b3e",
      },
    },
  },
  plugins: [],
};

export default config;

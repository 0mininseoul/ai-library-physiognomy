"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "라이트 테마로 전환" : "다크 테마로 전환"}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className={[
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-bg-card/70 px-3 text-sm font-black text-text-primary shadow-glass backdrop-blur-xl transition hover:border-border-bright hover:bg-bg-card-hover",
        className,
      ].join(" ")}
    >
      {isDark ? <Moon className="h-4 w-4 text-accent-info" aria-hidden="true" /> : <SunMedium className="h-4 w-4 text-accent-info" aria-hidden="true" />}
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}


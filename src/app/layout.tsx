import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 관상가 고양이",
  description: "고양이 관상가가 얼굴과 성향 신호를 읽어주는 캠퍼스 큐레이션 서비스",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/brand/ai-library-logo.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const stored = localStorage.getItem("ai-library-theme"); const theme = stored === "dark" ? "dark" : "light"; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch (_) { document.documentElement.dataset.theme = "light"; document.documentElement.style.colorScheme = "light"; } })();`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

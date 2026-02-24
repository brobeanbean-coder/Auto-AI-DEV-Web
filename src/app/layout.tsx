import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto AI DEV",
  description: "GPT · Claude · Gemini가 토론하며 자동으로 웹사이트를 만들어 줍니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

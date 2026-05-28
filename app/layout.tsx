import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "건강이음",
  description: "지역 의료 취약도와 의료 접근성을 한눈에 보는 공공데이터 기반 대시보드"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

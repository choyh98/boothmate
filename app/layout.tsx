import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "부스메이트",
    template: "%s | 부스메이트"
  },
  description: "전시부스 견적 요청부터 업체 비교까지 연결하는 B2B 중개 플랫폼"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

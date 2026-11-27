import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F4F0",
};

export const metadata: Metadata = {
  title: "SIDE B // 026 — Unsent Notes & Soundtrack Archive",
  description:
    "An editorial archive of unsent transmissions, synced lyrics, mixtapes, and 24-hour frequencies.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#F4F4F0] antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F4F0] text-[#111111]">{children}</body>
    </html>
  );
}
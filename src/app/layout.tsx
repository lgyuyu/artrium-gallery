import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "星玥艺术 · 学生线上画展",
  description: "星玥艺术 — 让每个孩子都拥有属于自己的画展。360° VR 沉浸式线上展厅。",
  keywords: ["星玥艺术", "画展", "VR展厅", "线上画展", "儿童美术", "学生作品"],
  authors: [{ name: "星玥艺术" }],
  icons: {
    icon: "/logo-xingyue.png",
    apple: "/logo-xingyue.png",
  },
  openGraph: {
    title: "星玥艺术 · 学生线上画展",
    description: "让每个孩子都拥有属于自己的画展 — 360° VR 沉浸式线上展厅",
    siteName: "星玥艺术",
    type: "website",
    images: ["/logo-xingyue.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

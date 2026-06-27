import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "艺境美术 ARTRIUM · 学生线上画展",
  description: "艺境美术 ARTRIUM — 让每个孩子都拥有属于自己的画展。360° VR 沉浸式线上展厅。",
  keywords: ["艺境美术", "ARTRIUM", "画展", "VR展厅", "线上画展", "儿童美术", "学生作品"],
  authors: [{ name: "艺境美术 ARTRIUM" }],
  icons: {
    icon: "/logo-artium.png",
    apple: "/logo-artium.png",
  },
  openGraph: {
    title: "艺境美术 ARTRIUM · 学生线上画展",
    description: "让每个孩子都拥有属于自己的画展 — 360° VR 沉浸式线上展厅",
    siteName: "艺境美术 ARTRIUM",
    type: "website",
    images: ["/logo-artium.png"],
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

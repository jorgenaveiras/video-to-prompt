import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video to Veo Prompt Generator",
  description: "Sube un video (3-30s) y genera un prompt optimizado para Google Veo",
  keywords: ["video", "prompt", "veo", "google", "ai", "generative", "video generation"],
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-900">{children}</body>
    </html>
  );
}
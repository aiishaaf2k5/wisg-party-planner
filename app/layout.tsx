import "./globals.css";
import TopBar from "@/components/TopBar";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import InstallAppPrompt from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "IWSG Event Management",
  description: "Intercultural Women's Support Group event planning app.",
  applicationName: "IWSG Event Management",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IWSG",
  },
};

export const viewport: Viewport = {
  themeColor: "#ec4899",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50 text-gray-900">
        <PwaRegister />
        <InstallAppPrompt />
        <TopBar />
        {children}
      </body>
    </html>
  );
}

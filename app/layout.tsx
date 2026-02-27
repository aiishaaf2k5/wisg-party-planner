import "./globals.css";
import TopBar from "@/components/TopBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50 text-gray-900">
        <TopBar />
        {children}
      </body>
    </html>
  );
}

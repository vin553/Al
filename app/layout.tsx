import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/top-nav";
import { COMPANY } from "@/lib/seed-data";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: `${COMPANY.name} — Booking & Operations`,
  description:
    "Booking calendar, scheduling, revenue and cleaner utilisation for Mei Myanmar Cleaning Services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="flex min-h-screen flex-col">
            <TopNav />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
              {COMPANY.name} · internal booking &amp; operations console
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

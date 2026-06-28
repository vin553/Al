import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/top-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SG Wedding Intel — Singapore Luxury Indian Wedding Market",
  description:
    "Market intelligence platform for Singapore's luxury Indian wedding segment. Pricing, positioning, and SWOT across six vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex min-h-screen flex-col">
            <TopNav />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
              SG Wedding Intel · built for market ops · data collected {new Date().getFullYear()}
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

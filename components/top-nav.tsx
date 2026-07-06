"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles } from "lucide-react";
import { COMPANY } from "@/lib/seed-data";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Jobs" },
  { href: "/cleaners", label: "Cleaners" },
  { href: "/customers", label: "Customers" },
  { href: "/grow", label: "Grow" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-8 flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="hidden sm:inline">{COMPANY.shortName}</span>
          <span className="sm:hidden">{COMPANY.shortName}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/bookings?new=1"
            className="hidden rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
          >
            + New booking
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

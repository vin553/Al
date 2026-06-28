"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon, Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/positioning", label: "Positioning" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-8 flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded bg-foreground text-background"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span>SG Wedding Intel</span>
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
        <div className="ml-auto flex items-center gap-1">
          <a
            href="https://github.com"
            aria-label="GitHub"
            className="hidden rounded-md p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground sm:inline-flex"
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

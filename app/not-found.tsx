import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Nothing here.</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The vendor or view you requested isn&apos;t in the database.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

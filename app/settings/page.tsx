import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnection } from "@/lib/google";
import { CalendarCheck2, CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentOrigin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const conn = getConnection();
  const origin = currentOrigin();
  const redirectUri = `${origin}/api/google/callback`;

  return (
    <div className="container max-w-3xl space-y-8 py-8">
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="Connect external services so your bookings stay in sync everywhere."
      />

      {searchParams.connected && (
        <Banner tone="success">Google Calendar connected. New bookings will sync automatically.</Banner>
      )}
      {searchParams.error === "notconfigured" && (
        <Banner tone="error">
          Google Calendar isn’t configured on the server yet. Follow the setup steps below.
        </Banner>
      )}
      {searchParams.error && searchParams.error !== "notconfigured" && (
        <Banner tone="error">
          Couldn’t complete the Google connection ({searchParams.error}). Please try again.
        </Banner>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <StatusPill conn={conn} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            When connected, every booking you create is added to your Google Calendar in real time —
            with the customer, cleaner, address, and time — and removed if you delete the booking.
          </p>

          {/* CONNECTED */}
          {conn.configured && conn.connected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-emerald-500/5 px-4 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>
                  Connected as <span className="font-medium">{conn.email}</span>
                </span>
              </div>
              <form action="/api/google/disconnect" method="post">
                <button
                  type="submit"
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Disconnect
                </button>
              </form>
            </div>
          )}

          {/* CONFIGURED, NOT YET CONNECTED */}
          {conn.configured && !conn.connected && (
            <a
              href="/api/google/connect"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <CalendarCheck2 className="h-4 w-4" />
              Connect Google Calendar
            </a>
          )}

          {/* NOT CONFIGURED — setup guide */}
          {!conn.configured && (
            <div className="space-y-4 rounded-md border bg-muted/30 p-4 text-sm">
              <p className="font-medium">One-time setup (server admin)</p>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>
                  In{" "}
                  <a
                    className="inline-flex items-center gap-1 text-foreground underline"
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Cloud Console → Credentials <ExternalLink className="h-3 w-3" />
                  </a>
                  , create an <span className="font-medium">OAuth client ID</span> of type{" "}
                  <span className="font-medium">Web application</span>.
                </li>
                <li>
                  Add this exact <span className="font-medium">Authorized redirect URI</span>:
                  <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-foreground">
                    {redirectUri}
                  </code>
                </li>
                <li>
                  Enable the <span className="font-medium">Google Calendar API</span> for the project.
                </li>
                <li>
                  Set these environment variables on the host (Render → Environment), then redeploy:
                  <code className="mt-1 block rounded bg-background px-2 py-1 text-foreground">
                    GOOGLE_CLIENT_ID = …
                    <br />
                    GOOGLE_CLIENT_SECRET = …
                  </code>
                </li>
              </ol>
              <p className="text-muted-foreground">
                Once those are set, this page will show a{" "}
                <span className="font-medium">Connect Google Calendar</span> button.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ conn }: { conn: { configured: boolean; connected: boolean } }) {
  if (conn.connected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <CircleAlert className="h-3.5 w-3.5" />
      {conn.configured ? "Not connected" : "Not configured"}
    </span>
  );
}

function Banner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
          : "rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
      }
    >
      {children}
    </div>
  );
}

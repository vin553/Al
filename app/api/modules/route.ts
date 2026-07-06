import { NextResponse } from "next/server";
import { getModule } from "@/lib/modules";
import { getUnlockedKeys, growthProgress, setUnlocked } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ unlocked: getUnlockedKeys(), progress: growthProgress() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    action?: "unlock" | "lock";
  };
  if (!body.key || !getModule(body.key)) {
    return NextResponse.json({ error: "Unknown module" }, { status: 400 });
  }
  if (body.action !== "unlock" && body.action !== "lock") {
    return NextResponse.json({ error: "action must be unlock or lock" }, { status: 400 });
  }
  setUnlocked(body.key, body.action === "unlock");
  return NextResponse.json({ unlocked: getUnlockedKeys(), progress: growthProgress() });
}

import { PageHeader } from "@/components/page-header";
import { GrowClient } from "@/components/grow-client";
import { MODULES, PLAN, SALES_CALL_URL } from "@/lib/modules";
import { getUnlockedKeys, growthProgress } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function GrowPage() {
  const unlocked = getUnlockedKeys();
  const progress = growthProgress();

  return (
    <div className="container max-w-6xl space-y-8 py-8">
      <PageHeader
        eyebrow="Grow your business"
        title="Plan & add-ons"
        description="Your base plan runs the day-to-day. Switch on add-on modules as you grow — payments, customer growth, field ops, team, and insights."
      />
      <GrowClient
        modules={MODULES}
        unlocked={unlocked}
        progress={progress}
        plan={PLAN}
        salesUrl={SALES_CALL_URL}
      />
    </div>
  );
}

import { PageHeader } from "@/components/page-header";
import { GrowClient } from "@/components/grow-client";
import { MODULES } from "@/lib/modules";
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
        title="Tools & upgrades"
        description="Unlock modules as you grow. Each tool you switch on levels up your business and adds new capabilities — payments, loyalty, staff, and more."
      />
      <GrowClient modules={MODULES} unlocked={unlocked} progress={progress} />
    </div>
  );
}

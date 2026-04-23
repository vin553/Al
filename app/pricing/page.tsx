import { PageHeader } from "@/components/page-header";
import { PricingHeatmap } from "@/components/pricing-heatmap";
import { getDataset } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const { vendors } = getDataset();
  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Pricing intelligence"
        title="Where everyone charges, across every tier."
        description="Normalised to SGD per guest at 150 pax where a vendor only quotes package pricing. Darker = more expensive."
      />
      <div className="mt-8">
        <PricingHeatmap vendors={vendors} />
      </div>
    </div>
  );
}

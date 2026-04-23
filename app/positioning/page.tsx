import { PageHeader } from "@/components/page-header";
import { PositioningMap } from "@/components/positioning-map";
import { getDataset } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function PositioningPage() {
  const { vendors } = getDataset();
  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Positioning map"
        title="Price vs. breadth — where does each vendor sit?"
        description="X: median wedding spend (SGD, log scale). Y: service breadth (0–10, covering 17 verticals). Bubble size: Instagram reach."
      />
      <div className="mt-8">
        <PositioningMap vendors={vendors} />
      </div>
    </div>
  );
}

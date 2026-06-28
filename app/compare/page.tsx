import { PageHeader } from "@/components/page-header";
import { CompareMatrix } from "@/components/compare-matrix";
import { getDataset } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  const { vendors } = getDataset();
  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Competitor matrix"
        title="Sort, filter, and compare every vendor."
        description="Click a column header to sort. Toggle service chips to filter. Row highlights the leader per metric."
      />
      <div className="mt-8">
        <CompareMatrix vendors={vendors} />
      </div>
    </div>
  );
}

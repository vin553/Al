import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/types";

const MAP: Record<BookingStatus, { label: string; variant: "success" | "info" | "muted" }> = {
  confirmed: { label: "Confirmed", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

import { Badge } from "@/components/ui/badge";
import type { JobStatus, PaymentStatus } from "@/lib/types";

const JOB: Record<JobStatus, { label: string; variant: "success" | "info" | "muted" }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

const PAY: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  done: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  unbilled: { label: "Unbilled", variant: "muted" },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const s = JOB[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = PAY[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { BookingDialog } from "@/components/booking-dialog";
import { formatSgd } from "@/lib/utils";
import { formatDateShort, formatTime12 } from "@/lib/dates";
import type { BookingDetail, Cleaner, Customer, JobStatus, PaymentStatus } from "@/lib/types";
import { Mail, Plus } from "lucide-react";

interface Props {
  bookings: BookingDetail[];
  cleaners: Cleaner[];
  customers: Customer[];
  hourlyRate: number;
  openNew?: boolean;
}

export function BookingsClient({ bookings, cleaners, customers, hourlyRate, openNew }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(!!openNew);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [payFilter, setPayFilter] = useState<"all" | PaymentStatus>("all");

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (statusFilter === "all" ? true : b.jobStatus === statusFilter))
      .filter((b) => (payFilter === "all" ? true : b.paymentStatus === payFilter))
      .filter((b) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          b.customer.name.toLowerCase().includes(q) ||
          b.customer.code.toLowerCase().includes(q) ||
          b.cleaner.name.toLowerCase().includes(q) ||
          b.cleaner.code.toLowerCase() === q
        );
      })
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [bookings, query, statusFilter, payFilter]);

  async function patch(id: string, body: Record<string, string>) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search customer, code, cleaner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-36">
          <option value="all">All jobs</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={payFilter} onChange={(e) => setPayFilter(e.target.value as typeof payFilter)} className="w-36">
          <option value="all">All payments</option>
          <option value="done">Paid</option>
          <option value="pending">Pending</option>
          <option value="unbilled">Unbilled</option>
        </Select>
        <Button className="ml-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New booking
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date / Time</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Cleaner</th>
              <th className="px-4 py-3 text-right font-medium">Hrs</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-t hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-medium">{formatDateShort(b.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime12(b.startTime)}–{formatTime12(b.endTime)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ background: b.cleaner.color }} />
                    {b.customer.name}
                    {b.emailSent && <Mail className="h-3 w-3 text-emerald-500" aria-label="Emailed" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{b.customer.code || b.customer.phone}</div>
                </td>
                <td className="px-4 py-3">{b.cleaner.code}</td>
                <td className="px-4 py-3 text-right tabular-nums">{b.hours}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatSgd(b.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.jobStatus} />
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge status={b.paymentStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {b.jobStatus === "scheduled" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(b.id, { jobStatus: "completed" })}>
                        Complete
                      </Button>
                    )}
                    {b.paymentStatus !== "done" && b.jobStatus !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(b.id, { paymentStatus: "done" })}>
                        Mark paid
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No jobs match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <BookingDialog
          cleaners={cleaners}
          customers={customers}
          hourlyRate={hourlyRate}
          onClose={() => {
            setDialogOpen(false);
            router.refresh();
          }}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

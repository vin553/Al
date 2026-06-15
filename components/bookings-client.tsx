"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { BookingDialog } from "@/components/booking-dialog";
import { formatSgd } from "@/lib/utils";
import { formatDateShort, formatTime12 } from "@/lib/dates";
import type { BookingDetail, BookingStatus, Cleaner, Customer, Package } from "@/lib/types";
import { Mail, Plus } from "lucide-react";

interface Props {
  bookings: BookingDetail[];
  packages: Package[];
  cleaners: Cleaner[];
  customers: Customer[];
  openNew?: boolean;
}

export function BookingsClient({ bookings, packages, cleaners, customers, openNew }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(!!openNew);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (statusFilter === "all" ? true : b.status === statusFilter))
      .filter((b) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          b.customer.name.toLowerCase().includes(q) ||
          b.package.name.toLowerCase().includes(q) ||
          b.cleaner.name.toLowerCase().includes(q) ||
          b.cleaner.code.toLowerCase() === q
        );
      })
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [bookings, query, statusFilter]);

  async function setStatus(id: string, status: BookingStatus) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search customer, package, cleaner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-40"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
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
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Cleaner</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Email</th>
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
                  <div className="font-medium">{b.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{b.customer.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: b.package.color }}
                  />
                  {b.package.name}
                </td>
                <td className="px-4 py-3">
                  {b.cleaner.code} · {b.cleaner.name}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatSgd(b.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3">
                  {b.emailSent ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Mail className="h-3.5 w-3.5" /> Sent
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {b.status === "confirmed" && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "completed")}>
                        Complete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "cancelled")}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No bookings match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <BookingDialog
          packages={packages}
          cleaners={cleaners}
          customers={customers}
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BookingDialog } from "@/components/booking-dialog";
import { formatSgd } from "@/lib/utils";
import {
  addDays,
  formatDateShort,
  formatTime12,
  startOfWeek,
  toMinutes,
  today,
  weekDates,
} from "@/lib/dates";
import type { BookingDetail, Cleaner, Customer } from "@/lib/types";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Props {
  bookings: BookingDetail[];
  cleaners: Cleaner[];
  customers: Customer[];
  hourlyRate: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i); // 7am–8pm slots

export function CalendarClient({ bookings, cleaners, customers, hourlyRate }: Props) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(startOfWeek(today()));
  const [cleanerFilter, setCleanerFilter] = useState("all");
  const [dialog, setDialog] = useState<{ date: string; startTime: string } | null>(null);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const todayStr = today();

  const visible = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.jobStatus !== "cancelled" &&
          b.date >= days[0] &&
          b.date <= days[6] &&
          (cleanerFilter === "all" || b.cleanerId === cleanerFilter)
      ),
    [bookings, days, cleanerFilter]
  );

  const byCell = useMemo(() => {
    const map = new Map<string, BookingDetail[]>();
    for (const b of visible) {
      const hour = Math.floor(toMinutes(b.startTime) / 60);
      const key = `${b.date}|${hour}`;
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [visible]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(todayStr))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium">
          {formatDateShort(days[0])} – {formatDateShort(days[6])}
        </div>
        <Select value={cleanerFilter} onChange={(e) => setCleanerFilter(e.target.value)} className="ml-auto w-44">
          <option value="all">All cleaners</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {cleaners.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
            {c.code}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b bg-muted/40 text-xs">
            <div className="px-2 py-2" />
            {days.map((d) => (
              <div
                key={d}
                className={`px-2 py-2 text-center font-medium ${d === todayStr ? "text-primary" : "text-muted-foreground"}`}
              >
                {formatDateShort(d)}
              </div>
            ))}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b last:border-b-0">
              <div className="px-2 py-2 text-right text-[11px] text-muted-foreground">
                {formatTime12(`${String(hour).padStart(2, "0")}:00`)}
              </div>
              {days.map((d) => {
                const cell = byCell.get(`${d}|${hour}`) ?? [];
                const startTime = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={d + hour}
                    className="group relative min-h-[52px] border-l p-1"
                    role="button"
                    onClick={() => setDialog({ date: d, startTime })}
                  >
                    {cell.map((b) => (
                      <div
                        key={b.id}
                        className="mb-1 rounded-md px-1.5 py-1 text-[11px] leading-tight text-white shadow-sm"
                        style={{ background: b.cleaner.color }}
                        title={`${b.customer.name} · ${b.cleaner.name} · ${formatTime12(b.startTime)}–${formatTime12(b.endTime)} · ${formatSgd(b.amount)}`}
                      >
                        <div className="font-semibold">
                          {formatTime12(b.startTime)} {b.cleaner.code}
                        </div>
                        <div className="truncate opacity-90">{b.customer.name}</div>
                      </div>
                    ))}
                    {cell.length === 0 && (
                      <div className="absolute inset-0 hidden items-center justify-center text-muted-foreground group-hover:flex">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: click any empty slot to start a booking pre-filled with that day and time. Blocks are coloured by cleaner.
      </p>

      {dialog && (
        <BookingDialog
          cleaners={cleaners}
          customers={customers}
          hourlyRate={hourlyRate}
          initial={{ date: dialog.date, startTime: dialog.startTime }}
          onClose={() => {
            setDialog(null);
            router.refresh();
          }}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

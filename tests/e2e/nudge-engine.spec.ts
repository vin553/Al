import { expect, test } from "@playwright/test";
import type { Task } from "../../lib/focus-types";
import { addDays, buildDigest, buildReport, computeStreak, daysBetween, formatDayLabel, rankTasks, toDay } from "../../lib/nudge";
import { parseCalendarSources, parseIcs } from "../../lib/focus-sync";

// Fixed "now": 2026-09-19 10:00 in Singapore (02:00 UTC).
const NOW = new Date("2026-09-19T02:00:00Z");
const TODAY = "2026-09-19";

let seq = 0;
function task(over: Partial<Task>): Task {
  seq += 1;
  const created = new Date(NOW.getTime() - seq * 60_000).toISOString();
  return {
    id: `t${seq}`,
    title: `Task ${seq}`,
    notes: "",
    entity: "alangkaar",
    priority: "p2",
    status: "todo",
    dueOn: null,
    estimateMin: null,
    source: "manual",
    externalId: null,
    externalUrl: null,
    createdAt: created,
    updatedAt: created,
    touchedAt: created,
    completedAt: null,
    snoozeCount: 0,
    ...over,
  };
}

test.describe("Nudge engine (pure)", () => {
  test("date helpers work in Singapore time", () => {
    expect(toDay(NOW)).toBe(TODAY);
    // 23:30 UTC on the 18th is already the 19th in Singapore.
    expect(toDay(new Date("2026-09-18T23:30:00Z"))).toBe(TODAY);
    expect(addDays(TODAY, 1)).toBe("2026-09-20");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(daysBetween("2026-09-15", TODAY)).toBe(4);
    expect(formatDayLabel(TODAY, TODAY)).toBe("Today");
    expect(formatDayLabel("2026-09-17", TODAY)).toBe("2d overdue");
    expect(formatDayLabel("2026-09-22", TODAY)).toBe("In 3d");
  });

  test("classifies overdue, due today, due soon and stale", () => {
    const tasks = [
      task({ title: "Late", dueOn: "2026-09-17" }),
      task({ title: "Today", dueOn: TODAY }),
      task({ title: "Soon", dueOn: "2026-09-21" }),
      task({ title: "Far", dueOn: "2026-10-15" }),
      task({ title: "Stale", touchedAt: "2026-09-10T00:00:00Z" }),
      task({ title: "Done earlier today", status: "done", completedAt: "2026-09-19T01:00:00Z" }),
    ];
    const r = buildReport(tasks, NOW);
    expect(r.overdue.map((t) => t.title)).toEqual(["Late"]);
    expect(r.dueToday.map((t) => t.title)).toEqual(["Today"]);
    expect(r.dueSoon.map((t) => t.title)).toEqual(["Soon"]);
    expect(r.stale.map((t) => t.title)).toEqual(["Stale"]);
    expect(r.doneToday.map((t) => t.title)).toEqual(["Done earlier today"]);
    expect(r.openCount).toBe(5);
    expect(r.focusNow[0].title).toBe("Late");
    expect(r.pressure).toBeGreaterThan(0);
  });

  test("ranks overdue before priority, then priority, then due date", () => {
    const tasks = [
      task({ title: "P3 late", priority: "p3", dueOn: "2026-09-10" }),
      task({ title: "P1 today", priority: "p1", dueOn: TODAY }),
      task({ title: "P1 soon", priority: "p1", dueOn: "2026-09-25" }),
      task({ title: "P2 no date", priority: "p2" }),
    ];
    expect(rankTasks(tasks, TODAY).map((t) => t.title)).toEqual(["P3 late", "P1 today", "P1 soon", "P2 no date"]);
  });

  test("streak counts consecutive days and survives an empty today", () => {
    const done = (day: string) => task({ status: "done", completedAt: `${day}T05:00:00Z` });
    expect(computeStreak([done("2026-09-18"), done("2026-09-17"), done("2026-09-15")], TODAY)).toBe(2);
    expect(computeStreak([done("2026-09-19"), done("2026-09-18")], TODAY)).toBe(2);
    expect(computeStreak([done("2026-09-16")], TODAY)).toBe(0);
    expect(computeStreak([], TODAY)).toBe(0);
  });

  test("entity health drops with overdue work and idles at 60 when empty", () => {
    const r = buildReport([task({ entity: "nikkah", dueOn: "2026-09-01" }), task({ entity: "nikkah", dueOn: "2026-09-02" })], NOW);
    const nikkah = r.entities.find((e) => e.entity === "nikkah")!;
    const ivory = r.entities.find((e) => e.entity === "ivory")!;
    expect(nikkah.overdue).toBe(2);
    expect(nikkah.health).toBeLessThan(ivory.health);
    expect(ivory.health).toBe(60);
  });

  test("digests name the tasks and change with the time of day", () => {
    const tasks = [
      task({ title: "Send Ivory quote", entity: "ivory", priority: "p1", dueOn: "2026-09-17" }),
      task({ title: "Publish nikkah reels", entity: "nikkah", dueOn: TODAY, snoozeCount: 3 }),
      task({ title: "Booked AV", entity: "prime", status: "done", completedAt: "2026-09-19T01:00:00Z" }),
    ];
    const r = buildReport(tasks, NOW);
    const morning = buildDigest("morning", r);
    expect(morning.subject).toContain("1 overdue");
    expect(morning.body).toContain("OVERDUE (1)");
    expect(morning.body).toContain("Send Ivory quote (Ivory)");
    expect(morning.body).toContain("DO THESE THREE FIRST");

    const midday = buildDigest("midday", r);
    expect(midday.body).toContain("You keep pushing these back");
    expect(midday.body).toContain("snoozed 3×");

    const evening = buildDigest("evening", r);
    expect(evening.body).toContain("✓ Booked AV (Prime)");
    expect(evening.body).toContain("SLIPPED (2)");
  });

  test("ICS parser handles folding, all-day and zoned events", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:a@example.com",
      "SUMMARY:Site visit\\, Phuket",
      "DTSTART;TZID=Asia/Singapore:20260919T143000",
      "DTEND;TZID=Asia/Singapore:20260919T153000",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:b@example.com",
      "SUMMARY:Very long summary that",
      "  continues on the next line",
      "DTSTART;VALUE=DATE:20260920",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:c@example.com",
      "SUMMARY:UTC call",
      "DTSTART:20260919T020000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = parseIcs(ics);
    expect(events).toHaveLength(3);
    expect(events[0].title).toBe("Site visit, Phuket");
    expect(events[0].startsAt).toBe("2026-09-19T06:30:00.000Z");
    expect(events[0].allDay).toBe(false);
    expect(events[1].title).toBe("Very long summary that continues on the next line");
    expect(events[1].allDay).toBe(true);
    expect(toDay(events[1].startsAt)).toBe("2026-09-20");
    expect(events[2].startsAt).toBe("2026-09-19T02:00:00.000Z");

    expect(parseCalendarSources("Work=https://x.test/a.ics, https://calendar.google.com/b.ics")).toEqual([
      { name: "Work", url: "https://x.test/a.ics" },
      { name: "calendar.google.com", url: "https://calendar.google.com/b.ics" },
    ]);
  });
});

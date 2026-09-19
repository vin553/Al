import type { Metadata } from "next";
import { FocusBoard } from "@/components/focus/focus-board";
import { completionHistogram, listRecentTasks } from "@/lib/focus-db";
import { currentReport } from "@/lib/focus-report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Focus — Alangkaar Group",
  description: "One board for every entity. Tracks what is due, flags what slipped, and pushes the next three things.",
};

export default function FocusPage() {
  const tasks = listRecentTasks(14);
  const report = currentReport();
  const histogram = completionHistogram(14);
  return <FocusBoard initialTasks={tasks} initialReport={report} initialHistogram={histogram} />;
}

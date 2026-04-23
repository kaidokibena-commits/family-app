export type Frequency = "always" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface Task {
  id: string;
  label: string;
  icon: string;
  frequency: Frequency;
  week_start_day: number | null;
  sort_order: number;
}

export interface Member {
  id: string;
  name: string;
  sort_order: number;
}

export interface ChoreEntry {
  id: string;
  person: string;
  task: string;
  minutes: number;
  earnings: number;
  timestamp: number;
  weekKey: string;
}

export interface WeeklyStats {
  person: string;
  totalEarnings: number;
  totalMinutes: number;
  entries: ChoreEntry[];
}

export interface HistoricalWeek {
  weekStart: string; // "YYYY-MM-DD"
  weekLabel: string;
  stats: Record<string, { earnings: number; minutes: number }>;
}

// ── Colour palettes ───────────────────────────────────────────────────────────
// Strings must be full literals so Tailwind doesn't purge them.

const TASK_COLORS = [
  "bg-pink-600 hover:bg-pink-500 border-pink-400",
  "bg-blue-600 hover:bg-blue-500 border-blue-400",
  "bg-cyan-600 hover:bg-cyan-500 border-cyan-400",
  "bg-amber-600 hover:bg-amber-500 border-amber-400",
  "bg-orange-600 hover:bg-orange-500 border-orange-400",
  "bg-emerald-600 hover:bg-emerald-500 border-emerald-400",
  "bg-violet-600 hover:bg-violet-500 border-violet-400",
  "bg-rose-600 hover:bg-rose-500 border-rose-400",
  "bg-indigo-600 hover:bg-indigo-500 border-indigo-400",
  "bg-teal-600 hover:bg-teal-500 border-teal-400",
];

const MEMBER_COLORS = [
  { bar: "bg-blue-500",   glow: "shadow-blue-500/30",   text: "text-blue-400" },
  { bar: "bg-pink-500",   glow: "shadow-pink-500/30",   text: "text-pink-400" },
  { bar: "bg-teal-500",   glow: "shadow-teal-500/30",   text: "text-teal-400" },
  { bar: "bg-violet-500", glow: "shadow-violet-500/30", text: "text-violet-400" },
  { bar: "bg-amber-500",  glow: "shadow-amber-500/30",  text: "text-amber-400" },
  { bar: "bg-emerald-500",glow: "shadow-emerald-500/30",text: "text-emerald-400" },
  { bar: "bg-rose-500",   glow: "shadow-rose-500/30",   text: "text-rose-400" },
  { bar: "bg-orange-500", glow: "shadow-orange-500/30", text: "text-orange-400" },
];

export function getTaskColor(index: number): string {
  return TASK_COLORS[index % TASK_COLORS.length];
}

export function getMemberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().split("T")[0];
}


export function getEstonianDateStr(timestamp: number = Date.now()): string {
  return new Date(timestamp).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Tallinn",
  });
}

function getEstonianDayOfWeek(timestamp: number = Date.now()): number {
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Tallinn",
    weekday: "short",
  }).format(new Date(timestamp));
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dayStr] ?? 0;
}

export function getPeriodStartStr(
  frequency: Frequency,
  weekStartDay: number = 6
): string {
  const now = Date.now();
  const todayStr = getEstonianDateStr(now);

  if (frequency === "daily" || frequency === "always") return todayStr;

  if (frequency === "weekly") {
    const dayOfWeek = getEstonianDayOfWeek(now);
    const daysBack = (dayOfWeek - weekStartDay + 7) % 7;
    const [y, m, d] = todayStr.split("-").map(Number);
    const periodStart = new Date(Date.UTC(y, m - 1, d - daysBack));
    return periodStart.toISOString().split("T")[0];
  }

  return todayStr;
}

export function isTaskDue(
  frequency: Frequency,
  weekStartDay: number | null,
  lastCompletionTimestamp: number | null
): boolean {
  if (frequency === "always") return true;
  if (lastCompletionTimestamp === null) return true;
  const periodStart = getPeriodStartStr(frequency, weekStartDay ?? 6);
  const lastDone = getEstonianDateStr(lastCompletionTimestamp);
  return lastDone < periodStart;
}


export function frequencyLabel(frequency: string, weekStartDay?: number | null): string {
  switch (frequency) {
    case "always":    return "Alati";
    case "daily":     return "Iga päev";
    case "weekly":    return weekStartDay === 6 ? "Kord nädalas (laupäevast)" : "Kord nädalas";
    case "monthly":   return "Kord kuus";
    case "quarterly": return "Kord kvartalis";
    case "yearly":    return "Kord aastas";
    default:          return frequency;
  }
}

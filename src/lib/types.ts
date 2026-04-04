export type Person = "Dad" | "Child 1" | "Child 2";

export interface ChoreEntry {
  id: string;
  person: Person;
  task: string;
  minutes: number;
  earnings: number;
  timestamp: number;
  weekKey: string;
}

export interface WeeklyStats {
  person: Person;
  totalEarnings: number;
  totalMinutes: number;
  entries: ChoreEntry[];
}

export const TASKS = [
  { label: "Clean Room", color: "bg-violet-600 hover:bg-violet-500 border-violet-400" },
  { label: "Empty Dishwasher", color: "bg-sky-600 hover:bg-sky-500 border-sky-400" },
  { label: "Walk Dog", color: "bg-emerald-600 hover:bg-emerald-500 border-emerald-400" },
  { label: "Laundry", color: "bg-amber-600 hover:bg-amber-500 border-amber-400" },
  { label: "Set Table", color: "bg-rose-600 hover:bg-rose-500 border-rose-400" },
] as const;

export const PEOPLE: Person[] = ["Dad", "Child 1", "Child 2"];

export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
  return d.toISOString().split("T")[0];
}

export function calcEarnings(minutes: number): number {
  return (minutes / 15) * 1;
}

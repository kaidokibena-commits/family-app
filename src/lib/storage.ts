import { ChoreEntry, WeeklyStats, PEOPLE, Person, getWeekKey } from "./types";

const STORAGE_KEY = "family-chores-v1";

export function loadEntries(): ChoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: ChoreEntry): void {
  const entries = loadEntries();
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getWeeklyStats(weekKey?: string): WeeklyStats[] {
  const key = weekKey ?? getWeekKey();
  const entries = loadEntries().filter((e) => e.weekKey === key);

  return PEOPLE.map((person) => {
    const personEntries = entries.filter((e) => e.person === person);
    return {
      person,
      totalEarnings: personEntries.reduce((sum, e) => sum + e.earnings, 0),
      totalMinutes: personEntries.reduce((sum, e) => sum + e.minutes, 0),
      entries: personEntries,
    };
  });
}

export function clearWeek(weekKey: string): void {
  const entries = loadEntries().filter((e) => e.weekKey !== weekKey);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

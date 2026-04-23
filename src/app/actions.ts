"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  Task, Member, WeeklyStats, HistoricalWeek, Frequency,
  getWeekKey, getEstonianDateStr,
} from "@/lib/types";

async function getDb() {
  return createServerSupabase();
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function logEntry(member_name: string, task_name: string) {
  const db = await getDb();
  const { error } = await db
    .from("logs")
    .insert({ member_name, task_name, minutes: 0, earnings: 2 });
  if (error) console.error("logEntry error:", error.message);
}

export async function fetchWeeklyStats(): Promise<WeeklyStats[]> {
  const db = await getDb();
  const weekStart = getWeekStartUTC();
  const [logsRes, membersRes] = await Promise.all([
    db
      .from("logs")
      .select("id, created_at, member_name, task_name, minutes, earnings")
      .gte("created_at", weekStart.toISOString())
      .order("created_at", { ascending: false }),
    db.from("members").select("name").order("sort_order"),
  ]);

  const logs = logsRes.data ?? [];
  const members = membersRes.data?.map((m) => m.name) ?? [];
  const weekKey = getWeekKey();

  return members.map((person) => {
    const rows = logs.filter((r) => r.member_name === person);
    const entries = rows.map((r) => ({
      id: r.id,
      person: r.member_name,
      task: r.task_name,
      minutes: r.minutes,
      earnings: r.earnings,
      timestamp: new Date(r.created_at).getTime(),
      weekKey,
    }));
    return {
      person,
      totalEarnings: entries.reduce((s, e) => s + e.earnings, 0),
      totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
      entries,
    };
  });
}

export async function fetchLastCompletions(): Promise<Record<string, number>> {
  const db = await getDb();
  const { data, error } = await db
    .from("logs")
    .select("task_name, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return {};
  const result: Record<string, number> = {};
  for (const row of data) {
    if (!(row.task_name in result)) {
      result[row.task_name] = new Date(row.created_at).getTime();
    }
  }
  return result;
}

export async function resetWeek(): Promise<void> {
  const db = await getDb();
  const weekStart = getWeekStartUTC();
  const { error } = await db
    .from("logs")
    .delete()
    .gte("created_at", weekStart.toISOString());
  if (error) console.error("resetWeek error:", error.message);
}

export async function fetchHistoricalStats(): Promise<HistoricalWeek[]> {
  const db = await getDb();
  const currentWeekStart = getWeekStartUTC().toISOString();

  const { data, error } = await db
    .from("logs")
    .select("member_name, earnings, minutes, created_at")
    .lt("created_at", currentWeekStart)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const weeks: Record<string, HistoricalWeek> = {};

  for (const row of data) {
    const weekStart = getWeekKey(new Date(row.created_at));
    if (!weeks[weekStart]) {
      weeks[weekStart] = {
        weekStart,
        weekLabel: formatWeekLabel(weekStart),
        stats: {},
      };
    }
    const w = weeks[weekStart];
    if (!w.stats[row.member_name]) {
      w.stats[row.member_name] = { earnings: 0, minutes: 0 };
    }
    w.stats[row.member_name].earnings += row.earnings;
    w.stats[row.member_name].minutes += row.minutes;
  }

  return Object.values(weeks).sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("tasks")
    .select("id, label, icon, frequency, week_start_day, sort_order")
    .order("label");
  if (error || !data) return [];
  return data as Task[];
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  const { error } = await db.from("logs").delete().eq("id", id);
  if (error) console.error("deleteEntry error:", error.message);
}

export async function createTask(
  label: string,
  icon: string,
  frequency: Frequency,
  weekStartDay: number | null
): Promise<void> {
  const db = await getDb();
  const { data: existing } = await db
    .from("tasks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db
    .from("tasks")
    .insert({ label, icon, frequency, week_start_day: weekStartDay, sort_order });
  if (error) console.error("createTask error:", error.message);
}

export async function updateTask(
  id: string,
  label: string,
  icon: string,
  frequency: Frequency,
  weekStartDay: number | null
): Promise<void> {
  const db = await getDb();
  const { error } = await db
    .from("tasks")
    .update({ label, icon, frequency, week_start_day: weekStartDay })
    .eq("id", id);
  if (error) console.error("updateTask error:", error.message);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) console.error("deleteTask error:", error.message);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function fetchMembers(): Promise<Member[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("members")
    .select("id, name, sort_order")
    .order("sort_order");
  if (error || !data) return [];
  return data as Member[];
}

export async function createMember(name: string): Promise<void> {
  const db = await getDb();
  const { data: existing } = await db
    .from("members")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await db
    .from("members")
    .insert({ name, sort_order });
  if (error) console.error("createMember error:", error.message);
}

export async function updateMember(id: string, name: string): Promise<void> {
  const db = await getDb();
  const { error } = await db
    .from("members")
    .update({ name })
    .eq("id", id);
  if (error) console.error("updateMember error:", error.message);
}

export async function deleteMember(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.from("member_emails").delete().eq("member_name", name);
  const { error } = await db.from("members").delete().eq("id", id);
  if (error) console.error("deleteMember error:", error.message);
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function saveEmail(member_name: string, email: string): Promise<void> {
  const db = await getDb();
  const { error } = await db
    .from("member_emails")
    .upsert({ member_name, email }, { onConflict: "member_name" });
  if (error) console.error("saveEmail error:", error.message);
}

export async function fetchEmails(): Promise<Record<string, string>> {
  const db = await getDb();
  const { data, error } = await db
    .from("member_emails")
    .select("member_name, email");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.member_name, r.email]));
}

// ── Calendar / Unavailable dates ──────────────────────────────────────────────

export async function fetchUnavailableDates(
  year: number,
  month: number
): Promise<{ member_name: string; date: string }[]> {
  const db = await getDb();
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${year}-${pad(month)}-01`;
  const endDate = `${year}-${pad(month)}-31`;
  const { data, error } = await db
    .from("unavailable_dates")
    .select("member_name, date")
    .gte("date", startDate)
    .lte("date", endDate);
  if (error || !data) return [];
  return data;
}

export async function toggleUnavailableDate(
  member_name: string,
  date: string
): Promise<void> {
  const db = await getDb();
  const { data } = await db
    .from("unavailable_dates")
    .select("id")
    .eq("member_name", member_name)
    .eq("date", date)
    .maybeSingle();

  if (data) {
    await db
      .from("unavailable_dates")
      .delete()
      .eq("member_name", member_name)
      .eq("date", date);
  } else {
    await db
      .from("unavailable_dates")
      .insert({ member_name, date });
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getWeekStartUTC(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - now.getUTCDay());
  return now;
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00Z");
  const end = new Date(weekStart + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("et-EE", {
      timeZone: "Europe/Tallinn",
      day: "numeric",
      month: "short",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

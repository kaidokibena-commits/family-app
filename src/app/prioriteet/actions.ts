"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

export type BenefitType = "monetary" | "relationship" | "health" | "personal";

export interface PriorityTask {
  id: string;
  activity: string;
  duration: number;
  why: string;
  deadline: string | null;
  benefit_type: BenefitType;
  benefit_score: number;
  cost: number;
  completed_at: string | null;
  completion_summary: string | null;
  created_at: string;
}

export interface Recommendation {
  winner_id: string | null;
  winner_activity: string;
  reasoning: string;
  updated_at: string;
}

const ai = new Anthropic();

async function invalidateCache() {
  const db = await createServerSupabase();
  await db.from("priority_cache").upsert({ id: 1, tasks_hash: "" }, { onConflict: "id" });
}

export async function fetchActiveTasks(): Promise<PriorityTask[]> {
  const db = await createServerSupabase();
  const { data } = await db
    .from("priority_tasks")
    .select("*")
    .is("completed_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as PriorityTask[];
}

export async function fetchCompletedTasks(): Promise<PriorityTask[]> {
  const db = await createServerSupabase();
  const { data } = await db
    .from("priority_tasks")
    .select("*")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(10);
  return (data ?? []) as PriorityTask[];
}

export async function createPriorityTask(
  task: Omit<PriorityTask, "id" | "created_at" | "completed_at" | "completion_summary">
): Promise<void> {
  const db = await createServerSupabase();
  const { error } = await db.from("priority_tasks").insert(task);
  if (error) console.error("createPriorityTask:", error.message);
  else await invalidateCache();
}

export async function deletePriorityTask(id: string): Promise<void> {
  const db = await createServerSupabase();
  await db.from("priority_tasks").delete().eq("id", id);
  await invalidateCache();
}

export async function completePriorityTask(
  id: string,
  task: PriorityTask
): Promise<void> {
  const msg = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 100,
    system: "Summarize in 2 sentences why completing this task was worthwhile. Be specific.",
    messages: [{
      role: "user",
      content: `Task: "${task.activity}" (${task.duration}min, €${task.cost}). Why: ${task.why}. Benefit: ${task.benefit_type}, score ${task.benefit_score}/5.`,
    }],
  });
  const summary =
    msg.content[0].type === "text" ? msg.content[0].text.trim() : "Task completed.";
  const db = await createServerSupabase();
  await db
    .from("priority_tasks")
    .update({ completed_at: new Date().toISOString(), completion_summary: summary })
    .eq("id", id);
  await invalidateCache();
}

function urgencyBonus(deadline: string | null): number {
  if (!deadline) return 0;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 100;
  if (days <= 1) return 80;
  if (days <= 3) return 60;
  if (days <= 7) return 40;
  if (days <= 30) return 20;
  return 5;
}

function calcScore(t: PriorityTask): number {
  return (
    t.benefit_score * 20 +
    urgencyBonus(t.deadline) -
    Math.min(t.cost * 0.3, 25) -
    Math.min(t.duration / 60, 5)
  );
}

export async function getTopRecommendation(): Promise<Recommendation | null> {
  const db = await createServerSupabase();
  const tasks = await fetchActiveTasks();
  if (tasks.length === 0) return null;

  const hashInput = tasks
    .map((t) => `${t.id}${t.activity}${t.duration}${t.why}${t.deadline}${t.benefit_type}${t.benefit_score}${t.cost}`)
    .join("|");
  const hash = createHash("md5").update(hashInput).digest("hex");

  const { data: cache } = await db
    .from("priority_cache")
    .select("winner_id, winner_activity, reasoning, tasks_hash, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (cache?.tasks_hash === hash && cache?.winner_activity) {
    return {
      winner_id: cache.winner_id,
      winner_activity: cache.winner_activity,
      reasoning: cache.reasoning,
      updated_at: cache.updated_at,
    };
  }

  const top5 = [...tasks]
    .sort((a, b) => calcScore(b) - calcScore(a))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      act: t.activity,
      dur: t.duration,
      why: t.why,
      dl: t.deadline ?? "none",
      ben: t.benefit_type[0],
      sc: t.benefit_score,
      cost: t.cost,
    }));

  const msg = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    system: 'Pick the single most important task. Reply with valid JSON only, no markdown: {"id":"<id>","reason":"<25 words max>"}',
    messages: [{ role: "user", content: JSON.stringify(top5) }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  let winner_id = top5[0].id;
  let reasoning = "Highest priority by score.";

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.id && tasks.find((t) => t.id === parsed.id)) winner_id = parsed.id;
      if (parsed.reason) reasoning = parsed.reason;
    }
  } catch { /* use defaults */ }

  const winner = tasks.find((t) => t.id === winner_id);
  const winner_activity = winner?.activity ?? top5[0].act;
  const now = new Date().toISOString();

  await db.from("priority_cache").upsert(
    { id: 1, winner_id, winner_activity, reasoning, tasks_hash: hash, updated_at: now },
    { onConflict: "id" }
  );

  return { winner_id, winner_activity, reasoning, updated_at: now };
}

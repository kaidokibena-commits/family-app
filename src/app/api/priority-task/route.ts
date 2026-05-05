import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const secret = req.headers.get("x-api-secret");
  if (secret !== process.env.PRIORITY_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { activity, why, duration } = await req.json();
  if (!activity || !why || !duration) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("priority_tasks").insert({
    activity: String(activity),
    why: String(why),
    duration: Number(duration),
    benefit_type: "personal",
    benefit_score: 3,
    cost: 0,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("priority_cache")
    .upsert({ id: 1, tasks_hash: "" }, { onConflict: "id" });

  return NextResponse.json({ ok: true });
}

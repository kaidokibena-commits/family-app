"use server";

import { supabase } from "@/lib/supabase";

export async function logEntry(
  member_name: string,
  task_name: string,
  minutes: number,
  earnings: number
) {
  const { error } = await supabase
    .from("logs")
    .insert({ member_name, task_name, minutes, earnings });

  if (error) {
    console.error("Supabase insert error:", error.message);
  }
}

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createServerSupabase();
  const headersList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    headersList.get("origin") ??
    `https://${headersList.get("host")}` ??
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("OAuth error:", error.message);
    redirect("/login?error=oauth");
  }

  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

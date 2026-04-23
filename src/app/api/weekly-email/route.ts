import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
// members loaded from DB below

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  // Verify this request comes from Vercel cron
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getPreviousWeekRange();

  // Fetch logs for previous week
  const { data: logs, error: logsError } = await supabase
    .from("logs")
    .select("member_name, task_name, minutes, earnings, created_at")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (logsError) {
    console.error("Logs fetch error:", logsError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Fetch member emails
  const { data: emailRows, error: emailError } = await supabase
    .from("member_emails")
    .select("member_name, email");

  if (emailError) {
    console.error("Email fetch error:", emailError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const emailMap = Object.fromEntries(
    (emailRows ?? []).map((r) => [r.member_name, r.email])
  );

  // Fetch active members from DB
  const { data: memberRows } = await supabase
    .from("members")
    .select("name")
    .order("sort_order");
  const memberNames = (memberRows ?? []).map((r) => r.name);

  const weekLabel = formatWeekRange(start, end);
  const results: string[] = [];

  for (const person of memberNames) {
    const email = emailMap[person];
    if (!email) continue;

    const personLogs = (logs ?? []).filter((l) => l.member_name === person);
    const totalEarnings = personLogs.reduce((s, l) => s + l.earnings, 0);
    const totalMinutes = personLogs.reduce((s, l) => s + l.minutes, 0);

    const { error } = await resend.emails.send({
      from: "Family App <onboarding@resend.dev>",
      to: email,
      subject: `Sinu nädalane kokkuvõte — ${weekLabel}`,
      html: buildEmailHtml(person, totalEarnings, totalMinutes, personLogs, weekLabel),
    });

    if (error) {
      results.push(`${person} → VIGA: ${error.message}`);
    } else {
      results.push(`${person} → ${email} ✓`);
    }
  }

  return NextResponse.json({ sent: results });
}

function getPreviousWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  // This week's Sunday midnight UTC
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - end.getUTCDay());
  // Previous week's Sunday midnight UTC
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}

function formatWeekRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("et-EE", {
      timeZone: "Europe/Tallinn",
      day: "numeric",
      month: "long",
    });
  const endDay = new Date(end);
  endDay.setUTCDate(endDay.getUTCDate() - 1); // Saturday
  return `${fmt(start)} – ${fmt(endDay)}`;
}

function buildEmailHtml(
  person: string,
  totalEarnings: number,
  totalMinutes: number,
  logs: { task_name: string; minutes: number; earnings: number }[],
  weekLabel: string
): string {
  const taskRows = logs
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;">${l.task_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;text-align:right;">${l.minutes} min</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;text-align:right;color:#4ade80;">$${l.earnings.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const noActivity = logs.length === 0
    ? `<p style="color:#6b7280;text-align:center;padding:24px 0;">Sel nädalal ülesandeid ei täidetud.</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:500px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;">
    <div style="background:#6d28d9;padding:32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:900;">Perekonna ülesanded</h1>
      <p style="margin:8px 0 0;opacity:0.8;">Nädalane kokkuvõte — ${weekLabel}</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;margin:0 0 8px;">Tere, <strong>${person}</strong>!</p>
      <p style="color:#9ca3af;margin:0 0 24px;">Siin on sinu eelmise nädala tulemus.</p>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#0f172a;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#4ade80;">$${totalEarnings.toFixed(2)}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">teenitud</div>
        </div>
        <div style="flex:1;background:#0f172a;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#60a5fa;">${totalMinutes}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">minutit töötatud</div>
        </div>
      </div>

      ${logs.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="color:#6b7280;font-size:12px;text-transform:uppercase;">
            <th style="padding:8px 12px;text-align:left;">Ülesanne</th>
            <th style="padding:8px 12px;text-align:right;">Aeg</th>
            <th style="padding:8px 12px;text-align:right;">Tulu</th>
          </tr>
        </thead>
        <tbody>${taskRows}</tbody>
      </table>` : noActivity}
    </div>
    <div style="padding:16px 32px;background:#0f172a;text-align:center;color:#4b5563;font-size:12px;">
      Perekonna ülesannete rakendus
    </div>
  </div>
</body>
</html>`;
}

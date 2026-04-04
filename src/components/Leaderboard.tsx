"use client";

import { WeeklyStats, Person } from "@/lib/types";

interface LeaderboardProps {
  stats: WeeklyStats[];
  onReset: () => void;
}

const medals = ["🥇", "🥈", "🥉"];

const personColors: Record<Person, { bar: string; glow: string; text: string }> = {
  "Dad": { bar: "bg-blue-500", glow: "shadow-blue-500/30", text: "text-blue-400" },
  "Child 1": { bar: "bg-pink-500", glow: "shadow-pink-500/30", text: "text-pink-400" },
  "Child 2": { bar: "bg-teal-500", glow: "shadow-teal-500/30", text: "text-teal-400" },
};

export default function Leaderboard({ stats, onReset }: LeaderboardProps) {
  const sorted = [...stats].sort((a, b) => b.totalEarnings - a.totalEarnings);
  const maxEarnings = Math.max(...sorted.map((s) => s.totalEarnings), 1);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col h-full bg-gray-900/50 border-l border-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-black tracking-tight uppercase text-gray-100">
          Weekly Leaderboard
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {fmt(weekStart)} – {fmt(weekEnd)}
        </p>
      </div>

      {/* Rankings */}
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        {sorted.map((stat, i) => {
          const colors = personColors[stat.person];
          const pct = maxEarnings > 0 ? (stat.totalEarnings / maxEarnings) * 100 : 0;

          return (
            <div
              key={stat.person}
              className={`bg-gray-800/80 rounded-2xl p-5 border border-gray-700 shadow-lg ${colors.glow}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{medals[i] ?? "🏅"}</span>
                  <span className="text-xl font-black">{stat.person}</span>
                </div>
                <span className={`text-2xl font-black ${colors.text}`}>
                  ${stat.totalEarnings.toFixed(2)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-gray-500 text-sm">
                {stat.totalMinutes} min across {stat.entries.length} task{stat.entries.length !== 1 ? "s" : ""}
              </p>

              {/* Recent entries */}
              {stat.entries.length > 0 && (
                <div className="mt-3 space-y-1">
                  {stat.entries.slice(-3).reverse().map((e) => (
                    <div key={e.id} className="flex justify-between text-xs text-gray-500">
                      <span>{e.task}</span>
                      <span>{e.minutes}m · +${e.earnings.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset button */}
      <div className="p-6 border-t border-gray-800">
        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-red-900/60 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 text-sm font-semibold transition-all"
        >
          Reset This Week
        </button>
      </div>
    </div>
  );
}

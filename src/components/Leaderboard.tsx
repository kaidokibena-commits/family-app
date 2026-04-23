"use client";

import { useState } from "react";
import { WeeklyStats, Member, ChoreEntry, getMemberColor } from "@/lib/types";
import { deleteEntry } from "@/app/actions";

interface LeaderboardProps {
  stats: WeeklyStats[];
  members: Member[];
  onReset: () => void;
  onChanged: () => void;
}

const medals = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ stats, members, onReset, onChanged }: LeaderboardProps) {
  const sorted = [...stats].sort((a, b) => b.totalEarnings - a.totalEarnings);
  const maxEarnings = Math.max(...sorted.map((s) => s.totalEarnings), 1);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("et-EE", { month: "short", day: "numeric" });

  function colorFor(personName: string) {
    const idx = members.findIndex((m) => m.name === personName);
    return getMemberColor(idx >= 0 ? idx : 0);
  }

  async function handleDelete(id: string) {
    if (!confirm("Kustuta see kirje?")) return;
    await deleteEntry(id);
    onChanged();
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/50 border-l border-gray-800">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-black tracking-tight uppercase text-gray-100">
          Nädala edetabel
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {fmt(weekStart)} – {fmt(weekEnd)}
        </p>
      </div>

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        {sorted.map((stat, i) => {
          const colors = colorFor(stat.person);
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
                  €{stat.totalEarnings.toFixed(2)}
                </span>
              </div>

              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-gray-500 text-sm">
                {stat.entries.length} tegevust
              </p>

              {stat.entries.length > 0 && (
                <div className="mt-3 space-y-1">
                  {[...stat.entries].reverse().map((e: ChoreEntry) => (
                    <div key={e.id} className="flex items-center justify-between text-xs text-gray-500 group">
                      <span className="truncate flex-1">{e.task}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span>+€{e.earnings.toFixed(2)}</span>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors px-0.5"
                          title="Kustuta"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 border-t border-gray-800">
        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-red-900/60 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 text-sm font-semibold transition-all"
        >
          Lähtesta nädal
        </button>
      </div>
    </div>
  );
}

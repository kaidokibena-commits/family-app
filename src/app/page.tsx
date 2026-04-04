"use client";

import { useState, useCallback, useEffect } from "react";
import { TASKS, Person, ChoreEntry, getWeekKey, WeeklyStats } from "@/lib/types";
import { saveEntry, getWeeklyStats, clearWeek } from "@/lib/storage";
import { logEntry } from "@/app/actions";
import NumpadModal from "@/components/NumpadModal";
import Leaderboard from "@/components/Leaderboard";
import ToastNotification from "@/components/ToastNotification";

export default function Dashboard() {
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const refreshStats = useCallback(() => {
    setWeeklyStats(getWeeklyStats());
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  function handleConfirm(person: Person, minutes: number, earnings: number) {
    const entry: ChoreEntry = {
      id: crypto.randomUUID(),
      person,
      task: activeTask!,
      minutes,
      earnings,
      timestamp: Date.now(),
      weekKey: getWeekKey(),
    };
    saveEntry(entry);
    logEntry(person, activeTask!, minutes, earnings);
    setActiveTask(null);
    refreshStats();
    setToast(`${person} earned $${earnings.toFixed(2)} for ${activeTask}!`);
  }

  function handleReset() {
    if (confirm("Reset this week's leaderboard?")) {
      clearWeek(getWeekKey());
      refreshStats();
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* Main chore grid */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-black tracking-tight text-white">
            Family Chores
          </h1>
          <div className="flex-1 h-px bg-gray-800" />
          <p className="text-gray-500 text-lg">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Task grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-5">
          {TASKS.map(({ label, color }, i) => (
            <button
              key={label}
              onClick={() => setActiveTask(label)}
              className={`
                ${color}
                ${i === TASKS.length - 1 && TASKS.length % 2 !== 0 ? "col-span-2" : ""}
                border-2 rounded-3xl
                flex flex-col items-center justify-center gap-3
                text-white font-black
                shadow-lg
                transition-all duration-150
                active:scale-95
                select-none
                cursor-pointer
              `}
            >
              <span className="text-5xl">{taskEmoji(label)}</span>
              <span className="text-3xl tracking-tight">{label}</span>
              <span className="text-sm font-normal text-white/60">Tap to log</span>
            </button>
          ))}
        </div>

        {/* Rate reminder */}
        <p className="text-center text-gray-600 text-sm">
          $1.00 per 15 minutes worked
        </p>
      </main>

      {/* Leaderboard sidebar */}
      <aside className="w-80 flex-shrink-0">
        <Leaderboard stats={weeklyStats} onReset={handleReset} />
      </aside>

      {/* Modal */}
      {activeTask && (
        <NumpadModal
          task={activeTask}
          onConfirm={handleConfirm}
          onCancel={() => setActiveTask(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <ToastNotification
          message={toast}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}

function taskEmoji(task: string): string {
  const map: Record<string, string> = {
    "Clean Room": "🧹",
    "Empty Dishwasher": "🍽️",
    "Walk Dog": "🐕",
    "Laundry": "👕",
    "Set Table": "🥄",
  };
  return map[task] ?? "✅";
}

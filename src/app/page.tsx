"use client";

import { useState, useCallback, useEffect } from "react";
import { Task, Member, WeeklyStats, isTaskDue, getTaskColor, frequencyLabel } from "@/lib/types";
import {
  logEntry, fetchWeeklyStats, fetchLastCompletions, resetWeek,
  fetchTasks, fetchMembers, fetchEmails,
} from "@/app/actions";
import NumpadModal from "@/components/NumpadModal";
import Leaderboard from "@/components/Leaderboard";
import ToastNotification from "@/components/ToastNotification";
import SettingsModal from "@/components/SettingsModal";
import HistoricalStats from "@/components/HistoricalStats";
import Calendar from "@/components/Calendar";
import { signOut } from "@/app/auth-actions";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const refreshData = useCallback(async () => {
    const [allTasks, allMembers, stats, lastDone, emails] = await Promise.all([
      fetchTasks(),
      fetchMembers(),
      fetchWeeklyStats(),
      fetchLastCompletions(),
      fetchEmails(),
    ]);
    setTasks(allTasks);
    setMembers(allMembers);
    setWeeklyStats(stats);
    setMemberEmails(emails);
    const due = allTasks.filter((t) =>
      isTaskDue(t.frequency, t.week_start_day, lastDone[t.label] ?? null)
    );
    setVisibleTasks(due);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60_000);
    return () => clearInterval(interval);
  }, [refreshData]);

  async function handleConfirm(memberName: string) {
    const taskName = activeTask!;
    setActiveTask(null);
    await logEntry(memberName, taskName);
    await refreshData();
    setToast(`${memberName} teenis €2.00 (${taskName})!`);
  }

  async function handleReset() {
    if (confirm("Lähtesta selle nädala tulemused?")) {
      await resetWeek();
      await refreshData();
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:h-screen w-full bg-[#0a0a0f]">
      {/* Task list */}
      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 md:gap-5 overflow-y-auto min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            Perekonna Tegevused
          </h1>
          <div className="flex-1 h-px bg-gray-800 hidden md:block" />
          <button
            onClick={() => setShowCalendar(true)}
            className="text-gray-500 hover:text-white text-xl transition-colors"
            title="Kalender"
          >
            📅
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="text-gray-500 hover:text-white text-xl transition-colors"
            title="Statistika"
          >
            📊
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-500 hover:text-white text-xl transition-colors"
            title="Seaded"
          >
            ⚙️
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className="text-gray-500 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
              title="Logi välja"
            >
              Välju
            </button>
          </form>
          <p className="text-gray-500 text-sm md:text-base">
            {new Date().toLocaleDateString("et-EE", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Task rows */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <span className="text-lg">Laen...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <p className="text-xl font-bold text-gray-300">Tegevusi pole lisatud.</p>
              <p className="text-sm mt-2">Lisa tegevused seadetest.</p>
            </div>
          ) : (
            tasks.map((task, i) => {
              const isDone = !visibleTasks.find((v) => v.id === task.id);
              const color = isDone
                ? "bg-emerald-900/60 hover:bg-emerald-800/70 border-emerald-700"
                : getTaskColor(i);
              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTask(task.label)}
                  className={`
                    ${color}
                    w-full flex items-center gap-4 px-5 py-4
                    border-2 rounded-2xl text-white
                    shadow-lg transition-all duration-150
                    active:scale-[0.98] select-none cursor-pointer text-left
                  `}
                >
                  <span className="text-4xl shrink-0" aria-hidden="true">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg sm:text-xl font-bold leading-tight truncate">{task.label}</div>
                    <div className="text-sm font-normal text-white/60 mt-0.5">
                      {frequencyLabel(task.frequency, task.week_start_day)}
                    </div>
                  </div>
                  {isDone
                    ? <span className="text-emerald-400 text-xl font-bold shrink-0">✓</span>
                    : <span className="text-sm font-normal text-white/40 shrink-0">›</span>
                  }
                </button>
              );
            })
          )}
        </div>
      </main>

      {/* Leaderboard sidebar */}
      <aside className="w-full md:w-80 flex-shrink-0 overflow-y-auto border-t md:border-t-0 border-gray-800">
        <Leaderboard stats={weeklyStats} members={members} onReset={handleReset} onChanged={refreshData} />
      </aside>

      {/* Modals */}
      {activeTask && (
        <NumpadModal
          task={activeTask}
          members={members}
          onConfirm={handleConfirm}
          onCancel={() => setActiveTask(null)}
        />
      )}
      {toast && <ToastNotification message={toast} onDone={() => setToast(null)} />}
      {showSettings && (
        <SettingsModal
          tasks={tasks}
          members={members}
          memberEmails={memberEmails}
          onClose={() => setShowSettings(false)}
          onDataChanged={refreshData}
        />
      )}
      {showHistory && (
        <HistoricalStats members={members} onClose={() => setShowHistory(false)} />
      )}
      {showCalendar && (
        <Calendar members={members} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}

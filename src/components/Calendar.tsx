"use client";

import { useState, useEffect, useCallback } from "react";
import { Member, getMemberColor } from "@/lib/types";
import { fetchUnavailableDates, toggleUnavailableDate } from "@/app/actions";

interface Props {
  members: Member[];
  onClose: () => void;
}

const MONTH_NAMES = [
  "Jaanuar", "Veebruar", "Märts", "Aprill", "Mai", "Juuni",
  "Juuli", "August", "September", "Oktoober", "November", "Detsember",
];

const DAY_NAMES = ["E", "T", "K", "N", "R", "L", "P"];

export default function Calendar({ members, onClose }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [unavailable, setUnavailable] = useState<{ member_name: string; date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadDates = useCallback(async () => {
    const data = await fetchUnavailableDates(year, month);
    setUnavailable(data);
  }, [year, month]);

  useEffect(() => { loadDates(); }, [loadDates]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }

  async function handleToggle(memberName: string, date: string) {
    setToggling(true);
    await toggleUnavailableDate(memberName, date);
    await loadDates();
    setToggling(false);
  }

  // Build calendar grid (Monday-first)
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function dateStr(day: number) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function membersUnavailableOn(day: number) {
    const d = dateStr(day);
    return unavailable.filter((u) => u.date === d).map((u) => u.member_name);
  }

  const selectedUnavailable = selectedDate
    ? unavailable.filter((u) => u.date === selectedDate).map((u) => u.member_name)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <button
            onClick={prevMonth}
            className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
          >
            ‹
          </button>
          <h2 className="text-xl font-black text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-800 shrink-0">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 overflow-y-auto flex-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="border-b border-r border-gray-800/30 min-h-[52px]" />;
            }
            const d = dateStr(day);
            const unavailableMembers = membersUnavailableOn(day);
            const isToday = d === todayStr;
            const isSelected = d === selectedDate;
            const hasUnavailable = unavailableMembers.length > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : d)}
                className={`
                  flex flex-col items-center pt-1.5 pb-1 min-h-[52px] border-b border-r border-gray-800/30
                  transition-colors
                  ${isSelected ? "bg-gray-700" : "hover:bg-gray-800/60"}
                `}
              >
                <span className={`
                  text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-0.5
                  ${isToday ? "bg-violet-600 text-white" : hasUnavailable ? "bg-red-600 text-white" : "text-gray-300"}
                `}>
                  {day}
                </span>
                {hasUnavailable && (
                  <div className="flex flex-wrap justify-center gap-0.5 px-0.5">
                    {unavailableMembers.map((name, mi) => {
                      const idx = members.findIndex((m) => m.name === name);
                      const colors = getMemberColor(idx >= 0 ? idx : mi);
                      return (
                        <span
                          key={name}
                          className={`text-[7px] font-black px-0.5 rounded ${colors.bar} text-white leading-3 py-0.5`}
                          title={`${name} ei saa aidata`}
                        >
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day panel */}
        {selectedDate && (
          <div className="border-t border-gray-800 p-5 shrink-0">
            <p className="text-sm font-semibold text-gray-400 mb-3">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("et-EE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <div className="flex flex-col gap-2">
              {members.map((m, i) => {
                const isUnavailable = selectedUnavailable.includes(m.name);
                const colors = getMemberColor(i);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggle(m.name, selectedDate)}
                    disabled={toggling}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98]
                      ${isUnavailable
                        ? "bg-red-900/50 border-red-700 text-red-300"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}
                    `}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUnavailable ? "bg-red-400" : colors.bar}`} />
                    <span className="font-semibold flex-1 text-left">{m.name}</span>
                    <span className="text-sm opacity-70">
                      {isUnavailable ? "Ei saa aidata ✕" : "Saab aidata ✓"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-600 text-center mb-3">
            Vajuta päevale, et märkida kes ei saa sel päeval aidata.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-all"
          >
            Sulge
          </button>
        </div>
      </div>
    </div>
  );
}

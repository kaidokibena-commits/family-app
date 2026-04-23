"use client";

import { useState, useEffect } from "react";
import { Member, HistoricalWeek, getMemberColor } from "@/lib/types";
import { fetchHistoricalStats } from "@/app/actions";

interface Props {
  members: Member[];
  onClose: () => void;
}

export default function HistoricalStats({ members, onClose }: Props) {
  const [weeks, setWeeks] = useState<HistoricalWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalStats().then((data) => {
      setWeeks(data);
      setLoading(false);
    });
  }, []);

  // Collect all member names that appear in history (including deleted members)
  const allNames = Array.from(
    new Set([
      ...members.map((m) => m.name),
      ...weeks.flatMap((w) => Object.keys(w.stats)),
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-black text-white">Statistika</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">Laen...</div>
          ) : weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📊</p>
              <p>Veel pole varasemaid nädali andmeid.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                    Nädal
                  </th>
                  {allNames.map((name, i) => {
                    const idx = members.findIndex((m) => m.name === name);
                    const colors = getMemberColor(idx >= 0 ? idx : i);
                    return (
                      <th
                        key={name}
                        className={`text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${colors.text}`}
                      >
                        {name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.weekStart} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap font-medium">
                      {week.weekLabel}
                    </td>
                    {allNames.map((name) => {
                      const s = week.stats[name];
                      return (
                        <td key={name} className="px-5 py-3 text-right whitespace-nowrap">
                          {s ? (
                            <div className="text-white font-bold">€{s.earnings.toFixed(2)}</div>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

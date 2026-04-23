"use client";

import { Member, getMemberColor } from "@/lib/types";

interface NumpadModalProps {
  task: string;
  members: Member[];
  onConfirm: (memberName: string) => void;
  onCancel: () => void;
}

export default function NumpadModal({ task, members, onConfirm, onCancel }: NumpadModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 w-[420px] max-w-[95vw] shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-2 tracking-tight">{task}</h2>
        <p className="text-gray-400 text-xl text-center mb-6">Kes tegi seda?</p>

        <div className="flex flex-col gap-4">
          {members.map((m, i) => {
            const colors = getMemberColor(i);
            return (
              <button
                key={m.id}
                onClick={() => onConfirm(m.name)}
                className={`${colors.bar} border-2 border-white/20 rounded-2xl py-5 text-2xl font-bold tracking-wide transition-all active:scale-95`}
              >
                {m.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-center text-emerald-400 text-lg font-bold">+€2.00</div>

        <button
          onClick={onCancel}
          className="mt-4 w-full py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xl font-semibold transition-all"
        >
          Tühista
        </button>
      </div>
    </div>
  );
}

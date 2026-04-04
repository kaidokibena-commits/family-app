"use client";

import { useState } from "react";
import { Person, PEOPLE, calcEarnings } from "@/lib/types";

interface NumpadModalProps {
  task: string;
  onConfirm: (person: Person, minutes: number, earnings: number) => void;
  onCancel: () => void;
}

export default function NumpadModal({ task, onConfirm, onCancel }: NumpadModalProps) {
  const [input, setInput] = useState("0");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [step, setStep] = useState<"person" | "minutes">("person");

  function press(val: string) {
    setInput((prev) => {
      if (val === "⌫") {
        const next = prev.slice(0, -1);
        return next === "" ? "0" : next;
      }
      if (prev === "0") return val;
      if (prev.length >= 3) return prev; // max 999 minutes
      return prev + val;
    });
  }

  function handleConfirm() {
    const minutes = parseInt(input, 10);
    if (!minutes || minutes <= 0 || !selectedPerson) return;
    onConfirm(selectedPerson, minutes, calcEarnings(minutes));
  }

  const minutes = parseInt(input, 10) || 0;
  const earnings = calcEarnings(minutes);

  const personColors: Record<Person, string> = {
    "Dad": "bg-blue-600 hover:bg-blue-500 border-blue-400",
    "Child 1": "bg-pink-600 hover:bg-pink-500 border-pink-400",
    "Child 2": "bg-teal-600 hover:bg-teal-500 border-teal-400",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 w-[460px] shadow-2xl">
        <h2 className="text-3xl font-black text-center mb-2 tracking-tight">{task}</h2>

        {step === "person" ? (
          <>
            <p className="text-gray-400 text-xl text-center mb-6">Who did this?</p>
            <div className="flex flex-col gap-4">
              {PEOPLE.map((p) => (
                <button
                  key={p}
                  onClick={() => { setSelectedPerson(p); setStep("minutes"); }}
                  className={`${personColors[p]} border-2 rounded-2xl py-5 text-2xl font-bold tracking-wide transition-all active:scale-95`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={onCancel}
              className="mt-6 w-full py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xl font-semibold transition-all"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-xl text-center mb-1">
              <span className="text-white font-bold">{selectedPerson}</span> — Minutes spent?
            </p>

            {/* Display */}
            <div className="bg-gray-800 rounded-2xl px-6 py-4 mb-2 text-center">
              <span className="text-6xl font-black tabular-nums tracking-tighter">{input}</span>
              <span className="text-2xl text-gray-400 ml-2">min</span>
            </div>
            {minutes > 0 && (
              <p className="text-center text-emerald-400 text-xl font-bold mb-4">
                = ${earnings.toFixed(2)} earned
              </p>
            )}
            {minutes === 0 && <div className="mb-4 h-7" />}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {["1","2","3","4","5","6","7","8","9","⌫","0","✓"].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "✓") { handleConfirm(); return; }
                    press(key);
                  }}
                  className={`
                    rounded-2xl py-5 text-3xl font-black transition-all active:scale-95
                    ${key === "✓"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400 col-span-1"
                      : key === "⌫"
                      ? "bg-gray-700 hover:bg-gray-600 text-red-400 border-2 border-gray-600"
                      : "bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-600"}
                  `}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("person")}
                className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xl font-semibold transition-all"
              >
                Back
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xl font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

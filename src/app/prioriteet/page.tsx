"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  fetchActiveTasks,
  fetchCompletedTasks,
  createPriorityTask,
  deletePriorityTask,
  completePriorityTask,
  getTopRecommendation,
} from "./actions";
import type { PriorityTask, Recommendation, BenefitType } from "./actions";

const BENEFIT_OPTIONS: { value: BenefitType; label: string }[] = [
  { value: "monetary",     label: "💰 Monetary" },
  { value: "relationship", label: "❤️ Relationship" },
  { value: "health",       label: "🏃 Health" },
  { value: "personal",     label: "⭐ Personal" },
];

const EMPTY_FORM = {
  activity: "",
  duration: 30,
  why: "",
  deadline: "",
  benefit_type: "personal" as BenefitType,
  benefit_score: 3,
  cost: 0,
};

export default function PriorityPage() {
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [completed, setCompleted] = useState<PriorityTask[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [listening, setListening] = useState<"activity" | "why" | "duration" | "cost" | "deadline" | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);

  useEffect(() => {
    setHasSpeech(
      !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      )
    );
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [active, done] = await Promise.all([
      fetchActiveTasks(),
      fetchCompletedTasks(),
    ]);
    setTasks(active);
    setCompleted(done);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startListening(field: "activity" | "why" | "duration" | "cost" | "deadline") {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicError("Speech recognition not supported in this browser.");
      return;
    }
    setMicError(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript.trim();
      if (field === "duration" || field === "cost") {
        const num = parseFloat(transcript.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) setForm((f) => ({ ...f, [field]: num }));
        else setMicError(`Could not read "${transcript}" as a number. Try again.`);
      } else if (field === "deadline") {
        const d = new Date(transcript);
        if (!isNaN(d.getTime())) {
          setForm((f) => ({ ...f, deadline: d.toISOString().split("T")[0] }));
        } else {
          setMicError(`Could not parse date. Try saying "May 10" or "June 1 2026".`);
        }
      } else {
        setForm((f) => ({ ...f, [field]: transcript }));
      }
      setListening(null);
    };
    rec.onerror = (e: any) => {
      setListening(null);
      if (e.error === "not-allowed") {
        setMicError("Microphone permission denied. Please allow access in your browser settings.");
      } else if (e.error === "no-speech") {
        setMicError("No speech detected. Try again.");
      } else {
        setMicError("Mic error: " + e.error);
      }
    };
    rec.onend = () => setListening(null);
    try {
      rec.start();
      setListening(field);
    } catch {
      setMicError("Could not start microphone.");
    }
  }

  async function handleAdd() {
    if (!form.activity.trim() || !form.why.trim()) {
      setFormError("Activity and Why are required.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    await createPriorityTask({
      activity: form.activity.trim(),
      duration: form.duration,
      why: form.why.trim(),
      deadline: form.deadline || null,
      benefit_type: form.benefit_type,
      benefit_score: form.benefit_score,
      cost: form.cost,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setRecommendation(null);
    await loadData();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await deletePriorityTask(id);
    setRecommendation(null);
    await loadData();
  }

  async function handleComplete(task: PriorityTask) {
    setCompleting(task.id);
    await completePriorityTask(task.id, task);
    setRecommendation(null);
    await loadData();
    setCompleting(null);
  }

  async function handleGetTop() {
    setFetching(true);
    const rec = await getTopRecommendation();
    setRecommendation(rec);
    setFetching(false);
  }

  const benefitLabel = (type: BenefitType) =>
    BENEFIT_OPTIONS.find((b) => b.value === type)?.label ?? type;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-black tracking-tight">⚡ Priority Tasks</h1>
      </div>

      {/* Recommendation */}
      <div className="mb-6">
        <button
          onClick={handleGetTop}
          disabled={fetching || tasks.length === 0}
          className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
        >
          {fetching ? "Thinking…" : "⚡ Current Most Important Task"}
        </button>
        {recommendation && (
          <div className="mt-3 p-5 bg-amber-900/20 border-2 border-amber-600/50 rounded-2xl">
            <p className="text-xs text-amber-400/70 mb-1 uppercase tracking-wider">
              Do this next
            </p>
            <p className="text-xl font-bold text-amber-300 mb-2">
              {recommendation.winner_activity}
            </p>
            <p className="text-sm text-gray-300">{recommendation.reasoning}</p>
          </div>
        )}
      </div>

      {/* Add task */}
      <div className="mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-2xl text-gray-500 hover:text-gray-300 transition-all text-sm font-medium"
          >
            + Add task
          </button>
        ) : (
          <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl flex flex-col gap-4">
            {/* Activity + mic */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Activity *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.activity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activity: e.target.value }))
                  }
                  placeholder="What needs to be done?"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                />
                {hasSpeech && (
                  <button
                    type="button"
                    onClick={() => startListening("activity")}
                    title="Speak task name"
                    className={`px-3 rounded-xl border transition-all ${
                      listening === "activity"
                        ? "bg-red-600 border-red-500 animate-pulse"
                        : "bg-gray-800 border-gray-700 hover:border-amber-500"
                    }`}
                  >
                    {listening === "activity" ? "🔴" : "🎤"}
                  </button>
                )}
              </div>
              {listening === "activity" && (
                <p className="text-xs text-red-400 mt-1">Listening — speak now…</p>
              )}
              {micError && (
                <p className="text-xs text-red-400 mt-1">{micError}</p>
              )}
            </div>

            {/* Duration + Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Duration (min) *
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: +e.target.value }))
                    }
                    className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                  />
                  {hasSpeech && (
                    <button
                      type="button"
                      onClick={() => startListening("duration")}
                      title="Speak duration in minutes"
                      className={`px-2 rounded-xl border transition-all ${
                        listening === "duration"
                          ? "bg-red-600 border-red-500 animate-pulse"
                          : "bg-gray-800 border-gray-700 hover:border-amber-500"
                      }`}
                    >
                      {listening === "duration" ? "🔴" : "🎤"}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Cost (€)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.cost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cost: +e.target.value }))
                    }
                    className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                  />
                  {hasSpeech && (
                    <button
                      type="button"
                      onClick={() => startListening("cost")}
                      title="Speak cost amount"
                      className={`px-2 rounded-xl border transition-all ${
                        listening === "cost"
                          ? "bg-red-600 border-red-500 animate-pulse"
                          : "bg-gray-800 border-gray-700 hover:border-amber-500"
                      }`}
                    >
                      {listening === "cost" ? "🔴" : "🎤"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {(listening === "duration" || listening === "cost") && (
              <p className="text-xs text-red-400 -mt-2">Listening — speak a number…</p>
            )}

            {/* Why */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Why *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.why}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, why: e.target.value }))
                  }
                  placeholder="Brief reason…"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 text-sm"
                />
                {hasSpeech && (
                  <button
                    type="button"
                    onClick={() => startListening("why")}
                    title="Speak reason"
                    className={`px-3 rounded-xl border transition-all ${
                      listening === "why"
                        ? "bg-red-600 border-red-500 animate-pulse"
                        : "bg-gray-800 border-gray-700 hover:border-amber-500"
                    }`}
                  >
                    {listening === "why" ? "🔴" : "🎤"}
                  </button>
                )}
              </div>
              {listening === "why" && (
                <p className="text-xs text-red-400 mt-1">Listening — speak now…</p>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Deadline (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deadline: e.target.value }))
                  }
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
                {hasSpeech && (
                  <button
                    type="button"
                    onClick={() => startListening("deadline")}
                    title="Speak deadline date"
                    className={`px-3 rounded-xl border transition-all ${
                      listening === "deadline"
                        ? "bg-red-600 border-red-500 animate-pulse"
                        : "bg-gray-800 border-gray-700 hover:border-amber-500"
                    }`}
                  >
                    {listening === "deadline" ? "🔴" : "🎤"}
                  </button>
                )}
              </div>
              {listening === "deadline" && (
                <p className="text-xs text-red-400 mt-1">Listening — say a date e.g. "May 10"…</p>
              )}
            </div>

            {/* Benefit type */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Benefit type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BENEFIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, benefit_type: opt.value }))
                    }
                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                      form.benefit_type === opt.value
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Benefit score */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Benefit score:{" "}
                <span className="text-white font-bold">
                  {form.benefit_score}/5
                </span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, benefit_score: n }))
                    }
                    className={`flex-1 py-2 rounded-xl border font-bold text-sm transition-all ${
                      form.benefit_score === n
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Form actions */}
            {formError && (
              <p className="text-xs text-red-400 -mb-1">{formError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="flex-1 py-2.5 border border-gray-700 rounded-xl text-gray-400 hover:text-white text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={
                  submitting || !form.activity.trim() || !form.why.trim()
                }
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-xl font-bold text-sm transition-all"
              >
                {submitting ? "Saving…" : "Add Task"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active tasks */}
      <div className="flex flex-col gap-3 mb-6">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">
            No tasks yet. Add one above.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                recommendation?.winner_id === task.id
                  ? "bg-amber-900/20 border-amber-600/50"
                  : "bg-gray-900/40 border-gray-800"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm">{task.activity}</p>
                  {recommendation?.winner_id === task.id && (
                    <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full font-medium">
                      ⚡ Top
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                  <span>{task.duration}min</span>
                  {task.cost > 0 && <span>€{task.cost}</span>}
                  <span>
                    {benefitLabel(task.benefit_type)} · {task.benefit_score}/5
                  </span>
                  {task.deadline && <span>Due {task.deadline}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1 italic">{task.why}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleComplete(task)}
                  disabled={completing === task.id}
                  title="Mark done"
                  className="text-gray-600 hover:text-emerald-400 transition-colors p-1 text-sm disabled:opacity-40"
                >
                  {completing === task.id ? "…" : "✓"}
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  title="Delete"
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            {showCompleted ? "▾" : "▸"} Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-2">
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl border border-gray-800/50 bg-gray-900/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 line-through">
                        {task.activity}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(task.completed_at!).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" }
                        )}{" "}
                        · {task.duration}min
                      </p>
                    </div>
                    {task.completion_summary && (
                      <button
                        onClick={() =>
                          setExpandedSummary(
                            expandedSummary === task.id ? null : task.id
                          )
                        }
                        title="Why it mattered"
                        className="text-gray-600 hover:text-amber-400 transition-colors shrink-0 text-base"
                      >
                        💡
                      </button>
                    )}
                  </div>
                  {expandedSummary === task.id && task.completion_summary && (
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800 italic">
                      {task.completion_summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

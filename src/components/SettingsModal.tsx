"use client";

import { useState } from "react";
import { Task, Member, Frequency, frequencyLabel } from "@/lib/types";
import {
  createTask, updateTask, deleteTask,
  createMember, updateMember, deleteMember,
  saveEmail,
} from "@/app/actions";

const ICONS = [
  "🧹","🪣","🧺","🧻","🧼","🏠","🏡","🪜","🛏️","🪑",
  "🍳","🥘","🥗","🍽️","🥄","🍜","🥚","🧅","🛒","🧆",
  "🧸","🎮","🎨","⚽","🎯","🎲","📚","🐕","🐱","🌳",
  "🌀","❄️","💊","🔧","🗑️","💡","⭐","✨","🚿","🧊",
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "always",    label: "Alati" },
  { value: "daily",     label: "Iga päev" },
  { value: "weekly",    label: "Kord nädalas" },
  { value: "monthly",   label: "Kord kuus" },
  { value: "quarterly", label: "Kord kvartalis" },
  { value: "yearly",    label: "Kord aastas" },
];

const WEEKDAYS = [
  { value: 1, label: "Esmaspäev" },
  { value: 2, label: "Teisipäev" },
  { value: 3, label: "Kolmapäev" },
  { value: 4, label: "Neljapäev" },
  { value: 5, label: "Reede" },
  { value: 6, label: "Laupäev" },
  { value: 0, label: "Pühapäev" },
];

type Tab = "tasks" | "members" | "email";

interface Props {
  tasks: Task[];
  members: Member[];
  memberEmails: Record<string, string>;
  onClose: () => void;
  onDataChanged: () => void;
}

export default function SettingsModal({ tasks, members, memberEmails, onClose, onDataChanged }: Props) {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-black text-white">Seaded</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 shrink-0">
          {([["tasks","Tegevused"],["members","Liikmed"],["email","Emailid"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? "text-white border-b-2 border-violet-500" : "text-gray-500 hover:text-gray-300"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1">
          {tab === "tasks"   && <TasksTab   tasks={tasks}     onChanged={onDataChanged} />}
          {tab === "members" && <MembersTab members={members} onChanged={onDataChanged} />}
          {tab === "email"   && <EmailTab   members={members} initialEmails={memberEmails} />}
        </div>
      </div>
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab({ tasks, onChanged }: { tasks: Task[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Kustuta "${label}"? Varasemad logid säilivad.`)) return;
    await deleteTask(id);
    onChanged();
  }

  return (
    <div className="p-6 space-y-3">
      {tasks.map((task) => (
        editingId === task.id ? (
          <TaskForm
            key={task.id}
            initial={task}
            onSave={async (data) => {
              await updateTask(task.id, data.label, data.icon, data.frequency, data.weekStartDay);
              setEditingId(null);
              onChanged();
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={task.id} className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-4 py-3">
            <span className="text-2xl">{task.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{task.label}</div>
              <div className="text-xs text-gray-500">{frequencyLabel(task.frequency, task.week_start_day)}</div>
            </div>
            <button onClick={() => setEditingId(task.id)} className="text-gray-500 hover:text-white text-sm px-2 transition-colors">Muuda</button>
            <button onClick={() => handleDelete(task.id, task.label)} className="text-gray-600 hover:text-red-400 text-sm px-2 transition-colors">✕</button>
          </div>
        )
      ))}

      {showAdd ? (
        <TaskForm
          onSave={async (data) => {
            await createTask(data.label, data.icon, data.frequency, data.weekStartDay);
            setShowAdd(false);
            onChanged();
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-violet-500 text-gray-500 hover:text-violet-400 text-sm font-semibold transition-all"
        >
          + Lisa uus tegevus
        </button>
      )}
    </div>
  );
}

function TaskForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Task;
  onSave: (data: { label: string; icon: string; frequency: Frequency; weekStartDay: number | null }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "✅");
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "daily");
  const [weekStartDay, setWeekStartDay] = useState<number>(initial?.week_start_day ?? 6);
  const [showIconPicker, setShowIconPicker] = useState(false);

  function handleSubmit() {
    if (!label.trim()) return;
    onSave({ label: label.trim(), icon, frequency, weekStartDay: frequency === "weekly" ? weekStartDay : null });
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      {/* Icon + Label row */}
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-2xl flex items-center justify-center transition-colors"
          >
            {icon}
          </button>
          {showIconPicker && (
            <div className="absolute z-10 top-14 left-0 bg-gray-900 border border-gray-700 rounded-2xl p-3 grid grid-cols-8 gap-1 w-64 shadow-2xl">
              {ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setIcon(e); setShowIconPicker(false); }}
                  className="text-xl p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {e}
                </button>
              ))}
              <div className="col-span-8 mt-1 border-t border-gray-700 pt-2">
                <input
                  type="text"
                  placeholder="Või kirjuta emoji..."
                  value={icon}
                  onChange={(e) => { setIcon(e.target.value.slice(-2) || e.target.value); }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="Tegevuse nimi"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Frequency */}
      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as Frequency)}
        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Week start day (only for weekly) */}
      {frequency === "weekly" && (
        <select
          value={weekStartDay}
          onChange={(e) => setWeekStartDay(Number(e.target.value))}
          className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
        >
          {WEEKDAYS.map((d) => (
            <option key={d.value} value={d.value}>Algab {d.label}st</option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!label.trim()}
          className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
        >
          Salvesta
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold transition-all"
        >
          Tühista
        </button>
      </div>
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({ members, onChanged }: { members: Member[]; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await updateMember(id, editName.trim());
    setEditingId(null);
    onChanged();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Kustuta "${name}"? Tegevuse ajalugu säilib, kuid liige eemaldatakse.`)) return;
    await deleteMember(id, name);
    onChanged();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await createMember(newName.trim());
    setNewName("");
    onChanged();
  }

  return (
    <div className="p-6 space-y-3">
      {members.map((m) => (
        editingId === m.id ? (
          <div key={m.id} className="flex gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename(m.id)}
              className="flex-1 bg-gray-800 border border-violet-500 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            />
            <button onClick={() => handleRename(m.id)} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">✓</button>
            <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-all">✕</button>
          </div>
        ) : (
          <div key={m.id} className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-4 py-3">
            <span className="flex-1 font-semibold text-white">{m.name}</span>
            <button
              onClick={() => { setEditingId(m.id); setEditName(m.name); }}
              className="text-gray-500 hover:text-white text-sm px-2 transition-colors"
            >
              Muuda
            </button>
            <button
              onClick={() => handleDelete(m.id, m.name)}
              className="text-gray-600 hover:text-red-400 text-sm px-2 transition-colors"
            >
              ✕
            </button>
          </div>
        )
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Uue liikme nimi"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
        >
          Lisa
        </button>
      </div>
    </div>
  );
}

// ── Email Tab ─────────────────────────────────────────────────────────────────

function EmailTab({ members, initialEmails }: { members: Member[]; initialEmails: Record<string, string> }) {
  const [emails, setEmails] = useState<Record<string, string>>(initialEmails);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave(name: string) {
    const email = emails[name]?.trim();
    if (!email) return;
    setSaving(name);
    await saveEmail(name, email);
    setSaving(null);
    setSaved(name);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="p-6 space-y-5">
      <p className="text-gray-400 text-sm">
        Iga esmaspäev kell 00:00 saadame igale liikmele emaili eelmise nädala tulemustega.
      </p>
      {members.map((m) => (
        <div key={m.id}>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">{m.name}</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@näide.ee"
              value={emails[m.name] ?? ""}
              onChange={(e) => setEmails((prev) => ({ ...prev, [m.name]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSave(m.name)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              onClick={() => handleSave(m.name)}
              disabled={saving === m.name || !emails[m.name]?.trim()}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
            >
              {saving === m.name ? "..." : saved === m.name ? "✓" : "Salvesta"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

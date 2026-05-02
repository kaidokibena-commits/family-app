"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES, activities } from "@/data/activitiesData";

const ENERGY_DOTS = [1, 2, 3];

function EnergyDots({ level }) {
  return (
    <div className="flex gap-1">
      {ENERGY_DOTS.map((n) => (
        <span
          key={n}
          className={`w-2 h-2 rounded-full ${n <= level ? "bg-indigo-500" : "bg-gray-700"}`}
        />
      ))}
    </div>
  );
}

function ActivityCard({ activity }) {
  const cat = CATEGORIES[activity.category];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-indigo-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{cat.emoji}</span>
          <h3 className="font-bold text-white text-base leading-tight">{activity.name}</h3>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            activity.tasuta
              ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700"
              : "bg-amber-900/60 text-amber-400 border border-amber-700"
          }`}
        >
          {activity.tasuta ? "Tasuta" : activity.hind}
        </span>
      </div>

      <p className="text-gray-400 text-sm leading-snug">{activity.description}</p>

      <div className="flex flex-wrap gap-1">
        {activity.tags.map((tag) => (
          <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-1 border-t border-gray-800">
        <span>⏱ {activity.duration}</span>
        <span>
          {activity.location === "sees" ? "🏠 Sees" : activity.location === "väljas" ? "🌳 Väljas" : "🏠🌳 Mõlemad"}
        </span>
        <EnergyDots level={activity.energy} />
      </div>
    </div>
  );
}

function SurpriseModal({ activity, onClose, onAnother }) {
  if (!activity) return null;
  const cat = CATEGORIES[activity.category];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-indigo-600 rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-5xl mb-2">{cat.emoji}</div>
          <h2 className="text-xl font-black text-white">{activity.name}</h2>
          <span
            className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
              activity.tasuta
                ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700"
                : "bg-amber-900/60 text-amber-400 border border-amber-700"
            }`}
          >
            {activity.tasuta ? "Tasuta" : activity.hind}
          </span>
        </div>
        <p className="text-gray-300 text-sm text-center leading-relaxed">{activity.description}</p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>⏱ {activity.duration}</span>
          <span>
            {activity.location === "sees"
              ? "🏠 Sees"
              : activity.location === "väljas"
              ? "🌳 Väljas"
              : "🏠🌳 Mõlemad"}
          </span>
          <EnergyDots level={activity.energy} />
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onAnother}
            className="flex-1 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-600 text-indigo-300 font-semibold rounded-xl py-2 text-sm transition-colors"
          >
            Teine valik
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2 text-sm transition-colors"
          >
            Sobib! ✓
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TegevusedPage() {
  const [search, setSearch] = useState("");
  const [filterPrice, setFilterPrice] = useState("kõik"); // kõik | tasuta | tasuline
  const [filterLocation, setFilterLocation] = useState("kõik"); // kõik | sees | väljas | mõlemad
  const [filterCategory, setFilterCategory] = useState("kõik");
  const [surpriseActivity, setSurpriseActivity] = useState(null);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.name.toLowerCase().includes(q) &&
          !a.description.toLowerCase().includes(q) &&
          !a.tags.some((t) => t.toLowerCase().includes(q))
        )
          return false;
      }
      if (filterPrice === "tasuta" && !a.tasuta) return false;
      if (filterPrice === "tasuline" && a.tasuta) return false;
      if (filterLocation !== "kõik" && a.location !== filterLocation) return false;
      if (filterCategory !== "kõik" && a.category !== filterCategory) return false;
      return true;
    });
  }, [search, filterPrice, filterLocation, filterCategory]);

  const pickSurprise = useCallback(
    (excludeId) => {
      const pool = filtered.filter((a) => a.id !== excludeId);
      if (pool.length === 0) return;
      setSurpriseActivity(pool[Math.floor(Math.random() * pool.length)]);
    },
    [filtered]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-500 hover:text-white text-sm transition-colors"
              title="Tagasi"
            >
              ← Tagasi
            </Link>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">🎈 Tegevused</h1>
            <span className="text-gray-600 text-sm hidden sm:inline">
              {filtered.length} / {activities.length}
            </span>
          </div>
          <button
            onClick={() => pickSurprise(undefined)}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-1.5 rounded-xl text-sm transition-all"
          >
            🎲 Üllata mind!
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Otsi tegevusi, silte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Price filter */}
          <div className="flex rounded-xl overflow-hidden border border-gray-700 text-sm">
            {[
              { val: "kõik", label: "Kõik hinnad" },
              { val: "tasuta", label: "🟢 Tasuta" },
              { val: "tasuline", label: "🟡 Tasuline" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setFilterPrice(val)}
                className={`px-3 py-1.5 transition-colors ${
                  filterPrice === val
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Location filter */}
          <div className="flex rounded-xl overflow-hidden border border-gray-700 text-sm">
            {[
              { val: "kõik", label: "Kõik kohad" },
              { val: "sees", label: "🏠 Sees" },
              { val: "väljas", label: "🌳 Väljas" },
              { val: "mõlemad", label: "Mõlemad" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setFilterLocation(val)}
                className={`px-3 py-1.5 transition-colors ${
                  filterLocation === val
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="kõik">Kõik kategooriad</option>
            {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
              <option key={key} value={key}>
                {emoji} {label}
              </option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory("kõik")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
              filterCategory === "kõik"
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            Kõik
          </button>
          {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                filterCategory === key
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">Tulemusi ei leitud</p>
            <p className="text-sm mt-1">Proovi teist otsingut või eemalda filtrid</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </main>

      <SurpriseModal
        activity={surpriseActivity}
        onClose={() => setSurpriseActivity(null)}
        onAnother={() => pickSurprise(surpriseActivity?.id)}
      />
    </div>
  );
}

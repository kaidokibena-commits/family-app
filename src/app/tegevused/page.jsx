"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES, activities } from "@/data/activitiesData";

function parseWeather(code, temp, precip, wind) {
  const isRaining  = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const isSnowing  = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
  const isClear    = code <= 1;
  const isCloudy   = code >= 2 && code <= 3;
  const isHot      = temp >= 22;
  const isWarm     = temp >= 15;
  const isCold     = temp < 5;
  const isWindy    = wind > 35;
  let label, emoji;
  if      (code === 0)  { label = "Selge taevas";     emoji = "☀️"; }
  else if (code <= 1)   { label = "Peamiselt selge";  emoji = "🌤️"; }
  else if (code <= 2)   { label = "Osaliselt pilves"; emoji = "⛅"; }
  else if (code <= 3)   { label = "Pilvine";           emoji = "☁️"; }
  else if (code <= 48)  { label = "Udu";               emoji = "🌫️"; }
  else if (code <= 55)  { label = "Uduvihm";           emoji = "🌦️"; }
  else if (code <= 67)  { label = "Vihm";              emoji = "🌧️"; }
  else if (code <= 77)  { label = "Lumesadu";          emoji = "❄️"; }
  else if (code <= 82)  { label = "Vihmahoog";         emoji = "🌦️"; }
  else if (code <= 86)  { label = "Lumehoog";          emoji = "🌨️"; }
  else                  { label = "Äike";              emoji = "⛈️"; }
  return { code, temp, precip, wind, label, emoji, isRaining, isSnowing, isClear, isCloudy, isHot, isWarm, isCold, isWindy };
}

function scoreActivity(a, w) {
  let score = 0;
  if (w.isRaining || w.isSnowing) {
    if (a.location === "sees")   score += 15;
    if (a.location === "väljas") score -= 10;
  } else if (w.isWarm && (w.isClear || w.isCloudy)) {
    if (a.location === "väljas") score += 10;
    if (a.location === "sees")   score -= 3;
  } else {
    if (a.location === "mõlemad") score += 2;
  }
  if (w.isRaining || w.isSnowing) {
    if (["rahulik","loovus","avastamine","argitegevus"].includes(a.category)) score += 5;
  }
  if (w.isWarm && w.isClear) {
    if (["loodus","seiklus","liikumine","aktiivne"].includes(a.category)) score += 6;
  }
  if (w.isHot && a.tags.some(t => ["vesi","rand","ujula"].includes(t))) score += 8;
  if (w.isSnowing && a.tags.some(t => ["lumi","talv"].includes(t))) score += 8;
  if (w.isCold && !w.isSnowing && a.location === "sees") score += 5;
  return score;
}

function pickPair(pool, excludeIds, weather) {
  const available = pool.filter(a => !excludeIds.includes(a.id));
  if (available.length === 0) return null;
  const scored = available
    .map(a => ({ ...a, _s: scoreActivity(a, weather) + Math.random() * 4 }))
    .sort((a, b) => b._s - a._s);
  return scored[0] ?? null;
}

const ENERGY_DOTS = [1, 2, 3];
function EnergyDots({ level }) {
  return (
    <div className="flex gap-1">
      {ENERGY_DOTS.map(n => (
        <span key={n} className={`w-2 h-2 rounded-full ${n <= level ? "bg-indigo-400" : "bg-gray-700"}`} />
      ))}
    </div>
  );
}

function InfoRow({ icon, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-2 text-sm text-gray-300">
      <span className="shrink-0 w-5 text-center">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function RecommendationCard({ activity }) {
  const cat = CATEGORIES[activity.category];
  const mapsUrl = activity.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${activity.coordinates.lat},${activity.coordinates.lng}&travelmode=transit`
    : activity.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activity.address)}&travelmode=transit`
    : null;
  const wazeUrl = activity.coordinates
    ? `https://waze.com/ul?ll=${activity.coordinates.lat},${activity.coordinates.lng}&navigate=yes`
    : null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3 flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{cat.emoji}</span>
          <h3 className="font-black text-white text-base leading-snug">{activity.name}</h3>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${activity.tasuta ? "bg-emerald-900/60 text-emerald-400 border-emerald-700" : "bg-amber-900/60 text-amber-400 border-amber-700"}`}>
          {activity.tasuta ? "Tasuta" : activity.hind}
        </span>
      </div>
      <p className="text-gray-400 text-sm leading-snug">{activity.description}</p>
      <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-800">
        <InfoRow icon="👥">{activity.capacity}</InfoRow>
        <InfoRow icon="⏱️">{activity.duration}</InfoRow>
        {activity.whatToBring?.length > 0 && <InfoRow icon="🎒">{activity.whatToBring.join(", ")}</InfoRow>}
        {activity.openingHours && <InfoRow icon="🕐">{activity.openingHours}</InfoRow>}
        {!activity.tasuta && activity.hind && <InfoRow icon="💰">{activity.hind}</InfoRow>}
        {activity.busInfo && <InfoRow icon="🚌">{activity.busInfo}</InfoRow>}
        {activity.extraInfo && <InfoRow icon="💡">{activity.extraInfo}</InfoRow>}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {activity.website && (
          <a href={activity.website} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700 text-indigo-300 font-semibold px-3 py-1.5 rounded-xl transition-colors">
            🌐 Koduleht
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700 text-blue-300 font-semibold px-3 py-1.5 rounded-xl transition-colors">
            🚌 Sõida bussiga
          </a>
        )}
        {wazeUrl && (
          <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-teal-900/60 hover:bg-teal-800/80 border border-teal-700 text-teal-300 font-semibold px-3 py-1.5 rounded-xl transition-colors">
            🗺️ Waze
          </a>
        )}
      </div>
    </div>
  );
}

function WeatherSection() {
  const [weather, setWeather]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [freeRec, setFreeRec]       = useState(null);
  const [paidRec, setPaidRec]       = useState(null);
  const [excludeIds, setExcludeIds] = useState([]);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=59.4370&longitude=24.7536" +
      "&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m" +
      "&timezone=Europe%2FTallinn"
    )
      .then(r => r.json())
      .then(data => {
        const c = data.current;
        const w = parseWeather(c.weathercode, c.temperature_2m, c.precipitation, c.windspeed_10m);
        setWeather(w);
        pickRecommendations([], w);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickRecommendations(currentExclude, w) {
    const wth = w || weather;
    if (!wth) return;
    setFreeRec(pickPair(activities.filter(a => a.tasuta), currentExclude, wth));
    setPaidRec(pickPair(activities.filter(a => !a.tasuta), currentExclude, wth));
  }

  function handleNewVariant() {
    const usedIds = [freeRec?.id, paidRec?.id].filter(Boolean);
    const next = [...excludeIds, ...usedIds];
    const allFree = activities.filter(a => a.tasuta).length;
    const allPaid = activities.filter(a => !a.tasuta).length;
    const freeEx = next.filter(id => activities.find(a => a.id === id)?.tasuta).length;
    const paidEx = next.filter(id => !activities.find(a => a.id === id)?.tasuta).length;
    const reset = freeEx >= allFree - 1 || paidEx >= allPaid - 1 ? [] : next;
    setExcludeIds(reset);
    pickRecommendations(reset, weather);
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 pt-5">
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        🌤️ Kontrollin Tallinna ilma…
      </div>
    </div>
  );

  if (error || !weather) return (
    <div className="max-w-5xl mx-auto px-4 pt-5">
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
        Ilmaandmeid ei õnnestunud laadida. Sirvige tegevusi allpool käsitsi.
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 pt-5">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weather.emoji}</span>
            <div>
              <p className="text-white font-bold text-base">{weather.label} · {Math.round(weather.temp)}°C</p>
              <p className="text-gray-400 text-xs">
                Tallinn, praegu
                {weather.isWindy ? " · Tuuline" : ""}
                {weather.isRaining ? " · Ilmapõhine soovitus: sisetegevused" : ""}
                {!weather.isRaining && weather.isWarm ? " · Ilmapõhine soovitus: välitegevused" : ""}
              </p>
            </div>
          </div>
          <button onClick={handleNewVariant}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
            🔄 Uus variant
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {freeRec && <RecommendationCard activity={freeRec} />}
          {paidRec && <RecommendationCard activity={paidRec} />}
        </div>
      </div>
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
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${activity.tasuta ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700" : "bg-amber-900/60 text-amber-400 border border-amber-700"}`}>
          {activity.tasuta ? "Tasuta" : activity.hind}
        </span>
      </div>
      <p className="text-gray-400 text-sm leading-snug">{activity.description}</p>
      <div className="flex flex-wrap gap-1">
        {activity.tags.map(tag => (
          <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">#{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-1 border-t border-gray-800">
        <span>⏱ {activity.duration}</span>
        <span>{activity.location === "sees" ? "🏠 Sees" : activity.location === "väljas" ? "🌳 Väljas" : "🏠🌳 Mõlemad"}</span>
        <EnergyDots level={activity.energy} />
      </div>
    </div>
  );
}

function SurpriseModal({ activity, onClose, onAnother }) {
  if (!activity) return null;
  const cat = CATEGORIES[activity.category];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-indigo-600 rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-5xl mb-2">{cat.emoji}</div>
          <h2 className="text-xl font-black text-white">{activity.name}</h2>
          <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${activity.tasuta ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700" : "bg-amber-900/60 text-amber-400 border border-amber-700"}`}>
            {activity.tasuta ? "Tasuta" : activity.hind}
          </span>
        </div>
        <p className="text-gray-300 text-sm text-center leading-relaxed">{activity.description}</p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>⏱ {activity.duration}</span>
          <span>{activity.location === "sees" ? "🏠 Sees" : activity.location === "väljas" ? "🌳 Väljas" : "🏠🌳 Mõlemad"}</span>
          <EnergyDots level={activity.energy} />
        </div>
        <div className="flex gap-2 mt-1">
          <button onClick={onAnother} className="flex-1 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-600 text-indigo-300 font-semibold rounded-xl py-2 text-sm transition-colors">Teine valik</button>
          <button onClick={onClose} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2 text-sm transition-colors">Sobib! ✓</button>
        </div>
      </div>
    </div>
  );
}

export default function TegevusedPage() {
  const [search, setSearch]                     = useState("");
  const [filterPrice, setFilterPrice]           = useState("kõik");
  const [filterLocation, setFilterLocation]     = useState("kõik");
  const [filterCategory, setFilterCategory]     = useState("kõik");
  const [surpriseActivity, setSurpriseActivity] = useState(null);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (search) {
        const q = search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) &&
            !a.description.toLowerCase().includes(q) &&
            !a.tags.some(t => t.toLowerCase().includes(q))) return false;
      }
      if (filterPrice === "tasuta" && !a.tasuta) return false;
      if (filterPrice === "tasuline" && a.tasuta) return false;
      if (filterLocation !== "kõik" && a.location !== filterLocation) return false;
      if (filterCategory !== "kõik" && a.category !== filterCategory) return false;
      return true;
    });
  }, [search, filterPrice, filterLocation, filterCategory]);

  const pickSurprise = useCallback((excludeId) => {
    const pool = filtered.filter(a => a.id !== excludeId);
    if (pool.length === 0) return;
    setSurpriseActivity(pool[Math.floor(Math.random() * pool.length)]);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors" title="Tagasi">← Tagasi</Link>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">🎈 Tegevused</h1>
            <span className="text-gray-600 text-sm hidden sm:inline">{filtered.length} / {activities.length}</span>
          </div>
          <button onClick={() => pickSurprise(undefined)}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-1.5 rounded-xl text-sm transition-all">
            🎲 Üllata mind!
          </button>
        </div>
      </header>

      <WeatherSection />

      <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-5">
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs font-medium uppercase tracking-wider px-2">Kõik tegevused</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>
        <input type="text" placeholder="Otsi tegevusi, silte..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-700 text-sm">
            {[{ val: "kõik", label: "Kõik hinnad" }, { val: "tasuta", label: "🟢 Tasuta" }, { val: "tasuline", label: "🟡 Tasuline" }]
              .map(({ val, label }) => (
                <button key={val} onClick={() => setFilterPrice(val)}
                  className={`px-3 py-1.5 transition-colors ${filterPrice === val ? "bg-indigo-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}>
                  {label}
                </button>
              ))}
          </div>
          <div className="flex rounded-xl overflow-hidden border border-gray-700 text-sm">
            {[{ val: "kõik", label: "Kõik kohad" }, { val: "sees", label: "🏠 Sees" }, { val: "väljas", label: "🌳 Väljas" }, { val: "mõlemad", label: "Mõlemad" }]
              .map(({ val, label }) => (
                <button key={val} onClick={() => setFilterLocation(val)}
                  className={`px-3 py-1.5 transition-colors ${filterLocation === val ? "bg-indigo-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}>
                  {label}
                </button>
              ))}
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors">
            <option value="kõik">Kõik kategooriad</option>
            {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
              <option key={key} value={key}>{emoji} {label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory("kõik")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${filterCategory === "kõik" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
            Kõik
          </button>
          {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
            <button key={key} onClick={() => setFilterCategory(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${filterCategory === key ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
              {emoji} {label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">Tulemusi ei leitud</p>
            <p className="text-sm mt-1">Proovi teist otsingut või eemalda filtrid</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(activity => (
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


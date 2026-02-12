"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: number;
}

const MOODS: { label: string; color: string; bg: string }[] = [
  { label: "calm", color: "border-cyan-400 text-cyan-400", bg: "bg-cyan-400/10" },
  { label: "happy", color: "border-amber-400 text-amber-400", bg: "bg-amber-400/10" },
  { label: "sad", color: "border-blue-400 text-blue-400", bg: "bg-blue-400/10" },
  { label: "angry", color: "border-red-400 text-red-400", bg: "bg-red-400/10" },
  { label: "tired", color: "border-neutral-400 text-neutral-400", bg: "bg-neutral-400/10" },
  { label: "inspired", color: "border-violet-400 text-violet-400", bg: "bg-violet-400/10" },
];

function getMood(mood?: string) {
  return MOODS.find((m) => m.label === mood);
}

function getEntryImageUrl(entry: DiaryEntry): string {
  const moodStyle = entry.mood ? `, ${entry.mood} mood` : "";
  const prompt = `dreamy abstract art for diary entry titled "${entry.title}"${moodStyle}, ethereal, soft colors, digital painting, aesthetic, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=400&seed=${entry.id.replace(/\D/g, "").slice(0, 8)}&nologo=true`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

export default function Home() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "write" | "read">("list");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [views, setViews] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${password}`,
  }), [password]);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetch("/api/views", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setViews(d.count))
      .catch(() => {});
  }, [fetchEntries]);

  useEffect(() => {
    const saved = sessionStorage.getItem("diary-admin");
    if (saved) {
      setPassword(saved);
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (view === "write" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view]);

  async function handleLogin() {
    setLoginError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${loginInput}` },
      });
      if (res.ok) {
        setPassword(loginInput);
        setIsAdmin(true);
        sessionStorage.setItem("diary-admin", loginInput);
        setShowLogin(false);
        setLoginInput("");
      } else {
        setLoginError("wrong password");
      }
    } catch {
      setLoginError("something went wrong");
    }
  }

  function handleLogout() {
    setIsAdmin(false);
    setPassword("");
    sessionStorage.removeItem("diary-admin");
    setView("list");
  }

  async function saveEntry() {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch("/api/entries", {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ id: editingId, title, content, mood }),
        });
      } else {
        res = await fetch("/api/entries", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ title, content, mood }),
        });
      }
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries);
      setTitle("");
      setContent("");
      setMood("");
      setEditingId(null);
      setView("list");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: DiaryEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || "");
    setView("write");
  }

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, DiaryEntry[]>>((acc, e) => {
    const key = formatDate(e.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800/50 px-6 py-5 bg-gradient-to-r from-violet-500/5 via-pink-500/5 to-cyan-500/5 header-glow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <button
              onClick={() => {
                setView("list");
                setSelectedEntry(null);
                setEditingId(null);
              }}
              className="text-left hover:opacity-80 transition-opacity"
            >
              <h1 className="text-lg uppercase font-mono tracking-wide font-bold gradient-title">
                <span className="star star-delay-1 text-violet-400/60 text-sm">✦</span>{" "}
                D's Public Dumping Journal{" "}
                <span className="star star-delay-3 text-pink-400/60 text-sm">✦</span>
              </h1>
            </button>
            {views !== null && (
              <span className="text-xs font-mono mt-1">
                <span className="star-slow star-delay-2 text-amber-400/40 text-[10px]">✧</span>{" "}
                <span className="text-pink-400">{views.toLocaleString()}</span>
                <span className="text-neutral-600"> {views === 1 ? "visit" : "visits"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {view === "list" && !isAdmin && (
              <button
                onClick={() => setShowLogin(true)}
                className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white text-xs font-mono font-bold px-5 py-2 rounded-full transition-all glow-violet"
              >
                sign in
              </button>
            )}

            {view === "list" && isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setMood("");
                    setEditingId(null);
                    setView("write");
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-xs font-mono font-bold px-5 py-2 rounded-full transition-all glow-emerald"
                >
                  + new dump
                </button>
                <button
                  onClick={handleLogout}
                  className="text-neutral-600 hover:text-pink-400 text-xs font-mono transition-colors"
                >
                  sign out
                </button>
              </div>
            )}

            {view === "write" && (
              <div className="flex gap-3">
                <button
                  onClick={() => { setView("list"); setEditingId(null); }}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors text-xs font-mono px-4 py-2 rounded-full border border-neutral-800 hover:border-neutral-600"
                >
                  cancel
                </button>
                <button
                  onClick={saveEntry}
                  disabled={saving}
                  className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 disabled:opacity-30 text-white text-xs font-mono font-bold px-5 py-2 rounded-full transition-all glow-violet"
                >
                  {saving ? "saving..." : "save"}
                </button>
              </div>
            )}

            {view === "read" && (
              <button
                onClick={() => { setView("list"); setSelectedEntry(null); }}
                className="text-neutral-500 hover:text-neutral-300 transition-colors text-xs font-mono px-4 py-2 rounded-full border border-neutral-800 hover:border-neutral-600"
              >
                back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Loading */}
        {loading && (
          <div className="text-center py-24">
            <p className="text-neutral-700 font-mono text-sm animate-pulse">loading...</p>
          </div>
        )}

        {/* ===================== LIST VIEW ===================== */}
        {!loading && view === "list" && (
          <div>
            {entries.length > 0 && (
              <div className="mb-8">
                <input
                  type="text"
                  placeholder="search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-neutral-800 pb-2 text-sm font-mono text-neutral-400 placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
            )}

            {entries.length === 0 && (
              <div className="text-center py-24">
                <div className="mb-6">
                  <span className="star-float text-violet-400/40 text-lg">✧</span>
                  <span className="star-float star-delay-2 text-pink-400/30 text-sm mx-3">✦</span>
                  <span className="star-float star-delay-4 text-cyan-400/40 text-xs">★</span>
                </div>
                <h2 className="text-4xl font-mono font-bold gradient-title mb-4">D</h2>
                <p className="text-neutral-600 font-mono text-sm">
                  {isAdmin ? "nothing here yet — start dumping" : "no dumps yet — check back soon"}
                </p>
                <div className="mt-4 mb-2">
                  <span className="star-float star-delay-5 text-amber-400/30 text-xs">✦</span>
                  <span className="star-float star-delay-1 text-violet-400/20 text-sm mx-4">✧</span>
                  <span className="star-float star-delay-3 text-pink-400/30 text-xs">✦</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setView("write")}
                    className="mt-4 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white px-6 py-2.5 text-sm font-mono font-bold rounded-full transition-all glow-violet"
                  >
                    write your first dump
                  </button>
                )}
              </div>
            )}

            {Object.entries(grouped).map(([date, dateEntries]) => (
              <div key={date} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent" />
                  <span className="star star-delay-2 text-violet-400/40 text-[10px]">✦</span>
                  <p className="text-violet-400 text-xs font-mono tracking-widest uppercase">
                    {date}
                  </p>
                  <span className="star star-delay-4 text-pink-400/40 text-[10px]">✦</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-pink-500/30 to-transparent" />
                </div>
                <div className="space-y-1">
                  {dateEntries.map((entry) => {
                    const m = getMood(entry.mood);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setImageLoaded(false);
                          setView("read");
                        }}
                        className="entry-card w-full text-left group py-3 px-5 hover:bg-white/[0.02] transition-colors rounded-lg"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-neutral-300 group-hover:text-white transition-colors truncate">
                            {entry.title}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            {m && (
                              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${m.bg} ${m.color.split(" ")[1]}`}>
                                {entry.mood}
                              </span>
                            )}
                            <span className="text-neutral-700 text-xs font-mono">
                              {formatTime(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-neutral-600 text-sm mt-1 line-clamp-1">
                          {entry.content}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===================== WRITE VIEW ===================== */}
        {view === "write" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-mono tracking-widest uppercase mb-4">
                <span className="star star-delay-2 text-violet-400/50 text-[10px]">✦</span>{" "}
                <span className="text-violet-400">{editingId ? "editing" : formatDate(Date.now())}</span>
              </p>
              <input
                type="text"
                placeholder="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-white text-xl border-none placeholder:text-neutral-800 focus:outline-none mb-6"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMood(mood === m.label ? "" : m.label)}
                  className={`text-xs font-mono px-3 py-1 border rounded-full transition-all ${
                    mood === m.label
                      ? `${m.color} ${m.bg}`
                      : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              placeholder="write something..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-neutral-300 leading-relaxed placeholder:text-neutral-800 resize-none min-h-[60vh] text-base"
            />
          </div>
        )}

        {/* ===================== READ VIEW ===================== */}
        {view === "read" && selectedEntry && (
          <div>
            {/* AI Generated Image */}
            <div className="mb-6 rounded-xl overflow-hidden border border-neutral-800/50 relative">
              {!imageLoaded && (
                <div className="w-full h-[200px] bg-neutral-900 flex items-center justify-center">
                  <span className="text-neutral-700 font-mono text-xs animate-pulse">generating art...</span>
                </div>
              )}
              <img
                src={getEntryImageUrl(selectedEntry)}
                alt={`AI art for "${selectedEntry.title}"`}
                className={`w-full h-[200px] object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  setImageLoaded(true);
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 text-xs font-mono tracking-widest uppercase mb-4">
                <span className="star star-delay-1 text-violet-400/50 text-[10px]">✦</span>
                <span className="text-violet-400">{formatDate(selectedEntry.createdAt)}</span>
                <span className="text-neutral-800">/</span>
                <span className="text-pink-400">{formatTime(selectedEntry.createdAt)}</span>
                {selectedEntry.mood && (
                  <>
                    <span className="text-neutral-800">/</span>
                    <span className={`px-2 py-0.5 rounded-full ${getMood(selectedEntry.mood)?.bg || ""} ${getMood(selectedEntry.mood)?.color.split(" ")[1] || "text-neutral-500"}`}>
                      {selectedEntry.mood}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-white text-2xl mb-6">
                {selectedEntry.title}
              </h1>
              <div className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                {selectedEntry.content}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-3 pt-6 border-t border-neutral-800/50">
                <button
                  onClick={() => startEdit(selectedEntry)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors"
                >
                  edit
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 px-6 py-5 bg-gradient-to-r from-violet-500/5 via-transparent to-pink-500/5">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <span className="text-neutral-700 text-xs font-mono">
            <span className="star-slow star-delay-3 text-amber-400/30 text-[10px] mr-1">✧</span>
            <span className="text-amber-400">{entries.length}</span> {entries.length === 1 ? "dump" : "dumps"}
          </span>
          <div className="flex items-center gap-2">
            <span className="star-slow star-delay-1 text-violet-400/30 text-[10px]">✦</span>
            <span className="text-xs font-mono font-bold gradient-title">
              D
            </span>
            <span className="star-slow star-delay-5 text-pink-400/30 text-[10px]">✦</span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-6"
          onClick={() => { setShowLogin(false); setLoginInput(""); setLoginError(""); }}
        >
          <div
            className="border border-neutral-800 bg-[#111] rounded-2xl p-8 w-full max-w-sm relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500" />
            <p className="text-xs font-mono tracking-widest uppercase mb-6 gradient-title font-bold">
              <span className="star star-delay-1 text-violet-400/50">✦</span> sign in <span className="star star-delay-3 text-pink-400/50">✦</span>
            </p>
            <input
              type="password"
              placeholder="password"
              value={loginInput}
              onChange={(e) => { setLoginInput(e.target.value); setLoginError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              className="w-full bg-transparent border-b border-neutral-800 pb-2 text-sm font-mono text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-violet-500/50 transition-colors mb-4"
            />
            {loginError && (
              <p className="text-red-400 text-xs font-mono mb-4">{loginError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowLogin(false); setLoginInput(""); setLoginError(""); }}
                className="text-neutral-500 hover:text-neutral-300 text-sm font-mono px-4 py-1.5 rounded-full border border-neutral-800 hover:border-neutral-600 transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleLogin}
                className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white text-sm font-mono font-bold px-6 py-1.5 rounded-full transition-all glow-violet"
              >
                enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

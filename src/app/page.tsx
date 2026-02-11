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

const MOODS = ["calm", "happy", "sad", "angry", "tired", "inspired"];

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

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${password}`,
  }), [password]);

  // Fetch entries from API
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

  // Restore admin session
  useEffect(() => {
    const saved = sessionStorage.getItem("diary-admin");
    if (saved) {
      setPassword(saved);
      setIsAdmin(true);
    }
  }, []);

  // Auto-focus textarea
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
        headers: {
          Authorization: `Bearer ${loginInput}`,
        },
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

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/entries?id=${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      await fetchEntries();
      setView("list");
      setSelectedEntry(null);
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
    <div className="min-h-screen bg-black text-neutral-300 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-900 px-6 py-5">
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
              <span className="text-neutral-500 text-xs font-mono">✦ ♡ ✦</span>
              <h1 className="text-white tracking-wide text-sm uppercase font-mono">
                K&D <span className="text-neutral-500">♡</span> Public Dumping Journal
              </h1>
              <span className="text-neutral-500 text-xs font-mono">✦ ♡ ✦</span>
            </button>
            {views !== null && (
              <span className="text-neutral-600 text-xs font-mono mt-1">
                ★ {views.toLocaleString()} {views === 1 ? "visit" : "visits"} ★
              </span>
            )}
          </div>

          {view === "list" && isAdmin && (
            <button
              onClick={() => {
                setTitle("");
                setContent("");
                setMood("");
                setEditingId(null);
                setView("write");
              }}
              className="text-neutral-500 hover:text-white transition-colors text-sm font-mono tracking-wider"
            >
              + new
            </button>
          )}

          {view === "write" && (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setView("list");
                  setEditingId(null);
                }}
                className="text-neutral-600 hover:text-neutral-300 transition-colors text-sm font-mono"
              >
                cancel
              </button>
              <button
                onClick={saveEntry}
                disabled={saving}
                className="text-white hover:opacity-70 transition-opacity text-sm font-mono disabled:opacity-30"
              >
                {saving ? "saving..." : "save"}
              </button>
            </div>
          )}

          {view === "read" && (
            <button
              onClick={() => {
                setView("list");
                setSelectedEntry(null);
              }}
              className="text-neutral-500 hover:text-white transition-colors text-sm font-mono"
            >
              back
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Loading */}
        {loading && (
          <div className="text-center py-24">
            <p className="text-neutral-700 font-mono text-sm">loading...</p>
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
                  className="w-full bg-transparent border-b border-neutral-800 pb-2 text-sm font-mono text-neutral-400 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            )}

            {entries.length === 0 && (
              <div className="text-center py-24">
                <p className="text-neutral-700 font-mono text-lg mb-2">♡ ✦ ♡</p>
                <p className="text-neutral-600 font-mono text-sm">
                  {isAdmin ? "nothing here yet — start dumping" : "no dumps yet — check back soon"}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setView("write")}
                    className="mt-6 text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-5 py-2 text-sm font-mono transition-all"
                  >
                    write your first entry
                  </button>
                )}
              </div>
            )}

            {Object.entries(grouped).map(([date, dateEntries]) => (
              <div key={date} className="mb-10">
                <p className="text-neutral-600 text-xs font-mono tracking-widest uppercase mb-4">
                  {date}
                </p>
                <div className="space-y-1">
                  {dateEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setView("read");
                      }}
                      className="w-full text-left group py-3 px-4 -mx-4 hover:bg-neutral-950 transition-colors rounded"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-neutral-300 group-hover:text-white transition-colors truncate">
                          {entry.title}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          {entry.mood && (
                            <span className="text-neutral-700 text-xs font-mono">
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===================== WRITE VIEW ===================== */}
        {view === "write" && (
          <div className="space-y-6">
            <div>
              <p className="text-neutral-700 text-xs font-mono tracking-widest uppercase mb-4">
                {editingId ? "editing" : formatDate(Date.now())}
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
                  key={m}
                  onClick={() => setMood(mood === m ? "" : m)}
                  className={`text-xs font-mono px-3 py-1 border transition-all ${
                    mood === m
                      ? "border-white text-white"
                      : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {m}
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
            <div className="mb-8">
              <p className="text-neutral-700 text-xs font-mono tracking-widest uppercase mb-3">
                {formatDate(selectedEntry.createdAt)} &middot;{" "}
                {formatTime(selectedEntry.createdAt)}
                {selectedEntry.mood && ` \u00B7 ${selectedEntry.mood}`}
              </p>
              <h1 className="text-white text-2xl mb-6">
                {selectedEntry.title}
              </h1>
              <div className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                {selectedEntry.content}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-4 pt-6 border-t border-neutral-900">
                <button
                  onClick={() => startEdit(selectedEntry)}
                  className="text-neutral-600 hover:text-white text-sm font-mono transition-colors"
                >
                  edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("delete this entry?")) {
                      deleteEntry(selectedEntry.id);
                    }
                  }}
                  className="text-neutral-700 hover:text-red-400 text-sm font-mono transition-colors"
                >
                  delete
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <span className="text-neutral-800 text-xs font-mono">
            ♡ {entries.length} {entries.length === 1 ? "dump" : "dumps"} ♡
          </span>
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="text-neutral-800 hover:text-neutral-500 text-xs font-mono transition-colors"
            >
              sign out
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-neutral-800 hover:text-neutral-500 text-xs font-mono transition-colors"
            >
              sign in
            </button>
          )}
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-6"
          onClick={() => {
            setShowLogin(false);
            setLoginInput("");
            setLoginError("");
          }}
        >
          <div
            className="border border-neutral-800 bg-neutral-950 p-8 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-neutral-500 text-xs font-mono tracking-widest uppercase mb-6">
              sign in
            </p>
            <input
              type="password"
              placeholder="password"
              value={loginInput}
              onChange={(e) => {
                setLoginInput(e.target.value);
                setLoginError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              className="w-full bg-transparent border-b border-neutral-800 pb-2 text-sm font-mono text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors mb-4"
            />
            {loginError && (
              <p className="text-red-400/70 text-xs font-mono mb-4">
                {loginError}
              </p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowLogin(false);
                  setLoginInput("");
                  setLoginError("");
                }}
                className="text-neutral-600 hover:text-neutral-300 text-sm font-mono transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleLogin}
                className="text-white hover:opacity-70 text-sm font-mono transition-opacity"
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

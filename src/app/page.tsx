"use client";

import { useState, useEffect, useRef } from "react";

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: number;
}

const MOODS = ["", "calm", "happy", "sad", "angry", "tired", "inspired"];

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

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function Home() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [view, setView] = useState<"list" | "write" | "read">("list");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("diary-entries");
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // Save entries to localStorage
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem("diary-entries", JSON.stringify(entries));
    }
  }, [entries]);

  // Auto-focus textarea
  useEffect(() => {
    if (view === "write" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view]);

  function saveEntry() {
    if (!content.trim()) return;

    if (editingId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, title: title.trim() || "untitled", content, mood }
            : e
        )
      );
      setEditingId(null);
    } else {
      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        date: getTodayString(),
        title: title.trim() || "untitled",
        content,
        mood,
        createdAt: Date.now(),
      };
      setEntries((prev) => [entry, ...prev]);
    }

    setTitle("");
    setContent("");
    setMood("");
    setView("list");
  }

  function deleteEntry(id: string) {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (updated.length === 0) {
        localStorage.removeItem("diary-entries");
      }
      return updated;
    });
    setView("list");
    setSelectedEntry(null);
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

  // Group entries by date
  const grouped = filtered.reduce<Record<string, DiaryEntry[]>>((acc, e) => {
    const key = formatDate(e.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black text-neutral-300">
      {/* Header */}
      <header className="border-b border-neutral-900 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              setView("list");
              setSelectedEntry(null);
              setEditingId(null);
            }}
            className="text-white tracking-widest text-sm uppercase font-mono hover:opacity-70 transition-opacity"
          >
            diary
          </button>

          {view === "list" && (
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
                className="text-white hover:opacity-70 transition-opacity text-sm font-mono"
              >
                save
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

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* ===================== LIST VIEW ===================== */}
        {view === "list" && (
          <div>
            {/* Search */}
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
                <p className="text-neutral-600 font-mono text-sm mb-6">
                  nothing here yet
                </p>
                <button
                  onClick={() => setView("write")}
                  className="text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-5 py-2 text-sm font-mono transition-all"
                >
                  write your first entry
                </button>
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

            {/* Mood selector */}
            <div className="flex gap-2 flex-wrap">
              {MOODS.filter((m) => m).map((m) => (
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4 mt-auto">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <span className="text-neutral-800 text-xs font-mono">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
          <span className="text-neutral-800 text-xs font-mono">
            all data stored locally
          </span>
        </div>
      </footer>
    </div>
  );
}

import { list, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import { DiaryEntry } from "./types";

const BLOB_KEY = "diary/entries.json";
const VIEWS_BLOB_KEY = "diary/views.json";
const LOCAL_FILE = path.join(process.cwd(), "data", "entries.json");
const LOCAL_VIEWS_FILE = path.join(process.cwd(), "data", "views.json");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function getEntries(): Promise<DiaryEntry[]> {
  if (!useBlob) {
    try {
      const data = await fs.readFile(LOCAL_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(`${blobs[0].url}?_=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[storage] blob fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.error("[storage] getEntries error:", e);
    return [];
  }
}

export async function saveEntries(entries: DiaryEntry[]): Promise<void> {
  if (!useBlob) {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(entries, null, 2));
    return;
  }

  await put(BLOB_KEY, JSON.stringify(entries), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getViews(): Promise<number> {
  if (!useBlob) {
    try {
      const data = await fs.readFile(LOCAL_VIEWS_FILE, "utf-8");
      return JSON.parse(data).count || 0;
    } catch {
      return 0;
    }
  }

  try {
    const { blobs } = await list({ prefix: VIEWS_BLOB_KEY });
    if (blobs.length === 0) return 0;
    const res = await fetch(`${blobs[0].url}?_=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 0;
  }
}

export async function incrementViews(): Promise<number> {
  const current = await getViews();
  const next = current + 1;

  if (!useBlob) {
    await fs.mkdir(path.dirname(LOCAL_VIEWS_FILE), { recursive: true });
    await fs.writeFile(LOCAL_VIEWS_FILE, JSON.stringify({ count: next }));
    return next;
  }

  await put(VIEWS_BLOB_KEY, JSON.stringify({ count: next }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return next;
}

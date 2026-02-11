import { list, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import { DiaryEntry } from "./types";

const BLOB_KEY = "diary/entries.json";
const LOCAL_FILE = path.join(process.cwd(), "data", "entries.json");
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
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return await res.json();
  } catch {
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
  });
}

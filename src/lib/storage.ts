import { type InValue } from "@libsql/client";
import { getDb, initDb } from "./db";
import { DiaryEntry } from "./types";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

function rowToEntry(row: Record<string, unknown>): DiaryEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    content: row.content as string,
    mood: (row.mood as string) || undefined,
    section: (row.section as string) || "personal",
    isPrivate: !!(row.is_private as number),
    createdAt: row.created_at as number,
  };
}

export async function getEntries(includePrivate = false): Promise<DiaryEntry[]> {
  await ensureInit();
  const db = getDb();

  const query = includePrivate
    ? "SELECT * FROM entries ORDER BY created_at DESC"
    : "SELECT * FROM entries WHERE is_private = 0 ORDER BY created_at DESC";

  const result = await db.execute(query);
  return result.rows.map((row) => rowToEntry(row as unknown as Record<string, unknown>));
}

export async function createEntry(entry: DiaryEntry): Promise<void> {
  await ensureInit();
  const db = getDb();

  await db.execute({
    sql: `INSERT INTO entries (id, date, title, content, mood, section, is_private, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.id,
      entry.date,
      entry.title,
      entry.content,
      entry.mood || null,
      entry.section,
      entry.isPrivate ? 1 : 0,
      entry.createdAt,
    ],
  });
}

export async function updateEntry(
  id: string,
  updates: Partial<Pick<DiaryEntry, "title" | "content" | "mood" | "section" | "isPrivate">>
): Promise<DiaryEntry | null> {
  await ensureInit();
  const db = getDb();

  const sets: string[] = [];
  const args: InValue[] = [];

  if (updates.title !== undefined) {
    sets.push("title = ?");
    args.push(updates.title);
  }
  if (updates.content !== undefined) {
    sets.push("content = ?");
    args.push(updates.content);
  }
  if (updates.mood !== undefined) {
    sets.push("mood = ?");
    args.push(updates.mood || null);
  }
  if (updates.section !== undefined) {
    sets.push("section = ?");
    args.push(updates.section);
  }
  if (updates.isPrivate !== undefined) {
    sets.push("is_private = ?");
    args.push(updates.isPrivate ? 1 : 0);
  }

  if (sets.length === 0) return null;

  args.push(id);
  await db.execute({
    sql: `UPDATE entries SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });

  const result = await db.execute({
    sql: "SELECT * FROM entries WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) return null;
  return rowToEntry(result.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteEntry(id: string): Promise<boolean> {
  await ensureInit();
  const db = getDb();

  const result = await db.execute({
    sql: "DELETE FROM entries WHERE id = ?",
    args: [id],
  });

  return result.rowsAffected > 0;
}

export async function getViews(): Promise<number> {
  await ensureInit();
  const db = getDb();

  const result = await db.execute("SELECT count FROM views WHERE id = 1");
  if (result.rows.length === 0) return 0;
  return (result.rows[0] as unknown as Record<string, unknown>).count as number;
}

export async function incrementViews(): Promise<number> {
  await ensureInit();
  const db = getDb();

  await db.execute("UPDATE views SET count = count + 1 WHERE id = 1");
  return getViews();
}

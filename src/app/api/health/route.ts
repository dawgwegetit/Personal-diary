import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? "set" : "missing";
  checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? "set" : "missing";
  checks.DIARY_SECRET = process.env.DIARY_SECRET ? "set" : "missing";
  checks.NODE_ENV = process.env.NODE_ENV || "unknown";

  try {
    await initDb();
    checks.db_init = "ok";
  } catch (e: unknown) {
    checks.db_init = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    const db = getDb();
    const result = await db.execute("SELECT COUNT(*) as count FROM entries");
    const count = (result.rows[0] as unknown as Record<string, unknown>).count;
    checks.db_read = `ok (${count} entries)`;
  } catch (e: unknown) {
    checks.db_read = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}

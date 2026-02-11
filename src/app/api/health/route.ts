import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
    ? "set"
    : "missing";
  checks.DIARY_SECRET = process.env.DIARY_SECRET ? "set" : "missing";
  checks.NODE_ENV = process.env.NODE_ENV || "unknown";

  // Test blob read
  try {
    const { blobs } = await list({ prefix: "diary/" });
    checks.blob_read = `ok (${blobs.length} blobs)`;
  } catch (e: unknown) {
    checks.blob_read = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test blob write
  try {
    await put("diary/health-check.txt", "ok", {
      access: "public",
      addRandomSuffix: false,
    });
    checks.blob_write = "ok";
  } catch (e: unknown) {
    checks.blob_write = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}

import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

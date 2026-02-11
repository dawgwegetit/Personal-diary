import { NextResponse } from "next/server";
import { getEntries, saveEntries } from "@/lib/storage";
import { checkAuth } from "@/lib/auth";
import { DiaryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getEntries();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    title: body.title?.trim() || "untitled",
    content: body.content || "",
    mood: body.mood || undefined,
    createdAt: Date.now(),
  };

  const entries = await getEntries();
  entries.unshift(entry);
  await saveEntries(entries);

  return NextResponse.json({ entry, entries }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const entries = await getEntries();
  const index = entries.findIndex((e) => e.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  entries[index] = {
    ...entries[index],
    title: body.title?.trim() || entries[index].title,
    content: body.content ?? entries[index].content,
    mood: body.mood !== undefined ? body.mood || undefined : entries[index].mood,
  };

  await saveEntries(entries);
  return NextResponse.json({ entry: entries[index], entries });
}

export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await saveEntries(filtered);
  return NextResponse.json({ ok: true });
}

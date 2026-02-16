import { NextResponse } from "next/server";
import { getEntries, createEntry, updateEntry, deleteEntry } from "@/lib/storage";
import { checkAuth } from "@/lib/auth";
import { DiaryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAuthed = checkAuth(request);
  const entries = await getEntries(isAuthed);
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
    section: body.section || "personal",
    isPrivate: !!body.isPrivate,
    createdAt: Date.now(),
  };

  await createEntry(entry);
  const entries = await getEntries(true);

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

  const updated = await updateEntry(body.id, {
    title: body.title?.trim(),
    content: body.content,
    mood: body.mood !== undefined ? body.mood || undefined : undefined,
    section: body.section,
    isPrivate: body.isPrivate,
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const entries = await getEntries(true);
  return NextResponse.json({ entry: updated, entries });
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

  const deleted = await deleteEntry(id);
  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

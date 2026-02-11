import { NextResponse } from "next/server";
import { incrementViews } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST() {
  const count = await incrementViews();
  return NextResponse.json({ count });
}

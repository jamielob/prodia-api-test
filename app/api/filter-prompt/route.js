import { NextResponse } from "next/server";
import { filterPrompt } from "@/lib/blacklist";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }
    
    const filtered = await filterPrompt(prompt);
    return NextResponse.json({ filtered });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to filter prompt", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

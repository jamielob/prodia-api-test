import { NextResponse } from "next/server";
import { filterPrompt } from "@/lib/blacklist";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    
    // Filter copyrighted terms using AI
    const filteredPrompt = await filterPrompt(prompt);

    const apiKey = process.env.PRODIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing PRODIA_API_KEY" }, { status: 500 });
    }

    // Generate image using Prodia API with Flux Fast Schnell
    const prodiaRes = await fetch("https://inference.prodia.com/v2/job", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "image/jpeg",
      },
      body: JSON.stringify({
        type: "inference.flux-fast.schnell.txt2img.v2",
        config: {
          prompt: filteredPrompt
        }
      })
    });

    if (!prodiaRes.ok) {
      const errText = await prodiaRes.text();
      console.error('Prodia API error:', prodiaRes.status, errText);
      let errorMessage = `Prodia API error (${prodiaRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) errorMessage += `: ${errJson.error}`;
        if (errJson.message) errorMessage += `: ${errJson.message}`;
      } catch {
        if (errText) errorMessage += `: ${errText.substring(0, 200)}`;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }

    // Get the image as a buffer and convert to base64
    const imageBuffer = await prodiaRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected server error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

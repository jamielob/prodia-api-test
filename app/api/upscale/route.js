import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { imageDataUrl, upscaleFactor = 2 } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }
    
    // Validate upscale factor
    if (![2, 4, 8].includes(upscaleFactor)) {
      return NextResponse.json({ error: "Invalid upscale factor. Must be 2, 4, or 8" }, { status: 400 });
    }

    const apiKey = process.env.PRODIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing PRODIA_API_KEY" }, { status: 500 });
    }

    // Convert base64 data URL to blob
    const base64Data = imageDataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create multipart form data
    const formData = new FormData();
    
    // Add job configuration
    const jobConfig = {
      type: "inference.upscale.v1",
      config: {
        upscale: upscaleFactor
      }
    };
    
    formData.append('job', new Blob([JSON.stringify(jobConfig)], { type: 'application/json' }), 'job.json');
    formData.append('input', new Blob([imageBuffer], { type: 'image/jpeg' }), 'input.jpg');

    // Call Prodia upscale API
    const prodiaRes = await fetch("https://inference.prodia.com/v2/job", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "image/jpeg",
      },
      body: formData
    });

    if (!prodiaRes.ok) {
      const errText = await prodiaRes.text();
      return NextResponse.json(
        { error: "Prodia upscale API error", details: errText },
        { status: 502 }
      );
    }

    // Get the upscaled image as a buffer and convert to base64
    const upscaledBuffer = await prodiaRes.arrayBuffer();
    const base64Image = Buffer.from(upscaledBuffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected server error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

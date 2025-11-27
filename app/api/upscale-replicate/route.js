import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json({ error: "Server missing REPLICATE_API_TOKEN" }, { status: 500 });
    }

    // Start prediction using Real-ESRGAN
    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        input: {
          image: imageDataUrl,
          scale: 2,
          face_enhance: false
        }
      })
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      return NextResponse.json(
        { error: "Replicate API error", details: errText },
        { status: 502 }
      );
    }

    const prediction = await startRes.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          "Authorization": `Token ${apiToken}`,
        },
      });
      
      if (!pollRes.ok) {
        const errText = await pollRes.text();
        return NextResponse.json(
          { error: "Replicate polling error", details: errText },
          { status: 502 }
        );
      }
      
      result = await pollRes.json();
    }

    if (result.status === "failed") {
      return NextResponse.json(
        { error: "Replicate prediction failed", details: result.error },
        { status: 502 }
      );
    }

    // Get the output image URL
    const outputUrl = result.output;
    
    if (!outputUrl) {
      return NextResponse.json({ error: "No output from Replicate" }, { status: 502 });
    }

    // Fetch the image and convert to base64
    const imageRes = await fetch(outputUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected server error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

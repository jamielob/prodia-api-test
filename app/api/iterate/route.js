import { NextResponse } from "next/server";
import { filterPrompt } from "@/lib/blacklist";

export async function POST(req) {
  try {
    const { imageDataUrl, prompt } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const apiKey = process.env.PRODIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing PRODIA_API_KEY" }, { status: 500 });
    }

    // Convert base64 data URL to buffer
    const base64Data = imageDataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Filter the prompt using AI
    const filteredPrompt = await filterPrompt(prompt);
    
    // Create multipart form data
    const formData = new FormData();
    
    // Add job configuration
    const jobConfig = {
      type: "inference.qwen.image-edit.plus.lightning.img2img.v2",
      config: {
        prompt: filteredPrompt
      }
    };
    
    formData.append('job', new Blob([JSON.stringify(jobConfig)], { type: 'application/json' }), 'job.json');
    formData.append('input', new Blob([imageBuffer], { type: 'image/jpeg' }), 'input.jpg');

    // Call Prodia API with retry logic for 429
    let prodiaRes;
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      prodiaRes = await fetch("https://inference.prodia.com/v2/job", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "image/jpeg",
        },
        body: formData
      });
      
      // If 429, retry after delay
      if (prodiaRes.status === 429) {
        const retryAfter = prodiaRes.headers.get('Retry-After');
        const delaySeconds = retryAfter ? parseInt(retryAfter) : Math.pow(2, retryCount);
        
        if (retryCount < maxRetries) {
          console.log(`Rate limited, retrying after ${delaySeconds}s (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          retryCount++;
          continue;
        }
      }
      
      break;
    }

    if (!prodiaRes.ok) {
      const errText = await prodiaRes.text();
      console.error('Prodia img2img error:', prodiaRes.status, errText);
      let errorMessage = `Prodia img2img error (${prodiaRes.status})`;
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
    const resultBuffer = await prodiaRes.arrayBuffer();
    const base64Result = Buffer.from(resultBuffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Result}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e) {
    console.error('Iterate error:', e);
    return NextResponse.json(
      { error: "Unexpected server error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

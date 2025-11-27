"use client";

import { useState } from "react";

export default function Page() {
  const [promptPrepend, setPromptPrepend] = useState("Perfectly seamless repeating pattern, for fashion print, inspired by ");
  const [prompt, setPrompt] = useState("dancing in my ditsy floral");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(20);
  const [repeatMode, setRepeatMode] = useState("mirrored");
  const [rotation, setRotation] = useState(0);
  const [colorization, setColorization] = useState("original");
  const [crop, setCrop] = useState(0);
  const [upscaling, setUpscaling] = useState(false);
  const [isUpscaled, setIsUpscaled] = useState(false);
  const [upscaleOption, setUpscaleOption] = useState("none");
  const [mirroredImageUrl, setMirroredImageUrl] = useState("");

  // Create mirrored version when image or mode changes
  const createMirroredImage = (imgUrl, cropPercent = 0) => {
    const img = new Image();
    img.onload = () => {
      // First create 2x2 mirrored grid
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = img.width * 2;
      tempCanvas.height = img.height * 2;
      
      // Top-left: normal
      tempCtx.drawImage(img, 0, 0);
      
      // Top-right: flip horizontally
      tempCtx.save();
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(img, -img.width * 2, 0);
      tempCtx.restore();
      
      // Bottom-left: flip vertically
      tempCtx.save();
      tempCtx.scale(1, -1);
      tempCtx.drawImage(img, 0, -img.height * 2);
      tempCtx.restore();
      
      // Bottom-right: flip both
      tempCtx.save();
      tempCtx.scale(-1, -1);
      tempCtx.drawImage(img, -img.width * 2, -img.height * 2);
      tempCtx.restore();
      
      // Apply crop if needed
      if (cropPercent > 0) {
        const cropAmount = (cropPercent / 100) * tempCanvas.width / 2;
        const croppedSize = tempCanvas.width - (cropAmount * 2);
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = croppedSize;
        finalCanvas.height = croppedSize;
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.drawImage(
          tempCanvas,
          cropAmount, cropAmount, croppedSize, croppedSize,
          0, 0, croppedSize, croppedSize
        );
        
        setMirroredImageUrl(finalCanvas.toDataURL('image/jpeg'));
      } else {
        setMirroredImageUrl(tempCanvas.toDataURL('image/jpeg'));
      }
    };
    img.src = imgUrl;
  };

  const handleUpscale = async () => {
    if (!imageUrl || isUpscaled || upscaleOption === "none") return;
    
    // Check if using Replicate with already upscaled image
    if (upscaleOption === "replicate2x" && isUpscaled) {
      setError("Replicate Real-ESRGAN only works on original images. Generate a new image first.");
      return;
    }
    
    setUpscaling(true);
    setError("");

    try {
      // Always upscale the original image for speed, then regenerate mirrored version
      let res;
      if (upscaleOption === "replicate2x") {
        res = await fetch("/api/upscale-replicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: imageUrl }),
        });
      } else {
        // Prodia upscale original image
        const factor = upscaleOption === "prodia2x" ? 2 : 4;
        res = await fetch("/api/upscale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: imageUrl, upscaleFactor: factor }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Upscale error:', data);
        throw new Error(data?.error || data?.details || `Upscale failed (${res.status})`);
      }

      const data = await res.json();
      
      // Update original image and regenerate mirrored version
      setImageUrl(data.url);
      if (repeatMode === "mirrored") {
        createMirroredImage(data.url, crop);
      }
      setIsUpscaled(true);
    } catch (err) {
      console.error('Upscale error:', err);
      setError(err?.message || "Failed to upscale image.");
    } finally {
      setUpscaling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Enter a prompt.");
      return;
    }
    setLoading(true);
    setImageUrl("");

    const fullPrompt = promptPrepend + trimmed;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setImageUrl(data.url);
      createMirroredImage(data.url, crop);
      setIsUpscaled(false);
    } catch (err) {
      setError(err?.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white border-b border-gray-300">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={promptPrepend}
            onChange={(e) => setPromptPrepend(e.target.value)}
            placeholder="Prompt prepend..."
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm placeholder:text-gray-400 outline-none focus:border-gray-400"
          />
          <div className="flex items-center gap-3">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image (e.g., a serene mountain landscape at sunset)..."
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 text-base placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-black px-5 py-3 text-white transition-opacity disabled:opacity-50"
              aria-busy={loading ? "true" : "false"}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
            {imageUrl && (
              <>
                <select
                  value={upscaleOption}
                  onChange={(e) => setUpscaleOption(e.target.value)}
                  disabled={isUpscaled}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 disabled:opacity-50"
                >
                  <option value="none">None</option>
                  <option value="prodia2x">Prodia 2x</option>
                  <option value="prodia4x">Prodia 4x</option>
                  <option value="replicate2x">Replicate Real-ESRGAN (2×)</option>
                </select>
                {!isUpscaled && (
                  <button
                    type="button"
                    onClick={handleUpscale}
                    disabled={upscaling || upscaleOption === "none"}
                    className="rounded-md bg-blue-600 px-5 py-3 text-white transition-opacity disabled:opacity-50"
                    aria-busy={upscaling ? "true" : "false"}
                  >
                    {upscaling ? "Upscaling..." : "Upscale"}
                  </button>
                )}
                {isUpscaled && (
                  <span className="px-5 py-3 text-sm text-green-600">✓ Upscaled</span>
                )}
              </>
            )}
          </div>
        </form>

        {error ? (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {imageUrl && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label htmlFor="zoom" className="text-sm text-gray-700">
                Zoom:
              </label>
              <input
                id="zoom"
                type="range"
                min="10"
                max="200"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-48"
              />
              <span className="text-sm text-gray-600 w-12">{zoom}%</span>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="rotation" className="text-sm text-gray-700">
                Rotation:
              </label>
              <input
                id="rotation"
                type="range"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-48"
              />
              <span className="text-sm text-gray-600 w-12">{rotation}°</span>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="crop" className="text-sm text-gray-700">
                Crop:
              </label>
              <input
                id="crop"
                type="range"
                min="0"
                max="60"
                value={crop}
                onChange={(e) => {
                  const newCrop = Number(e.target.value);
                  setCrop(newCrop);
                  if (imageUrl) createMirroredImage(imageUrl, newCrop);
                }}
                className="w-48"
              />
              <span className="text-sm text-gray-600 w-12">{crop}%</span>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="repeatMode" className="text-sm text-gray-700">
                Repeat Mode:
              </label>
              <select
                id="repeatMode"
                value={repeatMode}
                onChange={(e) => setRepeatMode(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400"
              >
                <option value="standard">Standard</option>
                <option value="mirrored">Mirrored</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="colorization" className="text-sm text-gray-700">
                Color:
              </label>
              <select
                id="colorization"
                value={colorization}
                onChange={(e) => setColorization(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400"
              >
                <option value="original">Original</option>
                <option value="greyscale">Greyscale</option>
              </select>
            </div>
          </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full overflow-hidden relative">
        <div
          className={[
            "absolute inset-0",
            imageUrl ? "bg-repeat" : "bg-gray-50",
          ].join(" ")}
          style={imageUrl ? {
            backgroundImage: `url(${repeatMode === "mirrored" ? mirroredImageUrl : imageUrl})`,
            backgroundSize: `${zoom}%`,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            width: '300%',
            height: '300%',
            left: '-100%',
            top: '-100%',
            filter: colorization === 'greyscale' ? 'grayscale(100%)' : 'none'
          } : undefined}
        >
          {!imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Generated image will appear tiled here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

export default function Page() {
  const [promptPrepend, setPromptPrepend] = useState("Seamless repeating pattern, for fashion print, inspired by ");
  const [prompt, setPrompt] = useState("dancing in my ditsy floral");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [iterating, setIterating] = useState(false);
  const [iteratePrompt, setIteratePrompt] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(40);
  const [rotation, setRotation] = useState(0);
  const [colorization, setColorization] = useState("original");
  const [selectedHue, setSelectedHue] = useState(0);
  const [brightness, setBrightness] = useState(50);
  const [colorType, setColorType] = useState("vibrant");
  const [isDragging, setIsDragging] = useState(false);
  const [colorGridRef, setColorGridRef] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Color type presets: { saturation, lightness }
  const colorTypePresets = {
    vibrant: { sat: 85, light: 50 },
    pastel: { sat: 50, light: 75 },
    neon: { sat: 100, light: 60 },
    deep: { sat: 90, light: 35 },
    muted: { sat: 40, light: 55 },
    bright: { sat: 100, light: 55 }
  };
  
  // Handle global mouse events for dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    const handleGlobalMouseMove = (e) => {
      if (!isDragging || !colorGridRef) return;
      
      const rect = colorGridRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Calculate which column (0-37) based on x position
      const columnWidth = rect.width / 38;
      const column = Math.floor(x / columnWidth);
      
      if (column === 0) {
        // Original
        setColorization("original");
      } else if (column === 1) {
        // Greyscale
        setColorization("greyscale");
      } else if (column >= 2 && column < 38) {
        // Color columns (offset by 2)
        const hue = (column - 2) * 10;
        setColorization("colorized");
        setSelectedHue(hue);
      }
    };
    
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, colorGridRef]);
  
  // Handle canvas panning
  useEffect(() => {
    const handlePanMouseUp = () => {
      setIsPanning(false);
    };
    
    const handlePanMouseMove = (e) => {
      if (!isPanning) return;
      
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
    };
    
    if (isPanning) {
      document.addEventListener('mouseup', handlePanMouseUp);
      document.addEventListener('mousemove', handlePanMouseMove);
      return () => {
        document.removeEventListener('mouseup', handlePanMouseUp);
        document.removeEventListener('mousemove', handlePanMouseMove);
      };
    }
  }, [isPanning, panStart]);
  const [crop, setCrop] = useState(0);
  const [upscaling, setUpscaling] = useState(false);
  const [isUpscaled, setIsUpscaled] = useState(false);
  const [mirroredImageUrl, setMirroredImageUrl] = useState("");
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });

  // Utility function to render image with current filters to canvas
  const renderImageToCanvas = async (sourceImageUrl, includeFilters = true) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Apply CSS filters to canvas context if requested
        if (includeFilters) {
          let filter = 'none';
          if (colorization === 'greyscale') {
            filter = `grayscale(100%) brightness(${brightness / 50})`;
          } else if (colorization === 'colorized') {
            const preset = colorTypePresets[colorType];
            filter = `grayscale(100%) sepia(100%) saturate(${preset.sat * 4}%) brightness(${(brightness / 50) * (preset.light / 50)}) hue-rotate(${selectedHue - 50}deg)`;
          }
          ctx.filter = filter;
        }
        
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = sourceImageUrl;
    });
  };
  
  // Create mirrored version when image or mode changes
  const createMirroredImage = (imgUrl, cropPercent = 0) => {
    const img = new Image();
    img.onload = () => {
      // Update tile size state
      setTileSize({ width: img.width, height: img.height });
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


  const resizeImage = async (imageDataUrl, targetWidth, targetHeight) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageDataUrl;
    });
  };

  const handleUpscale = async () => {
    if (!imageUrl || isUpscaled) return;
    
    setUpscaling(true);
    setError("");

    try {
      // Always upscale the original image 4x
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: imageUrl, upscaleFactor: 4 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Upscale error:', data);
        throw new Error(data?.error || data?.details || `Upscale failed (${res.status})`);
      }

      const data = await res.json();
      
      // Update original image and regenerate mirrored version
      setImageUrl(data.url);
      createMirroredImage(data.url, crop);
      setIsUpscaled(true);
    } catch (err) {
      console.error('Upscale error:', err);
      setError(err?.message || "Failed to upscale image.");
    } finally {
      setUpscaling(false);
    }
  };

  const handleIterate = async () => {
    if (!imageUrl || iterating) return;
    
    const trimmed = iteratePrompt.trim();
    if (!trimmed) {
      setError("Enter an iterate prompt.");
      return;
    }
    
    setIterating(true);
    setError("");
    
    // Filter iterate prompt client-side to update input
    try {
      const filterRes = await fetch("/api/filter-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (filterRes.ok) {
        const { filtered } = await filterRes.json();
        if (filtered !== trimmed) {
          setIteratePrompt(filtered);
        }
      }
    } catch (e) {
      console.error('Filter error:', e);
    }
    
    try {
      // If upscaled, resize back to 1024x1024 before iterating
      let imageToIterate = imageUrl;
      if (isUpscaled) {
        imageToIterate = await resizeImage(imageUrl, 1024, 1024);
      }
      
      const res = await fetch("/api/iterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageDataUrl: imageToIterate,
          prompt: trimmed
        }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data?.error || `Iterate failed (${res.status})`;
        console.error('Iterate error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      setImageUrl(data.url);
      createMirroredImage(data.url, crop);
      setIsUpscaled(false); // Allow upscaling again after iterate
    } catch (err) {
      setError(err?.message || "Failed to iterate image.");
    } finally {
      setIterating(false);
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
    setImageUrl(""); // Clear to show loading state
    setMirroredImageUrl(""); // Clear display immediately

    const fullPrompt = promptPrepend + trimmed;
    
    // Filter prompt client-side to update input
    try {
      console.log('🔍 Filtering prompt:', fullPrompt);
      const filterRes = await fetch("/api/filter-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });
      console.log('📡 Filter response status:', filterRes.status);
      if (filterRes.ok) {
        const { filtered } = await filterRes.json();
        console.log('✅ Filtered result:', filtered);
        console.log('📝 Original trimmed:', trimmed);
        // Update the prompt with filtered version (remove prepend part)
        const filteredWithoutPrepend = filtered.replace(promptPrepend, '').trim();
        console.log('🔄 Filtered without prepend:', filteredWithoutPrepend);
        if (filteredWithoutPrepend !== trimmed) {
          console.log('✏️ Updating prompt input to:', filteredWithoutPrepend);
          setPrompt(filteredWithoutPrepend);
        } else {
          console.log('⏭️ Prompt unchanged, skipping update');
        }
      }
    } catch (e) {
      console.error('❌ Filter error:', e);
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data?.error || `Request failed (${res.status})`;
        console.error('Generation error:', errorMsg);
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setImageUrl(data.url);
      createMirroredImage(data.url, crop);
      setIsUpscaled(false);
      
      // Reset all controls to defaults
      setColorization("original");
      setZoom(40);
      setRotation(0);
      setCrop(0);
      setBrightness(50);
      setColorType("vibrant");
      setSelectedHue(0);
      setIteratePrompt("");
      
      // Calculate offset to show bottom row (mirrored tiles) at top
      // At 40% zoom, the 2x2 grid tile height is approximately window.innerHeight * 0.4
      // We want to offset by half the mirrored image height (one tile height)
      const img = new Image();
      img.onload = () => {
        // Mirrored image is 2x the original, so one tile is half
        const tileHeight = (img.height * 2) * (40 / 100); // 2x for mirrored grid, 40% zoom
        setPanOffset({ x: 0, y: -tileHeight / 2 });
      };
      img.src = data.url;
    } catch (err) {
      setError(err?.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-96 p-4 bg-white border-r border-gray-300 overflow-y-auto flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={promptPrepend}
            onChange={(e) => setPromptPrepend(e.target.value)}
            placeholder="Prompt prepend..."
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder:text-gray-400 outline-none focus:border-gray-400"
          />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSubmit(e);
                }
              }}
              placeholder="Describe your image (e.g., a serene mountain landscape at sunset)..."
              className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
            <button
              disabled={loading}
              className="rounded-md bg-black px-5 py-3 text-white transition-opacity disabled:opacity-50"
              aria-busy={loading ? "true" : "false"}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
            
            {imageUrl && (
              <>
                <input
                  value={iteratePrompt}
                  onChange={(e) => setIteratePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!iterating && iteratePrompt.trim()) {
                        handleIterate();
                      }
                    }
                  }}
                  placeholder="Iterate prompt (e.g., make it more vibrant)..."
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs placeholder:text-gray-400 outline-none focus:border-gray-400"
                />
                <button
                  type="button"
                  onClick={handleIterate}
                  disabled={iterating || !iteratePrompt.trim()}
                  className="rounded-md bg-purple-600 px-5 py-3 text-white transition-opacity disabled:opacity-50"
                >
                  {iterating ? "Iterating..." : "Iterate"}
                </button>
              </>
            )}
            {imageUrl && (
              <button
                type="button"
                onClick={handleUpscale}
                disabled={upscaling || isUpscaled}
                className="rounded-md bg-blue-600 px-5 py-3 text-white transition-opacity disabled:opacity-50"
                aria-busy={upscaling ? "true" : "false"}
              >
                {upscaling ? "Upscaling 4x..." : isUpscaled ? "Upscaled!" : "Upscale 4x"}
              </button>
            )}
        </form>

        {error ? (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {imageUrl && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="zoom" className="text-sm text-gray-700">
                  Zoom:
                </label>
                <span className="text-sm text-gray-600">{zoom}%</span>
              </div>
              <input
                id="zoom"
                type="range"
                min="10"
                max="200"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="rotation" className="text-sm text-gray-700">
                  Rotation:
                </label>
                <span className="text-sm text-gray-600">{rotation}°</span>
              </div>
              <input
                id="rotation"
                type="range"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="crop" className="text-sm text-gray-700">
                  Crop:
                </label>
                <span className="text-sm text-gray-600">{crop}%</span>
              </div>
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
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">Color:</label>
              
              {/* Original button */}
              {/* Color type dropdown */}
              <div className="flex flex-col gap-1 mb-2">
                <label className="text-sm text-gray-700">Color Type:</label>
                <select
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-gray-400"
                >
                  <option value="vibrant">Vibrant</option>
                  <option value="pastel">Pastel</option>
                  <option value="neon">Neon</option>
                  <option value="deep">Deep</option>
                  <option value="muted">Muted</option>
                  <option value="bright">Bright</option>
                </select>
              </div>
              
              {/* Color grid - single row of hues */}
              <div 
                ref={(el) => setColorGridRef(el)}
                className="grid select-none mb-3" 
                style={{ 
                  gridTemplateColumns: 'repeat(38, 1fr)',
                  border: '1px solid #ccc',
                  overflow: 'visible'
                }}
                onMouseDown={() => setIsDragging(true)}
              >
                {/* Original button */}
                <button
                  type="button"
                  onClick={() => setColorization("original")}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: '#fff',
                    border: colorization === 'original' ? '3px solid black' : 'none',
                    boxShadow: 'none',
                    margin: 0,
                    padding: 0,
                    aspectRatio: '1 / 4',
                    transform: colorization === 'original' ? 'scale(1.3)' : 'scale(1)',
                    zIndex: colorization === 'original' ? 10 : 1,
                    position: 'relative'
                  }}
                />
                
                {/* Greyscale button */}
                <button
                  type="button"
                  onClick={() => setColorization("greyscale")}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: `hsl(0, 0%, 50%)`,
                    border: colorization === 'greyscale' ? '3px solid black' : 'none',
                    boxShadow: 'none',
                    margin: 0,
                    padding: 0,
                    aspectRatio: '1 / 4',
                    transform: colorization === 'greyscale' ? 'scale(1.3)' : 'scale(1)',
                    zIndex: colorization === 'greyscale' ? 10 : 1,
                    position: 'relative'
                  }}
                />
                
                {/* Color columns */}
                {Array.from({ length: 36 }, (_, i) => i * 10).map((hue) => {
                  const isSelected = colorization === 'colorized' && selectedHue === hue;
                  
                  const handleColorSelect = () => {
                    setColorization("colorized");
                    setSelectedHue(hue);
                  };
                  
                  return (
                    <button
                      key={hue}
                      type="button"
                      onClick={handleColorSelect}
                      onMouseEnter={() => {
                        if (isDragging) {
                          handleColorSelect();
                        }
                      }}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: `hsl(${hue}, ${colorTypePresets[colorType].sat}%, ${colorTypePresets[colorType].light}%)`,
                        border: isSelected ? '3px solid black' : 'none',
                        boxShadow: 'none',
                        margin: 0,
                        padding: 0,
                        aspectRatio: '1 / 4',
                        transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                        zIndex: isSelected ? 10 : 1,
                        position: 'relative'
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Brightness slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Brightness:</label>
                  <span className="text-sm text-gray-600">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="65"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          </div>
        )}
        
        {imageUrl && tileSize.width > 0 && (
          <div className="mt-4 text-right text-xs text-gray-500">
            {tileSize.width} × {tileSize.height}
          </div>
        )}
      </div>

      <div className="flex-1 w-full overflow-hidden relative">
        <div
          className={[
            "absolute inset-0",
            imageUrl ? "bg-repeat" : "bg-gray-50",
            imageUrl ? "cursor-grab" : "",
            isPanning ? "cursor-grabbing" : ""
          ].join(" ")}
          onMouseDown={(e) => {
            if (imageUrl) {
              setIsPanning(true);
              setPanStart({ x: e.clientX, y: e.clientY });
            }
          }}
          style={imageUrl ? {
            backgroundImage: `url(${mirroredImageUrl})`,
            backgroundSize: `${zoom}%`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            width: '300%',
            height: '300%',
            left: '-100%',
            top: '-100%',
            filter: colorization === 'greyscale' 
              ? `grayscale(100%) brightness(${brightness / 50})` 
              : colorization === 'colorized'
                ? `grayscale(100%) sepia(100%) saturate(${colorTypePresets[colorType].sat * 4}%) brightness(${(brightness / 50) * (colorTypePresets[colorType].light / 50)}) hue-rotate(${selectedHue - 50}deg)`
                : `brightness(${brightness / 50})`
          } : undefined}
        >
          {!imageUrl && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Generated image will appear tiled here.
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Generating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

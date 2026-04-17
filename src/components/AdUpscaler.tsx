import React, { useState, useRef, useEffect } from 'react';
import { Button, Card } from './UI';
import { Upload, Download, TrendingUp, RefreshCw, Layers, Monitor, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Helper to inject 300 DPI into JPEG JFIF header
const setJpegDpi = (base64: string, dpi: number): string => {
  const binary = atob(base64.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Find JFIF marker (FF E0)
  for (let i = 0; i < bytes.length - 15; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xE0 && bytes[i + 4] === 0x4A && bytes[i + 5] === 0x46) {
      // JFIF found. Correct offsets for standard compliance:
      // Offset 11: Units (1 = dots per inch)
      // Offset 12-13: X density
      // Offset 14-15: Y density
      bytes[i + 11] = 1; 
      bytes[i + 12] = (dpi >> 8) & 0xFF;
      bytes[i + 13] = dpi & 0xFF;
      bytes[i + 14] = (dpi >> 8) & 0xFF;
      bytes[i + 15] = dpi & 0xFF;
      break;
    }
  }

  const newBinary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return `data:image/jpeg;base64,${btoa(newBinary)}`;
};

export default function AdUpscaler() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<'static' | 'digital'>('static');
  
  // Static inputs
  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [widthFeet, setWidthFeet] = useState<string>('');
  const [widthInches, setWidthInches] = useState<string>('');
  const [bleedInches, setBleedInches] = useState<string>('');
  
  // Digital inputs
  const [digitalHeight, setDigitalHeight] = useState<string>('');
  const [digitalWidth, setDigitalWidth] = useState<string>('');
  
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For visual guide
  const [bleedRatio, setBleedRatio] = useState<{ x: number, y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUpscaledImageUrl(null);
      setBleedRatio(null);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getFittedBase64 = async (file: File, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Use a high-quality working resolution for the AI input (max 3072px)
          const maxDim = 3072;
          let w = targetWidth;
          let h = targetHeight;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          // FORCE FIT: Stretch the original to the target ratio
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpscale = async () => {
    if (!selectedFile) return;
    
    setIsUpscaling(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const hF = parseFloat(heightFeet) || 0;
      const hI = parseFloat(heightInches) || 0;
      const wF = parseFloat(widthFeet) || 0;
      const wI = parseFloat(widthInches) || 0;
      const bleed = parseFloat(bleedInches) || 0;

      // New Rule: 1 Foot = 300 Pixels
      const liveHeightPx = (hF + hI / 12) * 300;
      const liveWidthPx = (wF + wI / 12) * 300;
      const bleedPx = (bleed / 12) * 300;
      const totalHeightPx = liveHeightPx + (bleedPx * 2);
      const totalWidthPx = liveWidthPx + (bleedPx * 2);

      // STEP 1: Force the original ad to fit the requested size ratio
      const base64Data = await getFittedBase64(selectedFile, totalWidthPx, totalHeightPx);
      
      // Calculate the best aspect ratio to maximize AI pixel usage
      const ratio = totalWidthPx / totalHeightPx;
      let targetAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
      if (ratio > 1.5) targetAspectRatio = "16:9";
      else if (ratio > 1.2) targetAspectRatio = "4:3";
      else if (ratio < 0.6) targetAspectRatio = "9:16";
      else if (ratio < 0.8) targetAspectRatio = "3:4";

      // Refined prompt for FIDELITY-FIRST ENHANCEMENT
      let prompt = "ACT AS A DIGITAL RESTORATION EXPERT. YOUR TASK IS TO ENHANCE THIS AD TO ULTRA-HIGH RESOLUTION. ";
      prompt += "THE INPUT IMAGE HAS BEEN PRE-FITTED TO THE CORRECT ASPECT RATIO. DO NOT CROP IT. ";
      prompt += "CRITICAL: PRESERVE 100% OF THE ORIGINAL BRANDING, FONTS, AND GRAPHIC STYLES. ";
      prompt += "1. REBUILD THE ENTIRE IMAGE at its current aspect ratio. Do not leave any borders or crop any edges. ";
      prompt += "2. DO NOT CHANGE THE FONTS. Enhance the existing letterforms, keeping their exact weight, black outlines, and drop shadows. ";
      prompt += "3. DO NOT DISTORT LOGOS. Clarify the existing logos (wrenches, NAPA logo, etc.), keeping every detail perfectly intact. ";
      prompt += "4. PRESERVE ALL STYLING: The black outlines on the red text and the drop shadows must be perfectly preserved and sharpened. ";
      prompt += "5. ZERO HALLUCINATION: Do not replace elements with your own versions. Do not 'simplify' the graphics. ";
      prompt += "6. SHARPNESS: The output must be razor-sharp, as if it were a native high-res export of the EXACT original design. ";
      prompt += `7. The output must be EXACTLY ${totalWidthPx} pixels WIDE and ${totalHeightPx} pixels HIGH. `;
      prompt += "The final result must be a digital master that is identical to the original in every detail but perfectly clear and high-definition.";

      // Use the stable model with a fidelity-focused prompt
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: selectedFile.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio
          }
        }
      });

      let aiGeneratedBase64 = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          aiGeneratedBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!aiGeneratedBase64) {
        throw new Error("AI failed to generate a high-res version. Please try again.");
      }

      const img = new Image();
      img.src = aiGeneratedBase64;
      
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let targetWidth = 0;
        let targetHeight = 0;

        if (outputType === 'static') {
          targetHeight = totalHeightPx;
          targetWidth = totalWidthPx;
          setBleedRatio({
            x: (bleedPx / totalWidthPx),
            y: (bleedPx / totalHeightPx)
          });
        } else {
          targetHeight = parseInt(digitalHeight) || 0;
          targetWidth = parseInt(digitalWidth) || 0;
          setBleedRatio(null);
        }

        if (targetWidth <= 0 || targetHeight <= 0) {
          setError("Please enter valid dimensions.");
          setIsUpscaling(false);
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Stage 1: Draw with high-quality scaling and Local Contrast Enhancement
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clarity boost: high contrast + slight saturation
        ctx.filter = 'contrast(1.2) saturate(1.05) brightness(1.02)';
        // Draw to full canvas to ensure 100% visibility (no clipping)
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        ctx.filter = 'none';

        // ADVANCED MATHEMATICAL RECONSTRUCTION (CAS + Edge Hardening)
        // Note: This is the advanced logic. If results are undesirable, revert to previous Unsharp Mask logic.
        
        const applyCAS = (imageData: ImageData): ImageData => {
          const { width, height, data } = imageData;
          const output = new ImageData(width, height);
          const outData = output.data;
          const sharpness = 1.0; // Maximum sharpness

          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const i = (y * width + x) * 4;
              const luma = (idx: number) => 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              
              const m = luma(i);
              const n = luma(i - width * 4);
              const w = luma(i - 4);
              const e = luma(i + 4);
              const s = luma(i + width * 4);

              const minL = Math.min(m, n, w, e, s);
              const maxL = Math.max(m, n, w, e, s);
              
              const amp = Math.min(minL, 255 - maxL) / Math.max(maxL, 1);
              const weight = amp * (-1.0 / (sharpness * 5.0 + 3.0));

              for (let c = 0; c < 3; c++) {
                const val = data[i + c];
                const neighbors = data[i + c - width * 4] + data[i + c - 4] + data[i + c + 4] + data[i + c + width * 4];
                outData[i + c] = Math.max(0, Math.min(255, val + (val * 4 - neighbors) * weight * 3.0));
              }
              outData[i + 3] = data[i + 3];
            }
          }
          return output;
        };

        const casData = applyCAS(ctx.getImageData(0, 0, targetWidth, targetHeight));
        ctx.putImageData(casData, 0, 0);

        // Final Edge-Hardening Pass (Extreme Laplacian)
        const edgeWeights = [
          -1, -1, -1,
          -1,  9, -1,
          -1, -1, -1
        ];
        const side = 3;
        const halfSide = 1;
        const edgeSrc = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
        const edgeOutput = ctx.createImageData(targetWidth, targetHeight);
        const edgeDst = edgeOutput.data;

        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const dstOff = (y * targetWidth + x) * 4;
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
              for (let cx = 0; cx < side; cx++) {
                const scy = Math.min(targetHeight - 1, Math.max(0, y + cy - halfSide));
                const scx = Math.min(targetWidth - 1, Math.max(0, x + cx - halfSide));
                const srcOff = (scy * targetWidth + scx) * 4;
                const wt = edgeWeights[cy * side + cx];
                r += edgeSrc[srcOff] * wt;
                g += edgeSrc[srcOff + 1] * wt;
                b += edgeSrc[srcOff + 2] * wt;
              }
            }
            edgeDst[dstOff] = Math.max(0, Math.min(255, r));
            edgeDst[dstOff + 1] = Math.max(0, Math.min(255, g));
            edgeDst[dstOff + 2] = Math.max(0, Math.min(255, b));
            edgeDst[dstOff + 3] = edgeSrc[dstOff + 3];
          }
        }
        ctx.putImageData(edgeOutput, 0, 0);

        let finalDataUrl = canvas.toDataURL('image/jpeg', 1.0);
        
        if (outputType === 'static') {
          finalDataUrl = setJpegDpi(finalDataUrl, 300);
        }

        setUpscaledImageUrl(finalDataUrl);
        setIsUpscaling(false);
      };
    } catch (err) {
      console.error("Upscale error:", err);
      setError("An error occurred during upscaling. Please check your connection and try again.");
      setIsUpscaling(false);
    }
  };

  const handleDownload = () => {
    if (!upscaledImageUrl || !selectedFile) return;

    const link = document.createElement('a');
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
    
    let dimensions = '';
    if (outputType === 'static') {
      dimensions = `${heightFeet}ft${heightInches}in_x_${widthFeet}ft${widthInches}in`;
      if (bleedInches) dimensions += `_bleed${bleedInches}in`;
      dimensions += "_300dpi";
    } else {
      dimensions = `${digitalWidth}x${digitalHeight}px`;
    }

    link.download = `${fileName}_upscaled_${dimensions}.jpg`;
    link.href = upscaledImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ad Upscaler</h1>
        <p className="text-slate-500">
          Create High Res Ads from Low Res Ads using AI. Recreates specific dimensions with 300 DPI metadata.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              1. Original Ad
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors bg-slate-50/50"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png"
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900 text-sm truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-600">Upload JPG or PNG</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                2. Output Type
              </h2>
              
              <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                <button 
                  onClick={() => setOutputType('static')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${outputType === 'static' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Layers className="w-4 h-4" />
                  Static
                </button>
                <button 
                  onClick={() => setOutputType('digital')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${outputType === 'digital' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Monitor className="w-4 h-4" />
                  Digital
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {outputType === 'static' ? (
                <motion.div 
                  key="static"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Output Size (Live Size)</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700">Height</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input type="text" inputMode="numeric" value={heightFeet} onChange={e => setHeightFeet(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-10" placeholder="0" />
                            <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">FT</span>
                          </div>
                          <div className="relative flex-1">
                            <input type="text" inputMode="numeric" value={heightInches} onChange={e => setHeightInches(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-10" placeholder="0" />
                            <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">IN</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700">Width</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input type="text" inputMode="numeric" value={widthFeet} onChange={e => setWidthFeet(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-10" placeholder="0" />
                            <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">FT</span>
                          </div>
                          <div className="relative flex-1">
                            <input type="text" inputMode="numeric" value={widthInches} onChange={e => setWidthInches(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-10" placeholder="0" />
                            <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">IN</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Bleed Size (Added to every side)</label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Optional</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={bleedInches} 
                        onChange={e => setBleedInches(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-16" 
                        placeholder="e.g. 6" 
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">INCHES</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Scale: 1' = 1" at 300 DPI</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="digital"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Output Size</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Height</label>
                      <div className="relative">
                        <input type="text" inputMode="numeric" value={digitalHeight} onChange={e => setDigitalHeight(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-12" placeholder="0" />
                        <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">PX</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Width</label>
                      <div className="relative">
                        <input type="text" inputMode="numeric" value={digitalWidth} onChange={e => setDigitalWidth(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm pr-12" placeholder="0" />
                        <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">PX</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button 
              onClick={handleUpscale} 
              disabled={!selectedFile || isUpscaling}
              className="w-full py-6 text-lg"
            >
              {isUpscaling ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  AI Recreating...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Upscale My Ad
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Column: Previews (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Original Ad</h2>
                {previewUrl && <span className="text-[10px] font-bold text-slate-400 uppercase">Source</span>}
              </div>
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                {previewUrl ? (
                  <img src={previewUrl} alt="Original" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <p className="text-sm text-slate-400">Upload an ad to see preview</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Upscaled Ad</h2>
                {upscaledImageUrl && <span className="text-[10px] font-bold text-green-600 uppercase">AI Enhanced</span>}
              </div>
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 relative group">
                {upscaledImageUrl ? (
                  <>
                    <img src={upscaledImageUrl} alt="Upscaled" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    
                    {/* Visual Guide for Bleed */}
                    {bleedRatio && (
                      <div 
                        className="absolute border-2 border-green-500/50 pointer-events-none"
                        style={{
                          top: `${bleedRatio.y * 100}%`,
                          bottom: `${bleedRatio.y * 100}%`,
                          left: `${bleedRatio.x * 100}%`,
                          right: `${bleedRatio.x * 100}%`,
                        }}
                      >
                        <div className="absolute -top-6 left-0 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Live Area
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <TrendingUp className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-sm text-slate-400">Upscaled version will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {upscaledImageUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button 
                  variant="primary" 
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download My Ad
                </Button>
                <p className="text-[10px] text-center text-slate-400 mt-2 italic">
                  Note: Final file includes 300 DPI metadata for professional printing.
                </p>
              </motion.div>
            )}
          </Card>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">Bleed Safety Tip</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                The green box in the preview represents the **Live Area**. No text or logos should extend past this line. Only background elements and photos should extend into the outer bleed area.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


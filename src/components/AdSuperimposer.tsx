import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, Trash2, Plus, Info, CheckCircle2, ChevronRight, Save } from 'lucide-react';

interface SavedBillboard {
  id: string;
  name: string;
  imageData: string; // Base64
  thumbnail: string;
}

export default function AdSuperimposer() {
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adPreview, setAdPreview] = useState<string | null>(null);
  const [billboardPhoto, setBillboardPhoto] = useState<string | null>(null);
  const [billboardName, setBillboardName] = useState('');
  const [savedBillboards, setSavedBillboards] = useState<SavedBillboard[]>([]);
  const [selectedBillboardId, setSelectedBillboardId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load saved billboards from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('saved_billboards');
    if (saved) {
      try {
        setSavedBillboards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved billboards", e);
      }
    }
  }, []);

  // Save billboards to localStorage
  const saveBillboards = (billboards: SavedBillboard[]) => {
    localStorage.setItem('saved_billboards', JSON.stringify(billboards));
    setSavedBillboards(billboards);
  };

  const handleAdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdFile(file);
      const reader = new FileReader();
      reader.onload = () => setAdPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBillboardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBillboardPhoto(reader.result as string);
        setSelectedBillboardId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCurrentBillboard = () => {
    if (!billboardPhoto || !billboardName) return;
    
    // Create a thumbnail
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      
      ctx.drawImage(img, x, y, w, h);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      const newBillboard: SavedBillboard = {
        id: Date.now().toString(),
        name: billboardName,
        imageData: billboardPhoto,
        thumbnail
      };
      
      const updated = [newBillboard, ...savedBillboards];
      saveBillboards(updated);
      setSelectedBillboardId(newBillboard.id);
      setBillboardName('');
    };
    img.src = billboardPhoto;
  };

  const deleteBillboard = (id: string) => {
    const updated = savedBillboards.filter(b => b.id !== id);
    saveBillboards(updated);
    if (selectedBillboardId === id) {
      setSelectedBillboardId(null);
      setBillboardPhoto(null);
    }
  };

  const selectSavedBillboard = (billboard: SavedBillboard) => {
    setBillboardPhoto(billboard.imageData);
    setSelectedBillboardId(billboard.id);
    setResultImage(null);
  };

  const processSuperimpose = async () => {
    if (!adPreview || !billboardPhoto) return;
    setIsProcessing(true);

    const adImg = new Image();
    const billboardImg = new Image();

    await Promise.all([
      new Promise(r => { adImg.onload = r; adImg.src = adPreview; }),
      new Promise(r => { billboardImg.onload = r; billboardImg.src = billboardPhoto; })
    ]);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    canvas.width = billboardImg.width;
    canvas.height = billboardImg.height;
    ctx.drawImage(billboardImg, 0, 0);

    // Detect red area
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // 1. Find all red pixels
    const isRed = new Uint8Array(width * height);
    const redPixelList: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Strict red detection: Red must be the dominant color
      if (r > 120 && r > g * 1.8 && r > b * 1.8 && (r + g + b) < 600) {
        const idx = i / 4;
        isRed[idx] = 1;
        redPixelList.push(idx);
      }
    }

    if (redPixelList.length < 500) {
      alert("Could not find a large enough red area. Please ensure the billboard face is colored bright red.");
      setIsProcessing(false);
      return;
    }

    // 2. Find the largest connected component (the billboard face)
    const visited = new Uint8Array(width * height);
    let largestComponent: number[] = [];
    
    for (const startIdx of redPixelList) {
      if (visited[startIdx]) continue;
      
      const component: number[] = [];
      const queue = new Int32Array(redPixelList.length);
      let head = 0;
      let tail = 0;
      
      queue[tail++] = startIdx;
      visited[startIdx] = 1;
      
      while (head < tail) {
        const idx = queue[head++];
        component.push(idx);
        
        const x = idx % width;
        const y = Math.floor(idx / width);
        
        // 4-connectivity
        const neighbors = [
          y > 0 ? idx - width : -1,
          y < height - 1 ? idx + width : -1,
          x > 0 ? idx - 1 : -1,
          x < width - 1 ? idx + 1 : -1
        ];
        
        for (const nIdx of neighbors) {
          if (nIdx !== -1 && isRed[nIdx] && !visited[nIdx]) {
            visited[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }
      
      if (component.length > largestComponent.length) {
        largestComponent = component;
      }
      
      // If we found a huge component, it's likely the billboard
      if (largestComponent.length > (redPixelList.length * 0.7)) break;
    }

    // Safety check: if the largest component is too big (e.g. > 90% of image), it's probably wrong
    if (largestComponent.length > (width * height * 0.9)) {
      alert("Detected red area is too large. Please ensure only the billboard face is red.");
      setIsProcessing(false);
      return;
    }

    if (largestComponent.length < 500) {
      alert("Could not isolate the billboard face. Try a clearer photo with a more distinct red area.");
      setIsProcessing(false);
      return;
    }

    // 3. Find 4 corners of the LARGEST component
    let tlIdx = largestComponent[0], trIdx = largestComponent[0], blIdx = largestComponent[0], brIdx = largestComponent[0];
    let minSum = Infinity, maxSum = -Infinity;
    let minDiff = Infinity, maxDiff = -Infinity;

    for (const idx of largestComponent) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      const sum = x + y;
      const diff = x - y;
      
      if (sum < minSum) { minSum = sum; tlIdx = idx; }
      if (sum > maxSum) { maxSum = sum; brIdx = idx; }
      if (diff < minDiff) { minDiff = diff; blIdx = idx; }
      if (diff > maxDiff) { maxDiff = diff; trIdx = idx; }
    }

    // Add 5px bleed to ensure coverage
    const tl = { x: (tlIdx % width) - 5, y: Math.floor(tlIdx / width) - 5 };
    const tr = { x: (trIdx % width) + 5, y: Math.floor(trIdx / width) - 5 };
    const bl = { x: (blIdx % width) - 5, y: Math.floor(blIdx / width) + 5 };
    const br = { x: (brIdx % width) + 5, y: Math.floor(brIdx / width) + 5 };

    const corners = [tl, tr, br, bl];
    
    // 4. Draw "Undercoat" to prevent red bleeding through seams
    // We fill the area with white first
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    // Perspective Warp
    drawPerspective(ctx, adImg, corners);

    // Final result
    setResultImage(canvas.toDataURL('image/jpeg', 0.95));
    setIsProcessing(false);
  };

  // Helper to draw image with perspective using affine triangle mapping
  const drawPerspective = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, corners: {x: number, y: number}[]) => {
    const numSubdivisions = 25;
    const { width, height } = img;
    
    for (let y = 0; y < numSubdivisions; y++) {
      for (let x = 0; x < numSubdivisions; x++) {
        const u1 = x / numSubdivisions;
        const v1 = y / numSubdivisions;
        const u2 = (x + 1) / numSubdivisions;
        const v2 = (y + 1) / numSubdivisions;
        
        const p1 = getPoint(u1, v1, corners);
        const p2 = getPoint(u2, v1, corners);
        const p3 = getPoint(u2, v2, corners);
        const p4 = getPoint(u1, v2, corners);
        
        // Triangle 1: (u1,v1), (u2,v1), (u1,v2)
        drawTriangle(ctx, img, 
          u1 * width, v1 * height, u2 * width, v1 * height, u1 * width, v2 * height,
          p1.x, p1.y, p2.x, p2.y, p4.x, p4.y
        );
        // Triangle 2: (u2,v1), (u2,v2), (u1,v2)
        drawTriangle(ctx, img, 
          u2 * width, v1 * height, u2 * width, v2 * height, u1 * width, v2 * height,
          p2.x, p2.y, p3.x, p3.y, p4.x, p4.y
        );
      }
    }
  };

  const getPoint = (u: number, v: number, corners: {x: number, y: number}[]) => {
    const [tl, tr, br, bl] = corners;
    // Bilinear interpolation
    const x = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
    const y = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;
    return { x, y };
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, sx1: number, sy1: number, sx2: number, sy2: number, sx3: number, sy3: number, dx1: number, dy1: number, dx2: number, dy2: number, dx3: number, dy3: number) => {
    ctx.save();
    
    // Create clipping path for the destination triangle
    // We add a tiny 0.5px expansion to the clip to ensure triangles overlap and hide seams
    const expand = 0.5;
    const centerX = (dx1 + dx2 + dx3) / 3;
    const centerY = (dy1 + dy2 + dy3) / 3;
    
    const ex1 = dx1 + (dx1 - centerX) * (expand / 10);
    const ey1 = dy1 + (dy1 - centerY) * (expand / 10);
    const ex2 = dx2 + (dx2 - centerX) * (expand / 10);
    const ey2 = dy2 + (dy2 - centerY) * (expand / 10);
    const ex3 = dx3 + (dx3 - centerX) * (expand / 10);
    const ey3 = dy3 + (dy3 - centerY) * (expand / 10);

    ctx.beginPath();
    ctx.moveTo(ex1, ey1);
    ctx.lineTo(ex2, ey2);
    ctx.lineTo(ex3, ey3);
    ctx.closePath();
    ctx.clip();
    
    // Calculate affine transform matrix mapping (sx,sy) to (dx,dy)
    const dsx1 = sx1 - sx3;
    const dsy1 = sy1 - sy3;
    const dsx2 = sx2 - sx3;
    const dsy2 = sy2 - sy3;
    
    const ddx1 = dx1 - dx3;
    const ddy1 = dy1 - dy3;
    const ddx2 = dx2 - dx3;
    const ddy2 = dy2 - dy3;

    const det = dsx1 * dsy2 - dsx2 * dsy1;
    if (Math.abs(det) < 0.0001) {
      ctx.restore();
      return;
    }

    const a = (ddx1 * dsy2 - ddx2 * dsy1) / det;
    const c = (dsx1 * ddx2 - dsx2 * ddx1) / det;
    const e = dx3 - a * sx3 - c * sy3;
    
    const b = (ddy1 * dsy2 - ddy2 * dsy1) / det;
    const d = (dsx1 * ddy2 - dsx2 * ddy1) / det;
    const f = dy3 - b * sx3 - d * sy3;

    // ctx.setTransform(a, b, c, d, e, f)
    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Ad Superimposer</h1>
        <p className="text-slate-500 text-lg">Visualize your ads on real billboard locations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Step 1: Upload Ad */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">1</div>
              <h3 className="font-semibold text-slate-900">Upload Your Ad</h3>
            </div>
            
            <label className="relative group cursor-pointer block">
              <input type="file" className="hidden" onChange={handleAdUpload} accept="image/*" />
              <div className={`aspect-video rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center
                ${adPreview ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'}`}>
                {adPreview ? (
                  <img src={adPreview} alt="Ad Preview" className="max-h-full rounded-lg shadow-sm" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-slate-600">Click to upload ad</span>
                    <span className="text-xs text-slate-400 mt-1">JPG, PNG or SVG</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Step 2: Billboard Photo */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="font-semibold text-slate-900">Billboard Location</h3>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                The billboard face in your photo <strong>must be colored solid red</strong>. 
                Need help? Email your photos to <a href="mailto:info@tastyad.com" className="font-bold underline">info@tastyad.com</a> to get them colored.
              </p>
            </div>

            <div className="space-y-4">
              <label className="relative group cursor-pointer block">
                <input type="file" className="hidden" onChange={handleBillboardUpload} accept="image/*" />
                <div className={`aspect-video rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center
                  ${billboardPhoto && !selectedBillboardId ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'}`}>
                  {billboardPhoto && !selectedBillboardId ? (
                    <img src={billboardPhoto} alt="Billboard Preview" className="max-h-full rounded-lg shadow-sm" />
                  ) : (
                    <>
                      <Plus className="w-8 h-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium text-slate-600">Upload new location</span>
                    </>
                  )}
                </div>
              </label>

              {billboardPhoto && !selectedBillboardId && (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Location name (e.g. Main St North)"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={billboardName}
                    onChange={(e) => setBillboardName(e.target.value)}
                  />
                  <button 
                    onClick={saveCurrentBillboard}
                    disabled={!billboardName}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              )}

              {savedBillboards.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Saved Locations</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {savedBillboards.map((b) => (
                      <div 
                        key={b.id}
                        onClick={() => selectSavedBillboard(b)}
                        className={`group relative cursor-pointer rounded-xl border transition-all overflow-hidden
                          ${selectedBillboardId === b.id ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <img src={b.thumbnail} alt={b.name} className="w-full aspect-video object-cover" />
                        <div className="p-2 bg-white">
                          <p className="text-[10px] font-bold text-slate-900 truncate">{b.name}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteBillboard(b.id); }}
                          className="absolute top-1 right-1 p-1 bg-white/90 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={processSuperimpose}
            disabled={!adPreview || !billboardPhoto || isProcessing}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                Superimpose Ad
              </>
            )}
          </button>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {resultImage ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex flex-col items-center gap-6"
                >
                  <div className="relative group max-w-full max-h-[70vh]">
                    <img src={resultImage} alt="Result" className="rounded-2xl shadow-2xl max-w-full max-h-full" />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors rounded-2xl" />
                  </div>
                  <div className="flex gap-4">
                    <a 
                      href={resultImage} 
                      download={`superimposed-ad-${Date.now()}.jpg`}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      Download Image
                    </a>
                    <button 
                      onClick={() => setResultImage(null)}
                      className="px-8 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      Start Over
                    </button>
                  </div>
                </motion.div>
              ) : billboardPhoto ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative max-w-full max-h-[70vh]">
                    <img src={billboardPhoto} alt="Billboard Preview" className="rounded-2xl shadow-lg max-w-full max-h-full opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-xl border border-white flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                        <span className="text-sm font-bold text-slate-900">Ready to Superimpose</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Live Preview</h3>
                  <p className="text-slate-400 max-w-xs mx-auto">
                    Upload your ad and a billboard location to see the magic happen.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}

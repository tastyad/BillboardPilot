import React, { useState, useRef, useEffect } from 'react';
import { BILLBOARD_SIZES } from '../constants';
import { BillboardSize } from '../types';
import { Button, Card } from './UI';
import { Upload, Download, Mail, Maximize2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdResizer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<BillboardSize | 'custom'>(BILLBOARD_SIZES[0]);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  
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
      setResizedImageUrl(null);
    }
  };

  const handleResize = () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsResizing(true);
    const img = new Image();
    img.src = previewUrl!;
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let targetWidth = 0;
      let targetHeight = 0;

      if (selectedSize === 'custom') {
        targetWidth = parseInt(customWidth) || 0;
        targetHeight = parseInt(customHeight) || 0;
      } else {
        targetWidth = selectedSize.width;
        targetHeight = selectedSize.height;
      }

      if (targetWidth <= 0 || targetHeight <= 0) {
        alert('Please enter valid dimensions');
        setIsResizing(false);
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Physically force the ad into specific sizes as requested
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setResizedImageUrl(dataUrl);
      setIsResizing(false);
    };
  };

  const handleDownload = () => {
    if (!resizedImageUrl || !selectedFile) return;

    const link = document.createElement('a');
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
    
    let dimensions = '';
    if (selectedSize === 'custom') {
      dimensions = `${customHeight}x${customWidth}`;
    } else {
      dimensions = selectedSize.label;
    }

    link.download = `${fileName}_${dimensions}.jpg`;
    link.href = resizedImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ad Resizer</h1>
        <p className="text-slate-500">
          Resize digital billboard ads into specific pixel dimensions. Physically force the ad into specific sizes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Upload and Settings */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              1. Upload Creative
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-300 transition-colors bg-slate-50/50"
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
                  <p className="font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-600">Click to upload JPG or PNG</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Maximize2 className="w-5 h-5" />
              2. Select Dimensions
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Standard Sizes</label>
                <select 
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={selectedSize === 'custom' ? 'custom' : selectedSize.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setSelectedSize('custom');
                    } else {
                      const size = BILLBOARD_SIZES.find(s => s.label === val);
                      if (size) setSelectedSize(size);
                    }
                  }}
                >
                  {BILLBOARD_SIZES.map((size) => (
                    <option key={size.label} value={size.label}>
                      {size.label} ({size.subtext})
                    </option>
                  ))}
                  <option value="custom">Custom Dimensions</option>
                </select>
              </div>

              {selectedSize === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Height (px)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 400"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Width (px)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 800"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}

              <Button 
                onClick={handleResize} 
                disabled={!selectedFile || isResizing}
                className="w-full"
              >
                {isResizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resizing...
                  </>
                ) : (
                  'Resize'
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Preview and Download */}
        <div className="space-y-6">
          <Card className="p-6 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="flex-1 min-h-[300px] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 relative">
              {resizedImageUrl ? (
                <img 
                  src={resizedImageUrl} 
                  alt="Resized preview" 
                  className="max-w-full max-h-full object-contain shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img 
                    src={previewUrl} 
                    alt="Original preview" 
                    className="max-w-full max-h-full object-contain opacity-50"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm font-medium text-slate-600 bg-white/80 px-3 py-1 rounded-full shadow-sm">
                      Ready to resize
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No image uploaded</p>
              )}
            </div>

            <AnimatePresence>
              {resizedImageUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Button 
                    variant="primary" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download .jpg
                  </Button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    Dimensions: {selectedSize === 'custom' ? `${customWidth}x${customHeight}` : `${selectedSize.width}x${selectedSize.height}`}px
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-8 border-t border-slate-200">
        <div className="bg-slate-50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-slate-900">Need to get this ad professionally resized?</h3>
            <p className="text-slate-500">Our experts at Tasty Ad can help you with high-quality manual resizing.</p>
          </div>
          <Button 
            variant="outline" 
            className="whitespace-nowrap bg-white"
            onClick={() => window.location.href = 'mailto:info@tastyad.com'}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Tasty Ad!
          </Button>
        </div>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

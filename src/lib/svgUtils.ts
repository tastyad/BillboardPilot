/**
 * Renders an SVG string to a Data URL (PNG) via Canvas.
 */
export const renderSvgToDataUrl = (svgString: string, width: number = 612, height: number = 792, scale: number = 2): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svg);
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      
      img.onerror = (err) => {
        console.error('SVG Image loading error:', err);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
};

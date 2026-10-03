import React, { useState } from 'react';
import { Layer } from '../types';
import { Download, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  width: number;
  height: number;
  backgroundColor: string;
  hasTransparentBg: boolean;
  projectTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  layers,
  width,
  height,
  backgroundColor,
  hasTransparentBg,
  projectTitle,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp' | 'svg'>('png');
  const [scale, setScale] = useState<number>(1);
  const [quality, setQuality] = useState<number>(0.92);
  const [includeBackground, setIncludeBackground] = useState<boolean>(!hasTransparentBg);

  if (!isOpen) return null;

  const handleExport = async () => {
    const exportWidth = width * scale;
    const exportHeight = height * scale;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Scale transform if scale > 1
    ctx.save();
    if (scale !== 1) {
      ctx.scale(scale, scale);
    }

    // Draw background if requested or format doesn't support alpha (JPEG)
    if (includeBackground || format === 'jpeg') {
      ctx.fillStyle = backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // Render layers
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100.0;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    // Restore context scale
    ctx.restore();

    // Export based on format
    const fileName = `${projectTitle.replace(/\s+/g, '_')}_${Date.now()}`;

    if (format === 'svg') {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
          <image href="${dataUrl}" width="${exportWidth}" height="${exportHeight}" />
        </svg>
      `;
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = exportCanvas.toDataURL(mimeType, quality);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileName}.${format === 'jpeg' ? 'jpg' : format}`;
      a.click();
    }

    onClose();
  };

  return (
    <div 
      id="export-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        id="export-modal-dialog"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-neutral-100">تصدير اللوحة الفنية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Options */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {/* Format selection */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-bold block">صيغة الملف</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'png', name: 'PNG (شفاف)' },
                { id: 'jpeg', name: 'JPG (صورة)' },
                { id: 'webp', name: 'WEBP (مضغوط)' },
                { id: 'svg', name: 'SVG (فيكتور)' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as any)}
                  className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                    format === fmt.id
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {fmt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scale resolution multiplier */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-neutral-300">
              <span className="font-bold">دقة التصدير وحجم البكسل</span>
              <span className="font-mono text-blue-400">
                {width * scale} × {height * scale} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { s: 1, label: 'الحجم الأصلي 1x' },
                { s: 2, label: 'دقة مضاعفة 2x' },
                { s: 4, label: 'فائقة الدقة 4x' },
              ].map((item) => (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setScale(item.s)}
                  className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                    scale === item.s
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider (if JPG or WEBP) */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span>جودة الضغط</span>
                <span className="font-mono text-blue-400">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          )}

          {/* Background transparency toggle */}
          {format !== 'jpeg' && (
            <label className="flex items-center gap-2 text-neutral-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                className="rounded border-neutral-700 text-blue-500 bg-neutral-800"
              />
              <span>تضمين لون الخلفية (إلغاء التحديد لحفظ خلفية شفافة)</span>
            </label>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium cursor-pointer font-bold"
          >
            إلغاء
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل الصورة الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};

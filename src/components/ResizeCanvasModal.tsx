import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Settings, 
  Move, 
  Maximize2, 
  Minimize2, 
  Scaling, 
  Maximize 
} from 'lucide-react';

interface ResizeCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  currentDpi: number;
  currentBgColor: string;
  currentTransparentBg: boolean;
  onResize: (
    width: number,
    height: number,
    dpi: number,
    bgColor: string,
    transparent: boolean,
    scaleContent: boolean, // whether to stretch the drawing to fit, or just change canvas bounds
    anchor: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  ) => void;
}

export const ResizeCanvasModal: React.FC<ResizeCanvasModalProps> = ({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  currentDpi,
  currentBgColor,
  currentTransparentBg,
  onResize,
}) => {
  const [width, setWidth] = useState<number>(currentWidth);
  const [height, setHeight] = useState<number>(currentHeight);
  const [dpi, setDpi] = useState<number>(currentDpi);
  const [bgChoice, setBgChoice] = useState<'white' | 'black' | 'transparent' | 'custom'>('custom');
  const [customBgColor, setCustomBgColor] = useState<string>(currentBgColor);
  const [scaleContent, setScaleContent] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('center');

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth);
      setHeight(currentHeight);
      setDpi(currentDpi);
      setCustomBgColor(currentBgColor);
      if (currentTransparentBg) {
        setBgChoice('transparent');
      } else if (currentBgColor === '#ffffff') {
        setBgChoice('white');
      } else if (currentBgColor === '#121212' || currentBgColor === '#1a1a1a') {
        setBgChoice('black');
      } else {
        setBgChoice('custom');
      }
    }
  }, [isOpen, currentWidth, currentHeight, currentDpi, currentBgColor, currentTransparentBg]);

  if (!isOpen) return null;

  const presets = [
    { name: 'شاشة عريضة Full HD', w: 1920, h: 1080 },
    { name: 'مربع وسائل التواصل', w: 1080, h: 1080 },
    { name: 'رسم رقمي عالي الدقة 2K', w: 2048, h: 2048 },
    { name: 'A4 طباعة رأسية', w: 2480, h: 3508 },
    { name: 'A4 طباعة أفقية', w: 3508, h: 2480 },
    { name: 'شاشة هاتف ذكي', w: 1080, h: 2400 },
  ];

  const handleApply = () => {
    const isTrans = bgChoice === 'transparent';
    const bgCol = bgChoice === 'white' ? '#ffffff' : bgChoice === 'black' ? '#121212' : customBgColor;
    onResize(width, height, dpi, bgCol, isTrans, scaleContent, anchor);
    onClose();
  };

  return (
    <div 
      id="resize-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-250"
    >
      <div 
        id="resize-modal-dialog"
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="text-sm font-bold text-neutral-100">ضبط أبعاد ومقاسات الرسم الحالية</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Quick presets */}
          <div className="space-y-2">
            <label className="text-neutral-400 font-medium block">أبعاد قياسية جاهزة للملاءمة</label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((pr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setWidth(pr.w);
                    setHeight(pr.h);
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-colors cursor-pointer text-[11px] ${
                    width === pr.w && height === pr.h
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span className="block truncate font-bold">{pr.name}</span>
                  <span className="block text-[10px] text-neutral-500 font-mono mt-0.5">
                    {pr.w} × {pr.h} px
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom dimensions */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-neutral-400 block font-bold">العرض (بكسل)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(100, Math.min(8000, Number(e.target.value))))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-400 block font-bold">الارتفاع (بكسل)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(100, Math.min(8000, Number(e.target.value))))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-400 block font-bold">الكثافة (DPI)</label>
              <input
                type="number"
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Resize Type: Scale Content vs Expand Bounds */}
          <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-3">
            <span className="text-neutral-300 font-bold block">خيارات معالجة الرسم</span>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScaleContent(false)}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                  !scaleContent
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                    : 'border-neutral-850 bg-neutral-900/40 hover:bg-neutral-850 text-neutral-400'
                }`}
              >
                <div className="font-bold text-[11px]">قص وتوسيع اللوحة</div>
                <div className="text-[9px] text-neutral-500 mt-0.5">يغير مساحة العمل مع إبقاء حجم الرسم الأصلي</div>
              </button>

              <button
                type="button"
                onClick={() => setScaleContent(true)}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                  scaleContent
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                    : 'border-neutral-850 bg-neutral-900/40 hover:bg-neutral-850 text-neutral-400'
                }`}
              >
                <div className="font-bold text-[11px]">تمديد وملاءمة الرسم</div>
                <div className="text-[9px] text-neutral-500 mt-0.5">تمديد الرسم تلقائياً ليتناسب مع الأبعاد الجديدة</div>
              </button>
            </div>
          </div>

          {/* Canvas anchor selector (only visible if scaleContent is false) */}
          {!scaleContent && (
            <div className="grid grid-cols-3 gap-4 items-center bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
              <div className="col-span-2 space-y-1">
                <span className="text-neutral-300 font-bold block">مربط اتجاه التوسيع (Anchor)</span>
                <span className="text-neutral-500 text-[10px] block">حدد اتجاه تثبيت الرسم الحالي عند قص أو توسيع اللوحة</span>
              </div>
              
              {/* Anchor Grid selector */}
              <div className="grid grid-cols-3 gap-1 w-20 h-20 mx-auto border border-neutral-700 p-1 rounded-lg bg-neutral-950">
                {(['top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => {
                  const isSelected = anchor === pos;
                  // Handle center placement positioning correctly inside the 3x3 grid
                  let gridClass = '';
                  if (pos === 'top-left') gridClass = 'col-start-1 row-start-1';
                  if (pos === 'top-center') gridClass = 'col-start-2 row-start-1';
                  if (pos === 'top-right') gridClass = 'col-start-3 row-start-1';
                  if (pos === 'center') gridClass = 'col-start-2 row-start-2';
                  if (pos === 'bottom-left') gridClass = 'col-start-1 row-start-3';
                  if (pos === 'bottom-center') gridClass = 'col-start-2 row-start-3';
                  if (pos === 'bottom-right') gridClass = 'col-start-3 row-start-3';

                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setAnchor(pos)}
                      title={pos}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${gridClass} ${
                        isSelected 
                          ? 'bg-blue-500 text-white shadow-md' 
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-500'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-neutral-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Canvas Background Color Choice */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-neutral-300 font-bold block">تعديل لون خلفية لوحة الرسم</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setBgChoice('white')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer text-center ${
                  bgChoice === 'white'
                    ? 'border-blue-500 bg-neutral-800 text-neutral-100 font-bold'
                    : 'border-neutral-800 bg-neutral-950/20 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                أبيض
              </button>
              <button
                type="button"
                onClick={() => setBgChoice('black')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer text-center ${
                  bgChoice === 'black'
                    ? 'border-blue-500 bg-neutral-800 text-neutral-100 font-bold'
                    : 'border-neutral-800 bg-neutral-950/20 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                أسود
              </button>
              <button
                type="button"
                onClick={() => setBgChoice('transparent')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer text-center ${
                  bgChoice === 'transparent'
                    ? 'border-blue-500 bg-neutral-800 text-neutral-100 font-bold'
                    : 'border-neutral-800 bg-neutral-950/20 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                شفاف
              </button>
              <button
                type="button"
                onClick={() => setBgChoice('custom')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer text-center ${
                  bgChoice === 'custom'
                    ? 'border-blue-500 bg-neutral-800 text-neutral-100 font-bold'
                    : 'border-neutral-800 bg-neutral-950/20 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                مخصص
              </button>
            </div>

            {bgChoice === 'custom' && (
              <div className="flex items-center gap-2.5 mt-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-10 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="bg-transparent border-b border-neutral-800 outline-none font-mono text-xs text-neutral-300 flex-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-xs cursor-pointer font-bold"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تطبيق التعديلات</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { BrushPresetId, BrushSettings } from '../types';
import { BRUSH_PRESETS } from '../utils/brushPresets';
import { BrushRenderer } from '../utils/brushEngine';
import { Sliders, RotateCw, Sparkles, PanelLeftClose } from 'lucide-react';

interface BrushPanelProps {
  currentBrush: BrushSettings;
  onSelectBrush: (brush: BrushSettings) => void;
  onUpdateBrushSettings: (settings: Partial<BrushSettings>) => void;
  currentColor: string;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const BrushPanel: React.FC<BrushPanelProps> = ({
  currentBrush,
  onSelectBrush,
  onUpdateBrushSettings,
  currentColor,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const categories = [
    'الكل',
    'رصاص وتخطيط',
    'أحبار وخطوط',
    'فراشي تلوين',
    'فحم وباستيل',
    'تأثيرات وبكسل',
  ];

  const filteredBrushes = Object.values(BRUSH_PRESETS).filter((b) => {
    if (selectedCategory === 'الكل') return true;
    return b.category === selectedCategory;
  });

  // Render dynamic stroke preview swatch
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderer = new BrushRenderer();
    const w = canvas.width;
    const h = canvas.height;

    // Draw S-curve stroke to demonstrate dynamics
    const points = [
      { x: w * 0.15, y: h * 0.7, pressure: 0.3, time: 0 },
      { x: w * 0.35, y: h * 0.25, pressure: 0.6, time: 10 },
      { x: w * 0.65, y: h * 0.8, pressure: 0.9, time: 20 },
      { x: w * 0.85, y: h * 0.35, pressure: 0.4, time: 30 },
    ];

    renderer.startStroke(ctx, points[0], currentBrush, currentColor);
    for (let i = 1; i < points.length; i++) {
      renderer.continueStroke(ctx, points[i], currentBrush, currentColor);
    }
    renderer.endStroke();
  }, [currentBrush, currentColor]);

  return (
    <div 
      id="brush-management-panel"
      className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-100 overflow-hidden w-80 select-none text-xs"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-neutral-200">الفرش والإعدادات</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            {currentBrush.name}
          </span>
          {onClose && (
            <button
              id="brush-panel-collapse-btn"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
              title="طي وإدخال اللوحة الجانبية"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Live Stroke Swatch Preview */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/60">
        <div className="relative w-full h-14 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
          <canvas
            ref={previewCanvasRef}
            width={280}
            height={56}
            className="w-full h-full block"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 overflow-x-auto bg-neutral-900">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Brushes Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-56 border-b border-neutral-800">
        <div className="grid grid-cols-2 gap-1.5">
          {filteredBrushes.map((b) => {
            const isSelected = currentBrush.id === b.id;
            return (
              <button
                key={b.id}
                id={`brush-preset-${b.id}`}
                onClick={() => onSelectBrush(b)}
                className={`flex flex-col items-start p-2 rounded-xl border text-right transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                    : 'border-neutral-800/80 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <span className="text-[12px] truncate w-full">{b.name}</span>
                <span className="text-[10px] text-neutral-400 truncate w-full mt-0.5">
                  {b.size}px • {Math.round(b.opacity * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Brush Tuning Sliders */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Size */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="brush-size-slider" className="text-neutral-400 cursor-pointer">
              حجم قطر الفرشاة (Size)
            </label>
            <span className="text-amber-400 font-mono">{currentBrush.size} بكسل</span>
          </div>
          <input
            id="brush-size-slider"
            type="range"
            min="1"
            max="200"
            step="1"
            value={currentBrush.size}
            onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 2. Opacity */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="brush-opacity-slider" className="text-neutral-400 cursor-pointer">
              الشفافية (Opacity)
            </label>
            <span className="text-amber-400 font-mono">{Math.round(currentBrush.opacity * 100)}%</span>
          </div>
          <input
            id="brush-opacity-slider"
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={currentBrush.opacity}
            onChange={(e) => onUpdateBrushSettings({ opacity: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 3. Flow */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="brush-flow-slider" className="text-neutral-400 cursor-pointer">
              تدفق وكثافة اللون (Flow)
            </label>
            <span className="text-amber-400 font-mono">{Math.round(currentBrush.flow * 100)}%</span>
          </div>
          <input
            id="brush-flow-slider"
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={currentBrush.flow}
            onChange={(e) => onUpdateBrushSettings({ flow: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 4. Hardness */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">الصلابة (Hardness)</span>
            <span className="text-amber-400 font-mono">{Math.round(currentBrush.hardness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={currentBrush.hardness}
            onChange={(e) => onUpdateBrushSettings({ hardness: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* 5. Smoothing */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">تنعيم الخط وتثبيت اليد</span>
            <span className="text-amber-400 font-mono">{Math.round(currentBrush.smoothing * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.9"
            step="0.05"
            value={currentBrush.smoothing}
            onChange={(e) => onUpdateBrushSettings({ smoothing: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* 6. Spacing */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">التباعد (Spacing)</span>
            <span className="text-amber-400 font-mono">{Math.round(currentBrush.spacing * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.02"
            max="0.8"
            step="0.02"
            value={currentBrush.spacing}
            onChange={(e) => onUpdateBrushSettings({ spacing: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* Calligraphy Angle if applicable */}
        {currentBrush.id === 'calligraphy' && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">زاوية شطفة القلم</span>
              <span className="text-amber-400 font-mono">{currentBrush.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={currentBrush.angle}
              onChange={(e) => onUpdateBrushSettings({ angle: Number(e.target.value) })}
              className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded"
            />
          </div>
        )}

        {/* Stylus Pressure Dynamics Switches */}
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <span className="text-[11px] font-bold text-neutral-300 block">
            حساسية ضغط القلم (Stylus / Apple Pencil)
          </span>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-neutral-400">الضغط يتحكم بالحجم</span>
            <input
              type="checkbox"
              checked={currentBrush.pressureSize}
              onChange={(e) => onUpdateBrushSettings({ pressureSize: e.target.checked })}
              className="rounded border-neutral-700 text-amber-500 bg-neutral-800"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-neutral-400">الضغط يتحكم بالشفافية</span>
            <input
              type="checkbox"
              checked={currentBrush.pressureOpacity}
              onChange={(e) => onUpdateBrushSettings({ pressureOpacity: e.target.checked })}
              className="rounded border-neutral-700 text-amber-500 bg-neutral-800"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

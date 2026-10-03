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
    '✏️ أقلام الجرافيت',
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
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-sm text-neutral-200">الفرش والإعدادات</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-blue-400/90 font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
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
                ? 'bg-blue-600 text-white font-bold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Brushes Grid */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-1.5 border-b border-neutral-800 transition-all ${
        selectedCategory === '✏️ أقلام الجرافيت' ? 'max-h-[380px]' : 'max-h-56'
      }`}>
        <div className="grid grid-cols-2 gap-1.5">
          {filteredBrushes.map((b) => {
            const isSelected = currentBrush.id === b.id;
            const isGraphitePencil = b.category === '✏️ أقلام الجرافيت';
            return (
              <button
                key={b.id}
                id={`brush-preset-${b.id}`}
                onClick={() => onSelectBrush(b)}
                className={`flex flex-col items-start p-2 rounded-xl border text-right transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                    : 'border-neutral-800/80 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[12px] truncate">{b.name}</span>
                  {isGraphitePencil && (
                    <span className="text-[9px] px-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono scale-[0.9]">
                      {b.id.replace('pencil_', '').toUpperCase().replace('_GRAD', '')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 truncate w-full mt-0.5">
                  {b.size}px • {Math.round(b.opacity * 100)}%
                </span>
                {isGraphitePencil && (
                  <div className="flex items-center gap-1.5 w-full justify-between mt-1 pt-1 border-t border-neutral-800/50">
                    <span className="text-[8px] text-neutral-500">الجرافيت:</span>
                    <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round(b.opacity * b.flow * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
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
              {currentBrush.id === 'charcoal_eraser' ? 'حجم استيكة الفحم (Size)' : 'حجم قطر الفرشاة (Size)'}
            </label>
            <span className="text-blue-400 font-mono">{currentBrush.size} بكسل</span>
          </div>
          <input
            id="brush-size-slider"
            type="range"
            min="1"
            max={currentBrush.id === 'glow_light' || currentBrush.id === 'airbrush' ? "500" : (currentBrush.id === 'laser' || currentBrush.id === 'charcoal_eraser') ? "300" : "250"}
            step="1"
            value={currentBrush.size}
            onChange={(e) => onUpdateBrushSettings({ size: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 2. Opacity / Light Strength / Laser Power / Smudge Strength / Charcoal Eraser Strength */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="brush-opacity-slider" className="text-neutral-400 cursor-pointer">
              {currentBrush.id === 'charcoal_eraser'
                ? 'قوة التفتيح والمسح (Strength)'
                : currentBrush.id === 'laser'
                ? 'قوة الضوء الليزر (Laser Power)'
                : currentBrush.id === 'glow_light'
                ? 'قوة الإضاءة (Light Strength)'
                : currentBrush.id === 'smudge'
                ? 'قوة الدمج (Smudge Strength)'
                : 'الشفافية (Opacity)'}
            </label>
            <span className="text-blue-400 font-mono">{Math.round(currentBrush.opacity * 100)}%</span>
          </div>
          <input
            id="brush-opacity-slider"
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={currentBrush.opacity}
            onChange={(e) => onUpdateBrushSettings({ opacity: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* Texture / Grain (For Charcoal Eraser) */}
        {(currentBrush.id === 'charcoal_eraser' || currentBrush.texture !== undefined) && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">ملمس النسيج وحبيبات الفحم (Texture)</span>
              <span className="text-blue-400 font-mono">
                {Math.round((currentBrush.texture ?? 0.65) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={currentBrush.texture ?? 0.65}
              onChange={(e) => onUpdateBrushSettings({ texture: Number(e.target.value) })}
              className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Glow Amount (For Light & Laser Brushes) */}
        {(currentBrush.id === 'glow_light' || currentBrush.id === 'laser') && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">
                {currentBrush.id === 'laser' ? 'توهج الليزر (Laser Glow)' : 'التوهج وهالة الضوء (Glow)'}
              </span>
              <span className="text-blue-400 font-mono">
                {Math.round((currentBrush.glowAmount ?? (currentBrush.id === 'laser' ? 0.9 : 0.85)) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={currentBrush.glowAmount ?? (currentBrush.id === 'laser' ? 0.9 : 0.85)}
              onChange={(e) => onUpdateBrushSettings({ glowAmount: Number(e.target.value) })}
              className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Build-up Accumulation (For Light & Laser Brushes) */}
        {(currentBrush.id === 'glow_light' || currentBrush.id === 'laser') && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">التراكم (Build-up)</span>
              <span className="text-blue-400 font-mono">
                {Math.round((currentBrush.buildUp ?? (currentBrush.id === 'laser' ? 0.8 : 0.75)) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.05"
              value={currentBrush.buildUp ?? (currentBrush.id === 'laser' ? 0.8 : 0.75)}
              onChange={(e) => onUpdateBrushSettings({ buildUp: Number(e.target.value) })}
              className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        )}

        {/* 3. Flow */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="brush-flow-slider" className="text-neutral-400 cursor-pointer">
              {currentBrush.id === 'charcoal_eraser'
                ? 'تدفق المسح (Flow)'
                : currentBrush.id === 'laser'
                ? 'تدفق الليزر (Flow)'
                : currentBrush.id === 'glow_light'
                ? 'تدفق ونفاذية الإضاءة (Flow)'
                : currentBrush.id === 'smudge'
                ? 'التدفق والامتصاص (Flow)'
                : 'تدفق وكثافة اللون (Flow)'}
            </label>
            <span className="text-blue-400 font-mono">{Math.round(currentBrush.flow * 100)}%</span>
          </div>
          <input
            id="brush-flow-slider"
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={currentBrush.flow}
            onChange={(e) => onUpdateBrushSettings({ flow: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 4. Hardness */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">
              {currentBrush.id === 'charcoal_eraser'
                ? 'نعومة / صلابة الاستيكة (Softness/Hardness)'
                : currentBrush.id === 'glow_light'
                ? 'صلابة ونعومة مركز الضوء (Softness/Hardness)'
                : currentBrush.id === 'smudge'
                ? 'نعومة حواف الدمج (Hardness)'
                : 'الصلابة (Hardness)'}
            </span>
            <span className="text-blue-400 font-mono">{Math.round(currentBrush.hardness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={currentBrush.hardness}
            onChange={(e) => onUpdateBrushSettings({ hardness: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* 5. Smoothing */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">تنعيم الخط وتثبيت اليد</span>
            <span className="text-blue-400 font-mono">{Math.round(currentBrush.smoothing * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.9"
            step="0.05"
            value={currentBrush.smoothing}
            onChange={(e) => onUpdateBrushSettings({ smoothing: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* 6. Spacing */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">التباعد (Spacing)</span>
            <span className="text-blue-400 font-mono">{Math.round(currentBrush.spacing * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.02"
            max="0.8"
            step="0.02"
            value={currentBrush.spacing}
            onChange={(e) => onUpdateBrushSettings({ spacing: Number(e.target.value) })}
            className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded"
          />
        </div>

        {/* Calligraphy Angle if applicable */}
        {currentBrush.id === 'calligraphy' && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">زاوية شطفة القلم</span>
              <span className="text-blue-400 font-mono">{currentBrush.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={currentBrush.angle}
              onChange={(e) => onUpdateBrushSettings({ angle: Number(e.target.value) })}
              className="w-full accent-blue-500 bg-neutral-800 h-1.5 rounded"
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
              className="rounded border-neutral-700 text-blue-500 bg-neutral-800"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-neutral-400">الضغط يتحكم بالشفافية</span>
            <input
              type="checkbox"
              checked={currentBrush.pressureOpacity}
              onChange={(e) => onUpdateBrushSettings({ pressureOpacity: e.target.checked })}
              className="rounded border-neutral-700 text-blue-500 bg-neutral-800"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

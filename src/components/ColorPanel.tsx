import React, { useState, useEffect, useRef } from 'react';
import { PRESET_COLOR_PALETTES } from '../utils/brushPresets';
import { Palette, Pipette, Plus, Trash2, History, PanelLeftClose } from 'lucide-react';

interface ColorPanelProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  previousColor: string;
  onSelectEyedropper: () => void;
  customPalette: string[];
  onAddToCustomPalette: (color: string) => void;
  onRemoveFromCustomPalette: (index: number) => void;
  recentColors: string[];
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({
  currentColor,
  onColorChange,
  previousColor,
  onSelectEyedropper,
  customPalette,
  onAddToCustomPalette,
  onRemoveFromCustomPalette,
  recentColors,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [hue, setHue] = useState<number>(0);
  const [sat, setSat] = useState<number>(100);
  const [val, setVal] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('essential');

  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef<boolean>(false);

  // Convert HSV to Hex
  const hsvToHex = (h: number, s: number, v: number): string => {
    s /= 100;
    v /= 100;
    const f = (n: number) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    };
    const r = Math.round(f(5) * 255);
    const g = Math.round(f(3) * 255);
    const b = Math.round(f(1) * 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Convert Hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgb = hexToRgb(currentColor);

  // Update HSV from pointer event on 2D square
  const handleSatValPointer = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    const rect = satValRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    const newSat = Math.round(x * 100);
    const newVal = Math.round((1 - y) * 100);

    setSat(newSat);
    setVal(newVal);
    onColorChange(hsvToHex(hue, newSat, newVal));
  };

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    onColorChange(hsvToHex(newHue, sat, val));
  };

  const selectedPresetPalette =
    PRESET_COLOR_PALETTES.find((p) => p.id === selectedPaletteId) || PRESET_COLOR_PALETTES[0];

  return (
    <div 
      id="color-management-panel"
      className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-100 overflow-y-auto w-80 select-none text-xs p-4 space-y-4"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-neutral-200">نظام الألوان</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="color-panel-eyedropper-btn"
            onClick={onSelectEyedropper}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="قطّارة الألوان"
          >
            <Pipette className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              id="color-panel-collapse-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
              title="طي وإدخال اللوحة الجانبية"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2D Saturation / Value Gradient Box */}
      <div
        ref={satValRef}
        id="color-sat-val-picker"
        onPointerDown={(e) => {
          isDraggingSatVal.current = true;
          handleSatValPointer(e);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (isDraggingSatVal.current) handleSatValPointer(e);
        }}
        onPointerUp={(e) => {
          isDraggingSatVal.current = false;
        }}
        style={{
          backgroundColor: `hsl(${hue}, 100%, 50%)`,
        }}
        className="relative w-full h-36 rounded-xl cursor-crosshair overflow-hidden touch-none shadow-inner border border-neutral-800"
      >
        {/* White horizontal gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #ffffff, transparent)',
          }}
        />
        {/* Black vertical gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent, #000000)',
          }}
        />
        {/* Picker thumb handle */}
        <div
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`,
            backgroundColor: currentColor,
          }}
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none"
        />
      </div>

      {/* Hue Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>درجة اللون (Hue)</span>
          <span className="font-mono text-amber-400">{hue}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => handleHueChange(Number(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        />
      </div>

      {/* Current vs Previous Color Preview Swatches */}
      <div className="flex items-center gap-3 p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2 flex-1">
          <div
            id="color-current-swatch"
            style={{ backgroundColor: currentColor }}
            className="w-10 h-10 rounded-xl border border-neutral-700 shadow-md"
            title="اللون الحالي"
          />
          <div className="text-[11px]">
            <span className="text-neutral-400 block">اللون الحالي</span>
            <span className="font-mono text-neutral-200 font-bold uppercase">{currentColor}</span>
          </div>
        </div>

        {previousColor && (
          <button
            onClick={() => onColorChange(previousColor)}
            className="flex items-center gap-2 text-right group"
            title="استرجاع اللون السابق"
          >
            <div className="text-[11px]">
              <span className="text-neutral-500 block group-hover:text-amber-400">السابق</span>
              <span className="font-mono text-neutral-400 text-[10px] uppercase">
                {previousColor}
              </span>
            </div>
            <div
              style={{ backgroundColor: previousColor }}
              className="w-8 h-8 rounded-lg border border-neutral-800"
            />
          </button>
        )}
      </div>

      {/* Numeric Values: HEX, RGB */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-neutral-950/40 rounded-lg border border-neutral-800/80">
          <span className="text-[10px] text-neutral-500 block">HEX</span>
          <input
            type="text"
            value={currentColor.toUpperCase()}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onColorChange(v);
            }}
            className="w-full bg-transparent font-mono text-neutral-200 font-bold outline-none text-xs"
          />
        </div>

        <div className="p-2 bg-neutral-950/40 rounded-lg border border-neutral-800/80">
          <span className="text-[10px] text-neutral-500 block">RGB</span>
          <span className="font-mono text-neutral-300 font-bold text-xs">
            {rgb.r}, {rgb.g}, {rgb.b}
          </span>
        </div>
      </div>

      {/* Palettes & Favorites Tabs */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              مجموعات جاهزة
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              مفضلتي
            </button>
          </div>

          {activeTab === 'custom' && (
            <button
              onClick={() => onAddToCustomPalette(currentColor)}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
              title="إضافة اللون الحالي إلى المفضلات"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حفظ اللون</span>
            </button>
          )}
        </div>

        {activeTab === 'presets' ? (
          <div className="space-y-2">
            {/* Palette selector drop-down */}
            <select
              value={selectedPaletteId}
              onChange={(e) => setSelectedPaletteId(e.target.value)}
              className="w-full bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            >
              {PRESET_COLOR_PALETTES.map((pal) => (
                <option key={pal.id} value={pal.id}>
                  {pal.name}
                </option>
              ))}
            </select>

            {/* Palette swatches grid */}
            <div className="grid grid-cols-7 gap-1.5 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800/80">
              {selectedPresetPalette.colors.map((c, i) => (
                <button
                  key={i}
                  style={{ backgroundColor: c }}
                  onClick={() => onColorChange(c)}
                  className={`w-7 h-7 rounded-lg border transition-transform hover:scale-110 ${
                    currentColor.toLowerCase() === c.toLowerCase()
                      ? 'border-amber-400 ring-2 ring-amber-400/40'
                      : 'border-neutral-800'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 bg-neutral-950/40 rounded-xl border border-neutral-800/80 min-h-24">
            {customPalette.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-neutral-500 text-center text-[11px]">
                <span>لا توجد ألوان محفوظة بعد.</span>
                <span className="text-[10px] mt-0.5">انقر على "حفظ اللون" لإضافة ألوانك المفضلة</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {customPalette.map((c, i) => (
                  <div key={i} className="relative group">
                    <button
                      style={{ backgroundColor: c }}
                      onClick={() => onColorChange(c)}
                      className={`w-7 h-7 rounded-lg border transition-transform hover:scale-110 ${
                        currentColor.toLowerCase() === c.toLowerCase()
                          ? 'border-amber-400 ring-2 ring-amber-400/40'
                          : 'border-neutral-800'
                      }`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromCustomPalette(i);
                      }}
                      className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 bg-rose-600 text-white rounded-full items-center justify-center text-[8px]"
                      title="حذف"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Colors Strip */}
      {recentColors.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-neutral-800">
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <History className="w-3 h-3" />
            <span>الألوان الأخيرة</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {recentColors.slice(0, 10).map((c, i) => (
              <button
                key={i}
                style={{ backgroundColor: c }}
                onClick={() => onColorChange(c)}
                className="w-6 h-6 rounded-md border border-neutral-800 flex-shrink-0 hover:scale-110 transition-transform"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

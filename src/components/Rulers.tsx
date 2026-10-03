import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasTransform, RulerUnit, GuideLine } from '../types';
import { Settings, X, Plus, Eye, EyeOff, Trash2, Check, ChevronDown } from 'lucide-react';

export const RULER_THICKNESS = 26; // pixels

interface RulersProps {
  width: number;
  height: number;
  dpi: number;
  transform: CanvasTransform;
  cursorPos: { x: number; y: number } | null;
  isDarkMode: boolean;
  unit: RulerUnit;
  onChangeUnit: (unit: RulerUnit) => void;
  showGuides: boolean;
  guides: GuideLine[];
  onAddGuide: (guide: GuideLine) => void;
  onUpdateGuide: (id: string, position: number) => void;
  onRemoveGuide: (id: string) => void;
  onClearGuides: () => void;
  showCursorIndicator?: boolean;
  onOpenSettings?: () => void;
}

// Convert canvas pixel position to target unit value
export function pxToUnit(px: number, unit: RulerUnit, dpi: number): number {
  switch (unit) {
    case 'cm':
      return (px / dpi) * 2.54;
    case 'mm':
      return (px / dpi) * 25.4;
    case 'in':
      return px / dpi;
    case 'px':
    default:
      return px;
  }
}

// Convert target unit value back to canvas pixels
export function unitToPx(val: number, unit: RulerUnit, dpi: number): number {
  switch (unit) {
    case 'cm':
      return (val / 2.54) * dpi;
    case 'mm':
      return (val / 25.4) * dpi;
    case 'in':
      return val * dpi;
    case 'px':
    default:
      return val;
  }
}

// Format unit value for display
export function formatUnitValue(val: number, unit: RulerUnit): string {
  if (unit === 'px') {
    return Math.round(val).toString();
  }
  if (unit === 'in') {
    return val.toFixed(2);
  }
  if (unit === 'cm') {
    return val.toFixed(1);
  }
  // mm
  return Math.round(val).toString();
}

export const Rulers: React.FC<RulersProps> = ({
  width,
  height,
  dpi,
  transform,
  cursorPos,
  isDarkMode,
  unit,
  onChangeUnit,
  showGuides,
  guides,
  onAddGuide,
  onUpdateGuide,
  onRemoveGuide,
  onClearGuides,
  showCursorIndicator = true,
  onOpenSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [unitMenuOpen, setUnitMenuOpen] = useState<boolean>(false);
  const [activeGuideDrag, setActiveGuideDrag] = useState<{
    id?: string;
    isNew: boolean;
    type: 'horizontal' | 'vertical';
    currentPos: number;
    startPos: number;
  } | null>(null);

  // Monitor container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setContainerSize({ width: w, height: h });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute canvas bounding position in container coordinates
  const getCanvasScreenBounds = useCallback(() => {
    const { width: vw, height: vh } = containerSize;
    if (vw === 0 || vh === 0) {
      return { left: 0, right: 0, top: 0, bottom: 0, scale: transform.zoom };
    }

    const cx = vw / 2 + transform.panX;
    const cy = vh / 2 + transform.panY;
    const scaledW = width * transform.zoom;
    const scaledH = height * transform.zoom;

    const left = cx - scaledW / 2;
    const right = cx + scaledW / 2;
    const top = cy - scaledH / 2;
    const bottom = cy + scaledH / 2;

    return { left, right, top, bottom, scale: transform.zoom };
  }, [containerSize, transform.panX, transform.panY, transform.zoom, width, height]);

  // Render Horizontal (Top) Ruler
  const renderTopRuler = useCallback(() => {
    const canvas = topCanvasRef.current;
    if (!canvas || containerSize.width <= RULER_THICKNESS) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rulerW = containerSize.width - RULER_THICKNESS;
    const rulerH = RULER_THICKNESS;

    if (canvas.width !== Math.round(rulerW * dpr) || canvas.height !== Math.round(rulerH * dpr)) {
      canvas.width = Math.round(rulerW * dpr);
      canvas.height = Math.round(rulerH * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rulerW, rulerH);

    const bounds = getCanvasScreenBounds();
    const canvasLeftRuler = bounds.left - RULER_THICKNESS;
    const canvasRightRuler = bounds.right - RULER_THICKNESS;

    // Background
    ctx.fillStyle = isDarkMode ? '#171717' : '#f4f4f5';
    ctx.fillRect(0, 0, rulerW, rulerH);

    // Highlight canvas extent on ruler
    const highlightStart = Math.max(0, canvasLeftRuler);
    const highlightEnd = Math.min(rulerW, canvasRightRuler);
    if (highlightEnd > highlightStart) {
      ctx.fillStyle = isDarkMode ? '#242426' : '#e4e4e7';
      ctx.fillRect(highlightStart, 0, highlightEnd - highlightStart, rulerH);
    }

    // Border line at bottom of horizontal ruler
    ctx.strokeStyle = isDarkMode ? '#2f2f33' : '#d4d4d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerH - 0.5);
    ctx.lineTo(rulerW, rulerH - 0.5);
    ctx.stroke();

    // Canvas boundary zero and max marks
    if (canvasLeftRuler >= 0 && canvasLeftRuler <= rulerW) {
      ctx.strokeStyle = isDarkMode ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvasLeftRuler + 0.5, 0);
      ctx.lineTo(canvasLeftRuler + 0.5, rulerH);
      ctx.stroke();
    }
    if (canvasRightRuler >= 0 && canvasRightRuler <= rulerW) {
      ctx.strokeStyle = isDarkMode ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvasRightRuler + 0.5, 0);
      ctx.lineTo(canvasRightRuler + 0.5, rulerH);
      ctx.stroke();
    }

    // Dynamic Step Calculation based on chosen unit and zoom
    const zoom = transform.zoom;
    const pxPerUnit = unitToPx(1, unit, dpi);

    // Nice steps in unit values
    let candidateSteps: number[];
    if (unit === 'px') {
      candidateSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
    } else if (unit === 'cm') {
      candidateSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    } else if (unit === 'mm') {
      candidateSteps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
    } else {
      // inches
      candidateSteps = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 10, 20];
    }

    // Find step that gives >= 55px on screen
    let unitStep = candidateSteps[candidateSteps.length - 1];
    for (const step of candidateSteps) {
      const screenDist = step * pxPerUnit * zoom;
      if (screenDist >= 55) {
        unitStep = step;
        break;
      }
    }

    const stepPx = unitStep * pxPerUnit;
    const stepScreen = stepPx * zoom;

    // Visible canvas X range on the ruler
    // canvasX at ruler pixel x = (x - canvasLeftRuler) / zoom
    const minCanvasX = -canvasLeftRuler / zoom;
    const maxCanvasX = (rulerW - canvasLeftRuler) / zoom;

    // Subdivisions count
    let subCount = 5;
    if (stepScreen < 40) subCount = 2;
    else if (stepScreen >= 120) subCount = 10;
    else if (stepScreen >= 70) subCount = 5;
    else subCount = 2;

    const firstIndex = Math.floor(minCanvasX / stepPx) - 1;
    const lastIndex = Math.ceil(maxCanvasX / stepPx) + 1;

    ctx.font = '9px monospace, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const tickColor = isDarkMode ? '#737373' : '#a1a1aa';
    const textColor = isDarkMode ? '#a3a3a3' : '#52525b';

    for (let i = firstIndex; i <= lastIndex; i++) {
      const curCanvasX = i * stepPx;
      const screenX = canvasLeftRuler + curCanvasX * zoom;

      // Draw sub-ticks
      for (let s = 1; s < subCount; s++) {
        const subCanvasX = curCanvasX + (s / subCount) * stepPx;
        const subScreenX = canvasLeftRuler + subCanvasX * zoom;
        if (subScreenX >= 0 && subScreenX <= rulerW) {
          const isMid = s === subCount / 2;
          const tickH = isMid ? 6 : 3.5;
          ctx.strokeStyle = tickColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.round(subScreenX) + 0.5, rulerH - tickH);
          ctx.lineTo(Math.round(subScreenX) + 0.5, rulerH);
          ctx.stroke();
        }
      }

      // Draw major tick and label
      if (screenX >= -20 && screenX <= rulerW + 40) {
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(screenX) + 0.5, rulerH - 10);
        ctx.lineTo(Math.round(screenX) + 0.5, rulerH);
        ctx.stroke();

        const unitVal = (curCanvasX / pxPerUnit);
        const labelText = formatUnitValue(unitVal, unit);

        ctx.fillStyle = textColor;
        ctx.fillText(labelText, Math.round(screenX) + 3, rulerH / 2 - 2);
      }
    }

    // Draw active cursor indicator
    if (showCursorIndicator && cursorPos) {
      const cursorScreenX = canvasLeftRuler + cursorPos.x * zoom;
      if (cursorScreenX >= 0 && cursorScreenX <= rulerW) {
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        // Hairline down
        ctx.beginPath();
        ctx.moveTo(Math.round(cursorScreenX) + 0.5, 0);
        ctx.lineTo(Math.round(cursorScreenX) + 0.5, rulerH);
        ctx.stroke();

        // Small indicator triangle at top
        ctx.beginPath();
        ctx.moveTo(Math.round(cursorScreenX) - 3, 0);
        ctx.lineTo(Math.round(cursorScreenX) + 3, 0);
        ctx.lineTo(Math.round(cursorScreenX), 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }, [containerSize, transform.zoom, transform.panX, transform.panY, width, height, isDarkMode, unit, dpi, getCanvasScreenBounds, showCursorIndicator, cursorPos]);

  // Render Vertical (Left) Ruler
  const renderLeftRuler = useCallback(() => {
    const canvas = leftCanvasRef.current;
    if (!canvas || containerSize.height <= RULER_THICKNESS) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rulerW = RULER_THICKNESS;
    const rulerH = containerSize.height - RULER_THICKNESS;

    if (canvas.width !== Math.round(rulerW * dpr) || canvas.height !== Math.round(rulerH * dpr)) {
      canvas.width = Math.round(rulerW * dpr);
      canvas.height = Math.round(rulerH * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rulerW, rulerH);

    const bounds = getCanvasScreenBounds();
    const canvasTopRuler = bounds.top - RULER_THICKNESS;
    const canvasBottomRuler = bounds.bottom - RULER_THICKNESS;

    // Background
    ctx.fillStyle = isDarkMode ? '#171717' : '#f4f4f5';
    ctx.fillRect(0, 0, rulerW, rulerH);

    // Highlight canvas extent
    const highlightStart = Math.max(0, canvasTopRuler);
    const highlightEnd = Math.min(rulerH, canvasBottomRuler);
    if (highlightEnd > highlightStart) {
      ctx.fillStyle = isDarkMode ? '#242426' : '#e4e4e7';
      ctx.fillRect(0, highlightStart, rulerW, highlightEnd - highlightStart);
    }

    // Border line at right of vertical ruler
    ctx.strokeStyle = isDarkMode ? '#2f2f33' : '#d4d4d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rulerW - 0.5, 0);
    ctx.lineTo(rulerW - 0.5, rulerH);
    ctx.stroke();

    // Canvas boundary zero and max marks
    if (canvasTopRuler >= 0 && canvasTopRuler <= rulerH) {
      ctx.strokeStyle = isDarkMode ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvasTopRuler + 0.5);
      ctx.lineTo(rulerW, canvasTopRuler + 0.5);
      ctx.stroke();
    }
    if (canvasBottomRuler >= 0 && canvasBottomRuler <= rulerH) {
      ctx.strokeStyle = isDarkMode ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvasBottomRuler + 0.5);
      ctx.lineTo(rulerW, canvasBottomRuler + 0.5);
      ctx.stroke();
    }

    // Dynamic Step Calculation
    const zoom = transform.zoom;
    const pxPerUnit = unitToPx(1, unit, dpi);

    let candidateSteps: number[];
    if (unit === 'px') {
      candidateSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
    } else if (unit === 'cm') {
      candidateSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    } else if (unit === 'mm') {
      candidateSteps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
    } else {
      candidateSteps = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 10, 20];
    }

    let unitStep = candidateSteps[candidateSteps.length - 1];
    for (const step of candidateSteps) {
      const screenDist = step * pxPerUnit * zoom;
      if (screenDist >= 55) {
        unitStep = step;
        break;
      }
    }

    const stepPx = unitStep * pxPerUnit;
    const stepScreen = stepPx * zoom;

    const minCanvasY = -canvasTopRuler / zoom;
    const maxCanvasY = (rulerH - canvasTopRuler) / zoom;

    let subCount = 5;
    if (stepScreen < 40) subCount = 2;
    else if (stepScreen >= 120) subCount = 10;
    else if (stepScreen >= 70) subCount = 5;
    else subCount = 2;

    const firstIndex = Math.floor(minCanvasY / stepPx) - 1;
    const lastIndex = Math.ceil(maxCanvasY / stepPx) + 1;

    ctx.font = '8.5px monospace, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    const tickColor = isDarkMode ? '#737373' : '#a1a1aa';
    const textColor = isDarkMode ? '#a3a3a3' : '#52525b';

    for (let i = firstIndex; i <= lastIndex; i++) {
      const curCanvasY = i * stepPx;
      const screenY = canvasTopRuler + curCanvasY * zoom;

      // Draw sub-ticks
      for (let s = 1; s < subCount; s++) {
        const subCanvasY = curCanvasY + (s / subCount) * stepPx;
        const subScreenY = canvasTopRuler + subCanvasY * zoom;
        if (subScreenY >= 0 && subScreenY <= rulerH) {
          const isMid = s === subCount / 2;
          const tickW = isMid ? 6 : 3.5;
          ctx.strokeStyle = tickColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rulerW - tickW, Math.round(subScreenY) + 0.5);
          ctx.lineTo(rulerW, Math.round(subScreenY) + 0.5);
          ctx.stroke();
        }
      }

      // Draw major tick and vertical label (rotated 90 degrees or compact)
      if (screenY >= -20 && screenY <= rulerH + 40) {
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rulerW - 10, Math.round(screenY) + 0.5);
        ctx.lineTo(rulerW, Math.round(screenY) + 0.5);
        ctx.stroke();

        const unitVal = (curCanvasY / pxPerUnit);
        const labelText = formatUnitValue(unitVal, unit);

        // Draw rotated vertical text for clean readability
        ctx.save();
        ctx.translate(rulerW / 2 - 2, Math.round(screenY) + 4);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }
    }

    // Cursor indicator on vertical ruler
    if (showCursorIndicator && cursorPos) {
      const cursorScreenY = canvasTopRuler + cursorPos.y * zoom;
      if (cursorScreenY >= 0 && cursorScreenY <= rulerH) {
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, Math.round(cursorScreenY) + 0.5);
        ctx.lineTo(rulerW, Math.round(cursorScreenY) + 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, Math.round(cursorScreenY) - 3);
        ctx.lineTo(0, Math.round(cursorScreenY) + 3);
        ctx.lineTo(4, Math.round(cursorScreenY));
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }, [containerSize, transform.zoom, transform.panX, transform.panY, width, height, isDarkMode, unit, dpi, getCanvasScreenBounds, showCursorIndicator, cursorPos]);

  // RequestAnimationFrame redraw triggers
  useEffect(() => {
    renderTopRuler();
    renderLeftRuler();
  }, [renderTopRuler, renderLeftRuler]);

  // Start dragging a guide line from the horizontal ruler (new horizontal guide)
  const handleTopRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const bounds = getCanvasScreenBounds();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startClientY = e.clientY;
    const initialCanvasY = (startClientY - rect.top - bounds.top) / transform.zoom;

    setActiveGuideDrag({
      isNew: true,
      type: 'horizontal',
      currentPos: Math.round(initialCanvasY),
      startPos: initialCanvasY,
    });
  };

  // Start dragging a guide line from the vertical ruler (new vertical guide)
  const handleLeftRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const bounds = getCanvasScreenBounds();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startClientX = e.clientX;
    const initialCanvasX = (startClientX - rect.left - bounds.left) / transform.zoom;

    setActiveGuideDrag({
      isNew: true,
      type: 'vertical',
      currentPos: Math.round(initialCanvasX),
      startPos: initialCanvasX,
    });
  };

  // Dragging Guide Listener on window
  useEffect(() => {
    if (!activeGuideDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const bounds = getCanvasScreenBounds();
      if (activeGuideDrag.type === 'horizontal') {
        const clientY = e.clientY - rect.top;
        const canvasY = Math.round((clientY - bounds.top) / transform.zoom);
        setActiveGuideDrag((prev) => prev ? { ...prev, currentPos: canvasY } : null);
      } else {
        const clientX = e.clientX - rect.left;
        const canvasX = Math.round((clientX - bounds.left) / transform.zoom);
        setActiveGuideDrag((prev) => prev ? { ...prev, currentPos: canvasX } : null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        setActiveGuideDrag(null);
        return;
      }

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Check if dropped back into ruler (which deletes it)
      if (activeGuideDrag.type === 'horizontal') {
        if (clientY <= RULER_THICKNESS) {
          if (!activeGuideDrag.isNew && activeGuideDrag.id) {
            onRemoveGuide(activeGuideDrag.id);
          }
        } else {
          if (activeGuideDrag.isNew) {
            onAddGuide({
              id: `guide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              type: 'horizontal',
              position: activeGuideDrag.currentPos,
            });
          } else if (activeGuideDrag.id) {
            onUpdateGuide(activeGuideDrag.id, activeGuideDrag.currentPos);
          }
        }
      } else {
        if (clientX <= RULER_THICKNESS) {
          if (!activeGuideDrag.isNew && activeGuideDrag.id) {
            onRemoveGuide(activeGuideDrag.id);
          }
        } else {
          if (activeGuideDrag.isNew) {
            onAddGuide({
              id: `guide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              type: 'vertical',
              position: activeGuideDrag.currentPos,
            });
          } else if (activeGuideDrag.id) {
            onUpdateGuide(activeGuideDrag.id, activeGuideDrag.currentPos);
          }
        }
      }

      setActiveGuideDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeGuideDrag, getCanvasScreenBounds, transform.zoom, onAddGuide, onUpdateGuide, onRemoveGuide]);

  const bounds = getCanvasScreenBounds();

  return (
    <div
      ref={containerRef}
      id="rulers-overlay-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {/* Top-Left Corner Box (Unit switch and Settings) */}
      <div
        id="ruler-corner-box"
        style={{ width: `${RULER_THICKNESS}px`, height: `${RULER_THICKNESS}px` }}
        className={`absolute top-0 left-0 z-30 flex items-center justify-center pointer-events-auto border-r border-b cursor-pointer transition-colors ${
          isDarkMode 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-blue-400' 
            : 'bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 hover:text-blue-600'
        }`}
        onClick={() => setUnitMenuOpen((prev) => !prev)}
        title={`وحدة قياس المسطرة الحالية: ${unit.toUpperCase()} (انقر لتغيير الوحدة)`}
      >
        <span className="text-[10px] font-mono font-bold uppercase">{unit}</span>
      </div>

      {/* Unit Selection Dropdown Menu */}
      {unitMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setUnitMenuOpen(false)}
          />
          <div
            id="ruler-unit-menu"
            className="absolute top-8 left-2 z-50 w-44 rounded-xl shadow-2xl border p-1 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
            dir="rtl"
          >
            <div className="px-2.5 py-1.5 font-bold text-[11px] text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
              <span>وحدة قياس المسطرة</span>
              <span className="font-mono text-[10px] text-blue-400">{dpi} DPI</span>
            </div>

            <div className="py-1">
              {(
                [
                  { id: 'px', label: 'بكسل (Pixel)', abbrev: 'px' },
                  { id: 'cm', label: 'سنتيمتر (Centimeter)', abbrev: 'cm' },
                  { id: 'mm', label: 'مليمتر (Millimeter)', abbrev: 'mm' },
                  { id: 'in', label: 'بوصة (Inch)', abbrev: 'in' },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onChangeUnit(u.id);
                    setUnitMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-right transition-colors ${
                    unit === u.id
                      ? 'bg-blue-600/20 text-blue-400 font-bold'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span>{u.label}</span>
                  {unit === u.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>

            {onOpenSettings && (
              <div className="pt-1 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setUnitMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-right hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-400" />
                  <span>إعدادات المسطرة ومساحة الرسم...</span>
                </button>
              </div>
            )}

            {guides.length > 0 && (
              <div className="pt-1 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setUnitMenuOpen(false);
                    onClearGuides();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-right hover:bg-rose-500/20 text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح جميع خطوط الإرشاد ({guides.length})</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Top Horizontal Ruler Canvas */}
      <canvas
        ref={topCanvasRef}
        id="top-ruler-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: `${RULER_THICKNESS}px`,
          width: `calc(100% - ${RULER_THICKNESS}px)`,
          height: `${RULER_THICKNESS}px`,
        }}
        onMouseDown={handleTopRulerMouseDown}
        className="pointer-events-auto cursor-ns-resize"
        title="المسطرة الأفقية: انقر واسحب للأسفل لإنشاء خط إرشادي أفقي (Guide Line)"
      />

      {/* Left Vertical Ruler Canvas */}
      <canvas
        ref={leftCanvasRef}
        id="left-ruler-canvas"
        style={{
          position: 'absolute',
          top: `${RULER_THICKNESS}px`,
          left: 0,
          width: `${RULER_THICKNESS}px`,
          height: `calc(100% - ${RULER_THICKNESS}px)`,
        }}
        onMouseDown={handleLeftRulerMouseDown}
        className="pointer-events-auto cursor-ew-resize"
        title="المسطرة العمودية: انقر واسحب لليمين لإنشاء خط إرشادي عمودي (Guide Line)"
      />

      {/* Existing and In-Drag Guide Lines */}
      {showGuides && (
        <div className="absolute inset-0 pointer-events-none">
          {guides.map((g) => {
            if (g.type === 'horizontal') {
              const screenY = bounds.top + g.position * transform.zoom;
              if (screenY < RULER_THICKNESS || screenY > containerSize.height) return null;

              return (
                <div
                  key={g.id}
                  style={{ top: `${screenY}px` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveGuideDrag({
                      id: g.id,
                      isNew: false,
                      type: 'horizontal',
                      currentPos: g.position,
                      startPos: g.position,
                    });
                  }}
                  className="absolute left-0 right-0 h-[3px] -mt-[1px] pointer-events-auto cursor-ns-resize group z-20 flex items-center"
                  title={`خط إرشادي أفقي: Y = ${Math.round(g.position)} px (اسحبه للمسطرة لحذفه)`}
                >
                  <div className="w-full h-[1px] bg-cyan-400/80 group-hover:bg-cyan-300 group-hover:h-[1.5px] transition-all shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                  <div className="absolute right-4 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Y: {formatUnitValue(pxToUnit(g.position, unit, dpi), unit)} {unit} ({Math.round(g.position)}px)
                  </div>
                </div>
              );
            } else {
              const screenX = bounds.left + g.position * transform.zoom;
              if (screenX < RULER_THICKNESS || screenX > containerSize.width) return null;

              return (
                <div
                  key={g.id}
                  style={{ left: `${screenX}px` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveGuideDrag({
                      id: g.id,
                      isNew: false,
                      type: 'vertical',
                      currentPos: g.position,
                      startPos: g.position,
                    });
                  }}
                  className="absolute top-0 bottom-0 w-[3px] -ml-[1px] pointer-events-auto cursor-ew-resize group z-20 flex justify-center"
                  title={`خط إرشادي عمودي: X = ${Math.round(g.position)} px (اسحبه للمسطرة لحذفه)`}
                >
                  <div className="h-full w-[1px] bg-cyan-400/80 group-hover:bg-cyan-300 group-hover:w-[1.5px] transition-all shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                  <div className="absolute top-8 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    X: {formatUnitValue(pxToUnit(g.position, unit, dpi), unit)} {unit} ({Math.round(g.position)}px)
                  </div>
                </div>
              );
            }
          })}

          {/* Currently dragging guide preview */}
          {activeGuideDrag && (
            <>
              {activeGuideDrag.type === 'horizontal' ? (
                <div
                  style={{ top: `${bounds.top + activeGuideDrag.currentPos * transform.zoom}px` }}
                  className="absolute left-0 right-0 h-[1.5px] bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] z-30 pointer-events-none flex items-center"
                >
                  <div className="absolute right-6 px-2 py-0.5 rounded bg-neutral-950/95 border border-amber-500/80 text-[11px] font-mono font-bold text-amber-300 shadow-xl">
                    Y: {formatUnitValue(pxToUnit(activeGuideDrag.currentPos, unit, dpi), unit)} {unit} ({Math.round(activeGuideDrag.currentPos)} px)
                  </div>
                </div>
              ) : (
                <div
                  style={{ left: `${bounds.left + activeGuideDrag.currentPos * transform.zoom}px` }}
                  className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] z-30 pointer-events-none flex justify-center"
                >
                  <div className="absolute top-10 px-2 py-0.5 rounded bg-neutral-950/95 border border-amber-500/80 text-[11px] font-mono font-bold text-amber-300 shadow-xl">
                    X: {formatUnitValue(pxToUnit(activeGuideDrag.currentPos, unit, dpi), unit)} {unit} ({Math.round(activeGuideDrag.currentPos)} px)
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

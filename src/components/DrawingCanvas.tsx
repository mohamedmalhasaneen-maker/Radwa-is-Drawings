import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ToolType, 
  BrushSettings, 
  Layer, 
  CanvasTransform, 
  StrokePoint, 
  ShapeOptions 
} from '../types';
import { BrushRenderer } from '../utils/brushEngine';
import { floodFill } from '../utils/floodFill';
import { isShapeTool, drawGeometricShape } from '../utils/shapeDrawer';
import { Eye, Layers } from 'lucide-react';

interface DrawingCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  hasTransparentBg: boolean;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  currentColor: string;
  layers: Layer[];
  activeLayerId: string;
  isLayerIsolation?: boolean;
  onShowAllLayers?: () => void;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  onColorPick: (color: string) => void;
  onHistoryCommit: (description: string) => void;
  showGrid: boolean;
  showRulers: boolean;
  shapeOptions: ShapeOptions;
  isDarkMode: boolean;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isCanvasLocked?: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  backgroundColor,
  hasTransparentBg,
  activeTool,
  brushSettings,
  currentColor,
  layers,
  activeLayerId,
  isLayerIsolation = false,
  onShowAllLayers,
  transform,
  onTransformChange,
  onColorPick,
  onHistoryCommit,
  showGrid,
  showRulers,
  shapeOptions,
  isDarkMode,
  onShowToast,
  isCanvasLocked = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushRenderer = useRef<BrushRenderer>(new BrushRenderer());

  const isDrawing = useRef<boolean>(false);
  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePanPointerId = useRef<number | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef<{ x: number; y: number } | null>(null);

  // Palm Rejection & Single Pointer Drawing Lock
  const activeDrawingPointerId = useRef<number | null>(null);
  const activePointerType = useRef<string | null>(null);
  const strokeStartTime = useRef<number>(0);
  const strokeMovedDistance = useRef<number>(0);
  const strokeStartLayerSnapshot = useRef<ImageData | null>(null);
  const isMultiTouchGesture = useRef<boolean>(false);

  const [currentPressure, setCurrentPressure] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [activeInputType, setActiveInputType] = useState<'mouse' | 'touch' | 'pen' | null>(null);

  // Active layer helper
  const getActiveLayer = useCallback(() => {
    return layers.find((l) => l.id === activeLayerId);
  }, [layers, activeLayerId]);

  // Redraw composite canvas whenever layers, active layer, or isolation mode changes
  const renderComposite = useCallback(() => {
    const compCanvas = compositeCanvasRef.current;
    if (!compCanvas) return;
    const ctx = compCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw background if not transparent
    if (!hasTransparentBg && backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (isLayerIsolation && activeLayerId) {
      // Layer Isolation Mode: Render ONLY active layer
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer && activeLayer.visible) {
        ctx.save();
        ctx.globalAlpha = activeLayer.opacity / 100.0;
        ctx.globalCompositeOperation = activeLayer.blendMode;
        ctx.drawImage(activeLayer.canvas, 0, 0);
        ctx.restore();
      }
    } else {
      // Normal Composite Mode: Render ALL visible layers from bottom to top
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!layer.visible) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity / 100.0;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
    }
  }, [layers, width, height, backgroundColor, hasTransparentBg, isLayerIsolation, activeLayerId]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  // Convert client viewport coordinates to canvas pixel space
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = compositeCanvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      // Account for scale, pan, and transform
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      let x = (clientX - rect.left) * scaleX;
      let y = (clientY - rect.top) * scaleY;

      if (transform.flipH) x = width - x;
      if (transform.flipV) y = height - y;

      return { x, y };
    },
    [width, height, transform]
  );

  // Handle pointer down (mouse, touch, pen / stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Middle mouse, Alt+click, or Move tool initiates pan
    if (e.button === 1 || e.altKey || activeTool === 'move') {
      if (isCanvasLocked) {
        onShowToast?.('🔒 الورقة مثبتة: تم تعطيل التحريك. قم بفتح القفل لتحريك مساحة الرسم.', 'info');
        return;
      }
      if (!isPanning.current && activeDrawingPointerId.current === null) {
        isPanning.current = true;
        activePanPointerId.current = e.pointerId;
        panStart.current = { x: e.clientX - transform.panX, y: e.clientY - transform.panY };
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      return;
    }

    // If multi-touch zoom/pan is currently active on the viewport, reject new drawing
    if (isMultiTouchGesture.current) {
      return;
    }

    // PALM REJECTION & SINGLE POINTER LOCK:
    // If a drawing pointer is already active on the canvas:
    if (activeDrawingPointerId.current !== null) {
      // STYLUS PRIORITY:
      // If a stylus pen touches down while a touch/finger was drawing, the pen takes absolute priority!
      if (e.pointerType === 'pen' && activePointerType.current === 'touch') {
        // Rollback or cancel the accidental touch stroke cleanly
        if (strokeStartLayerSnapshot.current) {
          const activeLayer = getActiveLayer();
          if (activeLayer) {
            activeLayer.ctx.putImageData(strokeStartLayerSnapshot.current, 0, 0);
            renderComposite();
          }
        }
        brushRenderer.current.endStroke();
        overlayCanvasRef.current?.getContext('2d')?.clearRect(0, 0, width, height);
        
        try {
          (e.target as HTMLElement).releasePointerCapture(activeDrawingPointerId.current);
        } catch (_) {}

        // Fall through to start drawing with the Stylus!
      } else {
        // Secondary pointer (palm, sleeve, 2nd finger, or touch while pen is drawing) -> IGNORE 100%!
        return;
      }
    }

    const activeLayer = getActiveLayer();
    if (!activeLayer) return;

    if (activeLayer.locked) {
      onShowToast?.('الطبقة المحددة مقفولة. يرجى إلغاء قفل الطبقة للتمكن من الرسم أو الدمج عليها.', 'error');
      return;
    }

    if (!activeLayer.visible) {
      onShowToast?.('الطبقة المحددة مخفية. يرجى إظهار الطبقة للتمكن من الرسم أو الدمج عليها.', 'info');
      return;
    }

    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);

    // Eyedropper tool
    if (activeTool === 'eyedropper') {
      const compCtx = compositeCanvasRef.current?.getContext('2d');
      if (compCtx) {
        const pixel = compCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        onColorPick(hex);
      }
      return;
    }

    // Flood Fill
    if (activeTool === 'fill') {
      floodFill(activeLayer.ctx, x, y, currentColor, brushSettings.opacity, 32);
      renderComposite();
      onHistoryCommit('تعبئة لونية');
      return;
    }

    // LOCK Drawing Session to this specific Pointer ID
    activeDrawingPointerId.current = e.pointerId;
    activePointerType.current = e.pointerType;
    setActiveInputType(e.pointerType as any);
    isDrawing.current = true;
    strokeStartTime.current = Date.now();
    strokeMovedDistance.current = 0;
    shapeStart.current = { x, y };

    // Capture snapshot for pinch-to-zoom gesture rollback
    try {
      strokeStartLayerSnapshot.current = activeLayer.ctx.getImageData(0, 0, width, height);
    } catch (_) {
      strokeStartLayerSnapshot.current = null;
    }

    // Pressure & tilt values (hardware pen pressure 0.0 - 1.0 preserved)
    const pressure = e.pressure > 0 ? e.pressure : (e.pointerType === 'pen' ? 0.5 : 0.5);
    setCurrentPressure(pressure);

    const isEraser = activeTool === 'eraser';
    const isCharcoalEraser = activeTool === 'charcoal_eraser';

    if (
      activeTool === 'brush' ||
      activeTool === 'pencil' ||
      activeTool === 'ink' ||
      isEraser ||
      isCharcoalEraser
    ) {
      const effectiveBrush: BrushSettings = {
        ...brushSettings,
        id: isCharcoalEraser ? 'charcoal_eraser' : isEraser ? 'eraser' : brushSettings.id,
      };

      const point: StrokePoint = {
        x,
        y,
        pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        time: Date.now(),
      };
      brushRenderer.current.startStroke(activeLayer.ctx, point, effectiveBrush, currentColor, isEraser);
      renderComposite();
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If panning with move tool or middle mouse
    if (isPanning.current) {
      if (e.pointerId === activePanPointerId.current) {
        onTransformChange({
          ...transform,
          panX: e.clientX - panStart.current.x,
          panY: e.clientY - panStart.current.y,
        });
      }
      return;
    }

    // If not drawing, update cursor coordinates for hover pointers (mouse or hover stylus)
    if (!isDrawing.current) {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
        setCursorPos({ x: Math.round(x), y: Math.round(y) });
        if (e.pointerType === 'pen') {
          setActiveInputType('pen');
        }
      }
      return;
    }

    // PALM REJECTION: If this pointer is NOT the locked drawing pointer, IGNORE COMPLETELY!
    if (e.pointerId !== activeDrawingPointerId.current) {
      return;
    }

    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(x), y: Math.round(y) });

    const activeLayer = getActiveLayer();
    if (!activeLayer) return;

    const pressure = e.pressure > 0 ? e.pressure : (activePointerType.current === 'pen' ? 0.5 : 0.5);
    setCurrentPressure(pressure);

    // Track movement distance to disambiguate drawing vs accidental taps
    strokeMovedDistance.current += Math.hypot(e.movementX || 0, e.movementY || 0);

    const isEraser = activeTool === 'eraser';
    const isCharcoalEraser = activeTool === 'charcoal_eraser';

    if (
      activeTool === 'brush' ||
      activeTool === 'pencil' ||
      activeTool === 'ink' ||
      isEraser ||
      isCharcoalEraser
    ) {
      // Leverage W3C getCoalescedEvents for 120Hz/240Hz ultra-smooth tablet pen input
      const coalescedEvents = typeof (e.nativeEvent as any)?.getCoalescedEvents === 'function'
        ? (e.nativeEvent as any).getCoalescedEvents()
        : [e];

      for (let i = 0; i < coalescedEvents.length; i++) {
        const ce = coalescedEvents[i];
        const coords = clientToCanvasCoords(ce.clientX, ce.clientY);
        const cePressure = ce.pressure > 0 ? ce.pressure : pressure;
        const effectiveBrush: BrushSettings = {
          ...brushSettings,
          id: isCharcoalEraser ? 'charcoal_eraser' : isEraser ? 'eraser' : brushSettings.id,
        };
        const point: StrokePoint = {
          x: coords.x,
          y: coords.y,
          pressure: cePressure,
          tiltX: ce.tiltX,
          tiltY: ce.tiltY,
          time: Date.now(),
        };
        brushRenderer.current.continueStroke(activeLayer.ctx, point, effectiveBrush, currentColor, isEraser);
      }
      renderComposite();
    } else if (isShapeTool(activeTool)) {
      // Draw live shape preview onto overlay canvas
      drawShapePreview(x, y);
    }
  };

  // Render shapes preview onto overlay canvas
  const drawShapePreview = (curX: number, curY: number) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || !shapeStart.current) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    drawGeometricShape(
      ctx,
      activeTool,
      shapeStart.current.x,
      shapeStart.current.y,
      curX,
      curY,
      currentColor,
      shapeOptions,
      brushSettings.opacity
    );
  };

  // Commit shape onto layer on pointer up
  const commitShape = (curX: number, curY: number) => {
    const activeLayer = getActiveLayer();
    if (!activeLayer || !shapeStart.current) return;

    drawGeometricShape(
      activeLayer.ctx,
      activeTool,
      shapeStart.current.x,
      shapeStart.current.y,
      curX,
      curY,
      currentColor,
      shapeOptions,
      brushSettings.opacity
    );

    // Clear overlay
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.getContext('2d')?.clearRect(0, 0, width, height);
    }

    renderComposite();
    onHistoryCommit(`رسم شكل هندسي`);
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Pan release
    if (isPanning.current) {
      if (e.pointerId === activePanPointerId.current) {
        isPanning.current = false;
        activePanPointerId.current = null;
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      return;
    }

    if (!isDrawing.current) return;

    // PALM REJECTION:
    // If a secondary pointer (palm or 2nd touch) lifts off, DO NOT end the primary stroke!
    if (e.pointerId !== activeDrawingPointerId.current) {
      return;
    }

    // Release capture for the primary pointer
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);

    if (isShapeTool(activeTool)) {
      commitShape(x, y);
    } else {
      brushRenderer.current.endStroke();
      onHistoryCommit(
        activeTool === 'eraser' 
          ? 'ممحاة (مسح كلي)' 
          : activeTool === 'charcoal_eraser'
          ? '🧽 استيكة الفحم (تفتيح تدريجي)'
          : brushSettings.name
      );
    }

    // Reset drawing lock session cleanly
    isDrawing.current = false;
    activeDrawingPointerId.current = null;
    activePointerType.current = null;
    shapeStart.current = null;
    strokeStartLayerSnapshot.current = null;
    strokeMovedDistance.current = 0;
  };

  // Handle pointer cancel (system interruptions, palm touches cancelled by OS)
  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning.current && e.pointerId === activePanPointerId.current) {
      isPanning.current = false;
      activePanPointerId.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }

    if (!isDrawing.current || e.pointerId !== activeDrawingPointerId.current) {
      return;
    }

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    brushRenderer.current.endStroke();
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.getContext('2d')?.clearRect(0, 0, width, height);
    }

    isDrawing.current = false;
    activeDrawingPointerId.current = null;
    activePointerType.current = null;
    shapeStart.current = null;
    strokeStartLayerSnapshot.current = null;
    strokeMovedDistance.current = 0;
  };

  // Handle lost pointer capture
  const handleLostPointerCapture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId === activeDrawingPointerId.current && isDrawing.current) {
      brushRenderer.current.endStroke();
      isDrawing.current = false;
      activeDrawingPointerId.current = null;
      activePointerType.current = null;
      shapeStart.current = null;
      strokeStartLayerSnapshot.current = null;
      strokeMovedDistance.current = 0;
    }
  };

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isCanvasLocked) return;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(20.0, Math.max(0.1, transform.zoom * zoomFactor));
    onTransformChange({
      ...transform,
      zoom: newZoom,
    });
  };

  // Touch gesture support: 2-finger pinch zoom and pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isCanvasLocked) {
      // Paper is locked: ignore 2-finger pinch zoom/pan gestures
      return;
    }
    if (e.touches.length >= 2) {
      isMultiTouchGesture.current = true;

      // If an accidental touch stroke just started (< 150ms or moved < 15px) before 2nd finger landed:
      if (isDrawing.current && activePointerType.current === 'touch') {
        const timeSinceStart = Date.now() - strokeStartTime.current;
        if (timeSinceStart < 150 || strokeMovedDistance.current < 15) {
          // Rollback accidental touch dab so the canvas stays clean
          const activeLayer = getActiveLayer();
          if (activeLayer && strokeStartLayerSnapshot.current) {
            activeLayer.ctx.putImageData(strokeStartLayerSnapshot.current, 0, 0);
            renderComposite();
          }
          brushRenderer.current.endStroke();
          overlayCanvasRef.current?.getContext('2d')?.clearRect(0, 0, width, height);

          isDrawing.current = false;
          activeDrawingPointerId.current = null;
          activePointerType.current = null;
          shapeStart.current = null;
          strokeStartLayerSnapshot.current = null;
          strokeMovedDistance.current = 0;
        }
      }

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDist.current = dist;
      touchStartCenter.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isCanvasLocked) return;
    if (e.touches.length >= 2 && touchStartDist.current !== null && touchStartCenter.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / touchStartDist.current;
      const newZoom = Math.min(20.0, Math.max(0.1, transform.zoom * scale));

      const curCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      const dx = curCenter.x - touchStartCenter.current.x;
      const dy = curCenter.y - touchStartCenter.current.y;

      onTransformChange({
        ...transform,
        zoom: newZoom,
        panX: transform.panX + dx,
        panY: transform.panY + dy,
      });

      touchStartDist.current = dist;
      touchStartCenter.current = curCenter;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchStartDist.current = null;
      touchStartCenter.current = null;
    }
    if (e.touches.length === 0) {
      isMultiTouchGesture.current = false;
    }
  };

  // Dynamic cursor style
  const getCursorClass = () => {
    if (activeTool === 'move') return 'cursor-grab active:cursor-grabbing';
    if (activeTool === 'eyedropper') return 'cursor-crosshair';
    if (activeTool === 'fill') return 'cursor-cell';
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      id="drawing-viewport"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden flex items-center justify-center select-none touch-none ${
        isDarkMode ? 'bg-neutral-950' : 'bg-neutral-200'
      }`}
    >
      {/* Dynamic transform stage */}
      <div
        id="canvas-stage"
        style={{
          transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom}) rotate(${transform.rotation}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1})`,
          transformOrigin: 'center center',
          width: `${width}px`,
          height: `${height}px`,
          boxShadow: isDarkMode 
            ? '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)' 
            : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.1)',
        }}
        className={`relative transition-none ${
          hasTransparentBg 
            ? isDarkMode ? 'checkerboard-pattern' : 'checkerboard-pattern-light' 
            : ''
        }`}
      >
        {/* Composite Display Canvas */}
        <canvas
          ref={compositeCanvasRef}
          id="composite-canvas"
          width={width}
          height={height}
          className="absolute inset-0 block pointer-events-none"
        />

        {/* Live Interaction and Preview Overlay Canvas with Palm Rejection */}
        <canvas
          ref={overlayCanvasRef}
          id="interactive-canvas"
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          onPointerLeave={() => {
            setCursorPos(null);
          }}
          className={`absolute inset-0 block touch-none z-10 ${getCursorClass()}`}
        />





        {/* Grid Overlay if enabled */}
        {showGrid && (
          <div
            id="canvas-grid-overlay"
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              backgroundImage: isDarkMode
                ? 'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
                : 'linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        )}
      </div>

      {/* Floating Status Bar with Zoom, Pressure, and Cursor Coordinates */}
      <div 
        id="canvas-status-pill"
        className="absolute bottom-3 left-4 z-30 flex items-center gap-3 px-3 py-1.5 rounded-full bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 text-xs text-neutral-300 shadow-lg pointer-events-none"
      >
        <span>{Math.round(transform.zoom * 100)}%</span>
        {isCanvasLocked && (
          <>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🔒</span>
              <span>الورقة مثبتة</span>
            </span>
          </>
        )}
        <span className="w-1 h-1 rounded-full bg-neutral-600" />
        {cursorPos ? (
          <span>{cursorPos.x} × {cursorPos.y} بكسل</span>
        ) : (
          <span>{width} × {height} بكسل</span>
        )}
        {currentPressure > 0 && (
          <>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-blue-400 font-medium">قوة الضغط: {Math.round(currentPressure * 100)}%</span>
          </>
        )}
        {activeInputType === 'pen' && (
          <>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span>🖊️</span>
              <span>قلم Stylus</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

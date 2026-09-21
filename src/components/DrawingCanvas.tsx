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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushRenderer = useRef<BrushRenderer>(new BrushRenderer());

  const isDrawing = useRef<boolean>(false);
  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef<{ x: number; y: number } | null>(null);

  const [currentPressure, setCurrentPressure] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

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
    // Middle mouse or Space+click initiates pan
    if (e.button === 1 || e.altKey || activeTool === 'move') {
      isPanning.current = true;
      panStart.current = { x: e.clientX - transform.panX, y: e.clientY - transform.panY };
      return;
    }

    const activeLayer = getActiveLayer();
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      return;
    }

    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    setCurrentPressure(pressure);

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

    // Shapes or Freehand drawing / Erasing
    isDrawing.current = true;
    shapeStart.current = { x, y };

    const isEraser = activeTool === 'eraser';

    if (
      activeTool === 'brush' ||
      activeTool === 'pencil' ||
      activeTool === 'ink' ||
      isEraser
    ) {
      const point: StrokePoint = {
        x,
        y,
        pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        time: Date.now(),
      };
      brushRenderer.current.startStroke(activeLayer.ctx, point, brushSettings, currentColor, isEraser);
      renderComposite();
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(x), y: Math.round(y) });

    if (isPanning.current) {
      onTransformChange({
        ...transform,
        panX: e.clientX - panStart.current.x,
        panY: e.clientY - panStart.current.y,
      });
      return;
    }

    if (!isDrawing.current) return;

    const activeLayer = getActiveLayer();
    if (!activeLayer) return;

    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    setCurrentPressure(pressure);

    const isEraser = activeTool === 'eraser';

    if (
      activeTool === 'brush' ||
      activeTool === 'pencil' ||
      activeTool === 'ink' ||
      isEraser
    ) {
      const point: StrokePoint = {
        x,
        y,
        pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        time: Date.now(),
      };
      brushRenderer.current.continueStroke(activeLayer.ctx, point, brushSettings, currentColor, isEraser);
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

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);

    if (isShapeTool(activeTool)) {
      commitShape(x, y);
    } else {
      brushRenderer.current.endStroke();
      onHistoryCommit(activeTool === 'eraser' ? 'ممحاة (مسح جزئي)' : brushSettings.name);
    }

    shapeStart.current = null;
  };

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(20.0, Math.max(0.1, transform.zoom * zoomFactor));
    onTransformChange({
      ...transform,
      zoom: newZoom,
    });
  };

  // Touch gesture support: 2-finger pinch zoom and pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
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
    if (e.touches.length === 2 && touchStartDist.current !== null && touchStartCenter.current !== null) {
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

  const handleTouchEnd = () => {
    touchStartDist.current = null;
    touchStartCenter.current = null;
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
      className={`relative w-full h-full overflow-hidden flex items-center justify-center select-none ${
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

        {/* Live Interaction and Preview Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          id="interactive-canvas"
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            setCursorPos(null);
            if (isDrawing.current) {
              isDrawing.current = false;
              brushRenderer.current.endStroke();
            }
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
        <span className="w-1 h-1 rounded-full bg-neutral-600" />
        {cursorPos ? (
          <span>{cursorPos.x} × {cursorPos.y} بكسل</span>
        ) : (
          <span>{width} × {height} بكسل</span>
        )}
        {currentPressure > 0 && (
          <>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-amber-400 font-medium">قوة الضغط: {Math.round(currentPressure * 100)}%</span>
          </>
        )}
      </div>
    </div>
  );
};

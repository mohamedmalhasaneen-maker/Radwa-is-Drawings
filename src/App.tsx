import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ToolType, 
  BrushSettings, 
  Layer, 
  CanvasTransform, 
  ShapeOptions, 
  HistoryStep,
  LayerSnapshot,
  BlendModeType
} from './types';
import { BRUSH_PRESETS } from './utils/brushPresets';
import { 
  saveProjectToDB, 
  getProjectFromDB, 
  loadSavedPreferences, 
  savePreferences 
} from './utils/storage';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Toolbar } from './components/Toolbar';
import { BrushPanel } from './components/BrushPanel';
import { ColorPanel } from './components/ColorPanel';
import { LayersPanel } from './components/LayersPanel';
import { Header } from './components/Header';
import { LineArtModal } from './components/LineArtModal';
import { ProjectModal } from './components/ProjectModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X,
  Palette,
  Sliders,
  Minimize2,
  Maximize2,
  Layers as LayersIcon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  // Canvas Dimensions & Project Settings
  const [projectTitle, setProjectTitle] = useState<string>('مشروع رسم رقمي');
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [canvasWidth, setCanvasWidth] = useState<number>(1920);
  const [canvasHeight, setCanvasHeight] = useState<number>(1080);
  const [dpi, setDpi] = useState<number>(300);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [hasTransparentBg, setHasTransparentBg] = useState<boolean>(false);

  // Active Tools & Brush
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(BRUSH_PRESETS.pencil_standard);
  const [currentColor, setCurrentColor] = useState<string>('#1a1a1a');
  const [previousColor, setPreviousColor] = useState<string>('#e63946');
  const [recentColors, setRecentColors] = useState<string[]>(['#1a1a1a', '#e63946', '#457b9d', '#2a9d8f']);
  const [customPalette, setCustomPalette] = useState<string[]>([]);

  // Shape Options
  const [shapeOptions, setShapeOptions] = useState<ShapeOptions>({
    fill: false,
    stroke: true,
    strokeWidth: 4,
    polygonSides: 5,
    starPoints: 5,
  });

  // Transform Viewport (Zoom, Pan, Rotate, Flips)
  const [transform, setTransform] = useState<CanvasTransform>({
    zoom: 0.65,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  });

  // Canvas View Elements
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Layers state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('');
  const [isLayerIsolation, setIsLayerIsolation] = useState<boolean>(false);
  const layersRef = useRef<Layer[]>([]);
  layersRef.current = layers;
  const activeLayerIdRef = useRef<string>('');
  activeLayerIdRef.current = activeLayerId;

  // History Undo / Redo
  const historyStack = useRef<HistoryStep[]>([]);
  const historyIndex = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Full-Screen Mode state
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Desktop side panels & Mobile docking
  const [activeSidePanel, setActiveSidePanel] = useState<'brushes' | 'colors' | 'layers' | null>('brushes');
  const [isSidePanelPinned, setIsSidePanelPinned] = useState<boolean>(() => {
    const prefs = loadSavedPreferences();
    return prefs.isSidePanelPinned ?? false;
  });
  const [isMobileView, setIsMobileView] = useState<boolean>(false);

  const sidePanelContainerRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showLineArtModal, setShowLineArtModal] = useState<boolean>(false);
  const [pendingLineArtSource, setPendingLineArtSource] = useState<HTMLImageElement | null>(null);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [projectModalMode, setProjectModalMode] = useState<'new' | 'open'>('new');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Notifications Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPickingFileRef = useRef<boolean>(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  // Helper to create a new canvas backing store
  const createCanvasBuffer = (w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return { canvas, ctx };
  };

  // Initialize initial project and layer
  const initProject = useCallback(
    (
      title: string,
      w: number,
      h: number,
      projDpi: number,
      bgColor: string,
      transparent: boolean
    ) => {
      setProjectTitle(title);
      setProjectId(`proj_${Date.now()}`);
      setCanvasWidth(w);
      setCanvasHeight(h);
      setDpi(projDpi);
      setBackgroundColor(bgColor);
      setHasTransparentBg(transparent);

      const { canvas, ctx } = createCanvasBuffer(w, h);
      const initialLayer: Layer = {
        id: `layer_${Date.now()}`,
        name: 'الطبقة الأساسية 1',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'source-over',
        canvas,
        ctx,
      };

      setLayers([initialLayer]);
      setActiveLayerId(initialLayer.id);

      // Snapshot initial state
      historyStack.current = [
        {
          id: `step_${Date.now()}`,
          description: 'إنشاء مساحة الرسم',
          layersSnapshots: [
            {
              layerId: initialLayer.id,
              name: initialLayer.name,
              visible: initialLayer.visible,
              locked: initialLayer.locked,
              opacity: initialLayer.opacity,
              blendMode: initialLayer.blendMode,
              imageData: ctx.getImageData(0, 0, w, h),
            },
          ],
          activeLayerId: initialLayer.id,
        },
      ];
      historyIndex.current = 0;
      setCanUndo(false);
      setCanRedo(false);

      // Center and fit canvas in viewport
      const fitZoom = Math.min(
        (window.innerWidth - 380) / w,
        (window.innerHeight - 150) / h
      );
      setTransform({
        zoom: Math.max(0.2, Math.min(1.2, fitZoom > 0 ? fitZoom : 0.65)),
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
      });

      addToast(`تم تجهيز مساحة الرسم: ${w} × ${h} بكسل`, 'info');
    },
    [addToast]
  );

  // Load preferences and initialize on mount
  useEffect(() => {
    const prefs = loadSavedPreferences();
    if (prefs.theme) {
      setIsDarkMode(prefs.theme === 'dark');
    }
    if (prefs.recentColors && prefs.recentColors.length > 0) {
      setRecentColors(prefs.recentColors);
    }
    if (prefs.customPalette) {
      setCustomPalette(prefs.customPalette);
    }

    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setActiveSidePanel(null);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initial canvas setup (Full HD by default)
    initProject('مشروع رسم رقمي', 1920, 1080, 300, '#ffffff', false);

    return () => window.removeEventListener('resize', checkMobile);
  }, [initProject]);

  // Handle Tool Selection with auto-preset adaptation
  const handleSelectTool = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    if (tool === 'eraser') {
      setBrushSettings((prev) => ({
        ...BRUSH_PRESETS.eraser,
        size: prev.id === 'eraser' ? prev.size : Math.max(16, prev.size),
      }));
    } else if (tool === 'pencil') {
      setBrushSettings(BRUSH_PRESETS.pencil_standard);
    } else if (tool === 'ink') {
      setBrushSettings(BRUSH_PRESETS.ink_pen);
    } else if (tool === 'brush') {
      setBrushSettings(BRUSH_PRESETS.soft_brush);
    }
  }, []);

  // Snapshot all layers with complete attributes and image raster data
  const snapshotLayers = useCallback(
    (targetLayers: Layer[]): LayerSnapshot[] => {
      return targetLayers.map((l) => ({
        layerId: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        imageData: l.ctx.getImageData(0, 0, canvasWidth, canvasHeight),
      }));
    },
    [canvasWidth, canvasHeight]
  );

  // Restore layers from a history step
  const restoreHistoryStep = useCallback(
    (step: HistoryStep) => {
      const current = layersRef.current;
      const restoredLayers: Layer[] = step.layersSnapshots.map((snap) => {
        const existing = current.find((l) => l.id === snap.layerId);
        let canvas: HTMLCanvasElement;
        let ctx: CanvasRenderingContext2D;

        if (existing) {
          canvas = existing.canvas;
          ctx = existing.ctx;
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.putImageData(snap.imageData, 0, 0);
        } else {
          const buffer = createCanvasBuffer(canvasWidth, canvasHeight);
          canvas = buffer.canvas;
          ctx = buffer.ctx;
          ctx.putImageData(snap.imageData, 0, 0);
        }

        return {
          id: snap.layerId,
          name: snap.name,
          visible: snap.visible,
          locked: snap.locked,
          opacity: snap.opacity,
          blendMode: snap.blendMode,
          canvas,
          ctx,
        };
      });

      setLayers(restoredLayers);
      setActiveLayerId(step.activeLayerId);
    },
    [canvasWidth, canvasHeight]
  );

  // History Commit after each stroke or modification
  const handleHistoryCommit = useCallback(
    (description: string, customLayers?: Layer[], customActiveId?: string) => {
      const activeLayers = customLayers || layersRef.current;
      const targetActiveId = customActiveId || activeLayerIdRef.current;

      const newSnapshots = snapshotLayers(activeLayers);

      // Truncate any redo steps
      const newStack = historyStack.current.slice(0, historyIndex.current + 1);

      // Maximum 30 steps to preserve memory efficiently
      if (newStack.length >= 30) {
        newStack.shift();
      }

      newStack.push({
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        description,
        layersSnapshots: newSnapshots,
        activeLayerId: targetActiveId,
      });

      historyStack.current = newStack;
      historyIndex.current = newStack.length - 1;

      setCanUndo(historyIndex.current > 0);
      setCanRedo(false);
    },
    [snapshotLayers]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const step = historyStack.current[historyIndex.current];
    restoreHistoryStep(step);
    setCanUndo(historyIndex.current > 0);
    setCanRedo(historyIndex.current < historyStack.current.length - 1);
    addToast(`تراجع: ${step.description}`, 'info');
  }, [restoreHistoryStep, addToast]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex.current >= historyStack.current.length - 1) return;
    historyIndex.current += 1;
    const step = historyStack.current[historyIndex.current];
    restoreHistoryStep(step);
    setCanUndo(historyIndex.current > 0);
    setCanRedo(historyIndex.current < historyStack.current.length - 1);
    addToast(`إعادة: ${step.description}`, 'info');
  }, [restoreHistoryStep, addToast]);

  // Side Panel Pin toggle handler
  const handleTogglePin = useCallback(() => {
    setIsSidePanelPinned((prev) => {
      const next = !prev;
      savePreferences({ isSidePanelPinned: next });
      addToast(
        next
          ? 'تم تثبيت اللوحة الجانبية (ستبقى مفتوحة دائمًا ولن تُطوى تلقائيًا).'
          : 'تم إلغاء تثبيت اللوحة (سيتم طيها تلقائيًا عند النقر خارجها أو على مساحة الرسم).',
        'info'
      );
      return next;
    });
  }, [addToast]);

  // Auto-collapse side panel when clicking/tapping outside if unpinned
  useEffect(() => {
    if (!activeSidePanel || isSidePanelPinned) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Inside desktop side panel or mobile drawer container
      if (
        (sidePanelContainerRef.current && sidePanelContainerRef.current.contains(target)) ||
        (mobileDrawerRef.current && mobileDrawerRef.current.contains(target))
      ) {
        return;
      }

      // Ignore toggle buttons so they can handle their own clicks
      if (
        target.closest('#toggle-collapse-sidepanel-btn') ||
        target.closest('#strip-pin-toggle-btn') ||
        target.closest('#strip-brushes-btn') ||
        target.closest('#strip-colors-btn') ||
        target.closest('#strip-layers-btn')
      ) {
        return;
      }

      // Ignore modals and dialog overlays
      if (
        target.closest('[role="dialog"]') ||
        target.closest('.modal-container') ||
        target.closest('#shortcuts-modal-backdrop') ||
        target.closest('#export-modal-backdrop') ||
        target.closest('#lineart-modal-backdrop') ||
        target.closest('#project-modal-backdrop')
      ) {
        return;
      }

      // Click detected outside the unpinned side panel -> Auto-collapse!
      setActiveSidePanel(null);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [activeSidePanel, isSidePanelPinned]);

  // Full-Screen Mode Toggle (عرض الموقع على الشاشة بأكملها)
  const handleToggleFullScreen = useCallback(() => {
    const doc = document as any;
    const elem = document.documentElement as any;
    const isCurrentlyFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (isCurrentlyFs) {
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exit) {
        exit.call(doc).catch(() => {});
      }
      setIsFullScreen(false);
      addToast('تم الخروج من وضع ملء الشاشة.', 'info');
    } else {
      const req =
        elem.requestFullscreen ||
        elem.webkitRequestFullscreen ||
        elem.mozRequestFullScreen ||
        elem.msRequestFullscreen;
      if (req) {
        req
          .call(elem)
          .then(() => {
            setIsFullScreen(true);
            addToast('تم عرض الموقع على الشاشة بأكملها بنجاح.', 'success');
          })
          .catch(() => {
            setIsFullScreen(true);
            addToast('تم تفعيل وضع ملء الشاشة.', 'info');
          });
      } else {
        setIsFullScreen(true);
        addToast('تم تفعيل وضع ملء الشاشة.', 'info');
      }
    }
  }, [addToast]);

  // Listen for browser fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      if (!isCurrentlyFs && isPickingFileRef.current) {
        return;
      }
      setIsFullScreen(isCurrentlyFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Save Project to IndexedDB
  const handleSaveProject = async () => {
    try {
      // Generate thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 240;
      thumbCanvas.height = Math.round((240 * canvasHeight) / canvasWidth);
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        if (!hasTransparentBg) {
          thumbCtx.fillStyle = backgroundColor;
          thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        }
        for (const l of layers) {
          if (!l.visible) continue;
          thumbCtx.globalAlpha = l.opacity / 100;
          thumbCtx.drawImage(l.canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        }
      }

      const serializableLayers = layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        dataUrl: l.canvas.toDataURL('image/png'),
      }));

      await saveProjectToDB({
        id: projectId,
        title: projectTitle,
        width: canvasWidth,
        height: canvasHeight,
        dpi,
        backgroundColor,
        hasTransparentBg,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.8),
        layers: serializableLayers,
      });

      savePreferences({ lastProjectId: projectId });
      addToast('تم حفظ المشروع بنجاح في ذاكرة المتصفح الدائمة.', 'success');
    } catch (e) {
      addToast('حدث خطأ أثناء حفظ المشروع.', 'error');
    }
  };

  // Open Saved Project from IndexedDB
  const handleOpenProject = async (id: string) => {
    try {
      const proj = await getProjectFromDB(id);
      if (!proj) {
        addToast('لم يتم العثور على المشروع المحدد.', 'error');
        return;
      }

      setProjectTitle(proj.title);
      setProjectId(proj.id);
      setCanvasWidth(proj.width);
      setCanvasHeight(proj.height);
      setDpi(proj.dpi || 300);
      setBackgroundColor(proj.backgroundColor || '#ffffff');
      setHasTransparentBg(proj.hasTransparentBg || false);

      const restoredLayers: Layer[] = [];
      for (const sl of proj.layers) {
        const { canvas, ctx } = createCanvasBuffer(proj.width, proj.height);
        const img = new Image();
        img.src = sl.dataUrl;
        await new Promise((res) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            res(null);
          };
          img.onerror = () => res(null);
        });

        restoredLayers.push({
          id: sl.id,
          name: sl.name,
          visible: sl.visible,
          locked: sl.locked,
          opacity: sl.opacity,
          blendMode: sl.blendMode,
          canvas,
          ctx,
        });
      }

      setLayers(restoredLayers);
      if (restoredLayers.length > 0) {
        setActiveLayerId(restoredLayers[restoredLayers.length - 1].id);
      }

      addToast(`تم فتح المشروع "${proj.title}" بنجاح.`, 'success');
    } catch (e) {
      addToast('حدث خطأ أثناء فتح المشروع.', 'error');
    }
  };

  // Color change with recent colors preservation
  const handleColorChange = (newColor: string) => {
    if (newColor !== currentColor) {
      setPreviousColor(currentColor);
      setCurrentColor(newColor);
      if (!recentColors.includes(newColor)) {
        const updated = [newColor, ...recentColors.slice(0, 11)];
        setRecentColors(updated);
        savePreferences({ recentColors: updated });
      }
    }
  };

  // Layer Management functions
  const handleSelectLayer = (id: string) => {
    setActiveLayerId(id);
    setIsLayerIsolation(true);
  };

  const handleShowAllLayers = () => {
    setIsLayerIsolation(false);
    addToast('تم إلغاء العزل وعرض جميع الطبقات معاً.', 'info');
  };

  const handleToggleIsolation = (enabled: boolean) => {
    setIsLayerIsolation(enabled);
    if (enabled) {
      const active = layers.find((l) => l.id === activeLayerId);
      addToast(`تم تفعيل وضع عزل "${active?.name || 'الطبقة'}".`, 'info');
    } else {
      addToast('تم إلغاء العزل وعرض جميع الطبقات مجمعة.', 'info');
    }
  };

  const handleAddLayer = (name?: string) => {
    const { canvas, ctx } = createCanvasBuffer(canvasWidth, canvasHeight);
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: name || `طبقة جديدة ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas,
      ctx,
    };
    const updated = [...layers, newLayer];
    setLayers(updated);
    setActiveLayerId(newLayer.id);
    setIsLayerIsolation(true);
    handleHistoryCommit('إضافة طبقة', updated, newLayer.id);
    addToast('تمت إضافة طبقة جديدة.', 'info');
  };

  const handleDeleteLayer = (id: string) => {
    if (!id) {
      addToast('يرجى تحديد طبقة أولاً لحذفها.', 'info');
      return;
    }
    if (layers.length <= 1) {
      addToast('لا يمكن حذف الطبقة الأساسية الأخيرة. يجب أن تظل هناك طبقة رسم واحدة على الأقل.', 'error');
      return;
    }

    const targetLayer = layers.find((l) => l.id === id);
    const targetName = targetLayer ? targetLayer.name : 'الطبقة';

    const remaining = layers.filter((l) => l.id !== id);
    const deletedIndex = layers.findIndex((l) => l.id === id);
    const nextIndex = Math.max(0, Math.min(remaining.length - 1, deletedIndex > 0 ? deletedIndex - 1 : 0));
    const nextActive = remaining[nextIndex].id;

    setLayers(remaining);
    setActiveLayerId(nextActive);
    handleHistoryCommit(`حذف طبقة "${targetName}"`, remaining, nextActive);
    addToast(`تم حذف ${targetName} بنجاح. يمكنك التراجع (Undo) لاستعادتها.`, 'success');
  };

  const handleDuplicateLayer = (id: string) => {
    const src = layers.find((l) => l.id === id);
    if (!src) return;

    const { canvas, ctx } = createCanvasBuffer(canvasWidth, canvasHeight);
    ctx.drawImage(src.canvas, 0, 0);

    const dupLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `${src.name} (نسخة)`,
      visible: true,
      locked: false,
      opacity: src.opacity,
      blendMode: src.blendMode,
      canvas,
      ctx,
    };

    const updated = [...layers, dupLayer];
    setLayers(updated);
    setActiveLayerId(dupLayer.id);
    handleHistoryCommit('نسخ طبقة', updated, dupLayer.id);
    addToast('تم نسخ الطبقة بنجاح.', 'info');
  };

  const handleMergeDown = (id: string) => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx <= 0) {
      addToast('لا توجد طبقة سفلية للدمج معها.', 'info');
      return;
    }

    const currentLayer = layers[idx];
    const belowLayer = layers[idx - 1];

    belowLayer.ctx.save();
    belowLayer.ctx.globalAlpha = currentLayer.opacity / 100;
    belowLayer.ctx.globalCompositeOperation = currentLayer.blendMode;
    belowLayer.ctx.drawImage(currentLayer.canvas, 0, 0);
    belowLayer.ctx.restore();

    const remaining = layers.filter((_, i) => i !== idx);
    setLayers(remaining);
    setActiveLayerId(belowLayer.id);
    handleHistoryCommit('دمج الطبقات', remaining, belowLayer.id);
    addToast('تم دمج الطبقة بنجاح.', 'success');
  };

  const handleReorderLayer = (id: string, dir: 'up' | 'down') => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    if (dir === 'up' && idx < layers.length - 1) {
      const copy = [...layers];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      setLayers(copy);
      handleHistoryCommit('إعادة ترتيب الطبقات', copy);
    } else if (dir === 'down' && idx > 0) {
      const copy = [...layers];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      setLayers(copy);
      handleHistoryCommit('إعادة ترتيب الطبقات', copy);
    }
  };

  // Clear Page / Canvas content with full Undo history support
  const handleClearPage = () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;
    if (activeLayer.locked) {
      addToast('لا يمكن مسح الصفحة لأن الطبقة الحالية مقفلة.', 'error');
      return;
    }

    const { canvas, ctx } = createCanvasBuffer(canvasWidth, canvasHeight);
    const updated = layers.map((l) => {
      if (l.id === activeLayerId) {
        return {
          ...l,
          canvas,
          ctx,
        };
      }
      return l;
    });

    setLayers(updated);
    handleHistoryCommit('مسح الصفحة', updated, activeLayerId);
    addToast('تم مسح محتوى الصفحة بنجاح. يمكنك التراجع (Undo) لاسترجاعها.', 'info');
  };

  // Image Upload handler (File input or Drag & Drop)
  const handleOpenImageUpload = useCallback(() => {
    isPickingFileRef.current = true;
    if (!!document.fullscreenElement || isFullScreen) {
      sessionStorage.setItem('was_fullscreen_before_upload', 'true');
    }
    fileInputRef.current?.click();
    setTimeout(() => {
      isPickingFileRef.current = false;
    }, 6000);
  }, [isFullScreen]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('الملف غير صالح. يرجى اختيار ملف صورة (PNG, JPG, WEBP, SVG).', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      addToast('الصورة كبيرة جدًا، يرجى اختيار صورة أصغر من 25 ميغابايت.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setPendingLineArtSource(img);

        // Put image onto a new layer
        const { canvas, ctx } = createCanvasBuffer(canvasWidth, canvasHeight);
        // Draw centered
        const ratio = Math.min(canvasWidth / img.width, canvasHeight / img.height, 1);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (canvasWidth - w) / 2;
        const y = (canvasHeight - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        const newLayer: Layer = {
          id: `layer_${Date.now()}`,
          name: `صورة: ${file.name.slice(0, 14)}`,
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'source-over',
          canvas,
          ctx,
        };

        const updated = [...layers, newLayer];
        setLayers(updated);
        setActiveLayerId(newLayer.id);
        handleHistoryCommit('إدراج صورة', updated, newLayer.id);
        addToast('تم رفع الصورة بنجاح! يمكنك الآن تحويلها إلى خطوط (Line Art).', 'success');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Apply AI Subject Drawing result from LineArtModal
  const handleApplyLineArtResult = (
    contourCanvas: HTMLCanvasElement,
    originalImageCanvas: HTMLCanvasElement | null,
    options?: {
      includeOriginalImage?: boolean;
      opacity?: number;
      layerName?: string;
    }
  ) => {
    const newLayersToAdd: Layer[] = [];
    const baseTimestamp = Date.now();

    // Determine scale and center into project canvas
    const refCanvas = originalImageCanvas || contourCanvas;
    const ratio = Math.min(canvasWidth / refCanvas.width, canvasHeight / refCanvas.height, 1);
    const w = refCanvas.width * ratio;
    const h = refCanvas.height * ratio;
    const x = (canvasWidth - w) / 2;
    const y = (canvasHeight - h) / 2;

    // 1. Layer 1 (Bottom): Original Untouched Image (if requested or provided)
    if (options?.includeOriginalImage !== false && originalImageCanvas) {
      const { canvas: origCanvas, ctx: origCtx } = createCanvasBuffer(canvasWidth, canvasHeight);
      origCtx.drawImage(originalImageCanvas, x, y, w, h);

      const origLayer: Layer = {
        id: `layer_${baseTimestamp}_orig`,
        name: 'الصورة الأصلية',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'source-over',
        canvas: origCanvas,
        ctx: origCtx,
      };
      newLayersToAdd.push(origLayer);
    }

    // 2. Layer 2 (Top): Pure AI Line Drawing (Lines only, transparent background)
    const { canvas: drawingBufCanvas, ctx: drawingBufCtx } = createCanvasBuffer(canvasWidth, canvasHeight);
    drawingBufCtx.drawImage(contourCanvas, x, y, w, h);

    const drawingLayer: Layer = {
      id: `layer_${baseTimestamp}_ai_drawing`,
      name: options?.layerName || 'الرسم الخطي بالذكاء الاصطناعي',
      visible: true,
      locked: false,
      opacity: options?.opacity ?? 100,
      blendMode: 'source-over',
      canvas: drawingBufCanvas,
      ctx: drawingBufCtx,
    };
    newLayersToAdd.push(drawingLayer);

    const updated = [...layers, ...newLayersToAdd];
    setLayers(updated);
    setActiveLayerId(drawingLayer.id);
    handleHistoryCommit(
      newLayersToAdd.length > 1 ? 'إدراج الصورة الأصلية مع الرسم الخطي' : 'تحويل الصورة إلى رسم خطوط',
      updated,
      drawingLayer.id
    );

    addToast(
      newLayersToAdd.length > 1
        ? 'تمت إضافة طبقة "الصورة الأصلية" وطبقة "الرسم الخطي بالذكاء الاصطناعي" بنجاح!'
        : 'تمت إضافة طبقة "الرسم الخطي بالذكاء الاصطناعي" بنجاح!',
      'success'
    );
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in text input or modal
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        if (isFullScreen) {
          e.preventDefault();
          handleToggleFullScreen();
        }
      } else if ((e.key.toLowerCase() === 'f' || e.key === 'F11') && !ctrlOrCmd && !e.altKey) {
        e.preventDefault();
        handleToggleFullScreen();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setProjectModalMode('open');
        setShowProjectModal(true);
      } else if (!ctrlOrCmd && (e.key === '[' || e.key === ']' || e.key === 'Tab')) {
        e.preventDefault();
        setActiveSidePanel((prev) => (prev ? null : 'brushes'));
      } else if (!ctrlOrCmd) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          handleSelectTool('brush');
        } else if (k === 'p') {
          handleSelectTool('pencil');
        } else if (k === 'n') {
          handleSelectTool('ink');
        } else if (k === 'e') {
          handleSelectTool('eraser');
        } else if (k === 'g') {
          handleSelectTool('fill');
        } else if (k === 'i') {
          handleSelectTool('eyedropper');
        } else if (k === 'v') {
          handleSelectTool('move');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isFullScreen, handleToggleFullScreen, handleSaveProject, handleSelectTool]);

  // Drag and drop onto app window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  return (
    <div 
      id="digital-painting-app-root"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col w-screen h-screen overflow-hidden select-none font-sans text-right ${
        isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
      dir="rtl"
    >
      {/* Top Application Header */}
      <Header
        projectTitle={projectTitle}
        onRenameProjectTitle={setProjectTitle}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        transform={transform}
        onTransformChange={setTransform}
        onResetView={() => setTransform({ ...transform, zoom: 1.0, panX: 0, panY: 0, rotation: 0 })}
        onFitToScreen={() => {
          const fit = Math.min((window.innerWidth - 380) / canvasWidth, (window.innerHeight - 150) / canvasHeight);
          setTransform({ ...transform, zoom: Math.max(0.1, fit), panX: 0, panY: 0 });
        }}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => {
          const next = !isDarkMode;
          setIsDarkMode(next);
          savePreferences({ theme: next ? 'dark' : 'light' });
        }}
        onOpenNewProject={() => {
          setProjectModalMode('new');
          setShowProjectModal(true);
        }}
        onOpenProjectsManager={() => {
          setProjectModalMode('open');
          setShowProjectModal(true);
        }}
        onSaveProject={handleSaveProject}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenLineArtModal={() => setShowLineArtModal(true)}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        activeSidePanel={activeSidePanel}
        onToggleSidePanel={(p) => setActiveSidePanel(activeSidePanel === p ? null : p)}
        isFullScreen={isFullScreen}
        onToggleFullScreen={handleToggleFullScreen}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Right Tools Bar (Desktop) */}
        {!isMobileView && (
          <Toolbar
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            shapeOptions={shapeOptions}
            onUpdateShapeOptions={setShapeOptions}
            brushSettings={brushSettings}
            onUpdateBrushSettings={(patch) => setBrushSettings((prev) => ({ ...prev, ...patch }))}
            onOpenLineArtModal={() => setShowLineArtModal(true)}
            onOpenImageUpload={handleOpenImageUpload}
            onClearPage={handleClearPage}
          />
        )}

        {/* Central Drawing Viewport Canvas */}
        <div className="flex-1 relative h-full overflow-hidden">
          <DrawingCanvas
            width={canvasWidth}
            height={canvasHeight}
            backgroundColor={backgroundColor}
            hasTransparentBg={hasTransparentBg}
            activeTool={activeTool}
            brushSettings={brushSettings}
            currentColor={currentColor}
            layers={layers}
            activeLayerId={activeLayerId}
            isLayerIsolation={isLayerIsolation}
            onShowAllLayers={handleShowAllLayers}
            transform={transform}
            onTransformChange={setTransform}
            onColorPick={handleColorChange}
            onHistoryCommit={handleHistoryCommit}
            showGrid={showGrid}
            showRulers={showRulers}
            shapeOptions={shapeOptions}
            isDarkMode={isDarkMode}
          />

          {/* Floating Exit Fullscreen Button in Full-Screen Mode */}
          {isFullScreen && (
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
              <button
                id="exit-fullscreen-btn"
                onClick={handleToggleFullScreen}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/95 hover:bg-neutral-850 text-neutral-100 border border-neutral-700/80 shadow-2xl backdrop-blur transition-all text-xs font-semibold hover:text-amber-400 group"
                title="الخروج من وضع ملء الشاشة (Esc أو F)"
              >
                <Minimize2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>الخروج من ملء الشاشة</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 border border-neutral-700">Esc</kbd>
              </button>
            </div>
          )}
        </div>

        {/* Left Side Docked / Expandable Panels (Brushes, Colors, Layers) */}
        {!isMobileView ? (
          <div ref={sidePanelContainerRef} className="flex flex-row h-full z-20 transition-all duration-200">
            {/* Panel Selector Strip */}
            <div className="flex flex-col items-center gap-1.5 p-1.5 bg-neutral-950 border-r border-neutral-800 text-neutral-400 w-12">
              {/* Dedicated button to collapse/retract or expand side panel */}
              <button
                id="toggle-collapse-sidepanel-btn"
                onClick={() => setActiveSidePanel(activeSidePanel ? null : 'brushes')}
                className={`p-2 rounded-xl transition-all mb-1 border ${
                  activeSidePanel
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                    : 'border-transparent text-neutral-400 hover:text-amber-400 hover:bg-neutral-850'
                }`}
                title={activeSidePanel ? 'طي وإدخال اللوحة الجانبية (إخفاء)' : 'إظهار اللوحة الجانبية'}
              >
                {activeSidePanel ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>

              <div className="w-6 h-[1px] bg-neutral-800 my-0.5" />

              <button
                id="strip-brushes-btn"
                onClick={() => setActiveSidePanel(activeSidePanel === 'brushes' ? null : 'brushes')}
                className={`p-2.5 rounded-xl transition-all ${
                  activeSidePanel === 'brushes' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:bg-neutral-850 hover:text-neutral-200'
                }`}
                title="لوحة الفرش"
              >
                <Sliders className="w-5 h-5" />
              </button>
              <button
                id="strip-colors-btn"
                onClick={() => setActiveSidePanel(activeSidePanel === 'colors' ? null : 'colors')}
                className={`p-2.5 rounded-xl transition-all ${
                  activeSidePanel === 'colors' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:bg-neutral-850 hover:text-neutral-200'
                }`}
                title="لوحة الألوان"
              >
                <Palette className="w-5 h-5" />
              </button>
              <button
                id="strip-layers-btn"
                onClick={() => setActiveSidePanel(activeSidePanel === 'layers' ? null : 'layers')}
                className={`p-2.5 rounded-xl transition-all ${
                  activeSidePanel === 'layers' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:bg-neutral-850 hover:text-neutral-200'
                }`}
                title="لوحة الطبقات"
              >
                <LayersIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Active Panel Content */}
            {activeSidePanel === 'brushes' && (
              <BrushPanel
                currentBrush={brushSettings}
                onSelectBrush={setBrushSettings}
                onUpdateBrushSettings={(patch) => setBrushSettings((prev) => ({ ...prev, ...patch }))}
                currentColor={currentColor}
                onClose={() => setActiveSidePanel(null)}
                isPinned={isSidePanelPinned}
                onTogglePin={handleTogglePin}
              />
            )}
            {activeSidePanel === 'colors' && (
              <ColorPanel
                currentColor={currentColor}
                onColorChange={handleColorChange}
                previousColor={previousColor}
                onSelectEyedropper={() => setActiveTool('eyedropper')}
                customPalette={customPalette}
                onAddToCustomPalette={(c) => {
                  const updated = [...customPalette, c];
                  setCustomPalette(updated);
                  savePreferences({ customPalette: updated });
                }}
                onRemoveFromCustomPalette={(idx) => {
                  const updated = customPalette.filter((_, i) => i !== idx);
                  setCustomPalette(updated);
                  savePreferences({ customPalette: updated });
                }}
                recentColors={recentColors}
                onClose={() => setActiveSidePanel(null)}
                isPinned={isSidePanelPinned}
                onTogglePin={handleTogglePin}
              />
            )}
            {activeSidePanel === 'layers' && (
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                isLayerIsolation={isLayerIsolation}
                onSelectLayer={handleSelectLayer}
                onShowAllLayers={handleShowAllLayers}
                onToggleIsolation={handleToggleIsolation}
                onAddLayer={() => handleAddLayer()}
                onDeleteLayer={handleDeleteLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onClose={() => setActiveSidePanel(null)}
                isPinned={isSidePanelPinned}
                onTogglePin={handleTogglePin}
                onToggleVisibility={(id) => {
                  const updated = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
                  setLayers(updated);
                  handleHistoryCommit('تغيير ظهور طبقة', updated);
                }}
                onToggleLock={(id) => {
                  setLayers(layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
                }}
                onChangeOpacity={(id, op) => {
                  setLayers(layers.map((l) => (l.id === id ? { ...l, opacity: op } : l)));
                }}
                onCommitOpacityChange={() => {
                  handleHistoryCommit('تغيير شفافية الطبقة');
                }}
                onChangeBlendMode={(id, mode) => {
                  const updated = layers.map((l) => (l.id === id ? { ...l, blendMode: mode } : l));
                  setLayers(updated);
                  handleHistoryCommit('تغيير وضع دمج الطبقة', updated);
                }}
                onReorderLayer={handleReorderLayer}
                onMergeDown={handleMergeDown}
                onRenameLayer={(id, newName) => {
                  setLayers(layers.map((l) => (l.id === id ? { ...l, name: newName } : l)));
                }}
              />
            )}
          </div>
        ) : (
          /* Mobile / Tablet Floating Drawer Panels */
          activeSidePanel && (
            <>
              {/* Backdrop for outside tap on mobile when not pinned */}
              {!isSidePanelPinned && (
                <div
                  id="mobile-drawer-backdrop"
                  onClick={() => setActiveSidePanel(null)}
                  className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity"
                />
              )}
              <div 
                ref={mobileDrawerRef}
                className="absolute inset-y-0 left-0 z-40 bg-neutral-900 border-r border-neutral-800 shadow-2xl animate-in slide-in-from-left duration-200"
              >
                <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-950">
                  <span className="font-bold text-xs">
                    {activeSidePanel === 'brushes' && 'لوحة الفرش'}
                    {activeSidePanel === 'colors' && 'لوحة الألوان'}
                    {activeSidePanel === 'layers' && 'لوحة الطبقات'}
                  </span>
                  <button
                    onClick={() => setActiveSidePanel(null)}
                    className="p-1 rounded text-neutral-400 hover:text-neutral-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-[calc(100%-48px)]">
                  {activeSidePanel === 'brushes' && (
                    <BrushPanel
                      currentBrush={brushSettings}
                      onSelectBrush={(b) => {
                        setBrushSettings(b);
                        if (!isSidePanelPinned) setActiveSidePanel(null);
                      }}
                      onUpdateBrushSettings={(patch) => setBrushSettings((prev) => ({ ...prev, ...patch }))}
                      currentColor={currentColor}
                      isPinned={isSidePanelPinned}
                      onTogglePin={handleTogglePin}
                    />
                  )}
                  {activeSidePanel === 'colors' && (
                    <ColorPanel
                      currentColor={currentColor}
                      onColorChange={handleColorChange}
                      previousColor={previousColor}
                      onSelectEyedropper={() => {
                        setActiveTool('eyedropper');
                        if (!isSidePanelPinned) setActiveSidePanel(null);
                      }}
                      customPalette={customPalette}
                      onAddToCustomPalette={(c) => {
                        const updated = [...customPalette, c];
                        setCustomPalette(updated);
                        savePreferences({ customPalette: updated });
                      }}
                      onRemoveFromCustomPalette={(idx) => {
                        const updated = customPalette.filter((_, i) => i !== idx);
                        setCustomPalette(updated);
                        savePreferences({ customPalette: updated });
                      }}
                      recentColors={recentColors}
                      isPinned={isSidePanelPinned}
                      onTogglePin={handleTogglePin}
                    />
                  )}
                  {activeSidePanel === 'layers' && (
                    <LayersPanel
                      layers={layers}
                      activeLayerId={activeLayerId}
                      isLayerIsolation={isLayerIsolation}
                      onSelectLayer={handleSelectLayer}
                      onShowAllLayers={handleShowAllLayers}
                      onToggleIsolation={handleToggleIsolation}
                      onAddLayer={() => handleAddLayer()}
                      onDeleteLayer={handleDeleteLayer}
                      onDuplicateLayer={handleDuplicateLayer}
                      onClose={() => setActiveSidePanel(null)}
                      isPinned={isSidePanelPinned}
                      onTogglePin={handleTogglePin}
                    onToggleVisibility={(id) => {
                      const updated = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
                      setLayers(updated);
                      handleHistoryCommit('تغيير ظهور طبقة', updated);
                    }}
                    onToggleLock={(id) => {
                      setLayers(layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
                    }}
                    onChangeOpacity={(id, op) => {
                      setLayers(layers.map((l) => (l.id === id ? { ...l, opacity: op } : l)));
                    }}
                    onCommitOpacityChange={() => {
                      handleHistoryCommit('تغيير شفافية الطبقة');
                    }}
                    onChangeBlendMode={(id, mode) => {
                      const updated = layers.map((l) => (l.id === id ? { ...l, blendMode: mode } : l));
                      setLayers(updated);
                      handleHistoryCommit('تغيير وضع دمج الطبقة', updated);
                    }}
                    onReorderLayer={handleReorderLayer}
                    onMergeDown={handleMergeDown}
                    onRenameLayer={(id, newName) => {
                      setLayers(layers.map((l) => (l.id === id ? { ...l, name: newName } : l)));
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )
      )}
      </div>

      {/* Mobile Bottom Toolbar */}
      {isMobileView && (
        <Toolbar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          shapeOptions={shapeOptions}
          onUpdateShapeOptions={setShapeOptions}
          brushSettings={brushSettings}
          onUpdateBrushSettings={(patch) => setBrushSettings((prev) => ({ ...prev, ...patch }))}
          onOpenLineArtModal={() => setShowLineArtModal(true)}
          onOpenImageUpload={handleOpenImageUpload}
          onClearPage={handleClearPage}
          isMobile={true}
        />
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          setTimeout(() => {
            const wasFs = sessionStorage.getItem('was_fullscreen_before_upload') === 'true';
            if (wasFs || isFullScreen || !!document.fullscreenElement) {
              const elem = document.documentElement as any;
              const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
              if (req) {
                req.call(elem).then(() => {
                  setIsFullScreen(true);
                }).catch(() => {});
              }
              sessionStorage.removeItem('was_fullscreen_before_upload');
            }
          }, 350);
        }}
      />

      {/* Modals Suite */}
      <LineArtModal
        isOpen={showLineArtModal}
        onClose={() => setShowLineArtModal(false)}
        onApplyLineArt={handleApplyLineArtResult}
        initialImageSource={pendingLineArtSource}
      />

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onNewProject={initProject}
        onOpenProject={handleOpenProject}
        initialMode={projectModalMode}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        layers={layers}
        width={canvasWidth}
        height={canvasHeight}
        backgroundColor={backgroundColor}
        hasTransparentBg={hasTransparentBg}
        projectTitle={projectTitle}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Arabic Toast Notifications Toast Stack */}
      <div 
        id="app-toasts-container"
        className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md animate-in slide-in-from-bottom-2 duration-300 text-xs font-medium ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-800/80 text-rose-200'
                : toast.type === 'info'
                ? 'bg-neutral-900/90 border-neutral-700/80 text-neutral-200'
                : 'bg-emerald-950/90 border-emerald-800/80 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

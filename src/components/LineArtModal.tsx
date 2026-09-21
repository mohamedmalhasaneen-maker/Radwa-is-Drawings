import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AISubjectDrawingSettings, 
  DetailClarityLevel, 
  SmoothingLevel 
} from '../types';
import { 
  processAISubjectDrawing, 
  requestGeminiSubjectDrawing 
} from '../utils/aiDrawingEngine';
import { 
  Eye, 
  Check, 
  X, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Layers,
  SplitSquareVertical,
  MousePointerClick,
  Sliders,
  PenTool,
  Feather,
  Image as ImageIcon,
  Zap,
  Info,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface LineArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLineArt: (
    drawingCanvas: HTMLCanvasElement, 
    originalImageCanvas: HTMLCanvasElement | null,
    options: {
      includeOriginalImage: boolean;
      opacity: number;
      layerName?: string;
    }
  ) => void;
  initialImageSource?: HTMLImageElement | HTMLCanvasElement | null;
}

export const LineArtModal: React.FC<LineArtModalProps> = ({
  isOpen,
  onClose,
  onApplyLineArt,
  initialImageSource,
}) => {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('جاهز لتحويل الصورة إلى خطوط رسم');
  
  // Preview mode:
  // 'overlay' = Original photo + line art on top
  // 'linesOnly' = Clean line drawing on transparent/white background (no original photo)
  // 'split' = Side-by-side comparison
  // 'mask' = Subject segmentation mask
  const [previewMode, setPreviewMode] = useState<'overlay' | 'linesOnly' | 'split' | 'mask'>('overlay');

  // AI Line Drawing Settings with Default "بسيط جدًا" (Very Simple)
  const [settings, setSettings] = useState<AISubjectDrawingSettings>({
    detailLevel: 'very_simple',    // بسيط جدًا (الافتراضي) | بسيط | متوسط
    lineThickness: 2,              // 1 - 10 px
    lineColor: '#262626',          // Default pencil color
    lineOpacity: 100,              // 0 - 100%
    smoothing: 'medium',           // low | medium | high
    cleanLines: true,              // تنظيف الخطوط وإزالة الشوائب الصغيرة
    backgroundMode: 'transparent', // 'transparent' | 'white'
    threshold: 50,
    selectedSeedPoints: [],
    includeOriginalImage: true,
  });

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const isPickingFileRef = useRef<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingBufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const subjectMaskBufferRef = useRef<Float32Array | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Load initial image if provided
  useEffect(() => {
    if (initialImageSource && isOpen) {
      if (initialImageSource instanceof HTMLImageElement) {
        setSourceImg(initialImageSource);
      } else {
        const img = new Image();
        img.src = initialImageSource.toDataURL();
        img.onload = () => setSourceImg(img);
      }
    }
  }, [initialImageSource, isOpen]);

  // Handle image upload from disk
  const handleOpenUpload = () => {
    isPickingFileRef.current = true;
    if (!!document.fullscreenElement) {
      sessionStorage.setItem('was_fullscreen_before_upload', 'true');
    }
    hiddenFileInputRef.current?.click();
    setTimeout(() => {
      isPickingFileRef.current = false;
    }, 6000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setSourceImg(img);
        setSettings((prev) => ({ ...prev, selectedSeedPoints: [] }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    setTimeout(() => {
      const wasFs = sessionStorage.getItem('was_fullscreen_before_upload') === 'true';
      if (wasFs || !!document.fullscreenElement) {
        const elem = document.documentElement as any;
        const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
        if (req) {
          req.call(elem).catch(() => {});
        }
        sessionStorage.removeItem('was_fullscreen_before_upload');
      }
    }, 350);
  };

  /**
   * Fast redraw of preview canvas from buffer & current visual mode
   */
  const redrawPreview = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    const srcCanvas = sourceCanvasRef.current;
    const drawBuffer = drawingBufferCanvasRef.current;
    if (!previewCanvas || !srcCanvas || !drawBuffer) return;

    const w = previewCanvas.width;
    const h = previewCanvas.height;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    if (previewMode === 'mask' && subjectMaskBufferRef.current) {
      // Render subject segmentation mask
      const mask = subjectMaskBufferRef.current;
      const maskImgData = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = Math.round(mask[i] * 255);
        const idx = i * 4;
        maskImgData.data[idx] = v;
        maskImgData.data[idx + 1] = v;
        maskImgData.data[idx + 2] = v;
        maskImgData.data[idx + 3] = 255;
      }
      ctx.putImageData(maskImgData, 0, 0);
    } else if (previewMode === 'overlay') {
      // 1. Draw original untouched photo
      ctx.drawImage(srcCanvas, 0, 0);
      // 2. Overlay the AI line drawing on top
      ctx.drawImage(drawBuffer, 0, 0);
    } else if (previewMode === 'split') {
      // Split view: Left original photo, Right AI clean line drawing
      ctx.drawImage(srcCanvas, 0, 0);

      const splitX = Math.floor(w / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();

      if (settings.backgroundMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(splitX, 0, w - splitX, h);
      } else {
        ctx.clearRect(splitX, 0, w - splitX, h);
      }
      ctx.drawImage(drawBuffer, 0, 0);
      ctx.restore();

      // Splitter bar
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();
    } else {
      // 'linesOnly': Draw ONLY the extracted clean line drawing
      if (settings.backgroundMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(drawBuffer, 0, 0);
    }
  }, [previewMode, settings.backgroundMode]);

  /**
   * Run full AI subject detection, segmentation and line drawing pipeline
   */
  const runAILineExtraction = useCallback(async () => {
    if (!sourceImg) return;
    setIsProcessing(true);
    setAiStatusMessage('جاري تحليل الجسم واستخراج الخطوط الأساسية بالذكاء الاصطناعي...');

    const maxDim = 1024;
    let w = sourceImg.naturalWidth || sourceImg.width;
    let h = sourceImg.naturalHeight || sourceImg.height;

    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) {
      setIsProcessing(false);
      return;
    }

    srcCtx.drawImage(sourceImg, 0, 0, w, h);
    sourceCanvasRef.current = srcCanvas;

    // Scale user seed points if any
    const scaledSeeds = settings.selectedSeedPoints.map((pt) => ({
      x: (pt.x / (sourceImg.naturalWidth || sourceImg.width)) * w,
      y: (pt.y / (sourceImg.naturalHeight || sourceImg.height)) * h,
      weight: pt.weight,
    }));

    const activeSettings: AISubjectDrawingSettings = {
      ...settings,
      selectedSeedPoints: scaledSeeds,
    };

    // Execute AI Line Extraction & Simplification
    const { imageData, subjectMask } = processAISubjectDrawing(srcCtx, w, h, activeSettings);
    subjectMaskBufferRef.current = subjectMask;

    // Store in drawing buffer canvas
    const drawBuffer = document.createElement('canvas');
    drawBuffer.width = w;
    drawBuffer.height = h;
    const drawBufferCtx = drawBuffer.getContext('2d');
    if (drawBufferCtx) {
      drawBufferCtx.putImageData(imageData, 0, 0);
    }
    drawingBufferCanvasRef.current = drawBuffer;

    // Setup preview canvas dimensions
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      previewCanvas.width = w;
      previewCanvas.height = h;
    }

    redrawPreview();
    setIsProcessing(false);
    setAiStatusMessage('تم تحويل الصورة إلى رسم خطوط نظيف بنجاح!');
  }, [sourceImg, settings, redrawPreview]);

  // Debounced execution when tuning parameters
  useEffect(() => {
    if (!isOpen || !sourceImg) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      runAILineExtraction();
    }, 100);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    isOpen,
    sourceImg,
    settings.detailLevel,
    settings.lineThickness,
    settings.lineColor,
    settings.lineOpacity,
    settings.smoothing,
    settings.cleanLines,
    settings.backgroundMode,
    settings.threshold,
    settings.selectedSeedPoints,
    runAILineExtraction,
  ]);

  // Redraw preview when visual mode changes
  useEffect(() => {
    if (drawingBufferCanvasRef.current) {
      redrawPreview();
    }
  }, [previewMode, redrawPreview]);

  // User click on preview canvas to manually select a specific subject
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sourceImg || !previewCanvasRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = (sourceImg.naturalWidth || sourceImg.width) / rect.width;
    const scaleY = (sourceImg.naturalHeight || sourceImg.height) / rect.height;

    const imgX = clickX * scaleX;
    const imgY = clickY * scaleY;

    setSettings((prev) => ({
      ...prev,
      selectedSeedPoints: [{ x: imgX, y: imgY, weight: 1.0 }],
    }));
  };

  // Re-process with Gemini Vision AI API server call
  const handleServerAIReprocess = async () => {
    if (!sourceCanvasRef.current) return;
    setIsProcessing(true);
    setAiStatusMessage('جاري تحليل وفهم الصورة واستخراج الخطوط بواسطة الذكاء الاصطناعي (Gemini Vision)...');

    try {
      const base64 = sourceCanvasRef.current.toDataURL('image/png');
      const response = await requestGeminiSubjectDrawing(base64, settings);
      
      if (response.success && response.imageUrl) {
        const aiImg = new Image();
        aiImg.onload = () => {
          if (drawingBufferCanvasRef.current) {
            const ctx = drawingBufferCanvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, drawingBufferCanvasRef.current.width, drawingBufferCanvasRef.current.height);
              ctx.drawImage(aiImg, 0, 0, drawingBufferCanvasRef.current.width, drawingBufferCanvasRef.current.height);
              redrawPreview();
            }
          }
          setIsProcessing(false);
          setAiStatusMessage('تم استخراج الرسم الخطي بنجاح بواسطة الذكاء الاصطناعي!');
        };
        aiImg.src = response.imageUrl;
      } else {
        await runAILineExtraction();
      }
    } catch (e) {
      await runAILineExtraction();
    }
  };

  // Final Apply: Export drawing canvas + original image canvas to main app
  const handleApply = () => {
    if (!drawingBufferCanvasRef.current || !sourceCanvasRef.current) return;

    onApplyLineArt(
      drawingBufferCanvasRef.current,
      settings.includeOriginalImage ? sourceCanvasRef.current : null,
      {
        includeOriginalImage: settings.includeOriginalImage,
        opacity: settings.lineOpacity,
        layerName: 'رسم رصاص مبدئي',
      }
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="ai-lineart-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div 
        id="ai-lineart-modal-card"
        className="flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-neutral-900 border border-neutral-750 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-neutral-950 font-black shadow-md shadow-amber-500/20">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">
                  تحويل الصورة إلى خطوط (Line Drawing بالذكاء الاصطناعي)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  AI Line Art
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                استخراج الـ Outline والخطوط الأساسية للجسم مع حذف الألوان والظلال والخلفية والتشويش لبدء الرسم والتلوين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ai-drawing-upload-new-btn"
              onClick={handleOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
              title="رفع صورة جديدة من جهازك"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع صورة أخرى</span>
            </button>
            <input
              ref={hiddenFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              id="ai-drawing-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-900/60">
          {/* Left Canvas Preview Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 bg-neutral-950/80 relative overflow-hidden border-b md:border-b-0 md:border-l border-neutral-800">
            {/* Top Preview Controls Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
              {/* Preview Modes */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  id="preview-mode-overlay"
                  onClick={() => setPreviewMode('overlay')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    previewMode === 'overlay' 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="عرض الصورة الأصلية الملونة مع الخطوط فوقها للمقارنة"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>الصورة + الخطوط</span>
                </button>

                <button
                  id="preview-mode-lines-only"
                  onClick={() => setPreviewMode('linesOnly')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    previewMode === 'linesOnly' 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="عرض الرسم الخطي فقط بدون الصورة الأصلية"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>الرسم الخطي فقط</span>
                </button>

                <button
                  id="preview-mode-split"
                  onClick={() => setPreviewMode('split')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    previewMode === 'split' 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="مقارنة منقسمة بين الصورة الأصلية والرسم الخطي"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>مقارنة منقسمة</span>
                </button>

                <button
                  id="preview-mode-mask"
                  onClick={() => setPreviewMode('mask')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    previewMode === 'mask' 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="عرض قناع عزل الجسم عن الخلفية"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>عزل الخلفية</span>
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300">
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-amber-400">جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{aiStatusMessage}</span>
                  </>
                )}
              </div>
            </div>

            {/* Canvas Container with Checkerboard / White Background */}
            <div 
              className={`relative flex-1 w-full max-w-full flex items-center justify-center rounded-xl overflow-hidden border border-neutral-800/80 ${
                settings.backgroundMode === 'white' && previewMode === 'linesOnly'
                  ? 'bg-white'
                  : 'bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] bg-neutral-950'
              }`}
            >
              {sourceImg ? (
                <div className="relative max-h-full flex items-center justify-center">
                  <canvas
                    ref={previewCanvasRef}
                    onClick={handleCanvasClick}
                    className="max-h-[50vh] md:max-h-[60vh] max-w-full object-contain rounded shadow-lg cursor-crosshair"
                    title="اضغط على أي مكان في الجسم لاختياره يدوياً وتوجيه الذكاء الاصطناعي"
                  />

                  {/* Seed point indicator if user clicked */}
                  {settings.selectedSeedPoints.length > 0 && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-amber-500/90 text-neutral-950 text-[10px] font-bold shadow flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      <span>تم تحديد الجسم بنقرتك</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettings((p) => ({ ...p, selectedSeedPoints: [] }));
                        }}
                        className="mr-1 hover:text-white"
                        title="إلغاء التحديد اليدوي والعودة للتعرف التلقائي"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 text-amber-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-200 mb-1">
                    قم برفع صورة لتحويلها إلى رسم خطوط بالذكاء الاصطناعي
                  </p>
                  <p className="text-xs text-neutral-500 mb-4 max-w-sm">
                    مناسب للأشخاص، الوجوه، الحيوانات، السيارات، والمنتجات
                  </p>
                  <button
                    onClick={() => hiddenFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>اختر صورة من جهازك</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hint bar */}
            <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 mt-2 px-1">
              <div className="flex items-center gap-1.5 text-amber-400/90">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>نصيحة: انقر مباشرة على الجسم في الصورة لعزله وتحديده بدقة إذا احتوت الصورة على عناصر متعددة</span>
              </div>
              <div>
                <span>الأبعاد: {sourceImg ? `${sourceImg.naturalWidth || sourceImg.width} × ${sourceImg.naturalHeight || sourceImg.height}` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: AI Line Drawing Controls & Settings */}
          <div className="w-full md:w-84 lg:w-96 flex flex-col bg-neutral-900 border-t md:border-t-0 md:border-r border-neutral-800 overflow-y-auto custom-scrollbar p-4 gap-3.5">
            {/* 1. Detail Level (مستوى التفاصيل): بسيط جدًا / بسيط / متوسط */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>مستوى التفاصيل (Detail Level):</span>
                </label>
                <span className="text-[10px] text-amber-400/80 font-medium">الافتراضي: بسيط جدًا</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSettings((p) => ({ ...p, detailLevel: 'very_simple' }))}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all ${
                    settings.detailLevel === 'very_simple'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="الخط الخارجي الأساسي وأهم الخطوط الهيكلية فقط (بداية رسم مبسط)"
                >
                  <Feather className="w-4 h-4 mb-1" />
                  <span>بسيط جدًا (افتراضي)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((p) => ({ ...p, detailLevel: 'simple' }))}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all ${
                    settings.detailLevel === 'simple'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="الـOutline + الخطوط الأساسية للجسم والملامح"
                >
                  <PenTool className="w-4 h-4 mb-1" />
                  <span>بسيط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((p) => ({ ...p, detailLevel: 'medium' }))}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all ${
                    settings.detailLevel === 'medium'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="الـOutline + الخطوط الأساسية مع ثنيات الملابس الرئيسية"
                >
                  <Sliders className="w-4 h-4 mb-1" />
                  <span>متوسط</span>
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                {settings.detailLevel === 'very_simple' && '• رسم مبسط جدًا: الـ Outline الخارجي والخطوط الأساسية فقط بدون تفاصيل دقيقة.'}
                {settings.detailLevel === 'simple' && '• رسم بسيط: الـ Outline مع ملامح الوجه والأطراف الأساسية.'}
                {settings.detailLevel === 'medium' && '• رسم متوسط: يتضمن الخطوط الهيكلية الرئيسية وثنيات الملابس.'}
              </p>
            </div>

            {/* Sliders and Controls Box */}
            <div className="space-y-3 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
              {/* 2. Line Thickness (1 - 10 px) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>سمك القلم:</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    {settings.lineThickness} بكسل
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.lineThickness}
                  onChange={(e) => setSettings((p) => ({ ...p, lineThickness: Number(e.target.value) }))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 mt-0.5">
                  <span>دقيق (1px)</span>
                  <span>قلم رصاص (2-3px)</span>
                  <span>عريض (10px)</span>
                </div>
              </div>

              {/* 3. Line Color */}
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  لون الخط:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    {['#000000', '#1c1917', '#1e293b', '#3b250c', '#1e3a8a', '#831843'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, lineColor: c }))}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          settings.lineColor.toLowerCase() === c.toLowerCase()
                            ? 'scale-125 border-amber-400 ring-2 ring-amber-500/40'
                            : 'border-neutral-700 hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={settings.lineColor}
                      onChange={(e) => setSettings((p) => ({ ...p, lineColor: e.target.value }))}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-neutral-300 uppercase">
                      {settings.lineColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Line Opacity (0 - 100%) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-neutral-200">شفافية الخط:</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    {settings.lineOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.lineOpacity}
                  onChange={(e) => setSettings((p) => ({ ...p, lineOpacity: Number(e.target.value) }))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 5. Line Smoothing (منخفض / متوسط / مرتفع) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  تنعيم الخط (Line Smoothing):
                </label>
                <div className="grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs text-center">
                  {(['low', 'medium', 'high'] as SmoothingLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, smoothing: lvl }))}
                      className={`py-1 rounded font-medium transition-all ${
                        settings.smoothing === lvl
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {lvl === 'low' ? 'منخفض' : lvl === 'medium' ? 'متوسط' : 'مرتفع وناعم'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Clean Lines Toggle (تنظيف الخطوط) */}
              <div className="pt-1">
                <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">
                        تنظيف الخطوط (Clean Lines)
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        حذف الخطوط الصغيرة والنقاط العشوائية والتشويش
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cleanLines}
                    onChange={(e) => setSettings((p) => ({ ...p, cleanLines: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                </label>
              </div>

              {/* 7. Background Mode: Transparent vs White */}
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  خلفية الرسم:
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSettings((p) => ({ ...p, backgroundMode: 'transparent' }))}
                    className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                      settings.backgroundMode === 'transparent'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    خلفية شفافة (للرسم والتلوين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((p) => ({ ...p, backgroundMode: 'white' }))}
                    className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                      settings.backgroundMode === 'white'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    خلفية بيضاء ورقية
                  </button>
                </div>
              </div>
            </div>

            {/* Layer Output Settings Box */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 text-xs">
              <span className="font-bold text-neutral-200 block mb-2">
                هيكل الطبقات (Non-Destructive Layers):
              </span>
              <div className="space-y-1.5 text-neutral-400 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeOriginalImage}
                    onChange={(e) => setSettings((p) => ({ ...p, includeOriginalImage: e.target.checked }))}
                    className="accent-amber-500 rounded"
                  />
                  <span>
                    الطبقة 1 (السفلية): <strong className="text-neutral-200">الصورة الأصلية</strong> بدقتها الكاملة
                  </span>
                </label>

                <div className="flex items-center gap-2 text-amber-400/90 pl-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>
                    الطبقة 2 (العلوية): <strong className="text-amber-400">الرسم الخطي بالذكاء الاصطناعي</strong> (شفافة)
                  </span>
                </div>
              </div>
            </div>

            {/* Re-process Button */}
            <button
              id="ai-reprocess-drawing-btn"
              type="button"
              disabled={isProcessing || !sourceImg}
              onClick={handleServerAIReprocess}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs border border-amber-500/20 hover:border-amber-500/40 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>إعادة التحليل بالذكاء الاصطناعي</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-950 border-t border-neutral-800">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>سيتم إنشاء طبقة رسم خطي مستقلة تتيح لك إكمال وتلوين الرسم بحرية تامة</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="ai-drawing-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>

            <button
              id="ai-drawing-apply-btn"
              disabled={!sourceImg || isProcessing}
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق وإضافة الطبقات للرسم</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

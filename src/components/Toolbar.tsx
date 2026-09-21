import React, { useState } from 'react';
import { ToolType, ShapeOptions, BrushSettings } from '../types';
import { isShapeTool } from '../utils/shapeDrawer';
import { 
  Paintbrush, 
  Pencil, 
  PenTool, 
  Eraser, 
  Trash2,
  PaintBucket, 
  Pipette, 
  Move, 
  Shapes, 
  Square, 
  Circle, 
  Minus, 
  ArrowUpRight, 
  ArrowLeftRight,
  Pentagon, 
  Hexagon,
  Octagon,
  Triangle,
  Diamond,
  Star,
  Heart,
  Moon,
  RectangleHorizontal,
  Sparkles,
  Image as ImageIcon,
  ChevronDown,
  X,
  Spline,
  Waves,
  MessageSquare,
  Cloud,
  Plus,
  Check
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  shapeOptions: ShapeOptions;
  onUpdateShapeOptions: (opts: ShapeOptions) => void;
  brushSettings?: BrushSettings;
  onUpdateBrushSettings?: (patch: Partial<BrushSettings>) => void;
  onOpenLineArtModal: () => void;
  onOpenImageUpload: () => void;
  onClearPage?: () => void;
  isMobile?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  shapeOptions,
  onUpdateShapeOptions,
  brushSettings,
  onUpdateBrushSettings,
  onOpenLineArtModal,
  onOpenImageUpload,
  onClearPage,
  isMobile = false,
}) => {
  const [showShapesMenu, setShowShapesMenu] = useState<boolean>(false);
  const [showEraserMenu, setShowEraserMenu] = useState<boolean>(false);
  const [selectedShapeCategory, setSelectedShapeCategory] = useState<string>('الكل');

  const isShapeToolActive = isShapeTool(activeTool);
  const currentEraserSize = brushSettings?.size ?? 25;

  const handleSelectShape = (shape: ToolType) => {
    onSelectTool(shape);
    setShowShapesMenu(false);
  };

  const handleEraserClick = () => {
    onSelectTool('eraser');
    setShowEraserMenu(true);
    setShowShapesMenu(false);
  };

  const handleSetEraserSize = (size: number, closeMenuImmediately: boolean = false) => {
    const clamped = Math.max(1, Math.min(200, size));
    onUpdateBrushSettings?.({ size: clamped });
    onSelectTool('eraser');
    if (closeMenuImmediately) {
      setShowEraserMenu(false);
    }
  };

  const handleSetEraserHardness = (hardness: number) => {
    onUpdateBrushSettings?.({ hardness });
  };

  const ERASER_PRESET_SIZES = [5, 10, 20, 30, 50, 75, 100, 150, 200];

  const mainTools = [
    { id: 'brush' as ToolType, name: 'فرشاة تلوين', icon: Paintbrush, shortcut: 'B' },
    { id: 'pencil' as ToolType, name: 'قلم رصاص', icon: Pencil, shortcut: 'P' },
    { id: 'ink' as ToolType, name: 'قلم حبر', icon: PenTool, shortcut: 'N' },
    { id: 'eraser' as ToolType, name: 'مسح الأجزاء (الممحاة)', icon: Eraser, shortcut: 'E' },
    { id: 'fill' as ToolType, name: 'دلو التعبئة', icon: PaintBucket, shortcut: 'G' },
    { id: 'eyedropper' as ToolType, name: 'قطّارة الألوان', icon: Pipette, shortcut: 'I' },
    { id: 'move' as ToolType, name: 'تحريك وملاحة', icon: Move, shortcut: 'V' },
  ];

  const allShapes: {
    id: ToolType;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    category: 'أساسية' | 'مضلعات' | 'منحنيات وأسهم' | 'رموز';
  }[] = [
    // الأساسية
    { id: 'rectangle', name: 'مستطيل', icon: Square, category: 'أساسية' },
    { id: 'square', name: 'مربع متساوي', icon: Square, category: 'أساسية' },
    { id: 'rounded_rectangle', name: 'مستطيل مستدير', icon: RectangleHorizontal, category: 'أساسية' },
    { id: 'circle', name: 'دائرة منتظمة', icon: Circle, category: 'أساسية' },
    { id: 'ellipse', name: 'شكل بيضاوي', icon: Circle, category: 'أساسية' },

    // مضلعات ومثلثات
    { id: 'hexagon', name: 'سداسي الأضلاع', icon: Hexagon, category: 'مضلعات' },
    { id: 'pentagon', name: 'خماسي الأضلاع', icon: Pentagon, category: 'مضلعات' },
    { id: 'heptagon', name: 'سباعي الأضلاع', icon: Hexagon, category: 'مضلعات' },
    { id: 'octagon', name: 'ثماني الأضلاع', icon: Octagon, category: 'مضلعات' },
    { id: 'nonagon', name: 'تساعي الأضلاع', icon: Octagon, category: 'مضلعات' },
    { id: 'decagon', name: 'عشاري الأضلاع', icon: Octagon, category: 'مضلعات' },
    { id: 'polygon', name: 'مضلع مخصص', icon: Pentagon, category: 'مضلعات' },
    { id: 'triangle', name: 'مثلث متساوي', icon: Triangle, category: 'مضلعات' },
    { id: 'right_triangle', name: 'مثلث قائم', icon: Triangle, category: 'مضلعات' },
    { id: 'diamond', name: 'معين هندسي', icon: Diamond, category: 'مضلعات' },
    { id: 'trapezoid', name: 'شبه منحرف', icon: Square, category: 'مضلعات' },
    { id: 'parallelogram', name: 'متوازي أضلاع', icon: Square, category: 'مضلعات' },

    // منحنيات، أسهم وبيزييه
    { id: 'bezier_curve', name: 'منحنى بيزييه', icon: Spline, category: 'منحنيات وأسهم' },
    { id: 'cubic_bezier', name: 'منحنى S تكعيبي', icon: Spline, category: 'منحنيات وأسهم' },
    { id: 'arrow', name: 'سهم متجه', icon: ArrowUpRight, category: 'منحنيات وأسهم' },
    { id: 'double_arrow', name: 'سهم مزدوج', icon: ArrowLeftRight, category: 'منحنيات وأسهم' },
    { id: 'curved_arrow', name: 'سهم منحني', icon: ArrowUpRight, category: 'منحنيات وأسهم' },
    { id: 'block_arrow', name: 'سهم عريض مصمت', icon: ArrowUpRight, category: 'منحنيات وأسهم' },
    { id: 'line', name: 'خط مستقيم', icon: Minus, category: 'منحنيات وأسهم' },
    { id: 'arc', name: 'قوس دائري', icon: Spline, category: 'منحنيات وأسهم' },
    { id: 'wave', name: 'موجة متعرجة', icon: Waves, category: 'منحنيات وأسهم' },
    { id: 'spiral', name: 'حلزوني', icon: Spline, category: 'منحنيات وأسهم' },

    // رموز وأشكال توضيحية
    { id: 'star', name: 'نجمة', icon: Star, category: 'رموز' },
    { id: 'heart', name: 'قلب', icon: Heart, category: 'رموز' },
    { id: 'crescent', name: 'هلال', icon: Moon, category: 'رموز' },
    { id: 'speech_bubble', name: 'فقاعة حوار', icon: MessageSquare, category: 'رموز' },
    { id: 'cloud', name: 'سحابة', icon: Cloud, category: 'رموز' },
    { id: 'cross', name: 'إشارة زائد / صليب', icon: Plus, category: 'رموز' },
  ];

  const categories = ['الكل', 'أساسية', 'مضلعات', 'منحنيات وأسهم', 'رموز'] as const;

  const filteredShapes = selectedShapeCategory === 'الكل'
    ? allShapes
    : allShapes.filter((s) => s.category === selectedShapeCategory);

  // Shapes Option Controls Box
  const renderShapeConfigOptions = () => (
    <div className="pt-2 border-t border-neutral-800 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={shapeOptions.fill}
            onChange={(e) =>
              onUpdateShapeOptions({ ...shapeOptions, fill: e.target.checked })
            }
            className="rounded border-neutral-700 text-amber-500 bg-neutral-800 accent-amber-500"
          />
          <span>تعبئة (Fill)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={shapeOptions.stroke}
            onChange={(e) =>
              onUpdateShapeOptions({ ...shapeOptions, stroke: e.target.checked })
            }
            className="rounded border-neutral-700 text-amber-500 bg-neutral-800 accent-amber-500"
          />
          <span>حد (Stroke)</span>
        </label>
      </div>

      {/* Stroke width */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>سمك الحد</span>
          <span className="font-mono text-neutral-200">{shapeOptions.strokeWidth}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="40"
          value={shapeOptions.strokeWidth}
          onChange={(e) =>
            onUpdateShapeOptions({
              ...shapeOptions,
              strokeWidth: Number(e.target.value),
            })
          }
          className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
        />
      </div>

      {/* منحنيات بيزييه والأسهم المنحنية: نسبة الانحناء */}
      {(activeTool === 'bezier_curve' || activeTool === 'cubic_bezier' || activeTool === 'curved_arrow') && (
        <div className="space-y-1 pt-1 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>درجة انحناء بيزييه</span>
            <span className="font-mono text-neutral-200">{shapeOptions.curveCurvature ?? 45}%</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={shapeOptions.curveCurvature ?? 45}
            onChange={(e) =>
              onUpdateShapeOptions({
                ...shapeOptions,
                curveCurvature: Number(e.target.value),
              })
            }
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      )}

      {/* Special options for specific shapes */}
      {activeTool === 'rounded_rectangle' && (
        <div className="space-y-1 pt-1 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>نصف قطر الاستدارة</span>
            <span className="font-mono text-neutral-200">{shapeOptions.cornerRadius || 16}px</span>
          </div>
          <input
            type="range"
            min="2"
            max="60"
            value={shapeOptions.cornerRadius || 16}
            onChange={(e) =>
              onUpdateShapeOptions({
                ...shapeOptions,
                cornerRadius: Number(e.target.value),
              })
            }
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      )}

      {activeTool === 'polygon' && (
        <div className="space-y-1 pt-1 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>عدد أضلاع المضلع</span>
            <span className="font-mono text-neutral-200">{shapeOptions.polygonSides || 6}</span>
          </div>
          <input
            type="range"
            min="3"
            max="20"
            value={shapeOptions.polygonSides || 6}
            onChange={(e) =>
              onUpdateShapeOptions({
                ...shapeOptions,
                polygonSides: Number(e.target.value),
              })
            }
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      )}

      {activeTool === 'star' && (
        <div className="space-y-1 pt-1 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>عدد رؤوس النجمة</span>
            <span className="font-mono text-neutral-200">{shapeOptions.starPoints || 5}</span>
          </div>
          <input
            type="range"
            min="3"
            max="16"
            value={shapeOptions.starPoints || 5}
            onChange={(e) =>
              onUpdateShapeOptions({
                ...shapeOptions,
                starPoints: Number(e.target.value),
              })
            }
            className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div 
          id="mobile-bottom-toolbar"
          className="flex items-center justify-around w-full py-2 px-2 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 text-neutral-300 z-30"
        >
          {mainTools.slice(0, 3).map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                id={`mobile-tool-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
                title={tool.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}

          {/* زر مسح الأجزاء (الممحاة) مع فتح قائمة الحجم */}
          <button
            id="mobile-tool-eraser"
            onClick={handleEraserClick}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeTool === 'eraser'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="مسح الأجزاء - اختيار الحجم والممحاة"
          >
            <Eraser className="w-5 h-5" />
          </button>

          {/* زر مسح محتوى الطبقة المحددة */}
          {onClearPage && (
            <button
              id="mobile-clear-page-btn"
              onClick={onClearPage}
              className="p-2.5 rounded-xl flex flex-col items-center gap-1 text-neutral-400 hover:text-red-400 hover:bg-red-500/15 active:scale-95 transition-all"
              title="مسح محتوى الطبقة المحددة (مع إمكانية التراجع)"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Shapes trigger button */}
          <button
            id="mobile-shapes-trigger-btn"
            onClick={() => {
              setShowShapesMenu(true);
              setShowEraserMenu(false);
            }}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${
              isShapeToolActive
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="الأشكال الهندسية والمنحنيات"
          >
            <Shapes className="w-5 h-5" />
          </button>

          {/* Quick Line Art button */}
          <button
            id="mobile-lineart-trigger-btn"
            onClick={onOpenLineArtModal}
            className="p-2.5 rounded-xl flex flex-col items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all"
            title="تحويل الصورة إلى خطوط"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Eraser Size Modal / Drawer */}
        {showEraserMenu && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
            <div 
              id="mobile-eraser-drawer"
              className="w-full max-h-[85vh] bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-4 overflow-y-auto space-y-3.5 text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Eraser className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm text-neutral-100">إعدادات وحجم الممحاة</span>
                </div>
                <button 
                  onClick={() => setShowEraserMenu(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current size indicator badge */}
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-400">الحجم المختار:</span>
                <span className="text-sm font-bold font-mono text-amber-400 bg-amber-500/10 px-3 py-0.5 rounded-lg border border-amber-500/30">
                  حجم الممحاة: {currentEraserSize} px
                </span>
              </div>

              {/* Visual Live Preview of Eraser footprint */}
              <div className="flex flex-col items-center justify-center p-3 bg-neutral-950/50 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-500 mb-2">معاينة مساحة المسح الحقيقية:</div>
                <div className="flex items-center justify-center w-20 h-20 relative border border-dashed border-neutral-700/60 rounded-full bg-neutral-900/60">
                  <div
                    className="rounded-full border-2 border-red-400 bg-red-500/25 transition-all duration-75 shadow-md shadow-red-500/30"
                    style={{
                      width: `${Math.min(76, Math.max(4, (currentEraserSize / 200) * 76))}px`,
                      height: `${Math.min(76, Math.max(4, (currentEraserSize / 200) * 76))}px`,
                    }}
                  />
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>شريط التمرير (1 px - 200 px):</span>
                  <span className="font-mono text-amber-400 font-bold">{currentEraserSize} px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={currentEraserSize}
                  onChange={(e) => handleSetEraserSize(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-800 h-2 rounded cursor-pointer"
                />
              </div>

              {/* Preset Sizes */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-400 font-medium">أحجام سريعة ومباشرة (تفعيل فوري):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {ERASER_PRESET_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSetEraserSize(s, true)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-medium transition-all ${
                        currentEraserSize === s
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700/60'
                      }`}
                    >
                      {s} px
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardness options */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                <span className="text-neutral-400">نوع حواف الممحاة:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleSetEraserHardness(1.0)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      (brushSettings?.hardness ?? 0.8) >= 0.85
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    حادة (صلبة)
                  </button>
                  <button
                    onClick={() => handleSetEraserHardness(0.5)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      (brushSettings?.hardness ?? 0.8) < 0.85
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    ناعمة (متدرجة)
                  </button>
                </div>
              </div>

              {/* Confirm / Start Erasing Button */}
              <button
                onClick={() => {
                  onSelectTool('eraser');
                  setShowEraserMenu(false);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد وبدء المسح</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Shapes Modal / Drawer */}
        {showShapesMenu && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
            <div 
              id="mobile-shapes-drawer"
              className="w-full max-h-[85vh] bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-4 overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <Shapes className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-neutral-100">الأشكال الهندسية والمنحنيات</span>
                </div>
                <button 
                  onClick={() => setShowShapesMenu(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedShapeCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      selectedShapeCategory === cat
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Shapes grid */}
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredShapes.map((shape) => {
                  const Icon = shape.icon;
                  const isActive = activeTool === shape.id;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => handleSelectShape(shape.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all ${
                        isActive
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-neutral-800/70 border-neutral-700/60 text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] truncate">{shape.name}</span>
                    </button>
                  );
                })}
              </div>

              {renderShapeConfigOptions()}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div 
      id="desktop-primary-toolbar"
      className="flex flex-col items-center gap-2 p-2 bg-neutral-900 border-l border-neutral-800 h-full w-16 z-20 select-none"
    >
      {/* Primary Drawing Tools */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {mainTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const isEraserTool = tool.id === 'eraser';

          return (
            <React.Fragment key={tool.id}>
              <div className="relative">
                <button
                  id={`tool-btn-${tool.id}`}
                  onClick={() => {
                    if (isEraserTool) {
                      handleEraserClick();
                    } else {
                      onSelectTool(tool.id);
                      setShowEraserMenu(false);
                      setShowShapesMenu(false);
                    }
                  }}
                  className={`relative group p-2.5 rounded-xl w-11 h-11 flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/25 font-bold'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                  }`}
                  title={`${tool.name} (${tool.shortcut})`}
                >
                  <Icon className="w-5 h-5" />

                  {isEraserTool && (
                    <span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono font-bold text-neutral-400 group-hover:text-neutral-200">
                      {currentEraserSize}
                    </span>
                  )}

                  {/* Tooltip */}
                  <div className="absolute right-full mr-2 hidden group-hover:flex items-center px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    <span>{tool.name}</span>
                    <span className="mr-1.5 px-1 py-0.2 bg-neutral-800 rounded text-[10px] text-neutral-400 font-mono">
                      {tool.shortcut}
                    </span>
                  </div>
                </button>

                {/* Eraser Size Selector Dropdown / Popover for Desktop */}
                {isEraserTool && showEraserMenu && (
                  <div 
                    id="desktop-eraser-size-popover"
                    className="absolute right-full mr-3 top-0 w-72 p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 space-y-3 text-neutral-200 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Eraser className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs text-neutral-100">إعدادات وحجم الممحاة</span>
                      </div>
                      <button
                        onClick={() => setShowEraserMenu(false)}
                        className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Current Size Display */}
                    <div className="bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">الحجم المختار:</span>
                      <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        حجم الممحاة: {currentEraserSize} px
                      </span>
                    </div>

                    {/* Visual footprint preview circle */}
                    <div className="flex flex-col items-center justify-center p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                      <div className="text-[10px] text-neutral-500 mb-1.5">معاينة مساحة المسح الحقيقية:</div>
                      <div className="flex items-center justify-center w-16 h-16 relative border border-dashed border-neutral-700/60 rounded-full bg-neutral-900/50">
                        <div
                          className="rounded-full border-2 border-red-400 bg-red-500/25 transition-all duration-75 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                          style={{
                            width: `${Math.min(60, Math.max(4, (currentEraserSize / 200) * 60))}px`,
                            height: `${Math.min(60, Math.max(4, (currentEraserSize / 200) * 60))}px`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-300">
                        <span>شريط التمرير (1 - 200 px):</span>
                        <span className="font-mono text-amber-400 font-bold">{currentEraserSize} px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="200"
                        step="1"
                        value={currentEraserSize}
                        onChange={(e) => handleSetEraserSize(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
                      />
                    </div>

                    {/* Preset Size Grid (5, 10, 20, 30, 50, 75, 100, 150, 200) */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-400 font-medium">أحجام سريعة ومباشرة (تفعيل فوري):</span>
                      <div className="grid grid-cols-3 gap-1">
                        {ERASER_PRESET_SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSetEraserSize(s, true)}
                            className={`py-1 px-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                              currentEraserSize === s
                                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                                : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-750'
                            }`}
                          >
                            {s} px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hardness selector */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800 text-[11px]">
                      <span className="text-neutral-400">نوع المسح:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSetEraserHardness(1.0)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                            (brushSettings?.hardness ?? 0.8) >= 0.85
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          حادة
                        </button>
                        <button
                          onClick={() => handleSetEraserHardness(0.5)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                            (brushSettings?.hardness ?? 0.8) < 0.85
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          ناعمة
                        </button>
                      </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                      onClick={() => {
                        onSelectTool('eraser');
                        setShowEraserMenu(false);
                      }}
                      className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تأكيد وبدء المسح</span>
                    </button>
                  </div>
                )}
              </div>

              {/* زر مسح محتوى الطبقة المحددة مباشرة بجوار أداة الممحاة */}
              {tool.id === 'eraser' && onClearPage && (
                <button
                  id="tool-btn-clear-page"
                  onClick={onClearPage}
                  className="relative group p-2.5 rounded-xl w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-500/15 active:scale-95 transition-all"
                  title="مسح محتوى الطبقة المحددة (مع إمكانية التراجع)"
                >
                  <Trash2 className="w-5 h-5" />

                  {/* Tooltip */}
                  <div className="absolute right-full mr-2 hidden group-hover:flex items-center px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    <span>مسح محتوى الطبقة المحددة</span>
                  </div>
                </button>
              )}
            </React.Fragment>
          );
        })}

        {/* Shapes Dropdown Menu */}
        <div className="relative">
          <button
            id="shapes-menu-toggle-btn"
            onClick={() => setShowShapesMenu(!showShapesMenu)}
            className={`relative group p-2.5 rounded-xl w-11 h-11 flex items-center justify-center transition-all ${
              isShapeToolActive
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/25 font-bold'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
            title="جميع الأشكال الهندسية والمنحنيات"
          >
            <Shapes className="w-5 h-5" />
            <ChevronDown className="w-2.5 h-2.5 absolute bottom-1 left-1 opacity-70" />
          </button>

          {showShapesMenu && (
            <div 
              id="shapes-dropdown-popup"
              className="absolute right-full mr-3 top-0 w-84 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 space-y-3 text-neutral-200 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <Shapes className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-neutral-100">الأشكال الهندسية والمنحنيات</span>
                </div>
                <button
                  onClick={() => setShowShapesMenu(false)}
                  className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category selector pills */}
              <div className="flex gap-1 bg-neutral-950/60 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedShapeCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      selectedShapeCategory === cat
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of all shapes */}
              <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {filteredShapes.map((shape) => {
                  const Icon = shape.icon;
                  const isActive = activeTool === shape.id;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => handleSelectShape(shape.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                        isActive
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-neutral-800/60 border-neutral-750/70 hover:bg-neutral-800 hover:border-neutral-600 text-neutral-300'
                      }`}
                      title={shape.name}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate w-full">{shape.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shape options: fill, stroke, width, specific sliders */}
              {renderShapeConfigOptions()}
            </div>
          )}
        </div>
      </div>

      <div className="w-8 h-[1px] bg-neutral-800 my-1" />

      {/* Prominent Image & Outline Extraction Buttons */}
      <div className="flex flex-col items-center gap-2 w-full mt-auto mb-2">
        {/* Upload Image Button */}
        <button
          id="toolbar-upload-image-btn"
          onClick={onOpenImageUpload}
          className="group relative p-2.5 rounded-xl w-11 h-11 flex items-center justify-center text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 border border-neutral-800 transition-all"
          title="رفع صورة"
        >
          <ImageIcon className="w-5 h-5" />
          <div className="absolute right-full mr-2 hidden group-hover:flex items-center px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
            <span>رفع صورة إلى العمل</span>
          </div>
        </button>

        {/* Feature Button: Line Art / Outline extraction */}
        <button
          id="toolbar-lineart-extract-btn"
          onClick={onOpenLineArtModal}
          className="group relative p-2.5 rounded-xl w-11 h-11 flex items-center justify-center bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-neutral-950 transition-all shadow-lg shadow-amber-500/10"
          title="استخراج الحدود والـ Line Art"
        >
          <Sparkles className="w-5 h-5" />
          <div className="absolute right-full mr-2 hidden group-hover:flex items-center px-2.5 py-1 bg-neutral-950 border border-amber-500/30 text-amber-300 text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none font-bold">
            <span>تحويل الصورة إلى خطوط (Line Art)</span>
          </div>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  X, 
  Settings, 
  Ruler, 
  Grid, 
  Lock, 
  Unlock, 
  Sun, 
  Moon, 
  Trash2, 
  Sliders, 
  Check, 
  Maximize2,
  HelpCircle
} from 'lucide-react';
import { RulerUnit, GuideLine } from '../types';

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Ruler settings
  showRulers: boolean;
  onToggleRulers: () => void;
  rulerUnit: RulerUnit;
  onChangeRulerUnit: (unit: RulerUnit) => void;
  showRulerCursor: boolean;
  onToggleRulerCursor: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  guides: GuideLine[];
  onClearGuides: () => void;
  // Grid
  showGrid: boolean;
  onToggleGrid: () => void;
  // Canvas viewport lock
  isCanvasLocked: boolean;
  onToggleLockCanvas: () => void;
  // Theme
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  // Canvas Info & resize trigger
  canvasWidth: number;
  canvasHeight: number;
  dpi: number;
  onOpenResizeModal: () => void;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  isOpen,
  onClose,
  showRulers,
  onToggleRulers,
  rulerUnit,
  onChangeRulerUnit,
  showRulerCursor,
  onToggleRulerCursor,
  showGuides,
  onToggleGuides,
  guides,
  onClearGuides,
  showGrid,
  onToggleGrid,
  isCanvasLocked,
  onToggleLockCanvas,
  isDarkMode,
  onToggleDarkMode,
  canvasWidth,
  canvasHeight,
  dpi,
  onOpenResizeModal,
}) => {
  if (!isOpen) return null;

  const units: { id: RulerUnit; name: string; desc: string }[] = [
    { id: 'px', name: 'بكسل (px)', desc: 'الوحدة الرقمية الأساسية للتصميم والشاشات' },
    { id: 'cm', name: 'سنتيمتر (cm)', desc: 'مناسبة للطباعة والمقاسات الورقية والمادية' },
    { id: 'mm', name: 'مليمتر (mm)', desc: 'للتصميم الهندسي والمقاسات الدقيقة جداً' },
    { id: 'in', name: 'بوصة (in)', desc: 'المقاييس الإنجليزية للطباعة 300 DPI' },
  ];

  return (
    <div 
      id="canvas-settings-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        id="canvas-settings-dialog"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">إعدادات مساحة الرسم والمساطر</h3>
              <p className="text-[11px] text-neutral-400">التحكم في المساطر الديناميكية، القياس، والشبكة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Section: Dynamic Rulers */}
          <div className="bg-neutral-950/50 border border-neutral-800/90 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${showRulers ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-neutral-200">المسطرة الديناميكية (Dynamic Rulers)</span>
                  <p className="text-[11px] text-neutral-400">عرض مساطر أفقية وعمودية على حواف مساحة الرسم تتكيف مع التكبير والتحريك</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={onToggleRulers}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showRulers ? 'bg-blue-600' : 'bg-neutral-700'
                }`}
                role="switch"
                aria-checked={showRulers}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showRulers ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Ruler Options (Sub-controls if enabled) */}
            {showRulers && (
              <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                {/* Unit Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    وحدة القياس للمسطرة:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {units.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => onChangeRulerUnit(u.id)}
                        className={`px-2.5 py-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          rulerUnit === u.id
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold shadow-sm'
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <span className="text-xs">{u.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub Options Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Cursor Indicator Toggle */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:bg-neutral-850 transition-colors">
                    <input
                      type="checkbox"
                      checked={showRulerCursor}
                      onChange={onToggleRulerCursor}
                      className="w-4 h-4 rounded text-blue-500 bg-neutral-800 border-neutral-700 focus:ring-0 focus:outline-none"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-200">مؤشر التتبع التفاعلي</span>
                      <span className="text-[10px] text-neutral-400">تحديد موقع الفأرة المباشر على المسطرة</span>
                    </div>
                  </label>

                  {/* Guides Toggle */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:bg-neutral-850 transition-colors">
                    <input
                      type="checkbox"
                      checked={showGuides}
                      onChange={onToggleGuides}
                      className="w-4 h-4 rounded text-blue-500 bg-neutral-800 border-neutral-700 focus:ring-0 focus:outline-none"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-200">خطوط الإرشاد (Guides)</span>
                      <span className="text-[10px] text-neutral-400">السحب من المسطرة لإسقاط خط إرشادي</span>
                    </div>
                  </label>
                </div>

                {/* Active Guides Management */}
                {guides.length > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800 text-[11px]">
                    <span className="text-neutral-300">
                      يوجد <strong className="text-cyan-400">{guides.length}</strong> خط إرشادي نشط على مساحة الرسم
                    </span>
                    <button
                      type="button"
                      onClick={onClearGuides}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Grid & Lock Viewport */}
          <div className="bg-neutral-950/50 border border-neutral-800/90 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-neutral-300 block mb-1">بيئة العرض والمساعدة</span>
            
            {/* Grid Toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${showGrid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-neutral-200">شبكة الرسم (Grid)</span>
                  <p className="text-[11px] text-neutral-400">إظهار شبكة مربعات مساعدة لتوزيع العناصر</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleGrid}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showGrid ? 'bg-blue-600' : 'bg-neutral-700'
                }`}
                role="switch"
                aria-checked={showGrid}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showGrid ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Lock Canvas Viewport */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-850">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isCanvasLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                  {isCanvasLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-semibold text-neutral-200">تثبيت الورقة (Lock Viewport)</span>
                  <p className="text-[11px] text-neutral-400">منع تحريك أو تكبير مساحة الرسم أثناء استخدام القلم أو الفأرة</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleLockCanvas}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCanvasLocked ? 'bg-amber-600' : 'bg-neutral-700'
                }`}
                role="switch"
                aria-checked={isCanvasLocked}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isCanvasLocked ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-800 text-neutral-400">
                  {isDarkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <span className="font-semibold text-neutral-200">المظهر (Theme)</span>
                  <p className="text-[11px] text-neutral-400">{isDarkMode ? 'الوضع الداكن (Dark Studio)' : 'الوضع الفاتح (Light Mode)'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
              >
                {isDarkMode ? 'تفعيل الفاتح' : 'تفعيل الداكن'}
              </button>
            </div>
          </div>

          {/* Section: Canvas Dimensions & Quick Resize Link */}
          <div className="p-4 bg-neutral-950/40 border border-neutral-800/80 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-xs text-neutral-200">مقاسات مساحة الرسم الحالية</span>
              <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                {canvasWidth} × {canvasHeight} بكسل | {dpi} نقطة لكل بوصة (DPI)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResizeModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>تغيير الأبعاد</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80">
          <div className="text-[11px] text-neutral-500">
            اختصار المسطرة السريع: <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-neutral-400 border border-neutral-700">Ctrl + R</kbd>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

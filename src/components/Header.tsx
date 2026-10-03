import React, { useState } from 'react';
import { 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Grid, 
  Download, 
  Save, 
  FolderOpen, 
  Plus, 
  Sparkles, 
  Sun, 
  Moon, 
  HelpCircle,
  Menu,
  X,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';
import { CanvasTransform } from '../types';

interface HeaderProps {
  projectTitle: string;
  onRenameProjectTitle: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  onResetView: () => void;
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNewProject: () => void;
  onOpenProjectsManager: () => void;
  onSaveProject: () => void;
  onOpenExportModal: () => void;
  onOpenLineArtModal: () => void;
  onOpenShortcutsModal: () => void;
  activeSidePanel: 'brushes' | 'colors' | 'layers' | null;
  onToggleSidePanel: (panel: 'brushes' | 'colors' | 'layers') => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onOpenResizeModal: () => void;
  isCanvasLocked?: boolean;
  onToggleLockCanvas?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectTitle,
  onRenameProjectTitle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  transform,
  onTransformChange,
  onResetView,
  onFitToScreen,
  showGrid,
  onToggleGrid,
  isDarkMode,
  onToggleDarkMode,
  onOpenNewProject,
  onOpenProjectsManager,
  onSaveProject,
  onOpenExportModal,
  onOpenLineArtModal,
  onOpenShortcutsModal,
  activeSidePanel,
  onToggleSidePanel,
  isFullScreen,
  onToggleFullScreen,
  canvasWidth,
  canvasHeight,
  onOpenResizeModal,
  isCanvasLocked = false,
  onToggleLockCanvas,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>(projectTitle);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  const handleCommitTitle = () => {
    if (titleInput.trim()) {
      onRenameProjectTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header 
      id="main-app-header"
      className="flex items-center justify-between px-3 sm:px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-neutral-100 select-none z-30 h-14"
    >
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-neutral-950 font-black text-base shadow-md shadow-blue-500/20">
            ر
          </div>
          <span className="font-extrabold text-sm tracking-wide hidden sm:inline text-neutral-100">
            رَسّام
          </span>
        </div>

        <div className="h-5 w-[1px] bg-neutral-800 hidden sm:block" />

        {/* Project Title with inline editing */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-neutral-800 border border-blue-500 text-neutral-100 text-xs px-2 py-1 rounded-lg outline-none max-w-[150px] sm:max-w-[200px]"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(projectTitle);
                setIsEditingTitle(true);
              }}
              className="text-xs font-medium text-neutral-300 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-neutral-800/80 transition-colors truncate max-w-[120px] sm:max-w-[160px]"
              title="انقر لتعديل اسم المشروع"
            >
              {projectTitle}
            </button>
          )}

          {/* Sizing Badge */}
          <button
            onClick={onOpenResizeModal}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-blue-400 transition-colors cursor-pointer"
            title="انقر لضبط أبعاد ومقاسات الرسم الحالية"
          >
            <span className="text-[10px] font-mono font-bold tracking-wide">
              {canvasWidth} × {canvasHeight} px
            </span>
            <Settings className="w-3 h-3 text-neutral-500 hover:text-blue-400" />
          </button>

          {/* Lock / Freeze Canvas Viewport Button */}
          {onToggleLockCanvas && (
            <button
              id="header-lock-canvas-btn"
              onClick={onToggleLockCanvas}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isCanvasLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title={
                isCanvasLocked
                  ? 'الورقة مثبتة ومقفلة (انقر لإلغاء التثبيت وتفعيل التكبير والتحريك)'
                  : 'تثبيت الورقة (إلغاء ومنع التكبير والتصغير والتحريك أثناء الرسم)'
              }
            >
              {isCanvasLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-amber-300 font-bold hidden sm:inline">الورقة مثبتة</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[11px] text-neutral-300 hidden sm:inline">تثبيت الورقة</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center Group: Undo / Redo & Zoom Viewport Controls */}
      <div className="hidden md:flex items-center gap-1 bg-neutral-950/60 p-1 rounded-xl border border-neutral-800/80">
        <button
          id="header-undo-btn"
          disabled={!canUndo}
          onClick={onUndo}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="تراجع (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          id="header-redo-btn"
          disabled={!canRedo}
          onClick={onRedo}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="إعادة (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

        {/* Zoom Out */}
        <button
          id="header-zoom-out-btn"
          disabled={isCanvasLocked}
          onClick={() => onTransformChange({ ...transform, zoom: Math.max(0.1, transform.zoom * 0.85) })}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'تصغير'}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom percentage & Reset to 100% */}
        <button
          id="header-zoom-reset-btn"
          disabled={isCanvasLocked}
          onClick={onResetView}
          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-neutral-300 hover:text-blue-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'حجم 100%'}
        >
          {Math.round(transform.zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          id="header-zoom-in-btn"
          disabled={isCanvasLocked}
          onClick={() => onTransformChange({ ...transform, zoom: Math.min(20.0, transform.zoom * 1.15) })}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'تكبير'}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Fit to screen */}
        <button
          id="header-fit-screen-btn"
          disabled={isCanvasLocked}
          onClick={onFitToScreen}
          className="px-2 py-1 rounded-lg text-[11px] text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'ملاءمة للشاشة'}
        >
          ملاءمة
        </button>

        <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

        {/* Center lock view toggle button */}
        {onToggleLockCanvas && (
          <button
            id="header-center-lock-btn"
            onClick={onToggleLockCanvas}
            className={`p-1.5 rounded-lg transition-colors ${
              isCanvasLocked
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title={
              isCanvasLocked
                ? 'الورقة مثبتة: تم تعطيل التكبير والتصغير والتحريك (انقر لفتح القفل)'
                : 'تثبيت الورقة: منع التكبير والتصغير والتحريك أثناء الرسم'
            }
          >
            {isCanvasLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}

        <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

        {/* Grid toggle */}
        <button
          id="header-grid-toggle-btn"
          onClick={onToggleGrid}
          className={`p-1.5 rounded-lg transition-colors ${
            showGrid ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={showGrid ? 'إخفاء الشبكة' : 'إظهار الشبكة'}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Rotate Canvas 90deg */}
        <button
          id="header-rotate-canvas-btn"
          disabled={isCanvasLocked}
          onClick={() => onTransformChange({ ...transform, rotation: (transform.rotation + 90) % 360 })}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'تدوير مساحة الرسم 90 درجة'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Flip Horizontal */}
        <button
          id="header-flip-h-btn"
          disabled={isCanvasLocked}
          onClick={() => onTransformChange({ ...transform, flipH: !transform.flipH })}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            transform.flipH ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={isCanvasLocked ? 'الورقة مثبتة ومقفلة' : 'قلب أفقي للمعاينة'}
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Save project */}
        <button
          id="header-save-project-btn"
          onClick={onSaveProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          title="حفظ المشروع (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden md:inline">حفظ</span>
        </button>

        {/* Export image */}
        <button
          id="header-export-btn"
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          title="تصدير العمل كصورة"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير</span>
        </button>

        {/* Community Projects & Gallery button */}
        <button
          id="header-projects-mgr-btn"
          onClick={onOpenProjectsManager}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-amber-300 text-xs font-medium transition-all border border-neutral-750"
          title="معرض الفنانين والمشاريع المشتركة (Ctrl+O)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">معرض الرسامين</span>
        </button>

        {/* New Project */}
        <button
          id="header-new-project-btn"
          onClick={onOpenNewProject}
          className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors hidden sm:flex"
          title="مشروع جديد"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          id="header-fullscreen-btn"
          onClick={onToggleFullScreen}
          className={`p-2 rounded-xl transition-all hidden sm:flex ${
            isFullScreen
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
              : 'bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700'
          }`}
          title={isFullScreen ? 'الخروج من ملء الشاشة (F / Esc)' : 'عرض الموقع على الشاشة بأكملها (F)'}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Keyboard Shortcuts */}
        <button
          id="header-shortcuts-btn"
          onClick={onOpenShortcutsModal}
          className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors hidden sm:flex"
          title="اختصارات لوحة المفاتيح"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Side panels toggle buttons on mobile/tablet */}
        <div className="flex items-center gap-1 sm:hidden">
          {onToggleLockCanvas && (
            <button
              id="header-lock-canvas-btn-mobile"
              onClick={onToggleLockCanvas}
              className={`p-2 rounded-xl text-xs flex items-center justify-center transition-all ${
                isCanvasLocked
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title={isCanvasLocked ? 'الورقة مثبتة (انقر لإلغاء القفل)' : 'تثبيت الورقة ومنع الحركة'}
            >
              {isCanvasLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
          <button
            id="header-fullscreen-btn-mobile"
            onClick={onToggleFullScreen}
            className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-neutral-100 text-xs"
            title="ملء الشاشة"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onToggleSidePanel('brushes')}
            className={`p-2 rounded-xl text-xs ${
              activeSidePanel === 'brushes' ? 'bg-blue-600 text-white font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            فرش
          </button>
          <button
            onClick={() => onToggleSidePanel('colors')}
            className={`p-2 rounded-xl text-xs ${
              activeSidePanel === 'colors' ? 'bg-blue-600 text-white font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            ألوان
          </button>
          <button
            onClick={() => onToggleSidePanel('layers')}
            className={`p-2 rounded-xl text-xs ${
              activeSidePanel === 'layers' ? 'bg-blue-600 text-white font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            طبقات
          </button>
        </div>
      </div>
    </header>
  );
};

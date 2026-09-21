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
  FlipVertical
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-neutral-950 font-black text-base shadow-md shadow-amber-500/20">
            ر
          </div>
          <span className="font-extrabold text-sm tracking-wide hidden sm:inline text-neutral-100">
            رَسّام
          </span>
        </div>

        <div className="h-5 w-[1px] bg-neutral-800 hidden sm:block" />

        {/* Project Title with inline editing */}
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
            className="bg-neutral-800 border border-amber-500 text-neutral-100 text-xs px-2 py-1 rounded-lg outline-none max-w-[150px] sm:max-w-[200px]"
          />
        ) : (
          <button
            onClick={() => {
              setTitleInput(projectTitle);
              setIsEditingTitle(true);
            }}
            className="text-xs font-medium text-neutral-300 hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-neutral-800/80 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
            title="انقر لتعديل اسم المشروع"
          >
            {projectTitle}
          </button>
        )}
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
          onClick={() => onTransformChange({ ...transform, zoom: Math.max(0.1, transform.zoom * 0.85) })}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title="تصغير"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom percentage & Reset to 100% */}
        <button
          id="header-zoom-reset-btn"
          onClick={onResetView}
          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
          title="حجم 100%"
        >
          {Math.round(transform.zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          id="header-zoom-in-btn"
          onClick={() => onTransformChange({ ...transform, zoom: Math.min(20.0, transform.zoom * 1.15) })}
          className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title="تكبير"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Fit to screen */}
        <button
          id="header-fit-screen-btn"
          onClick={onFitToScreen}
          className="px-2 py-1 rounded-lg text-[11px] text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title="ملاءمة للشاشة"
        >
          ملاءمة
        </button>

        <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

        {/* Grid toggle */}
        <button
          id="header-grid-toggle-btn"
          onClick={onToggleGrid}
          className={`p-1.5 rounded-lg transition-colors ${
            showGrid ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={showGrid ? 'إخفاء الشبكة' : 'إظهار الشبكة'}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Rotate Canvas 90deg */}
        <button
          id="header-rotate-canvas-btn"
          onClick={() => onTransformChange({ ...transform, rotation: (transform.rotation + 90) % 360 })}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          title="تدوير مساحة الرسم 90 درجة"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Flip Horizontal */}
        <button
          id="header-flip-h-btn"
          onClick={() => onTransformChange({ ...transform, flipH: !transform.flipH })}
          className={`p-1.5 rounded-lg transition-colors ${
            transform.flipH ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="قلب أفقي للمعاينة"
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Highlighted AI Line Drawing Trigger Button */}
        <button
          id="header-lineart-btn"
          onClick={onOpenLineArtModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-neutral-950 text-xs font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
          title="تحويل الصورة إلى رسم خطوط Line Drawing نظيف وواضح بالذكاء الاصطناعي"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تحويل الصورة إلى خطوط</span>
          <span className="sm:hidden">تحويل إلى خطوط</span>
        </button>

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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          title="تصدير العمل كصورة"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير</span>
        </button>

        {/* Projects / New / Settings menu */}
        <button
          id="header-projects-mgr-btn"
          onClick={onOpenProjectsManager}
          className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors hidden sm:flex"
          title="المشاريع المحفوظة"
        >
          <FolderOpen className="w-4 h-4" />
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

        {/* Dark/Light mode */}
        <button
          id="header-theme-toggle-btn"
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors hidden sm:flex"
          title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          id="header-fullscreen-btn"
          onClick={onToggleFullScreen}
          className={`p-2 rounded-xl transition-all hidden sm:flex ${
            isFullScreen
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
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
              activeSidePanel === 'brushes' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            فرش
          </button>
          <button
            onClick={() => onToggleSidePanel('colors')}
            className={`p-2 rounded-xl text-xs ${
              activeSidePanel === 'colors' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            ألوان
          </button>
          <button
            onClick={() => onToggleSidePanel('layers')}
            className={`p-2 rounded-xl text-xs ${
              activeSidePanel === 'layers' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            طبقات
          </button>
        </div>
      </div>
    </header>
  );
};

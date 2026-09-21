import React, { useState, useEffect } from 'react';
import { ProjectMetadata } from '../types';
import { listProjectsFromDB, deleteProjectFromDB } from '../utils/storage';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Check, 
  X,
  FileImage,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: (
    title: string,
    width: number,
    height: number,
    dpi: number,
    backgroundColor: string,
    hasTransparentBg: boolean
  ) => void;
  onOpenProject: (id: string) => void;
  initialMode?: 'new' | 'open';
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onNewProject,
  onOpenProject,
  initialMode = 'new',
}) => {
  const [tab, setTab] = useState<'new' | 'open'>(initialMode);
  const [title, setTitle] = useState<string>('مشروع رسم جديد');
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [dpi, setDpi] = useState<number>(300);
  const [bgChoice, setBgChoice] = useState<'white' | 'black' | 'transparent' | 'custom'>('white');
  const [customBgColor, setCustomBgColor] = useState<string>('#f5f5f5');

  const [savedProjects, setSavedProjects] = useState<ProjectMetadata[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    setTab(initialMode);
    setProjectToDelete(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isOpen && tab === 'open') {
      loadProjects();
    }
  }, [isOpen, tab]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const list = await listProjectsFromDB();
      setSavedProjects(list);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  /**
   * Delete saved project permanently from IndexedDB storage by its unique ID
   */
  const deleteSavedProject = async (projectId: string) => {
    if (!projectId) return;
    setIsDeleting(true);
    try {
      // 1. Delete permanently from persistent IndexedDB storage
      await deleteProjectFromDB(projectId);

      // 2. Immediately update UI state list
      setSavedProjects((prev) => prev.filter((project) => project.id !== projectId));
      setProjectToDelete(null);

      // 3. Reload fresh list from DB to guarantee complete sync
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project from storage:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const presets = [
    { name: 'شاشة عريضة Full HD', w: 1920, h: 1080, dpi: 72 },
    { name: 'مربع وسائل التواصل', w: 1080, h: 1080, dpi: 72 },
    { name: 'رسم رقمي عالي الدقة 2K', w: 2048, h: 2048, dpi: 300 },
    { name: 'A4 طباعة رأسية', w: 2480, h: 3508, dpi: 300 },
    { name: 'A4 طباعة أفقية', w: 3508, h: 2480, dpi: 300 },
    { name: 'شاشة هاتف ذكي (Portrait)', w: 1080, h: 2400, dpi: 300 },
  ];

  const handleCreate = () => {
    const isTrans = bgChoice === 'transparent';
    const bgCol = bgChoice === 'white' ? '#ffffff' : bgChoice === 'black' ? '#121212' : customBgColor;
    onNewProject(title || 'مشروع بدون عنوان', width, height, dpi, bgCol, isTrans);
    onClose();
  };

  return (
    <div 
      id="project-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        id="project-modal-dialog"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <button
              id="tab-new-project-btn"
              onClick={() => {
                setTab('new');
                setProjectToDelete(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                tab === 'new'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>مشروع جديد</span>
            </button>
            <button
              id="tab-saved-projects-btn"
              onClick={() => {
                setTab('open');
                setProjectToDelete(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                tab === 'open'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>المشاريع المحفوظة</span>
            </button>
          </div>

          <button
            id="close-project-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {tab === 'new' ? (
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            {/* Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="new-project-title-input" className="text-neutral-300 font-bold block cursor-pointer">اسم المشروع</label>
              <input
                id="new-project-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل اسم المشروع"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm outline-none focus:border-amber-500"
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-neutral-400 font-medium block">أبعاد قياسية جاهزة</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((pr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWidth(pr.w);
                      setHeight(pr.h);
                      setDpi(pr.dpi);
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-colors cursor-pointer ${
                      width === pr.w && height === pr.h
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                        : 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className="block truncate font-bold">{pr.name}</span>
                    <span className="block text-[11px] text-neutral-400 font-mono mt-0.5">
                      {pr.w} × {pr.h} px
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dimensions */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-neutral-400">العرض (بكسل)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Math.max(100, Math.min(8000, Number(e.target.value))))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400">الارتفاع (بكسل)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Math.max(100, Math.min(8000, Number(e.target.value))))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400">الكثافة (DPI)</label>
                <input
                  type="number"
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Background choice */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <label className="text-neutral-300 font-bold block">خلفية لوحة الرسم</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setBgChoice('white')}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                    bgChoice === 'white'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-400" />
                  <span>أبيض</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgChoice('black')}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                    bgChoice === 'black'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-neutral-950 border border-neutral-700" />
                  <span>داكن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgChoice('transparent')}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                    bgChoice === 'transparent'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full checkerboard-pattern border border-neutral-700" />
                  <span>شفاف</span>
                </button>
                <div className="flex items-center gap-2 p-1 bg-neutral-950/40 border border-neutral-800 rounded-xl">
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => {
                      setCustomBgColor(e.target.value);
                      setBgChoice('custom');
                    }}
                    className="w-7 h-7 rounded border border-neutral-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-neutral-400">مخصص</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Saved Projects List */
          <div className="p-6 overflow-y-auto flex-1 min-h-[350px]">
            {isLoadingProjects ? (
              <div className="flex items-center justify-center h-48 text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400 ml-2" />
                <span>جاري تحميل المشاريع...</span>
              </div>
            ) : savedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500">
                <FileImage className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-bold text-neutral-300">لا توجد مشاريع محفوظة بعد</span>
                <p className="text-xs text-neutral-500 mt-1">
                  عند حفظ أي رسمة، ستظهر تلقائياً هنا في ذاكرة المتصفح الدائمة (IndexedDB)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    id={`saved-project-card-${p.id}`}
                    onClick={() => {
                      onOpenProject(p.id);
                      onClose();
                    }}
                    className="group relative flex items-center gap-3 p-3 bg-neutral-950/60 border border-neutral-800 hover:border-amber-500/70 rounded-xl cursor-pointer transition-all shadow-md"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center flex-shrink-0">
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileImage className="w-6 h-6 text-neutral-600" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-amber-400 truncate">
                        {p.title}
                      </h4>
                      <span className="text-[11px] text-neutral-400 block font-mono mt-0.5">
                        {p.width} × {p.height} بكسل
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-1">
                        {new Date(p.updatedAt).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Delete action with event.stopPropagation() */}
                    <button
                      type="button"
                      id={`delete-saved-project-${p.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p);
                      }}
                      className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="حذف المشروع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/80">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          {tab === 'new' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إنشاء مساحة الرسم</span>
            </button>
          )}
        </div>

        {/* In-Dialog Confirmation Prompt for Deleting Project */}
        {projectToDelete && (
          <div 
            id="delete-confirmation-overlay"
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setProjectToDelete(null);
            }}
          >
            <div 
              id="delete-confirmation-dialog"
              className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-100">
                  هل أنت متأكد من حذف هذا المشروع؟
                </h3>
                <p className="text-xs text-neutral-400">
                  سيتم حذف مشروع <span className="font-bold text-neutral-200">"{projectToDelete.title}"</span> نهائياً من التخزين الدائم.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  id="cancel-delete-project-btn"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  id="confirm-delete-project-btn"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedProject(projectToDelete.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>حذف</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

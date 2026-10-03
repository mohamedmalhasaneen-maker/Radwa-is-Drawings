import React, { useState, useEffect } from 'react';
import { ProjectMetadata, ProjectData } from '../types';
import { listProjectsFromDB, deleteProjectFromDB, getProjectFromDB } from '../utils/storage';
import { 
  subscribeToCommunityProjects, 
  likeCommunityProject, 
  CommunityProjectDoc,
  deleteCommunityProject
} from '../firebase';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Check, 
  X,
  FileImage,
  AlertTriangle,
  Loader2,
  Globe,
  Heart,
  Search,
  Download,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  User,
  ExternalLink
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
  onOpenProject: (id: string, customProjectData?: ProjectData) => void;
  initialMode?: 'community' | 'saved' | 'new';
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onNewProject,
  onOpenProject,
  initialMode = 'community',
  onShowToast,
}) => {
  const [tab, setTab] = useState<'community' | 'saved' | 'new'>(initialMode);
  const [title, setTitle] = useState<string>('مشروع رسم جديد');
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [dpi, setDpi] = useState<number>(300);
  const [bgChoice, setBgChoice] = useState<'white' | 'black' | 'transparent' | 'custom'>('white');
  const [customBgColor, setCustomBgColor] = useState<string>('#f5f5f5');

  // Local storage projects state
  const [savedProjects, setSavedProjects] = useState<ProjectMetadata[]>([]);
  const [isLoadingLocalProjects, setIsLoadingLocalProjects] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string; isCommunity?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Community projects state
  const [communityProjects, setCommunityProjects] = useState<CommunityProjectDoc[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [likedProjects, setLikedProjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTab(initialMode);
    setProjectToDelete(null);
  }, [initialMode, isOpen]);

  // Real-time subscription to community projects
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingCommunity(true);
    const unsubscribe = subscribeToCommunityProjects(
      (items) => {
        setCommunityProjects(items);
        setIsLoadingCommunity(false);
      },
      (error) => {
        console.error('Community subscription error:', error);
        setIsLoadingCommunity(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Load local projects
  useEffect(() => {
    if (isOpen && tab === 'saved') {
      loadLocalProjects();
    }
  }, [isOpen, tab]);

  const loadLocalProjects = async () => {
    setIsLoadingLocalProjects(true);
    try {
      const list = await listProjectsFromDB();
      setSavedProjects(list);
    } catch (e) {
      console.error('Failed to load local projects:', e);
    } finally {
      setIsLoadingLocalProjects(false);
    }
  };

  /**
   * Delete saved project permanently
   */
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      if (projectToDelete.isCommunity) {
        await deleteCommunityProject(projectToDelete.id);
        setCommunityProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        onShowToast?.('تم حذف اللوحة من المعرض المشترك', 'info');
      } else {
        await deleteProjectFromDB(projectToDelete.id);
        setSavedProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        onShowToast?.('تم حذف المشروع من الذاكرة المحلية', 'info');
        await loadLocalProjects();
      }
      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      onShowToast?.('تعذر حذف المشروع', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Open community project
   */
  const handleOpenCommunityProject = (item: CommunityProjectDoc) => {
    try {
      const layers = item.layersData ? JSON.parse(item.layersData) : [];
      const projectData: ProjectData = {
        id: item.id,
        title: item.title,
        artistName: item.artistName,
        width: item.width,
        height: item.height,
        dpi: item.dpi || 300,
        backgroundColor: item.backgroundColor || '#ffffff',
        hasTransparentBg: !!item.hasTransparentBg,
        createdAt: new Date(item.createdAt).getTime(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        thumbnail: item.thumbnail,
        likesCount: item.likesCount || 0,
        layers,
      };

      onOpenProject(item.id, projectData);
      onShowToast?.(`تم فتح لوحة "${item.title}" للفنان ${item.artistName} بنجاح!`, 'success');
      onClose();
    } catch (err) {
      console.error('Failed to open community project:', err);
      onShowToast?.('حدث خطأ أثناء فتح بيانات اللوحة', 'error');
    }
  };

  /**
   * Like a community artwork
   */
  const handleLike = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (likedProjects[projectId]) return;

    setLikedProjects((prev) => ({ ...prev, [projectId]: true }));
    setCommunityProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p))
    );

    try {
      await likeCommunityProject(projectId);
      onShowToast?.('شكرًا لإعجابك بالعمل الفني! ❤️', 'info');
    } catch (err) {
      console.error('Failed to like project:', err);
    }
  };

  /**
   * Download thumbnail / artwork as PNG
   */
  const handleDownloadImage = (e: React.MouseEvent, item: CommunityProjectDoc | ProjectMetadata) => {
    e.stopPropagation();
    if (!item.thumbnail) return;
    const link = document.createElement('a');
    link.href = item.thumbnail;
    link.download = `${item.title || 'artwork'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('جاري تنزيل الصورة...', 'success');
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

  // Filter community projects by search query
  const filteredCommunity = communityProjects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.artistName && p.artistName.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      id="project-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="project-modal-dialog"
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-750/90 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-neutral-100 flex flex-col max-h-[92vh] select-none"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Tab 1: Community Gallery */}
            <button
              id="tab-community-gallery-btn"
              onClick={() => {
                setTab('community');
                setProjectToDelete(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === 'community'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              <Globe className="w-4 h-4 text-amber-300" />
              <span>معرض الفنانين والمجتمع</span>
              {communityProjects.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {communityProjects.length}
                </span>
              )}
            </button>

            {/* Tab 2: Local Saved Projects */}
            <button
              id="tab-saved-projects-btn"
              onClick={() => {
                setTab('saved');
                setProjectToDelete(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === 'saved'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>مشاريعي المحفوظة</span>
            </button>

            {/* Tab 3: New Project */}
            <button
              id="tab-new-project-btn"
              onClick={() => {
                setTab('new');
                setProjectToDelete(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === 'new'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>مشروع جديد</span>
            </button>
          </div>

          <button
            id="close-project-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= TAB 1: COMMUNITY GALLERY ================= */}
        {tab === 'community' && (
          <div className="flex flex-col flex-1 overflow-hidden min-h-[420px]">
            {/* Search and Filter Bar */}
            <div className="px-5 py-3 border-b border-neutral-800/80 bg-neutral-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم اللوحة أو اسم الفنان..."
                  className="w-full bg-neutral-950 border border-neutral-750 focus:border-blue-500 rounded-xl pr-9 pl-3.5 py-2 text-neutral-100 text-xs outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-neutral-400 w-full sm:w-auto justify-between sm:justify-end">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>مزامنة سحابية حية لجميع الرسامين</span>
                </span>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingCommunity ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400 space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                  <span className="text-xs font-medium">جاري جلب لوحات الفنانين من المعرض المشترك...</span>
                </div>
              ) : filteredCommunity.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-500 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-800/50 border border-neutral-750 flex items-center justify-center text-2xl">
                    🎨
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-300 block">
                      {searchQuery ? 'لم يتم العثور على نتائج للبحث' : 'معرض الرسامين بانتظار أول لوحة!'}
                    </span>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                      {searchQuery
                        ? 'جرّب البحث باسم فنان آخر أو مسح مربع البحث'
                        : 'ارسم لوحتك الآن واضغط على "حفظ" واكتب اسمك لتظهر لوحتك واسمك الفني لجميع المستخدمين في التطبيق.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCommunity.map((item) => {
                    const isLiked = !!likedProjects[item.id];
                    return (
                      <div
                        key={item.id}
                        id={`community-card-${item.id}`}
                        onClick={() => handleOpenCommunityProject(item)}
                        className="group relative flex flex-col bg-neutral-950/70 border border-neutral-800 hover:border-blue-500/80 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
                      >
                        {/* Artwork Preview Image */}
                        <div className="relative w-full h-44 bg-neutral-900 overflow-hidden flex items-center justify-center border-b border-neutral-800/80">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <FileImage className="w-10 h-10 text-neutral-700" />
                          )}

                          {/* Hover Overlay with Open Action */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <span className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                              <Eye className="w-3.5 h-3.5" />
                              <span>فتح اللوحة للرسم</span>
                            </span>
                          </div>

                          {/* Like Button Badge */}
                          <button
                            type="button"
                            onClick={(e) => handleLike(e, item.id)}
                            className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md transition-all shadow-md ${
                              isLiked
                                ? 'bg-rose-500 text-white'
                                : 'bg-neutral-900/80 text-neutral-300 hover:bg-rose-600 hover:text-white border border-neutral-700/60'
                            }`}
                            title="إعجاب باللوحة"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                            <span className="font-mono text-[11px]">{item.likesCount || 0}</span>
                          </button>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDownloadImage(e, item)}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-neutral-900/80 hover:bg-blue-600 text-neutral-300 hover:text-white border border-neutral-700/60 backdrop-blur-md transition-all shadow-md"
                            title="تنزيل الصورة"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Card Info Details */}
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-neutral-100 group-hover:text-blue-400 truncate">
                              {item.title}
                            </h4>

                            {/* PROMINENT ARTIST BADGE */}
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-neutral-400 font-normal">بريشة الفنان:</span>
                              <span className="font-bold truncate">{item.artistName || 'رسام مجهول'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1.5 border-t border-neutral-850">
                            <span className="font-mono">{item.width} × {item.height} px</span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: LOCAL SAVED PROJECTS ================= */}
        {tab === 'saved' && (
          <div className="p-6 overflow-y-auto flex-1 min-h-[350px]">
            {isLoadingLocalProjects ? (
              <div className="flex items-center justify-center h-48 text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400 ml-2" />
                <span>جاري تحميل المشاريع المحلية...</span>
              </div>
            ) : savedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500 space-y-2">
                <FileImage className="w-12 h-12 opacity-50" />
                <span className="text-sm font-bold text-neutral-300">لا توجد مشاريع محلية محفوظة بعد</span>
                <p className="text-xs text-neutral-400 max-w-sm">
                  عند حفظ أي رسمة، يتم أيضاً تخزين نسخة دائمة هنا في ذاكرة متصفحك (IndexedDB).
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
                    className="group relative flex items-center gap-3 p-3 bg-neutral-950/60 border border-neutral-800 hover:border-blue-500/70 rounded-xl cursor-pointer transition-all shadow-md"
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
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-blue-400 truncate">
                        {p.title}
                      </h4>
                      {p.artistName && (
                        <span className="text-[10px] text-amber-400 block truncate">
                          🎨 {p.artistName}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-400 block font-mono mt-0.5">
                        {p.width} × {p.height} بكسل
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {new Date(p.updatedAt).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      id={`delete-saved-project-${p.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete({ id: p.id, title: p.title, isCommunity: false });
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

        {/* ================= TAB 3: NEW PROJECT CREATOR ================= */}
        {tab === 'new' && (
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            {/* Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="new-project-title-input" className="text-neutral-300 font-bold block cursor-pointer">
                اسم المشروع / اللوحة
              </label>
              <input
                id="new-project-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل اسم اللوحة"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm outline-none focus:border-blue-500"
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
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
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
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400">الارتفاع (بكسل)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Math.max(100, Math.min(8000, Number(e.target.value))))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400">الكثافة (DPI)</label>
                <input
                  type="number"
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 font-mono text-neutral-100 outline-none focus:border-blue-500"
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
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
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
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
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
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
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
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          {tab === 'new' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إنشاء مساحة الرسم</span>
            </button>
          )}
        </div>

        {/* Delete Confirmation Overlay */}
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
                  سيتم حذف مشروع <span className="font-bold text-neutral-200">"{projectToDelete.title}"</span> نهائياً.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
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
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject();
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

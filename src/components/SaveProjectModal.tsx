import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  User, 
  Palette, 
  Globe, 
  Layers, 
  Check, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle: string;
  defaultArtistName: string;
  canvasWidth: number;
  canvasHeight: number;
  layersCount: number;
  previewThumbnail: string;
  onSave: (title: string, artistName: string, publishToCommunity: boolean) => Promise<void>;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  defaultTitle,
  defaultArtistName,
  canvasWidth,
  canvasHeight,
  layersCount,
  previewThumbnail,
  onSave,
}) => {
  const [title, setTitle] = useState<string>(defaultTitle || 'لوحة فنية جديدة');
  const [artistName, setArtistName] = useState<string>(defaultArtistName || '');
  const [publishToCommunity, setPublishToCommunity] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle || 'لوحة فنية جديدة');
      // If defaultArtistName not provided, try reading from localStorage
      if (!defaultArtistName) {
        const savedName = localStorage.getItem('rassam_artist_name') || '';
        setArtistName(savedName);
      } else {
        setArtistName(defaultArtistName);
      }
    }
  }, [isOpen, defaultTitle, defaultArtistName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || 'مشروع بدون عنوان';
    const finalArtist = artistName.trim() || 'فنان مبدع';

    // Save artist name to localStorage for seamless reuse
    try {
      localStorage.setItem('rassam_artist_name', finalArtist);
    } catch (err) {
      // Ignore storage errors
    }

    setIsSaving(true);
    try {
      await onSave(finalTitle, finalArtist, publishToCommunity);
      onClose();
    } catch (err) {
      console.error('Error saving project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="save-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="save-project-modal-dialog"
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-750/90 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden text-neutral-100 flex flex-col max-h-[92vh] select-none"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Save className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">حفظ ونشر العمل الفني</h3>
              <span className="text-[11px] text-neutral-400">حفظ اللوحة مع اسم الفنان لتظهر لجميع المستخدمين</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Artwork Thumbnail & Specs Preview */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-750/80 bg-neutral-900 flex items-center justify-center shrink-0 shadow-md">
              {previewThumbnail ? (
                <img src={previewThumbnail} alt="معاينة الرسمة" className="w-full h-full object-cover" />
              ) : (
                <Palette className="w-8 h-8 text-neutral-600" />
              )}
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-neutral-300 block truncate">
                {title || 'لوحة فنية جديدة'}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                <span>{canvasWidth} × {canvasHeight} px</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-400" />
                  {layersCount} طبقات
                </span>
              </div>
              <div className="text-[10px] text-amber-400/90 font-medium">
                {artistName ? `🎨 بريشة: ${artistName}` : '🎨 سيتم تسجيل اسم الفنان'}
              </div>
            </div>
          </div>

          {/* Project Title Input */}
          <div className="space-y-1.5">
            <label htmlFor="save-project-title" className="text-neutral-300 font-bold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              <span>اسم اللوحة / المشروع:</span>
            </label>
            <input
              id="save-project-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: لوحة الغروب بالفحم والجرافيت"
              className="w-full bg-neutral-950 border border-neutral-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-neutral-100 text-xs outline-none transition-all shadow-inner"
            />
          </div>

          {/* Artist Name Input (The key requirement!) */}
          <div className="space-y-1.5">
            <label htmlFor="save-project-artist" className="text-neutral-300 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>اسم الرسام / الفنان:</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-normal">سيظهر هذا الاسم على اللوحة لجميع المستخدمين</span>
            </label>
            <div className="relative">
              <input
                id="save-project-artist"
                type="text"
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="اكتب اسمك كفنان (مثال: محمد الأحمد / سارة النجار)"
                className="w-full bg-neutral-950 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-amber-300 text-xs font-semibold outline-none transition-all shadow-inner"
              />
              <span className="absolute left-3 top-2.5 text-xs text-amber-400/80">🖌️</span>
            </div>
          </div>

          {/* Community Sharing Toggle */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={publishToCommunity}
                onChange={(e) => setPublishToCommunity(e.target.checked)}
                className="mt-0.5 rounded border-neutral-700 text-blue-600 bg-neutral-900 accent-blue-500 cursor-pointer"
              />
              <div className="space-y-0.5 flex-1">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>نشر في معرض المجتمع المشترك (ليشاهده كل المستخدمين)</span>
                </span>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  عند التفعيل، سيتم حفظ ومزامنة اللوحة سحابياً في التطبيق ليتمكن جميع الفنانين من مشاهدة عملك واسمك الفني والتفاعل معه.
                </p>
              </div>
            </label>
          </div>

          {/* Info footnote */}
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 px-1">
            <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>يتم أيضاً حفظ نسخة دائمة في ذاكرة متصفحك تلقائياً لسرعة الفتح لاحقاً.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ والنشر...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ ونشر العمل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

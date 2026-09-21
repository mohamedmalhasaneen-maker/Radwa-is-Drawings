import React from 'react';
import { HelpCircle, X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Z', desc: 'تراجع عن آخر خطوة (Undo)' },
    { key: 'Ctrl + Y / Shift + Z', desc: 'إعادة الخطوة المتراجع عنها (Redo)' },
    { key: 'F / F11', desc: 'تبديل وضع ملء الشاشة الكامل' },
    { key: 'Esc', desc: 'الخروج من وضع ملء الشاشة' },
    { key: 'Ctrl + S', desc: 'حفظ المشروع محلياً' },
    { key: 'Ctrl + O', desc: 'فتح إدارة المشاريع' },
    { key: '[ أو Tab', desc: 'طي وإدخال اللوحة الجانبية' },
    { key: 'B', desc: 'تفعيل الفرشاة' },
    { key: 'P', desc: 'تفعيل قلم الرصاص' },
    { key: 'N', desc: 'تفعيل قلم الحبر' },
    { key: 'E', desc: 'تفعيل الممحاة' },
    { key: 'G', desc: 'دلو التعبئة اللونية' },
    { key: 'I', desc: 'أداة قطّارة الألوان' },
    { key: 'V', desc: 'أداة التحريك والملاحة' },
    { key: 'عجلة الماوس', desc: 'تكبير وتصغير مساحة الرسم' },
    { key: 'Space + سحب', desc: 'سحب وتحريك مساحة العمل' },
    { key: 'لمس بإصبعين', desc: 'تكبير وتصغير الشاشة باللمس' },
  ];

  return (
    <div 
      id="shortcuts-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        id="shortcuts-modal-dialog"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-neutral-100">اختصارات لوحة المفاتيح واللمس</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-neutral-950/40 border border-neutral-800/80 rounded-xl"
              >
                <span className="text-neutral-300">{sc.desc}</span>
                <kbd className="px-2 py-0.5 bg-neutral-800 text-amber-400 font-mono text-[11px] rounded border border-neutral-700">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end px-6 py-3 border-t border-neutral-800 bg-neutral-950/80">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>
  );
};

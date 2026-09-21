import React, { useState } from 'react';
import { Layer, BlendModeType } from '../types';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ArrowUp, 
  ArrowDown, 
  Merge,
  Edit2,
  Check,
  PanelLeftClose,
  SquareDashed
} from 'lucide-react';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  isLayerIsolation?: boolean;
  onSelectLayer: (id: string) => void;
  onShowAllLayers?: () => void;
  onToggleIsolation?: (enabled: boolean) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onCommitOpacityChange?: () => void;
  onChangeBlendMode: (id: string, mode: BlendModeType) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onMergeDown: (id: string) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  isLayerIsolation = false,
  onSelectLayer,
  onShowAllLayers,
  onToggleIsolation,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onToggleLock,
  onChangeOpacity,
  onCommitOpacityChange,
  onChangeBlendMode,
  onReorderLayer,
  onMergeDown,
  onRenameLayer,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleCommitRename = (id: string) => {
    if (editingName.trim()) {
      onRenameLayer(id, editingName.trim());
    }
    setEditingId(null);
  };

  const blendModes: { id: BlendModeType; name: string }[] = [
    { id: 'source-over', name: 'عادي (Normal)' },
    { id: 'multiply', name: 'مضاعفة (Multiply)' },
    { id: 'screen', name: 'شاشة (Screen)' },
    { id: 'overlay', name: 'تراكب (Overlay)' },
    { id: 'darken', name: 'تعتيم (Darken)' },
    { id: 'lighten', name: 'تفتيح (Lighten)' },
    { id: 'color-dodge', name: 'إضاءة قوية (Dodge)' },
  ];

  // In layers stack, index 0 is bottom, length-1 is top.
  // We display them with top layer at top of UI list (reversed)
  const displayLayers = [...layers].reverse();

  return (
    <div 
      id="layers-management-panel"
      className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-100 overflow-hidden w-80 select-none text-xs"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-neutral-200">لوحة الطبقات</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-400 font-mono">
            {layers.length} {layers.length === 1 ? 'طبقة' : 'طبقات'}
          </span>
          {onClose && (
            <button
              id="layers-panel-collapse-btn"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors cursor-pointer"
              title="طي وإدخال اللوحة الجانبية"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Layer Isolation / View Mode Banner */}
      <div className="px-3 py-2.5 border-b border-neutral-800 bg-neutral-950/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isLayerIsolation ? (
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px] truncate">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <span className="truncate">وضع عزل الطبقة نشط</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="truncate">عرض كل الطبقات مجمعة</span>
            </div>
          )}
        </div>

        {isLayerIsolation ? (
          <button
            id="show-all-layers-btn"
            onClick={onShowAllLayers}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            title="إلغاء العزل وعرض جميع الطبقات فوق بعضها على اللوحة"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>عرض كل الطبقات</span>
          </button>
        ) : (
          <button
            id="isolate-active-layer-btn"
            onClick={() => onToggleIsolation?.(true)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 border border-neutral-700 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            title="عزل الطبقة المحددة وعرض محتواها فقط على اللوحة"
          >
            <SquareDashed className="w-3.5 h-3.5 text-amber-400" />
            <span>عزل الطبقة</span>
          </button>
        )}
      </div>

      {/* Active Layer Adjustments: Opacity & Blend Mode */}
      {activeLayer && (
        <div className="p-3 border-b border-neutral-800 bg-neutral-950/50 space-y-2.5">
          {/* Blend Mode */}
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-[11px]">وضع الدمج:</span>
            <select
              value={activeLayer.blendMode}
              onChange={(e) => onChangeBlendMode(activeLayer.id, e.target.value as BlendModeType)}
              className="bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              {blendModes.map((bm) => (
                <option key={bm.id} value={bm.id}>
                  {bm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <label htmlFor="layer-opacity-slider" className="text-neutral-400 cursor-pointer">
                شفافية الطبقة المحددة:
              </label>
              <span id="active-layer-opacity-value" className="text-amber-400 font-mono font-bold">
                {activeLayer.opacity}%
              </span>
            </div>
            <input
              id="layer-opacity-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={activeLayer.opacity}
              onChange={(e) => onChangeOpacity(activeLayer.id, Number(e.target.value))}
              onMouseUp={() => onCommitOpacityChange?.()}
              onTouchEnd={() => onCommitOpacityChange?.()}
              onKeyUp={() => onCommitOpacityChange?.()}
              className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {displayLayers.map((layer) => {
          const isSelected = layer.id === activeLayerId;
          const isEditing = layer.id === editingId;

          return (
            <div
              key={layer.id}
              id={`layer-row-${layer.id}`}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10'
                  : 'border-neutral-800/80 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-neutral-700 transition-colors cursor-pointer ${
                    layer.visible ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                  title={layer.visible ? 'إخفاء الطبقة' : 'إظهار الطبقة'}
                >
                  {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-neutral-700 transition-colors cursor-pointer ${
                    layer.locked ? 'text-amber-400' : 'text-neutral-500'
                  }`}
                  title={layer.locked ? 'فتح قفل الطبقة' : 'قفل الطبقة'}
                >
                  {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>

                {/* Layer Name / Inline Edit */}
                {isEditing ? (
                  <div 
                    className="flex items-center gap-1 flex-1" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitRename(layer.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="bg-neutral-900 border border-amber-500 px-1.5 py-0.5 rounded text-xs text-neutral-100 outline-none w-full"
                    />
                    <button
                      onClick={() => handleCommitRename(layer.id)}
                      className="p-1 rounded hover:bg-neutral-700 text-emerald-400 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => handleStartRename(layer)}
                    className="truncate font-medium text-xs flex-1 select-none"
                    title={layer.name}
                  >
                    {layer.name}
                  </span>
                )}

                {/* Badge if isolated */}
                {isSelected && isLayerIsolation && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 whitespace-nowrap">
                    معزولة
                  </span>
                )}
              </div>

              {/* Actions on row */}
              <div className="flex items-center gap-1 opacity-90 hover:opacity-100">
                {!isEditing && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(layer);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="إعادة تسمية الطبقة"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      title={layers.length > 1 ? `حذف طبقة "${layer.name}"` : 'لا يمكن حذف الطبقة الوحيدة'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Actions Footer Bar */}
      <div className="flex items-center justify-between p-2.5 border-t border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-1">
          <button
            id="layer-add-btn"
            onClick={onAddLayer}
            className="p-2 rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            title="إنشاء طبقة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="layer-duplicate-btn"
            onClick={() => onDuplicateLayer(activeLayerId)}
            className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors cursor-pointer active:scale-95"
            title="نسخ الطبقة المحددة"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            id="layer-merge-btn"
            onClick={() => onMergeDown(activeLayerId)}
            className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors cursor-pointer active:scale-95"
            title="دمج مع الطبقة السفلية"
          >
            <Merge className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="layer-move-up-btn"
            onClick={() => onReorderLayer(activeLayerId, 'up')}
            className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer active:scale-95"
            title="تحريك لأعلى"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            id="layer-move-down-btn"
            onClick={() => onReorderLayer(activeLayerId, 'down')}
            className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer active:scale-95"
            title="تحريك لأسفل"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            id="layer-delete-btn"
            onClick={() => onDeleteLayer(activeLayerId)}
            className="p-2 rounded-lg bg-neutral-800 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors active:scale-95 cursor-pointer"
            title="حذف الطبقة المحددة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

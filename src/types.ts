export type ToolType = 
  | 'brush'
  | 'pencil'
  | 'ink'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'double_arrow'
  | 'curved_arrow'
  | 'block_arrow'
  | 'bezier_curve'
  | 'cubic_bezier'
  | 'arc'
  | 'wave'
  | 'spiral'
  | 'rectangle'
  | 'square'
  | 'rounded_rectangle'
  | 'ellipse'
  | 'circle'
  | 'triangle'
  | 'right_triangle'
  | 'diamond'
  | 'trapezoid'
  | 'parallelogram'
  | 'pentagon'
  | 'hexagon'
  | 'heptagon'
  | 'octagon'
  | 'nonagon'
  | 'decagon'
  | 'polygon'
  | 'star'
  | 'heart'
  | 'crescent'
  | 'speech_bubble'
  | 'cloud'
  | 'cross'
  | 'fill'
  | 'gradient'
  | 'eyedropper'
  | 'text'
  | 'marquee'
  | 'lasso'
  | 'move';

export type BrushPresetId =
  | 'pencil_standard'
  | 'pencil_hb'
  | 'pencil_mech'
  | 'ink_pen'
  | 'fine_liner'
  | 'highlighter'
  | 'calligraphy'
  | 'brush_pen'
  | 'marker'
  | 'soft_brush'
  | 'hard_brush'
  | 'airbrush'
  | 'watercolor'
  | 'oil_brush'
  | 'acrylic'
  | 'charcoal'
  | 'chalk'
  | 'pastel'
  | 'crayon'
  | 'spray'
  | 'textured'
  | 'smudge'
  | 'blur'
  | 'pixel'
  | 'eraser';

export interface BrushSettings {
  id: BrushPresetId;
  name: string;
  category: 'رصاص وتخطيط' | 'أحبار وخطوط' | 'فراشي تلوين' | 'فحم وباستيل' | 'تأثيرات وبكسل';
  description: string;
  size: number;              // 1 - 250
  opacity: number;           // 0.01 - 1.0
  flow: number;              // 0.01 - 1.0
  hardness: number;          // 0.0 - 1.0
  spacing: number;           // 0.05 - 1.0
  smoothing: number;         // 0.0 - 0.95 (stroke stabilizer)
  pressureSize: boolean;     // Stylus / Apple pencil pressure affects radius
  pressureOpacity: boolean;  // Stylus pressure affects opacity
  angle: number;             // Angle for calligraphy nibs (0 - 180)
  scatter: number;           // Scatter for spray & texture (0 - 50)
  blendMode?: GlobalCompositeOperation;
}

export type BlendModeType = 
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'difference';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;          // 0 - 100
  blendMode: BlendModeType;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface SerializableLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendModeType;
  dataUrl: string;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  width: number;
  height: number;
  dpi: number;
  backgroundColor: string;
  hasTransparentBg: boolean;
  createdAt: number;
  updatedAt: number;
  thumbnail: string;
}

export interface ProjectData extends ProjectMetadata {
  layers: SerializableLayer[];
}

export type SmoothingLevel = 'low' | 'medium' | 'high' | 'ultra';
export type AccuracyLevel = 'low' | 'medium' | 'high';
export type DenoiseLevel = 'low' | 'medium' | 'high';
export type DetailClarityLevel = 'very_simple' | 'simple' | 'medium';
export type DrawingStyleType = 'pencil' | 'ink' | 'clean-sketch';

export interface AISubjectDrawingSettings {
  detailLevel: 'very_simple' | 'simple' | 'medium'; // بسيط جدًا (الافتراضي) | بسيط | متوسط
  lineThickness: number;       // 1 - 10 (سمك القلم الرصاص)
  lineColor: string;           // لون قلم الرصاص (default #262626)
  lineOpacity: number;         // 0 - 100% (وضوح الخط / الشفافية)
  smoothing: SmoothingLevel;   // low | medium | high (تنعيم خطوط القلم)
  cleanLines: boolean;         // تنظيف الخطوط وإزالة الشوائب والظلال (Default true)
  backgroundMode: 'transparent' | 'white'; // خلفية شفافة أو ورقية بيضاء
  threshold: number;           // 1 - 100 (عتبة فصل الكائن عن الخلفية)
  selectedSeedPoints: { x: number; y: number; weight: number }[]; // Interactive clicked subject seeds
  includeOriginalImage: boolean; // إضافة الصورة الأصلية كطبقة سفلية
}

export interface OuterContourPoint {
  x: number;
  y: number;
}

export interface OuterContourSettings {
  lineThickness: number;       // 1 - 20 px
  lineOpacity: number;         // 0 - 100 %
  lineColor: string;           // Hex color (default #000000)
  smoothing: SmoothingLevel;   // low | medium | high | ultra
  accuracy: AccuracyLevel;     // low | medium | high
  denoise: DenoiseLevel;       // low | medium | high
  threshold: number;           // 1 - 100 (عتبة فصل الجسم عن الخلفية)
  transparentBg: boolean;      // Default true
  fillSilhouette: boolean;     // Fill body area
  invertSelection: boolean;    // Invert foreground / background
  selectedSeedPoints: { x: number; y: number; weight: number }[]; // Interactive subject seeds
  onlyOuterContour: boolean;   // Strict outer boundary flag
  showOutline: boolean;        // Toggle outline visibility
  includeOriginalImage: boolean; // Add original image as layer 1 below contour layer 2
}

export type LineArtMode = 'silhouette' | 'detailed' | 'sketch';

export interface LineArtSettings {
  mode: LineArtMode;
  detailLevel: number;      // 1 - 100
  lineStrength: number;     // 1 - 100
  lineThickness: number;    // 1 - 20
  contrast: number;         // -50 - 100
  threshold: number;        // 1 - 255
  smoothing: number;        // 0 - 10
  denoise: number;          // 0 - 10
  edgeSensitivity: number;  // 1 - 100
  transparentBg: boolean;   // Transparent instead of solid white
  invert: boolean;          // Invert lines (black on white vs white on black)
  lineColor: string;        // Hex color of the extracted lines
}

export interface CanvasTransform {
  zoom: number;             // Scale factor e.g. 1.0 = 100%
  panX: number;
  panY: number;
  rotation: number;         // Degrees (0, 90, 180, 270)
  flipH: boolean;
  flipV: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  time: number;
}

export interface ShapeOptions {
  fill: boolean;
  stroke: boolean;
  strokeWidth: number;
  cornerRadius?: number;
  polygonSides?: number;
  starPoints?: number;
  curveCurvature?: number;
  arrowHeadSize?: number;
}

export interface LayerSnapshot {
  layerId: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendModeType;
  imageData: ImageData;
}

export interface HistoryStep {
  id: string;
  description: string;
  layersSnapshots: LayerSnapshot[];
  activeLayerId: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

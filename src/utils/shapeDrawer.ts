import { ToolType, ShapeOptions } from '../types';

export const SHAPE_TOOL_TYPES = [
  // أشكال أساسية ومستطيلات
  'rectangle',
  'square',
  'rounded_rectangle',
  'ellipse',
  'circle',

  // مثلثات ومضلعات
  'triangle',
  'right_triangle',
  'diamond',
  'trapezoid',
  'parallelogram',
  'pentagon',
  'hexagon',
  'heptagon',
  'octagon',
  'nonagon',
  'decagon',
  'polygon',

  // خطوط، أسهم ومنحنيات بيزييه
  'line',
  'arrow',
  'double_arrow',
  'curved_arrow',
  'block_arrow',
  'bezier_curve',
  'cubic_bezier',
  'arc',
  'wave',
  'spiral',

  // رموز وأشكال توضيحية
  'star',
  'heart',
  'crescent',
  'speech_bubble',
  'cloud',
  'cross',
] as const;

export type ShapeToolType = typeof SHAPE_TOOL_TYPES[number];

export const isShapeTool = (tool: ToolType): tool is ShapeToolType => {
  return (SHAPE_TOOL_TYPES as readonly string[]).includes(tool);
};

export interface ShapeCategory {
  title: string;
  shapes: {
    id: ToolType;
    name: string;
    iconName: string;
  }[];
}

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    title: 'أشكال أساسية ومستطيلات',
    shapes: [
      { id: 'rectangle', name: 'مستطيل', iconName: 'Square' },
      { id: 'square', name: 'مربع متساوي', iconName: 'Square' },
      { id: 'rounded_rectangle', name: 'مستطيل مستدير', iconName: 'RectangleHorizontal' },
      { id: 'circle', name: 'دائرة منتظمة', iconName: 'Circle' },
      { id: 'ellipse', name: 'شكل بيضاوي', iconName: 'Circle' },
    ],
  },
  {
    title: 'مثلثات ورباعيات',
    shapes: [
      { id: 'triangle', name: 'مثلث متساوي', iconName: 'Triangle' },
      { id: 'right_triangle', name: 'مثلث قائم الزاوية', iconName: 'Triangle' },
      { id: 'diamond', name: 'معين هندسي', iconName: 'Diamond' },
      { id: 'parallelogram', name: 'متوازي أضلاع', iconName: 'Square' },
      { id: 'trapezoid', name: 'شبه منحرف', iconName: 'Square' },
    ],
  },
  {
    title: 'مضلعات منتظمة',
    shapes: [
      { id: 'pentagon', name: 'خماسي الأضلاع', iconName: 'Pentagon' },
      { id: 'hexagon', name: 'سداسي الأضلاع', iconName: 'Hexagon' },
      { id: 'heptagon', name: 'سباعي الأضلاع', iconName: 'Hexagon' },
      { id: 'octagon', name: 'ثماني الأضلاع', iconName: 'Octagon' },
      { id: 'nonagon', name: 'تساعي الأضلاع', iconName: 'Octagon' },
      { id: 'decagon', name: 'عشاري الأضلاع', iconName: 'Octagon' },
      { id: 'polygon', name: 'مضلع مخصص', iconName: 'Pentagon' },
    ],
  },
  {
    title: 'خطوط، أسهم ومنحنيات بيزييه',
    shapes: [
      { id: 'line', name: 'خط مستقيم', iconName: 'Minus' },
      { id: 'arrow', name: 'سهم متجه', iconName: 'ArrowUpRight' },
      { id: 'double_arrow', name: 'سهم مزدوج الاتجاه', iconName: 'ArrowLeftRight' },
      { id: 'curved_arrow', name: 'سهم منحني', iconName: 'ArrowUpRight' },
      { id: 'block_arrow', name: 'سهم عريض', iconName: 'ArrowUpRight' },
      { id: 'bezier_curve', name: 'منحنى بيزييه', iconName: 'Spline' },
      { id: 'cubic_bezier', name: 'منحنى S تكعيبي', iconName: 'Spline' },
      { id: 'arc', name: 'قوس دائري', iconName: 'Spline' },
      { id: 'wave', name: 'موجة متعرجة', iconName: 'Waves' },
      { id: 'spiral', name: 'حلزوني', iconName: 'Spline' },
    ],
  },
  {
    title: 'أشكال خاصة ورموز',
    shapes: [
      { id: 'star', name: 'نجمة', iconName: 'Star' },
      { id: 'heart', name: 'قلب', iconName: 'Heart' },
      { id: 'crescent', name: 'هلال', iconName: 'Moon' },
      { id: 'speech_bubble', name: 'فقاعة حوار', iconName: 'MessageSquare' },
      { id: 'cloud', name: 'سحابة', iconName: 'Cloud' },
      { id: 'cross', name: 'إشارة زائد / صليب', iconName: 'Plus' },
    ],
  },
];

/**
 * Draws any geometric shape or Bezier curve with support for fill, stroke, strokeWidth, and opacity
 */
export function drawGeometricShape(
  ctx: CanvasRenderingContext2D,
  tool: ToolType,
  sx: number,
  sy: number,
  curX: number,
  curY: number,
  color: string,
  options: ShapeOptions,
  opacity: number = 1
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, options.strokeWidth);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity;

  const minX = Math.min(sx, curX);
  const maxX = Math.max(sx, curX);
  const minY = Math.min(sy, curY);
  const maxY = Math.max(sy, curY);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const cx = (sx + curX) / 2;
  const cy = (sy + curY) / 2;

  const doFillAndStroke = () => {
    if (options.fill) ctx.fill();
    if (options.stroke) ctx.stroke();
  };

  switch (tool) {
    // ---- الخطوط والأسهم والمنحنيات ----
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // رأس السهم عند نقطة النهاية (curX, curY)
      const angle = Math.atan2(curY - sy, curX - sx);
      const headLen = Math.max(12, options.strokeWidth * 3.2);
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(
        curX - headLen * Math.cos(angle - Math.PI / 6),
        curY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        curX - (headLen * 0.7) * Math.cos(angle),
        curY - (headLen * 0.7) * Math.sin(angle)
      );
      ctx.lineTo(
        curX - headLen * Math.cos(angle + Math.PI / 6),
        curY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'double_arrow': {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      const angle = Math.atan2(curY - sy, curX - sx);
      const headLen = Math.max(12, options.strokeWidth * 3.2);

      // رأس السهم الأول عند curX, curY
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(
        curX - headLen * Math.cos(angle - Math.PI / 6),
        curY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        curX - (headLen * 0.7) * Math.cos(angle),
        curY - (headLen * 0.7) * Math.sin(angle)
      );
      ctx.lineTo(
        curX - headLen * Math.cos(angle + Math.PI / 6),
        curY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // رأس السهم الثاني عند sx, sy
      const revAngle = angle + Math.PI;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx - headLen * Math.cos(revAngle - Math.PI / 6),
        sy - headLen * Math.sin(revAngle - Math.PI / 6)
      );
      ctx.lineTo(
        sx - (headLen * 0.7) * Math.cos(revAngle),
        sy - (headLen * 0.7) * Math.sin(revAngle)
      );
      ctx.lineTo(
        sx - headLen * Math.cos(revAngle + Math.PI / 6),
        sy - headLen * Math.sin(revAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'curved_arrow': {
      const curvature = (options.curveCurvature !== undefined ? options.curveCurvature : 40) / 100;
      const dx = curX - sx;
      const dy = curY - sy;
      const midX = (sx + curX) / 2;
      const midY = (sy + curY) / 2;
      const cpx = midX - dy * curvature;
      const cpy = midY + dx * curvature;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpx, cpy, curX, curY);
      ctx.stroke();

      // زاوية رأس السهم عند نقطة النهاية مشتقة من نقطة التحكم
      const tipAngle = Math.atan2(curY - cpy, curX - cpx);
      const headLen = Math.max(12, options.strokeWidth * 3.2);
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(
        curX - headLen * Math.cos(tipAngle - Math.PI / 6),
        curY - headLen * Math.sin(tipAngle - Math.PI / 6)
      );
      ctx.lineTo(
        curX - (headLen * 0.7) * Math.cos(tipAngle),
        curY - (headLen * 0.7) * Math.sin(tipAngle)
      );
      ctx.lineTo(
        curX - headLen * Math.cos(tipAngle + Math.PI / 6),
        curY - headLen * Math.sin(tipAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'block_arrow': {
      const angle = Math.atan2(curY - sy, curX - sx);
      const dist = Math.hypot(curX - sx, curY - sy);
      const headL = Math.min(dist * 0.45, Math.max(24, options.strokeWidth * 5));
      const shaftW = Math.max(10, options.strokeWidth * 3);
      const headW = Math.max(20, options.strokeWidth * 6);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, -shaftW / 2);
      ctx.lineTo(dist - headL, -shaftW / 2);
      ctx.lineTo(dist - headL, -headW / 2);
      ctx.lineTo(dist, 0);
      ctx.lineTo(dist - headL, headW / 2);
      ctx.lineTo(dist - headL, shaftW / 2);
      ctx.lineTo(0, shaftW / 2);
      ctx.closePath();

      doFillAndStroke();
      ctx.restore();
      break;
    }

    // ---- منحنيات بيزييه والأقواس ----
    case 'bezier_curve': {
      const curvature = (options.curveCurvature !== undefined ? options.curveCurvature : 45) / 100;
      const dx = curX - sx;
      const dy = curY - sy;
      const midX = (sx + curX) / 2;
      const midY = (sy + curY) / 2;
      const cpx = midX - dy * curvature;
      const cpy = midY + dx * curvature;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpx, cpy, curX, curY);
      ctx.stroke();

      if (options.fill) {
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'cubic_bezier': {
      const curvature = (options.curveCurvature !== undefined ? options.curveCurvature : 45) / 100;
      const dx = curX - sx;
      const dy = curY - sy;
      const cp1x = sx + dx * 0.33 - dy * curvature;
      const cp1y = sy + dy * 0.33 + dx * curvature;
      const cp2x = sx + dx * 0.66 + dy * curvature;
      const cp2y = sy + dy * 0.66 - dx * curvature;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curX, curY);
      ctx.stroke();

      if (options.fill) {
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'arc': {
      const radius = Math.hypot(curX - sx, curY - sy) / 2;
      const angle = Math.atan2(curY - sy, curX - sx);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, radius), angle - Math.PI / 2, angle + Math.PI / 2, false);
      ctx.stroke();
      if (options.fill) {
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'wave': {
      const dx = curX - sx;
      const dy = curY - sy;
      const segments = 4;
      const waveHeight = 0.25;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (let i = 1; i <= segments; i++) {
        const tPrev = (i - 1) / segments;
        const tCurr = i / segments;
        const tMid = (tPrev + tCurr) / 2;
        const sign = i % 2 === 1 ? 1 : -1;
        const px = sx + dx * tCurr;
        const py = sy + dy * tCurr;
        const cpx = sx + dx * tMid - dy * waveHeight * sign;
        const cpy = sy + dy * tMid + dx * waveHeight * sign;
        ctx.quadraticCurveTo(cpx, cpy, px, py);
      }
      ctx.stroke();
      if (options.fill) {
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'spiral': {
      ctx.beginPath();
      const maxR = Math.max(w, h) / 2;
      const coils = 3.5;
      const totalSteps = Math.floor(coils * 40);
      for (let i = 0; i <= totalSteps; i++) {
        const theta = (i / totalSteps) * (coils * 2 * Math.PI);
        const r = (i / totalSteps) * maxR;
        const px = cx + r * Math.cos(theta);
        const py = cy + r * Math.sin(theta);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }

    // ---- الأشكال الأساسية والمستطيلات ----
    case 'rectangle': {
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      doFillAndStroke();
      break;
    }

    case 'square': {
      const size = Math.max(w, h);
      const startX = curX >= sx ? sx : sx - size;
      const startY = curY >= sy ? sy : sy - size;
      ctx.beginPath();
      ctx.rect(startX, startY, size, size);
      doFillAndStroke();
      break;
    }

    case 'rounded_rectangle': {
      const radius = Math.min(options.cornerRadius || 16, w / 2, h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(minX, minY, w, h, radius);
      } else {
        ctx.moveTo(minX + radius, minY);
        ctx.lineTo(maxX - radius, minY);
        ctx.arcTo(maxX, minY, maxX, minY + radius, radius);
        ctx.lineTo(maxX, maxY - radius);
        ctx.arcTo(maxX, maxY, maxX - radius, maxY, radius);
        ctx.lineTo(minX + radius, maxY);
        ctx.arcTo(minX, maxY, minX, maxY - radius, radius);
        ctx.lineTo(minX, minY + radius);
        ctx.arcTo(minX, minY, minX + radius, minY, radius);
        ctx.closePath();
      }
      doFillAndStroke();
      break;
    }

    case 'ellipse': {
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      doFillAndStroke();
      break;
    }

    case 'circle': {
      const r = Math.max(w, h) / 2;
      const circX = sx + (curX >= sx ? r : -r);
      const circY = sy + (curY >= sy ? r : -r);
      ctx.beginPath();
      ctx.arc(circX, circY, r, 0, Math.PI * 2);
      doFillAndStroke();
      break;
    }

    // ---- المثلثات والمضلعات ----
    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(maxX, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'right_triangle': {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, curY);
      ctx.lineTo(curX, curY);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(maxX, cy);
      ctx.lineTo(cx, maxY);
      ctx.lineTo(minX, cy);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'trapezoid': {
      const topIndent = w * 0.22;
      ctx.beginPath();
      ctx.moveTo(minX + topIndent, minY);
      ctx.lineTo(maxX - topIndent, minY);
      ctx.lineTo(maxX, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'parallelogram': {
      const skew = w * 0.25;
      ctx.beginPath();
      ctx.moveTo(minX + skew, minY);
      ctx.lineTo(maxX, minY);
      ctx.lineTo(maxX - skew, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'pentagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 5);
      doFillAndStroke();
      break;
    }

    case 'hexagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 6);
      doFillAndStroke();
      break;
    }

    case 'heptagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 7);
      doFillAndStroke();
      break;
    }

    case 'octagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 8);
      doFillAndStroke();
      break;
    }

    case 'nonagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 9);
      doFillAndStroke();
      break;
    }

    case 'decagon': {
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, 10);
      doFillAndStroke();
      break;
    }

    case 'polygon': {
      const sides = Math.max(3, options.polygonSides || 6);
      drawRegularPolygon(ctx, cx, cy, Math.max(w, h) / 2, sides);
      doFillAndStroke();
      break;
    }

    // ---- الرموز والأشكال التوضيحية ----
    case 'star': {
      const points = Math.max(3, options.starPoints || 5);
      const rOuter = Math.max(w, h) / 2;
      const rInner = rOuter * 0.45;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const a = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'heart': {
      ctx.beginPath();
      const topCurveHeight = h * 0.3;
      ctx.moveTo(cx, minY + topCurveHeight);
      ctx.bezierCurveTo(cx, minY, minX, minY, minX, minY + topCurveHeight);
      ctx.bezierCurveTo(minX, minY + (h + topCurveHeight) / 2, cx, minY + (h + topCurveHeight) / 2, cx, maxY);
      ctx.bezierCurveTo(cx, minY + (h + topCurveHeight) / 2, maxX, minY + (h + topCurveHeight) / 2, maxX, minY + topCurveHeight);
      ctx.bezierCurveTo(maxX, minY, cx, minY, cx, minY + topCurveHeight);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'crescent': {
      const r = Math.max(w, h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 0.4, Math.PI * 0.8, false);
      ctx.arc(cx + r * 0.4, cy - r * 0.1, r * 0.85, Math.PI * 0.8, -Math.PI * 0.4, true);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'speech_bubble': {
      const radius = Math.min(16, w / 4, h / 4);
      const tailH = Math.min(20, h * 0.25);
      const bodyH = Math.max(10, h - tailH);
      ctx.beginPath();
      ctx.moveTo(minX + radius, minY);
      ctx.lineTo(maxX - radius, minY);
      ctx.arcTo(maxX, minY, maxX, minY + radius, radius);
      ctx.lineTo(maxX, minY + bodyH - radius);
      ctx.arcTo(maxX, minY + bodyH, maxX - radius, minY + bodyH, radius);
      ctx.lineTo(minX + w * 0.45, minY + bodyH);
      ctx.lineTo(minX + w * 0.25, maxY);
      ctx.lineTo(minX + w * 0.3, minY + bodyH);
      ctx.lineTo(minX + radius, minY + bodyH);
      ctx.arcTo(minX, minY + bodyH, minX, minY + bodyH - radius, radius);
      ctx.lineTo(minX, minY + radius);
      ctx.arcTo(minX, minY, minX + radius, minY, radius);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'cloud': {
      ctx.beginPath();
      const r1 = w * 0.18;
      const r2 = w * 0.26;
      const r3 = w * 0.22;
      const r4 = w * 0.16;
      ctx.arc(minX + r1, maxY - r1, r1, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(minX + w * 0.35, minY + h * 0.45, r2, Math.PI * 0.9, Math.PI * 1.9);
      ctx.arc(minX + w * 0.68, minY + h * 0.5, r3, Math.PI * 1.2, Math.PI * 0.1);
      ctx.arc(maxX - r4, maxY - r4, r4, -Math.PI * 0.3, Math.PI * 0.5);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    case 'cross': {
      const arm = Math.min(w, h) * 0.32;
      ctx.beginPath();
      ctx.moveTo(cx - arm / 2, minY);
      ctx.lineTo(cx + arm / 2, minY);
      ctx.lineTo(cx + arm / 2, cy - arm / 2);
      ctx.lineTo(maxX, cy - arm / 2);
      ctx.lineTo(maxX, cy + arm / 2);
      ctx.lineTo(cx + arm / 2, cy + arm / 2);
      ctx.lineTo(cx + arm / 2, maxY);
      ctx.lineTo(cx - arm / 2, maxY);
      ctx.lineTo(cx - arm / 2, cy + arm / 2);
      ctx.lineTo(minX, cy + arm / 2);
      ctx.lineTo(minX, cy - arm / 2);
      ctx.lineTo(cx - arm / 2, cy - arm / 2);
      ctx.closePath();
      doFillAndStroke();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

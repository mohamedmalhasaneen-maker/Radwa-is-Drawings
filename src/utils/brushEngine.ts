import { BrushSettings, StrokePoint } from '../types';

export class BrushRenderer {
  private lastPoint: StrokePoint | null = null;
  private points: StrokePoint[] = [];

  public startStroke(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    brush: BrushSettings,
    colorHex: string,
    isEraser: boolean = false
  ) {
    this.points = [point];
    this.lastPoint = point;
    this.drawDot(ctx, point, brush, colorHex, isEraser);
  }

  public continueStroke(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    brush: BrushSettings,
    colorHex: string,
    isEraser: boolean = false
  ) {
    this.points.push(point);

    if (this.points.length < 2) return;

    // Stroke smoothing / stabilization
    const p1 = this.points[this.points.length - 2];
    const p2 = this.points[this.points.length - 1];

    // Distance and interpolation steps
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Spacing based on brush size
    const effectiveSize = this.calculateSize(brush, p2.pressure);
    const step = Math.max(1, effectiveSize * Math.max(0.04, brush.spacing));
    const numSteps = Math.ceil(dist / step);

    for (let i = 1; i <= numSteps; i++) {
      const t = i / numSteps;
      const interpX = p1.x + dx * t;
      const interpY = p1.y + dy * t;
      const interpPressure = p1.pressure + (p2.pressure - p1.pressure) * t;

      this.renderDab(
        ctx,
        interpX,
        interpY,
        interpPressure,
        brush,
        colorHex,
        Math.atan2(dy, dx),
        isEraser
      );
    }

    this.lastPoint = point;
  }

  public endStroke() {
    this.points = [];
    this.lastPoint = null;
  }

  private calculateSize(brush: BrushSettings, pressure: number): number {
    let size = brush.size;
    if (brush.pressureSize && pressure > 0) {
      // Linear or curved pressure scale
      const pressureCurve = Math.pow(pressure, 1.1);
      size = Math.max(1, brush.size * (0.2 + 0.8 * pressureCurve));
    }
    return size;
  }

  private calculateOpacity(brush: BrushSettings, pressure: number): number {
    let alpha = brush.opacity * brush.flow;
    if (brush.pressureOpacity && pressure > 0) {
      alpha = Math.max(0.05, alpha * (0.3 + 0.7 * pressure));
    }
    return Math.min(1.0, alpha);
  }

  private drawDot(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    brush: BrushSettings,
    colorHex: string,
    isEraser: boolean = false
  ) {
    this.renderDab(ctx, point.x, point.y, point.pressure, brush, colorHex, 0, isEraser);
  }

  private renderDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings,
    colorHex: string,
    strokeAngle: number,
    isEraser: boolean = false
  ) {
    const size = this.calculateSize(brush, pressure);
    const opacity = this.calculateOpacity(brush, pressure);

    ctx.save();

    // Actual Eraser implementation: erases pixels from current active layer
    if (isEraser || brush.id === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      const radius = size / 2;
      if (brush.hardness < 0.85) {
        const gradient = ctx.createRadialGradient(x, y, radius * brush.hardness, x, y, radius);
        gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      }
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Calligraphy Nib Brush
    if (brush.id === 'calligraphy') {
      ctx.translate(x, y);
      const angleRad = (brush.angle * Math.PI) / 180;
      ctx.rotate(angleRad);
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = opacity;
      // Slanted ribbon ellipse / rectangle
      const width = size;
      const height = Math.max(1.5, size * 0.22);
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.restore();
      return;
    }

    // Pixel Art Brush (Strict nearest neighbor, integer coordinates)
    if (brush.id === 'pixel') {
      const pxSize = Math.max(1, Math.round(size));
      const pxX = Math.floor(x - pxSize / 2);
      const pxY = Math.floor(y - pxSize / 2);
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = opacity;
      ctx.fillRect(pxX, pxY, pxSize, pxSize);
      ctx.restore();
      return;
    }

    // Smudge / Blend Brush
    if (brush.id === 'smudge' || brush.id === 'blur') {
      const radius = Math.round(size / 2);
      const sampleX = Math.max(0, Math.round(x - radius));
      const sampleY = Math.max(0, Math.round(y - radius));
      const diameter = radius * 2;

      try {
        const imgData = ctx.getImageData(sampleX, sampleY, diameter, diameter);
        const data = imgData.data;

        // Apply fast box blur to the sampled circle
        if (brush.id === 'blur') {
          for (let py = 1; py < diameter - 1; py += 2) {
            for (let px = 1; px < diameter - 1; px += 2) {
              const idx = (py * diameter + px) * 4;
              const rightIdx = (py * diameter + px + 1) * 4;
              const downIdx = ((py + 1) * diameter + px) * 4;

              for (let c = 0; c < 4; c++) {
                const avg = (data[idx + c] + data[rightIdx + c] + data[downIdx + c]) / 3;
                data[idx + c] = avg;
              }
            }
          }
        }

        ctx.globalAlpha = opacity * 0.7;
        ctx.putImageData(imgData, sampleX, sampleY);
      } catch (e) {
        // Fallback if coordinates out of bounds
      }
      ctx.restore();
      return;
    }

    // Spray / Airbrush / Charcoal / Chalk Scatter
    if (brush.scatter > 0 || brush.id === 'spray' || brush.id === 'charcoal' || brush.id === 'chalk') {
      const particles = Math.max(3, Math.floor(size * 0.75 * (brush.scatter / 3)));
      ctx.fillStyle = colorHex;

      for (let p = 0; p < particles; p++) {
        const radiusDist = (Math.random() * size) / 2;
        const randAngle = Math.random() * Math.PI * 2;
        const px = x + Math.cos(randAngle) * radiusDist;
        const py = y + Math.sin(randAngle) * radiusDist;
        const pRadius = brush.id === 'spray' ? Math.random() * 1.5 + 0.5 : Math.random() * 2 + 1;
        const pAlpha = opacity * (1 - (radiusDist / (size / 2)) * 0.6) * Math.random();

        ctx.globalAlpha = Math.max(0.02, Math.min(1.0, pAlpha));
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Soft Brush vs Hard Brush Gradient Falloff
    const radius = size / 2;
    if (brush.hardness < 0.85) {
      const gradient = ctx.createRadialGradient(x, y, radius * brush.hardness, x, y, radius);
      gradient.addColorStop(0, colorHex);
      gradient.addColorStop(1, 'transparent');

      ctx.globalAlpha = opacity;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crisp round dot
      ctx.globalAlpha = opacity;
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

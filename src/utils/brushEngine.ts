import { BrushSettings, StrokePoint } from '../types';

export class BrushRenderer {
  private lastPoint: StrokePoint | null = null;
  private points: StrokePoint[] = [];
  private smudgeHead: {
    data: Float32Array;
    width: number;
    height: number;
  } | null = null;

  public startStroke(
    ctx: CanvasRenderingContext2D,
    point: StrokePoint,
    brush: BrushSettings,
    colorHex: string,
    isEraser: boolean = false
  ) {
    this.points = [point];
    this.lastPoint = point;
    this.smudgeHead = null;
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
    this.smudgeHead = null;
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

    // Charcoal / Kneaded Eraser (استيكة الفحم العجين - تفتيح تدريجي وحبيبي)
    if (brush.id === 'charcoal_eraser') {
      this.renderCharcoalEraserDab(ctx, x, y, pressure, brush);
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

    // Graphite Pencil Set
    if (brush.category === '✏️ أقلام الجرافيت') {
      this.renderGraphitePencilDab(ctx, x, y, pressure, brush, colorHex);
      ctx.restore();
      return;
    }

    // Glow / Light Brush
    if (brush.id === 'glow_light') {
      this.renderGlowDab(ctx, x, y, pressure, brush, colorHex);
      ctx.restore();
      return;
    }

    // Laser Brush (Pure Additive Light Only - No Dark Halos)
    if (brush.id === 'laser') {
      this.renderLaserDab(ctx, x, y, pressure, brush, colorHex);
      ctx.restore();
      return;
    }

    // Smudge / Blend Brush
    if (brush.id === 'smudge') {
      this.renderSmudgeDab(ctx, x, y, pressure, brush);
      ctx.restore();
      return;
    }

    // Blur Brush
    if (brush.id === 'blur') {
      this.renderBlurDab(ctx, x, y, pressure, brush);
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

  private renderSmudgeDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = Math.max(1, Math.round(size / 2));
    const diameter = radius * 2;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate bounds around (x, y)
    const left = Math.floor(x - radius);
    const top = Math.floor(y - radius);
    const sampleX = Math.max(0, Math.min(canvasWidth - 1, left));
    const sampleY = Math.max(0, Math.min(canvasHeight - 1, top));
    const sampleW = Math.max(1, Math.min(canvasWidth - sampleX, diameter));
    const sampleH = Math.max(1, Math.min(canvasHeight - sampleY, diameter));

    if (sampleW <= 0 || sampleH <= 0) return;

    // Get current layer destination pixels
    const dstImgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const dstData = dstImgData.data;

    // Initialize or adapt brush head pickup buffer
    if (
      !this.smudgeHead ||
      this.smudgeHead.width !== sampleW ||
      this.smudgeHead.height !== sampleH
    ) {
      const headBuffer = new Float32Array(sampleW * sampleH * 4);
      for (let i = 0; i < dstData.length; i++) {
        headBuffer[i] = dstData[i];
      }
      this.smudgeHead = {
        data: headBuffer,
        width: sampleW,
        height: sampleH,
      };
    }

    // Brush settings mapping
    let strength = Math.max(0.01, Math.min(1.0, brush.opacity));
    if (brush.pressureOpacity && pressure > 0) {
      strength = Math.max(0.02, strength * (0.2 + 0.8 * pressure));
    }
    const flow = Math.max(0.01, Math.min(1.0, brush.flow));
    const hardness = Math.min(0.98, Math.max(0.0, brush.hardness));

    const headData = this.smudgeHead.data;
    const centerXRel = x - sampleX;
    const centerYRel = y - sampleY;

    // Pickup rate: controls how fast new colors blend into the brush head
    const pickupRate = Math.min(0.85, (1.0 - strength * 0.4) * flow * 0.45);

    for (let py = 0; py < sampleH; py++) {
      for (let px = 0; px < sampleW; px++) {
        const idx = (py * sampleW + px) * 4;

        const dx = px - centerXRel;
        const dy = py - centerYRel;
        const distSq = dx * dx + dy * dy;

        if (distSq > radius * radius) continue;

        const dist = Math.sqrt(distSq);
        const normDist = dist / radius;

        let mask = 1.0;
        if (normDist > hardness) {
          const t = (normDist - hardness) / (1.0 - hardness);
          mask = 0.5 * (1.0 + Math.cos(t * Math.PI));
        }

        const alpha = strength * mask;

        // Source / Head color
        const sr = headData[idx];
        const sg = headData[idx + 1];
        const sb = headData[idx + 2];
        const sa = headData[idx + 3];

        // Destination / Canvas color
        const dr = dstData[idx];
        const dg = dstData[idx + 1];
        const db = dstData[idx + 2];
        const da = dstData[idx + 3];

        if (sa > 0 || da > 0) {
          const blendFactor = Math.min(1.0, alpha * (sa > 0 ? sa / 255.0 : 0.5));

          // Destination pixel becomes a smooth blend of source and destination
          dstData[idx]     = Math.round(dr + (sr - dr) * blendFactor);
          dstData[idx + 1] = Math.round(dg + (sg - dg) * blendFactor);
          dstData[idx + 2] = Math.round(db + (sb - db) * blendFactor);
          dstData[idx + 3] = Math.round(da + (sa - da) * (blendFactor * 0.5));

          // Update brush head color by picking up canvas color
          const pick = pickupRate * mask;
          headData[idx]     += (dr - sr) * pick;
          headData[idx + 1] += (dg - sg) * pick;
          headData[idx + 2] += (db - sb) * pick;
          headData[idx + 3] += (da - sa) * pick;
        }
      }
    }

    // Put modified pixels back to layer
    ctx.putImageData(dstImgData, sampleX, sampleY);
  }

  private renderBlurDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = Math.max(1, Math.round(size / 2));
    const diameter = radius * 2;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    const left = Math.floor(x - radius);
    const top = Math.floor(y - radius);
    const sampleX = Math.max(0, Math.min(canvasWidth - 1, left));
    const sampleY = Math.max(0, Math.min(canvasHeight - 1, top));
    const sampleW = Math.max(1, Math.min(canvasWidth - sampleX, diameter));
    const sampleH = Math.max(1, Math.min(canvasHeight - sampleY, diameter));

    if (sampleW <= 2 || sampleH <= 2) return;

    const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const data = imgData.data;
    const temp = new Uint8ClampedArray(data);

    let strength = Math.min(1.0, brush.opacity * brush.flow);
    if (brush.pressureOpacity && pressure > 0) {
      strength *= pressure;
    }

    const centerXRel = x - sampleX;
    const centerYRel = y - sampleY;

    for (let py = 1; py < sampleH - 1; py++) {
      for (let px = 1; px < sampleW - 1; px++) {
        const dx = px - centerXRel;
        const dy = py - centerYRel;
        if (dx * dx + dy * dy > radius * radius) continue;

        const idx = (py * sampleW + px) * 4;

        let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kIdx = ((py + ky) * sampleW + (px + kx)) * 4;
            rAcc += temp[kIdx];
            gAcc += temp[kIdx + 1];
            bAcc += temp[kIdx + 2];
            aAcc += temp[kIdx + 3];
          }
        }

        const avgR = rAcc / 9;
        const avgG = gAcc / 9;
        const avgB = bAcc / 9;
        const avgA = aAcc / 9;

        data[idx]     = Math.round(data[idx] + (avgR - data[idx]) * strength);
        data[idx + 1] = Math.round(data[idx + 1] + (avgG - data[idx + 1]) * strength);
        data[idx + 2] = Math.round(data[idx + 2] + (avgB - data[idx + 2]) * strength);
        data[idx + 3] = Math.round(data[idx + 3] + (avgA - data[idx + 3]) * strength);
      }
    }

    ctx.putImageData(imgData, sampleX, sampleY);
  }

  private renderGlowDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings,
    colorHex: string
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = Math.max(1, size / 2);

    let alpha = brush.opacity * brush.flow;
    if (brush.pressureOpacity && pressure > 0) {
      alpha *= Math.max(0.15, pressure);
    }
    const buildUpFactor = brush.buildUp ?? 0.75;
    alpha = Math.min(1.0, alpha * (0.3 + 0.7 * buildUpFactor));

    // Parse colorHex
    let hex = colorHex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16) || 255;
    const g = parseInt(hex.slice(2, 4), 16) || 255;
    const b = parseInt(hex.slice(4, 6), 16) || 255;

    ctx.save();
    ctx.globalCompositeOperation = brush.blendMode || 'screen';

    // 1. Ambient Glow Halo
    const glowHalo = brush.glowAmount ?? 0.85;
    if (glowHalo > 0.05) {
      const haloRadius = radius * (1.2 + 0.8 * glowHalo);
      const haloGradient = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
      haloGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35 * glowHalo})`);
      haloGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.15 * glowHalo})`);
      haloGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Main Luminous Gradient Core
    const hardness = Math.min(0.9, Math.max(0.0, brush.hardness));
    const innerRadius = radius * hardness;

    const coreGradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    coreGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    coreGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.75})`);
    coreGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
    coreGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Ultra Luminous Core Center
    if (alpha > 0.25) {
      const hotCoreRadius = Math.max(1, radius * 0.22);
      const hotCoreGrad = ctx.createRadialGradient(x, y, 0, x, y, hotCoreRadius);
      const wr = Math.round(r + (255 - r) * 0.65);
      const wg = Math.round(g + (255 - g) * 0.65);
      const wb = Math.round(b + (255 - b) * 0.65);
      hotCoreGrad.addColorStop(0, `rgba(${wr}, ${wg}, ${wb}, ${alpha * 0.65})`);
      hotCoreGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = hotCoreGrad;
      ctx.beginPath();
      ctx.arc(x, y, hotCoreRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderLaserDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings,
    colorHex: string
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = Math.max(1, Math.round(size / 2));
    const diameter = radius * 2;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate bounds around (x, y)
    const left = Math.floor(x - radius);
    const top = Math.floor(y - radius);
    const sampleX = Math.max(0, Math.min(canvasWidth - 1, left));
    const sampleY = Math.max(0, Math.min(canvasHeight - 1, top));
    const sampleW = Math.max(1, Math.min(canvasWidth - sampleX, diameter));
    const sampleH = Math.max(1, Math.min(canvasHeight - sampleY, diameter));

    if (sampleW <= 0 || sampleH <= 0) return;

    // Read existing pixels from the layer
    const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const data = imgData.data;

    // Parse laser color Hex
    let hex = colorHex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const lr = parseInt(hex.slice(0, 2), 16) || 255;
    const lg = parseInt(hex.slice(2, 4), 16) || 255;
    const lb = parseInt(hex.slice(4, 6), 16) || 255;

    // Calculate strength / alpha parameters
    let strength = brush.opacity * brush.flow;
    if (brush.pressureOpacity && pressure > 0) {
      strength *= Math.max(0.15, pressure);
    }
    const buildUpFactor = brush.buildUp ?? 0.8;
    strength = Math.min(1.0, strength * (0.3 + 0.7 * buildUpFactor));

    const hardness = Math.min(0.9, Math.max(0.0, brush.hardness));
    const centerXRel = x - sampleX;
    const centerYRel = y - sampleY;

    let modifiedAny = false;

    for (let py = 0; py < sampleH; py++) {
      for (let px = 0; px < sampleW; px++) {
        const idx = (py * sampleW + px) * 4;
        const origAlpha = data[idx + 3];

        // STRICT REQUIREMENT: Only affect pixels that have painted content (Alpha > 0)
        // Never draw anything on transparent areas (Alpha === 0)
        if (origAlpha === 0) continue;

        const dx = px - centerXRel;
        const dy = py - centerYRel;
        const distSq = dx * dx + dy * dy;

        if (distSq > radius * radius) continue;

        const dist = Math.sqrt(distSq);
        const normDist = dist / radius;

        // Radial falloff mask for the laser brush
        let mask = 1.0;
        if (normDist > hardness) {
          const t = (normDist - hardness) / (1.0 - hardness);
          mask = 0.5 * (1.0 + Math.cos(t * Math.PI));
        }

        // Scale by pixel's existing alpha so semi-transparent edges fade naturally
        const alphaFactor = origAlpha / 255.0;
        const effectiveLight = strength * mask * alphaFactor;

        if (effectiveLight <= 0) continue;

        // Additive Light calculation on existing RGB
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Lighten / Additive Light equation:
        // Add laser color scaled by effectiveLight, plus white-hot center core
        const coreFactor = Math.max(0, 1.0 - normDist / 0.35);
        const whiteHotBoost = Math.round(255 * effectiveLight * 0.45 * coreFactor);

        data[idx]     = Math.min(255, Math.round(r + lr * effectiveLight * 0.85 + whiteHotBoost));
        data[idx + 1] = Math.min(255, Math.round(g + lg * effectiveLight * 0.85 + whiteHotBoost));
        data[idx + 2] = Math.min(255, Math.round(b + lb * effectiveLight * 0.85 + whiteHotBoost));

        // ABSOLUTE CRITICAL: Final Alpha MUST equal Original Alpha!
        data[idx + 3] = origAlpha;

        modifiedAny = true;
      }
    }

    if (modifiedAny) {
      ctx.putImageData(imgData, sampleX, sampleY);
    }
  }

  private renderGraphitePencilDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings,
    colorHex: string
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = size / 2;
    const opacity = this.calculateOpacity(brush, pressure);

    const isHard = brush.id.includes('h');
    const isSoft = brush.id.includes('b');
    
    let grainDensity = 0.55; 
    let particleSizeRange = { min: 0.4, max: 1.2 };
    let particleCount = Math.max(8, Math.floor(size * 1.5));

    if (isHard) {
      grainDensity = 0.35;
      particleSizeRange = { min: 0.2, max: 0.7 };
      particleCount = Math.max(5, Math.floor(size * 1.0));
    } else if (isSoft) {
      grainDensity = 0.75;
      particleSizeRange = { min: 0.6, max: 1.8 };
      particleCount = Math.max(12, Math.floor(size * 2.2));
    }

    ctx.save();
    ctx.fillStyle = colorHex;
    
    let rgb = '0,0,0';
    let hex = colorHex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      rgb = `${r},${g},${b}`;
    }

    for (let i = 0; i < particleCount; i++) {
      const rand1 = this.pseudoRandom(x * 100 + i, y * 100 - i);
      const rand2 = this.pseudoRandom(y * 50 - i, x * 50 + i);
      
      const angle = rand1 * Math.PI * 2;
      const dist = Math.pow(rand2, 1.3) * radius; 
      
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      
      const paperToothNoise = this.pseudoRandom(Math.floor(px * 1.5), Math.floor(py * 1.5));
      
      if (paperToothNoise > grainDensity) continue;
      
      const pSize = particleSizeRange.min + (particleSizeRange.max - particleSizeRange.min) * this.pseudoRandom(i * 13, i * 37);
      
      const distRatio = dist / radius;
      const radialFalloff = Math.cos(distRatio * Math.PI / 2);
      const particleOpacity = opacity * radialFalloff * (0.4 + 0.6 * (1 - paperToothNoise));
      
      ctx.globalAlpha = Math.max(0.01, Math.min(1.0, particleOpacity));
      
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  private renderCharcoalEraserDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pressure: number,
    brush: BrushSettings
  ) {
    const size = this.calculateSize(brush, pressure);
    const radius = Math.max(1, Math.round(size / 2));
    const diameter = radius * 2;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate sample bounding box around center (x, y)
    const left = Math.floor(x - radius);
    const top = Math.floor(y - radius);
    const sampleX = Math.max(0, Math.min(canvasWidth - 1, left));
    const sampleY = Math.max(0, Math.min(canvasHeight - 1, top));
    const sampleW = Math.max(1, Math.min(canvasWidth - sampleX, diameter));
    const sampleH = Math.max(1, Math.min(canvasHeight - sampleY, diameter));

    if (sampleW <= 0 || sampleH <= 0) return;

    // Read existing pixels from the active layer
    const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const data = imgData.data;

    // Strength & flow calculations with pressure dynamics
    let strength = Math.max(0.01, Math.min(1.0, brush.opacity));
    if (brush.pressureOpacity && pressure > 0) {
      // Light stylus pressure -> subtle lightening (0.1 - 0.3)
      // Medium stylus pressure -> medium lightening (0.4 - 0.7)
      // Heavy stylus pressure -> stronger erase/lifting (0.8 - 1.0)
      const pressureCurve = Math.pow(pressure, 1.25);
      strength = Math.max(0.02, strength * (0.15 + 0.85 * pressureCurve));
    }

    const flow = Math.max(0.01, Math.min(1.0, brush.flow));
    const hardness = Math.min(0.95, Math.max(0.0, brush.hardness));
    const textureAmount = brush.texture !== undefined ? brush.texture : 0.65; // 0.0 to 1.0

    const centerXRel = x - sampleX;
    const centerYRel = y - sampleY;
    let modifiedAny = false;

    // Base lift factor per dab: progressive lifting (never erases 100% in a single tap)
    const baseLiftRate = 0.32 * strength * flow;

    for (let py = 0; py < sampleH; py++) {
      for (let px = 0; px < sampleW; px++) {
        const idx = (py * sampleW + px) * 4;
        const currentAlpha = data[idx + 3];

        // STRICT: Never paint on transparent areas or alter white/background pixels
        if (currentAlpha === 0) continue;

        const dx = px - centerXRel;
        const dy = py - centerYRel;
        const distSq = dx * dx + dy * dy;

        if (distSq > radius * radius) continue;

        const dist = Math.sqrt(distSq);
        const normDist = dist / radius;

        // Radial softness / hardness falloff mask
        let radialMask = 1.0;
        if (normDist > hardness) {
          const t = (normDist - hardness) / (1.0 - hardness);
          radialMask = 0.5 * (1.0 + Math.cos(t * Math.PI));
        }

        // Global canvas coordinate for persistent paper grain / tooth noise
        const globalX = sampleX + px;
        const globalY = sampleY + py;

        // Multi-frequency organic paper grain / charcoal tooth noise
        const n1 = this.pseudoRandom(Math.floor(globalX * 1.6), Math.floor(globalY * 1.6));
        const n2 = this.pseudoRandom(Math.floor(globalX * 0.5 + 43), Math.floor(globalY * 0.5 + 97));
        const fineNoise = (n1 * 0.65 + n2 * 0.35);

        // Texture factor: when textureAmount is high, paper grain peaks lift first
        // while pits retain subtle graphite/charcoal grain speckles
        let grainMask = 1.0;
        if (textureAmount > 0.01) {
          const toothThreshold = 1.0 - (textureAmount * 0.7);
          const toothFactor = fineNoise >= toothThreshold ? 1.0 : (fineNoise / Math.max(0.01, toothThreshold));
          grainMask = (1.0 - textureAmount) + (textureAmount * toothFactor);
        }

        // Lift factor for this pixel in this stamp
        const liftFactor = Math.min(0.92, baseLiftRate * radialMask * grainMask);

        if (liftFactor > 0.0005) {
          // Progressively reduce pixel alpha (lifting charcoal pigment off the paper)
          const newAlpha = Math.max(0, currentAlpha * (1.0 - liftFactor));
          data[idx + 3] = Math.round(newAlpha);
          modifiedAny = true;
        }
      }
    }

    if (modifiedAny) {
      ctx.putImageData(imgData, sampleX, sampleY);
    }
  }

  private pseudoRandom(x: number, y: number): number {
    const sf = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return sf - Math.floor(sf);
  }
}

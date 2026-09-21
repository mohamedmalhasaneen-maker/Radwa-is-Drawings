import { 
  OuterContourSettings, 
  OuterContourPoint, 
  SmoothingLevel, 
  AccuracyLevel, 
  DenoiseLevel,
  LineArtSettings 
} from '../types';

/**
 * Professional Subject Segmentation & Outer Contour (Silhouette) Engine.
 * 
 * Pipeline:
 * 1. Subject Segmentation (Color modeling + Border background profile + Saliency + User Seeds)
 * 2. Solid Binary Mask & Topological Hole Filling (Eradicates 100% of interior lines & facial/clothing details)
 * 3. RETR_EXTERNAL Moore-Neighbor Outer Boundary Tracing (Traces strictly the outermost body perimeter)
 * 4. RDP Polygon Simplification & Chaikin/Catmull-Rom Spline Smoothing (Clean organic silhouette)
 * 5. Transparent Vector Path Rendering (Supports stroke width 1-20, colors, opacity 0-100%)
 */

// Helper to convert hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Main Outer Contour / Silhouette Processing Entrypoint
 */
export function processOuterContour(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: OuterContourSettings
): {
  imageData: ImageData;
  paths: OuterContourPoint[][];
  binaryMask: Uint8Array;
} {
  const srcImageData = sourceCtx.getImageData(0, 0, width, height);
  const src = srcImageData.data;

  // 1. Stage 1: Segment foreground subject from background
  const rawMask = segmentSubject(src, width, height, settings);

  // 2. Stage 2: Create a SOLID Binary Mask with Topological Flood Hole Filling
  // Eliminates 100% of all interior features (eyes, nose, mouth, clothing folds, buttons, shadows)
  const solidMask = solidifyMaskAndFillHoles(rawMask, width, height, settings.denoise);

  // 3. Stage 3: Extract STRICTLY External Contours (RETR_EXTERNAL) using Moore-Neighbor boundary tracing
  const rawContourLoops = extractExternalContours(solidMask, width, height, settings.denoise);

  // 4. Stage 4: Contour Simplification (Douglas-Peucker) & Spline Curve Smoothing
  const smoothedContourLoops = rawContourLoops.map((loop) => {
    const simplified = simplifyContourRDP(loop, settings.accuracy);
    return smoothContourSpline(simplified, settings.smoothing);
  });

  // 5. Stage 5: Render Outer Contour Vector Paths to transparent ImageData
  const resultImageData = renderContourToImageData(
    sourceCtx,
    width,
    height,
    smoothedContourLoops,
    solidMask,
    settings
  );

  return {
    imageData: resultImageData,
    paths: smoothedContourLoops,
    binaryMask: solidMask,
  };
}

/**
 * Stage 1: Segment foreground subject from background using border color model,
 * multi-sampling, center saliency, and interactive seed points.
 */
function segmentSubject(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  settings: OuterContourSettings
): Uint8Array {
  const total = width * height;
  const mask = new Uint8Array(total);

  // 1. Sample perimeter border pixels to build background color profile
  const bgSamples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 100));

  // Top & Bottom rows
  for (let x = 0; x < width; x += step) {
    const topIdx = x * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    bgSamples.push([src[topIdx], src[topIdx + 1], src[topIdx + 2]]);
    bgSamples.push([src[botIdx], src[botIdx + 1], src[botIdx + 2]]);
  }

  // Left & Right columns
  for (let y = 0; y < height; y += step) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    bgSamples.push([src[leftIdx], src[leftIdx + 1], src[leftIdx + 2]]);
    bgSamples.push([src[rightIdx], src[rightIdx + 1], src[rightIdx + 2]]);
  }

  // Compute average background color
  let bgR = 0, bgG = 0, bgB = 0;
  for (let i = 0; i < bgSamples.length; i++) {
    bgR += bgSamples[i][0];
    bgG += bgSamples[i][1];
    bgB += bgSamples[i][2];
  }
  bgR /= bgSamples.length;
  bgG /= bgSamples.length;
  bgB /= bgSamples.length;

  // Background variance
  let bgVariance = 0;
  for (let i = 0; i < bgSamples.length; i++) {
    const dr = bgSamples[i][0] - bgR;
    const dg = bgSamples[i][1] - bgG;
    const db = bgSamples[i][2] - bgB;
    bgVariance += Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
  }
  bgVariance = Math.max(12, bgVariance / bgSamples.length);

  // User Seed Points (if user clicked on a specific body / object)
  const hasUserSeeds = settings.selectedSeedPoints && settings.selectedSeedPoints.length > 0;
  const seedColors: [number, number, number][] = [];

  if (hasUserSeeds) {
    for (const sp of settings.selectedSeedPoints) {
      const px = Math.min(width - 1, Math.max(0, Math.floor(sp.x)));
      const py = Math.min(height - 1, Math.max(0, Math.floor(sp.y)));
      const idx = (py * width + px) * 4;
      seedColors.push([src[idx], src[idx + 1], src[idx + 2]]);
    }
  }

  // Center coordinates for spatial center-bias
  const cx = width / 2;
  const cy = height / 2;
  const maxDistSq = (cx * cx + cy * cy) * 1.25;

  // Dynamic threshold based on user slider (1 to 100)
  const threshVal = (settings.threshold / 100.0) * 105 + 12;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      // Transparent pixels are definitely background
      if (a < 35) {
        mask[rowOffset + x] = 0;
        continue;
      }

      // 1. Color distance to background model
      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const distToBg = Math.sqrt(dr * dr * 0.299 * 3 + dg * dg * 0.587 * 3 + db * db * 0.114 * 3);

      // 2. Color distance to user seed points
      let distToSeed = Infinity;
      if (hasUserSeeds) {
        for (let s = 0; s < seedColors.length; s++) {
          const sr = seedColors[s][0];
          const sg = seedColors[s][1];
          const sb = seedColors[s][2];
          const ds = Math.sqrt(
            Math.pow(r - sr, 2) * 0.3 +
            Math.pow(g - sg, 2) * 0.59 +
            Math.pow(b - sb, 2) * 0.11
          );
          if (ds < distToSeed) distToSeed = ds;
        }
      }

      // 3. Center spatial prior
      const dxCenter = x - cx;
      const dyCenter = y - cy;
      const distCenterSq = dxCenter * dxCenter + dyCenter * dyCenter;
      const centerFactor = 1.0 - (distCenterSq / maxDistSq) * 0.35;

      let isForeground = false;

      if (hasUserSeeds) {
        // Targeted interactive subject selection
        isForeground = distToSeed < threshVal * 1.35 || (distToBg > threshVal * 0.85 && centerFactor > 0.55);
      } else {
        // Automatic subject detection
        const effectiveDist = distToBg * (0.65 + centerFactor * 0.45);
        isForeground = effectiveDist > (threshVal * (bgVariance > 35 ? 0.9 : 0.8));
      }

      if (settings.invertSelection) {
        isForeground = !isForeground;
      }

      mask[rowOffset + x] = isForeground ? 1 : 0;
    }
  }

  return mask;
}

/**
 * Stage 2: Create a SOLID Binary Mask with Topological Flood Hole Filling.
 * Guaranteed to eliminate ALL interior lines, facial features, clothing wrinkles, buttons, and textures.
 */
function solidifyMaskAndFillHoles(
  mask: Uint8Array,
  width: number,
  height: number,
  denoise: DenoiseLevel
): Uint8Array {
  // 1. Morphological Closing (Dilation followed by Erosion) to bridge small perimeter gaps
  const closeRadius = denoise === 'high' ? 4 : denoise === 'medium' ? 3 : 2;
  const dilated = morphologicalDilate(mask, width, height, closeRadius);
  const closed = morphologicalErode(dilated, width, height, Math.max(1, closeRadius - 1));

  // 2. Flood Fill from Padded Outer Border:
  // Any pixel connected to the outside frame is definite Background (0).
  // Everything inside the outer perimeter is 100% Solid Foreground (1).
  const padW = width + 2;
  const padH = height + 2;
  const padded = new Uint8Array(padW * padH);

  // Copy closed mask into interior
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      padded[(y + 1) * padW + (x + 1)] = closed[y * width + x];
    }
  }

  // BFS Flood Fill from (0, 0)
  const visited = new Uint8Array(padW * padH);
  const queueX = new Int32Array(padW * padH);
  const queueY = new Int32Array(padW * padH);
  let head = 0;
  let tail = 0;

  queueX[tail] = 0;
  queueY[tail] = 0;
  tail++;
  visited[0] = 1;

  while (head < tail) {
    const qx = queueX[head];
    const qy = queueY[head];
    head++;

    const neighbors = [
      [qx + 1, qy],
      [qx - 1, qy],
      [qx, qy + 1],
      [qx, qy - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < padW && ny >= 0 && ny < padH) {
        const nIdx = ny * padW + nx;
        if (!visited[nIdx] && padded[nIdx] === 0) {
          visited[nIdx] = 1;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail++;
        }
      }
    }
  }

  // All pixels that were NOT reached by outside flood fill are 100% SOLID FOREGROUND
  const solidMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const padIdx = (y + 1) * padW + (x + 1);
      solidMask[y * width + x] = visited[padIdx] === 0 ? 1 : 0;
    }
  }

  return solidMask;
}

/**
 * Stage 3: Extract STRICTLY External Contours (`RETR_EXTERNAL`) using Moore-Neighbor Boundary Tracing.
 * Discards any interior loops or hole transitions.
 */
function extractExternalContours(
  solidMask: Uint8Array,
  width: number,
  height: number,
  denoise: DenoiseLevel
): OuterContourPoint[][] {
  const visitedBorder = new Uint8Array(width * height);
  const contours: OuterContourPoint[][] = [];

  const minPoints = denoise === 'high' ? 35 : denoise === 'medium' ? 20 : 12;
  const minArea = denoise === 'high' ? 180 : denoise === 'medium' ? 80 : 30;

  // 8-direction clockwise offsets (starting from East, clockwise)
  const dirX = [1, 1, 0, -1, -1, -1, 0, 1];
  const dirY = [0, 1, 1, 1, 0, -1, -1, -1];

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;

      // Detect background (0) to foreground (1) transition on unvisited outer boundary
      if (solidMask[idx] === 1 && solidMask[idx - 1] === 0 && visitedBorder[idx] === 0) {
        const contour: OuterContourPoint[] = [];
        let curX = x;
        let curY = y;
        let enterDir = 4; // Came from West

        const startX = x;
        const startY = y;
        let closed = false;
        let steps = 0;
        const maxSteps = width * height;

        contour.push({ x: curX, y: curY });
        visitedBorder[idx] = 1;

        let minX = curX, maxX = curX, minY = curY, maxY = curY;

        while (!closed && steps < maxSteps) {
          steps++;
          let nextDir = -1;
          const searchStart = (enterDir + 2) % 8;

          for (let i = 0; i < 8; i++) {
            const checkDir = (searchStart + i) % 8;
            const nx = curX + dirX[checkDir];
            const ny = curY + dirY[checkDir];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (solidMask[ny * width + nx] === 1) {
                nextDir = checkDir;
                curX = nx;
                curY = ny;
                break;
              }
            }
          }

          if (nextDir === -1) {
            break;
          }

          visitedBorder[curY * width + curX] = 1;
          contour.push({ x: curX, y: curY });

          if (curX < minX) minX = curX;
          if (curX > maxX) maxX = curX;
          if (curY < minY) minY = curY;
          if (curY > maxY) maxY = curY;

          enterDir = (nextDir + 4) % 8;

          if (curX === startX && curY === startY && contour.length > 3) {
            closed = true;
          }
        }

        const bboxArea = (maxX - minX + 1) * (maxY - minY + 1);

        if (contour.length >= minPoints && bboxArea >= minArea) {
          contours.push(contour);
        }
      }
    }
  }

  // Sort contours by size descending so primary subject is first
  contours.sort((a, b) => b.length - a.length);

  return contours;
}

/**
 * Stage 4A: Ramer-Douglas-Peucker (RDP) Polygon Simplification
 */
function simplifyContourRDP(points: OuterContourPoint[], accuracy: AccuracyLevel): OuterContourPoint[] {
  if (points.length <= 4) return points;

  const epsilon = accuracy === 'high' ? 0.75 : accuracy === 'medium' ? 1.6 : 3.0;

  function getPerpendicularDistance(p: OuterContourPoint, lineStart: OuterContourPoint, lineEnd: OuterContourPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt(Math.pow(p.x - lineStart.x, 2) + Math.pow(p.y - lineStart.y, 2));
    const num = Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
    return num / mag;
  }

  function rdpRecursive(pts: OuterContourPoint[], startIdx: number, endIdx: number, out: OuterContourPoint[]) {
    let maxDist = 0;
    let index = startIdx;

    for (let i = startIdx + 1; i < endIdx; i++) {
      const dist = getPerpendicularDistance(pts[i], pts[startIdx], pts[endIdx]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      rdpRecursive(pts, startIdx, index, out);
      out.push(pts[index]);
      rdpRecursive(pts, index, endIdx, out);
    }
  }

  const result: OuterContourPoint[] = [points[0]];
  rdpRecursive(points, 0, points.length - 1, result);
  result.push(points[points.length - 1]);

  return result;
}

/**
 * Stage 4B: Spline / Catmull-Rom Curve Smoothing
 */
function smoothContourSpline(points: OuterContourPoint[], smoothing: SmoothingLevel): OuterContourPoint[] {
  if (points.length <= 3) return points;

  const iterations = smoothing === 'ultra' ? 4 : smoothing === 'high' ? 3 : smoothing === 'medium' ? 2 : 1;
  let current = [...points];

  for (let it = 0; it < iterations; it++) {
    const next: OuterContourPoint[] = [];
    const len = current.length;

    for (let i = 0; i < len; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % len];

      // Chaikin corner cut
      const q = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      };

      const r = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      };

      next.push(q);
      next.push(r);
    }
    current = next;
  }

  return current;
}

/**
 * Stage 5: Render Vector Outer Contour to transparent ImageData
 */
function renderContourToImageData(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contourLoops: OuterContourPoint[][],
  solidMask: Uint8Array,
  settings: OuterContourSettings
): ImageData {
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const ctx = renderCanvas.getContext('2d');

  if (!ctx) {
    return sourceCtx.createImageData(width, height);
  }

  if (!settings.transparentBg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (settings.fillSilhouette) {
    ctx.fillStyle = settings.lineColor || '#000000';
    for (const loop of contourLoops) {
      if (loop.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(loop[0].x, loop[0].y);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i].x, loop[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  if (settings.showOutline !== false) {
    const alpha = Math.max(0, Math.min(1, (settings.lineOpacity ?? 100) / 100));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = settings.lineColor || '#000000';
    ctx.lineWidth = Math.max(1, Math.min(20, settings.lineThickness));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const loop of contourLoops) {
      if (loop.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(loop[0].x, loop[0].y);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i].x, loop[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Fast Vector Redraw on a Canvas using cached paths
 */
export function drawVectorContoursOnContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contourLoops: OuterContourPoint[][],
  settings: OuterContourSettings
) {
  if (!settings.transparentBg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (settings.fillSilhouette) {
    ctx.fillStyle = settings.lineColor || '#000000';
    for (const loop of contourLoops) {
      if (loop.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(loop[0].x, loop[0].y);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i].x, loop[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  if (settings.showOutline !== false) {
    const alpha = Math.max(0, Math.min(1, (settings.lineOpacity ?? 100) / 100));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = settings.lineColor || '#000000';
    ctx.lineWidth = Math.max(1, Math.min(20, settings.lineThickness));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const loop of contourLoops) {
      if (loop.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(loop[0].x, loop[0].y);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i].x, loop[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/**
 * Morphological 2D Dilation
 */
function morphologicalDilate(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const dst = new Uint8Array(width * height);
  const r = Math.max(1, radius);

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - r);
    const yMax = Math.min(height - 1, y + r);

    for (let x = 0; x < width; x++) {
      if (src[y * width + x] === 1) {
        dst[y * width + x] = 1;
        continue;
      }
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(width - 1, x + r);

      let found = false;
      for (let cy = yMin; cy <= yMax && !found; cy++) {
        const row = cy * width;
        for (let cx = xMin; cx <= xMax; cx++) {
          if (src[row + cx] === 1) {
            found = true;
            break;
          }
        }
      }
      dst[y * width + x] = found ? 1 : 0;
    }
  }

  return dst;
}

/**
 * Morphological 2D Erosion
 */
function morphologicalErode(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const dst = new Uint8Array(width * height);
  const r = Math.max(1, radius);

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - r);
    const yMax = Math.min(height - 1, y + r);

    for (let x = 0; x < width; x++) {
      if (src[y * width + x] === 0) {
        dst[y * width + x] = 0;
        continue;
      }
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(width - 1, x + r);

      let allOne = true;
      for (let cy = yMin; cy <= yMax && allOne; cy++) {
        const row = cy * width;
        for (let cx = xMin; cx <= xMax; cx++) {
          if (src[row + cx] === 0) {
            allOne = false;
            break;
          }
        }
      }
      dst[y * width + x] = allOne ? 1 : 0;
    }
  }

  return dst;
}

/**
 * Legacy interface bridge for LineArtSettings
 */
export function processLineArt(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: LineArtSettings
): ImageData {
  const outerSettings: OuterContourSettings = {
    lineThickness: settings.lineThickness,
    lineOpacity: 100,
    smoothing: settings.smoothing > 5 ? 'high' : settings.smoothing > 2 ? 'medium' : 'low',
    accuracy: settings.detailLevel > 65 ? 'high' : settings.detailLevel > 35 ? 'medium' : 'low',
    denoise: settings.denoise > 5 ? 'high' : settings.denoise > 2 ? 'medium' : 'low',
    threshold: Math.round((settings.threshold / 255.0) * 100),
    lineColor: settings.lineColor,
    transparentBg: settings.transparentBg,
    fillSilhouette: false,
    invertSelection: settings.invert,
    selectedSeedPoints: [],
    onlyOuterContour: true,
    showOutline: true,
    includeOriginalImage: true,
  };

  const result = processOuterContour(sourceCtx, width, height, outerSettings);
  return result.imageData;
}

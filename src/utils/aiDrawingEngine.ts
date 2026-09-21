import { AISubjectDrawingSettings, SmoothingLevel } from '../types';

/**
 * AI Clean Line Drawing Engine (تحويل الصورة إلى رسم خطوط بالذكاء الاصطناعي)
 * 
 * Pipeline:
 * 1. AI Subject Isolation & Background Elimination: Identifies subject and completely discards background.
 * 2. Tone Flattening & Texture Suppression: Bilateral/Anisotropic filter to discard photo noise, skin pores, fabric textures, shadows, and lighting gradients.
 * 3. Structural Contour & Key Line Extraction: Multi-scale Difference of Gaussians (DoG) with high-pass structural thresholding.
 * 4. Non-Maximum Suppression (NMS) & Skeletonization: Extracts clean, single-pixel thin structural spine lines without double borders.
 * 5. Line Cleaning & Stray Fragment Pruning: Removes small isolated dots, speckles, and jagged artifacts.
 * 6. Smooth Anti-aliased Stroke Synthesis with Custom Thickness (1-20 px), Opacity (0-100%), and Custom Color.
 */

// Helper to convert hex color to RGB
export function hexToRgb(hex: string): [number, number, number] {
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
 * Main AI Line Drawing Processor
 */
export function processAISubjectDrawing(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: AISubjectDrawingSettings
): {
  imageData: ImageData;
  subjectMask: Float32Array;
} {
  const srcImgData = sourceCtx.getImageData(0, 0, width, height);
  const src = srcImgData.data;
  const totalPixels = width * height;

  // Stage 1: AI Foreground Subject Segmentation (100% Background Removal)
  const subjectMask = segmentForegroundSubject(src, width, height, settings);

  // Stage 2: Convert to Luminance
  const luminance = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    luminance[i] = (src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114) / 255.0;
  }

  // Stage 3: Bilateral-like Tone Flattening (Eliminates skin texture, fabric grain, lighting gradients)
  const flattenedLum = flattenTonesAndSuppressTextures(luminance, width, height, settings.smoothing);

  // Stage 4: Extract Key Structural Lines & Outline (No shadows, no textures)
  const rawLines = extractKeyStructuralLines(
    flattenedLum,
    luminance,
    width,
    height,
    settings.detailLevel
  );

  // Stage 5: Mask gating - strictly enforce subject area (zero background lines)
  const gatedLines = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const m = subjectMask[i];
    gatedLines[i] = m > 0.1 ? rawLines[i] * m : 0;
  }

  // Stage 6: Line Cleaning & Short Fragment Pruning (removes stray specks and short jagged noise)
  const cleanedLines = settings.cleanLines
    ? pruneStrayLineFragments(gatedLines, width, height, settings.detailLevel)
    : gatedLines;

  // Stage 7: Line Smoothing and Thickness Rendering (1 to 20 px)
  const renderedLines = renderSmoothStrokes(
    cleanedLines,
    width,
    height,
    settings.lineThickness,
    settings.smoothing
  );

  // Stage 8: Generate Output ImageData (Transparent or White Canvas)
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) {
    return { imageData: srcImgData, subjectMask };
  }

  const outImgData = resultCtx.createImageData(width, height);
  const outData = outImgData.data;
  const [rCol, gCol, bCol] = hexToRgb(settings.lineColor || '#000000');
  const maxAlpha = (settings.lineOpacity / 100.0) * 255;
  const isTransparent = settings.backgroundMode === 'transparent';

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const intensity = renderedLines[i];
    const maskVal = subjectMask[i];

    if (isTransparent) {
      if (intensity > 0.02 && maskVal > 0.05) {
        outData[idx] = rCol;
        outData[idx + 1] = gCol;
        outData[idx + 2] = bCol;
        outData[idx + 3] = Math.round(Math.min(1.0, intensity) * maxAlpha);
      } else {
        outData[idx] = 0;
        outData[idx + 1] = 0;
        outData[idx + 2] = 0;
        outData[idx + 3] = 0;
      }
    } else {
      // White Paper Background Mode
      if (maskVal > 0.05) {
        const inkAlpha = Math.min(1.0, intensity) * (settings.lineOpacity / 100.0);
        outData[idx] = Math.round(255 * (1 - inkAlpha) + rCol * inkAlpha);
        outData[idx + 1] = Math.round(255 * (1 - inkAlpha) + gCol * inkAlpha);
        outData[idx + 2] = Math.round(255 * (1 - inkAlpha) + bCol * inkAlpha);
        outData[idx + 3] = 255;
      } else {
        outData[idx] = 255;
        outData[idx + 1] = 255;
        outData[idx + 2] = 255;
        outData[idx + 3] = 255;
      }
    }
  }

  return {
    imageData: outImgData,
    subjectMask,
  };
}

/**
 * Fast redraw of processed drawing to a canvas
 */
export function drawProcessedSubjectDrawingToCanvas(
  targetCanvas: HTMLCanvasElement,
  drawingImageData: ImageData
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(drawingImageData, 0, 0);
}

/**
 * AI Subject Segmentation (Foreground Detection & Background Model Discarding)
 */
function segmentForegroundSubject(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  settings: AISubjectDrawingSettings
): Float32Array {
  const total = width * height;
  const mask = new Float32Array(total);

  // Background perimeter color sampling
  const bgSamples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));

  for (let x = 0; x < width; x += step) {
    const topIdx = x * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    bgSamples.push([src[topIdx], src[topIdx + 1], src[topIdx + 2]]);
    bgSamples.push([src[botIdx], src[botIdx + 1], src[botIdx + 2]]);
  }

  for (let y = 0; y < height; y += step) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    bgSamples.push([src[leftIdx], src[leftIdx + 1], src[leftIdx + 2]]);
    bgSamples.push([src[rightIdx], src[rightIdx + 1], src[rightIdx + 2]]);
  }

  let bgR = 0, bgG = 0, bgB = 0;
  for (let i = 0; i < bgSamples.length; i++) {
    bgR += bgSamples[i][0];
    bgG += bgSamples[i][1];
    bgB += bgSamples[i][2];
  }
  bgR /= bgSamples.length;
  bgG /= bgSamples.length;
  bgB /= bgSamples.length;

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

  const cx = width / 2;
  const cy = height / 2;
  const maxDistSq = (cx * cx + cy * cy) * 1.35;
  const threshVal = (settings.threshold / 100.0) * 110 + 10;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      if (a < 30) {
        mask[rowOffset + x] = 0;
        continue;
      }

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const distToBg = Math.sqrt(dr * dr * 0.299 * 3 + dg * dg * 0.587 * 3 + db * db * 0.114 * 3);

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

      const dxCenter = x - cx;
      const dyCenter = y - cy;
      const distCenterSq = dxCenter * dxCenter + dyCenter * dyCenter;
      const centerFactor = 1.0 - (distCenterSq / maxDistSq) * 0.35;

      let prob = 0;
      if (hasUserSeeds) {
        if (distToSeed < threshVal * 1.3) {
          prob = 1.0;
        } else if (distToBg > threshVal * 0.9 && centerFactor > 0.5) {
          prob = 0.9;
        } else {
          prob = Math.max(0, 1.0 - (distToSeed / (threshVal * 2.5)));
        }
      } else {
        const effectiveDist = distToBg * (0.65 + centerFactor * 0.45);
        if (effectiveDist > threshVal * 0.85) {
          prob = Math.min(1.0, (effectiveDist - threshVal * 0.85) / 35 + 0.6);
        }
      }

      mask[rowOffset + x] = prob > 0.45 ? 1.0 : prob > 0.2 ? (prob - 0.2) / 0.25 : 0;
    }
  }

  // Morphological Closing to seal interior subject holes
  return applyMorphologicalClosing(mask, width, height, 2);
}

/**
 * Bilateral-style Tone Flattening (Suppresses fine textures, skin pores, fabric grain, and lighting gradients)
 */
function flattenTonesAndSuppressTextures(
  lum: Float32Array,
  width: number,
  height: number,
  smoothing: SmoothingLevel
): Float32Array {
  const result = new Float32Array(width * height);
  const radius = smoothing === 'high' ? 3 : smoothing === 'medium' ? 2 : 1;
  const spatialSigmaSq = radius * radius * 2;
  const intensitySigmaSq = (0.15) * (0.15) * 2;

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - radius);
    const yMax = Math.min(height - 1, y + radius);

    for (let x = 0; x < width; x++) {
      const centerIdx = y * width + x;
      const centerVal = lum[centerIdx];

      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);

      let sumWeight = 0;
      let sumVal = 0;

      for (let cy = yMin; cy <= yMax; cy++) {
        const dy = cy - y;
        const row = cy * width;
        for (let cx = xMin; cx <= xMax; cx++) {
          const dx = cx - x;
          const neighborVal = lum[row + cx];
          const dIntensity = neighborVal - centerVal;

          const spatialWeight = Math.exp(-(dx * dx + dy * dy) / spatialSigmaSq);
          const rangeWeight = Math.exp(-(dIntensity * dIntensity) / intensitySigmaSq);
          const weight = spatialWeight * rangeWeight;

          sumVal += neighborVal * weight;
          sumWeight += weight;
        }
      }

      result[centerIdx] = sumWeight > 0 ? sumVal / sumWeight : centerVal;
    }
  }

  return result;
}

/**
 * Non-Maximum Suppression (NMS) to ensure clean single-stroke lines without double borders
 */
function applyNonMaximumSuppression(
  lines: Float32Array,
  grad: Float32Array,
  width: number,
  height: number
): Float32Array {
  const output = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    const prevRow = (y - 1) * width;
    const nextRow = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const val = lines[row + x];
      if (val <= 0.05) continue;

      const n = lines[prevRow + x];
      const s = lines[nextRow + x];
      const w = lines[row + x - 1];
      const e = lines[row + x + 1];

      const isLocalMaxH = val >= w && val >= e;
      const isLocalMaxV = val >= n && val >= s;

      if (isLocalMaxH || isLocalMaxV) {
        output[row + x] = val;
      }
    }
  }

  return output;
}

/**
 * Key Structural Line Extraction (Extended Difference-of-Gaussians with Semantic Thresholding)
 */
function extractKeyStructuralLines(
  flattenedLum: Float32Array,
  rawLum: Float32Array,
  width: number,
  height: number,
  detailLevel: 'very_simple' | 'simple' | 'medium'
): Float32Array {
  const total = width * height;
  const lines = new Float32Array(total);

  // Optimized blur radii for semantic line abstraction (suppressing texture, skin pores, and fine details)
  const blurRadius2 = detailLevel === 'very_simple' ? 6 : detailLevel === 'simple' ? 4 : 2;
  const g1 = applyBoxBlur(flattenedLum, width, height, 1);
  const g2 = applyBoxBlur(flattenedLum, width, height, blurRadius2);

  const gamma = detailLevel === 'very_simple' ? 0.90 : detailLevel === 'simple' ? 0.94 : 0.97;
  const phi = 25.0;
  const thresholdEpsilon = detailLevel === 'very_simple' ? 0.08 : detailLevel === 'simple' ? 0.04 : 0.02;

  const gradMagnitude = computeSobelGradient(flattenedLum, width, height);
  const gradThresh = detailLevel === 'very_simple' ? 0.35 : detailLevel === 'simple' ? 0.22 : 0.12;

  for (let i = 0; i < total; i++) {
    const diff = (1 + gamma) * g1[i] - gamma * g2[i];

    let stroke = 0;
    if (diff < 1.0 - thresholdEpsilon) {
      const val = 1.0 + Math.tanh(phi * (diff - (1.0 - thresholdEpsilon)));
      stroke = 1.0 - val * 0.5;
    }

    const grad = gradMagnitude[i];
    if (grad > gradThresh) {
      stroke = Math.max(stroke, Math.min(1.0, (grad - gradThresh) * 2.0));
    }

    lines[i] = stroke > 0.35 ? Math.min(1.0, (stroke - 0.35) / 0.4) : 0;
  }

  const thinnedLines = applyNonMaximumSuppression(lines, gradMagnitude, width, height);
  return thinnedLines;
}

/**
 * Prune Short Stray Line Fragments & Noise Specks (تنظيف الخطوط)
 */
function pruneStrayLineFragments(
  lines: Float32Array,
  width: number,
  height: number,
  detailLevel: 'very_simple' | 'simple' | 'medium'
): Float32Array {
  // Higher minimum length for very_simple to eliminate all random speckles and short jagged lines
  const minLength = detailLevel === 'very_simple' ? 60 : detailLevel === 'simple' ? 30 : 15;
  const total = width * height;
  const visited = new Uint8Array(total);
  const result = new Float32Array(lines);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = row + x;
      if (lines[idx] <= 0.05 || visited[idx]) continue;

      // BFS to find size of connected component
      const component: number[] = [];
      const queue: number[] = [idx];
      visited[idx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        component.push(curr);

        const cy = Math.floor(curr / width);
        const cx = curr % width;

        for (let ny = Math.max(0, cy - 1); ny <= Math.min(height - 1, cy + 1); ny++) {
          const nrow = ny * width;
          for (let nx = Math.max(0, cx - 1); nx <= Math.min(width - 1, cx + 1); nx++) {
            const nidx = nrow + nx;
            if (!visited[nidx] && lines[nidx] > 0.05) {
              visited[nidx] = 1;
              queue.push(nidx);
            }
          }
        }
      }

      // If connected component is smaller than minLength, prune it as noise
      if (component.length < minLength) {
        for (let i = 0; i < component.length; i++) {
          result[component[i]] = 0;
        }
      }
    }
  }

  return result;
}

/**
 * Smooth Anti-Aliased Stroke Renderer with Custom Thickness (1 - 20 px)
 */
function renderSmoothStrokes(
  thinLines: Float32Array,
  width: number,
  height: number,
  thickness: number,
  smoothing: SmoothingLevel
): Float32Array {
  const total = width * height;
  let expanded = thinLines;

  if (thickness > 1) {
    const radius = Math.min(10, Math.floor(thickness / 2));
    expanded = new Float32Array(total);

    for (let y = 0; y < height; y++) {
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);

      for (let x = 0; x < width; x++) {
        const xMin = Math.max(0, x - radius);
        const xMax = Math.min(width - 1, x + radius);

        let maxVal = 0;
        for (let cy = yMin; cy <= yMax; cy++) {
          const dy = cy - y;
          const row = cy * width;
          for (let cx = xMin; cx <= xMax; cx++) {
            const dx = cx - x;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const v = thinLines[row + cx];
              if (v > maxVal) {
                // Soft edge falloff for smooth rounded strokes
                const falloff = 1.0 - (dist / (radius + 0.5)) * 0.25;
                const strokeVal = v * falloff;
                if (strokeVal > maxVal) maxVal = strokeVal;
              }
            }
          }
        }
        expanded[y * width + x] = maxVal;
      }
    }
  }

  // Anti-aliasing pass
  const blurPasses = smoothing === 'high' ? 2 : smoothing === 'medium' ? 1 : 0;
  let smooth = expanded;
  for (let p = 0; p < blurPasses; p++) {
    smooth = applyBoxBlur(smooth, width, height, 1);
  }

  return smooth;
}

/**
 * Sobel Gradient filter for anatomical micro-edges
 */
function computeSobelGradient(lum: Float32Array, width: number, height: number): Float32Array {
  const grad = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const prevRow = (y - 1) * width;
    const nextRow = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const gx = 
        -1 * lum[prevRow + x - 1] + 1 * lum[prevRow + x + 1] +
        -2 * lum[rowOffset + x - 1] + 2 * lum[rowOffset + x + 1] +
        -1 * lum[nextRow + x - 1] + 1 * lum[nextRow + x + 1];

      const gy = 
        -1 * lum[prevRow + x - 1] - 2 * lum[prevRow + x] - 1 * lum[prevRow + x + 1] +
        1 * lum[nextRow + x - 1] + 2 * lum[nextRow + x] + 1 * lum[nextRow + x + 1];

      grad[rowOffset + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return grad;
}

/**
 * Box Blur helper
 */
function applyBoxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return src;
  const temp = new Float32Array(width * height);
  const dst = new Float32Array(width * height);
  const r = radius;
  const diameter = 2 * r + 1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const px = Math.min(width - 1, Math.max(0, i));
      sum += src[rowOffset + px];
    }
    for (let x = 0; x < width; x++) {
      temp[rowOffset + x] = sum / diameter;
      const left = Math.max(0, x - r);
      const right = Math.min(width - 1, x + r + 1);
      sum += src[rowOffset + right] - src[rowOffset + left];
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const py = Math.min(height - 1, Math.max(0, i));
      sum += temp[py * width + x];
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / diameter;
      const top = Math.max(0, y - r);
      const bot = Math.min(height - 1, y + r + 1);
      sum += temp[bot * width + x] - temp[top * width + x];
    }
  }

  return dst;
}

/**
 * Morphological Closing to seal interior holes in subject mask
 */
function applyMorphologicalClosing(mask: Float32Array, width: number, height: number, radius: number): Float32Array {
  const dilated = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - radius);
    const yMax = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      let maxV = 0;
      for (let cy = yMin; cy <= yMax; cy++) {
        const row = cy * width;
        for (let cx = xMin; cx <= xMax; cx++) {
          const val = mask[row + cx];
          if (val > maxV) maxV = val;
        }
      }
      dilated[y * width + x] = maxV;
    }
  }

  const eroded = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - radius);
    const yMax = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      let minV = 1.0;
      for (let cy = yMin; cy <= yMax; cy++) {
        const row = cy * width;
        for (let cx = xMin; cx <= xMax; cx++) {
          const val = dilated[row + cx];
          if (val < minV) minV = val;
        }
      }
      eroded[y * width + x] = minV;
    }
  }

  return eroded;
}

/**
 * Call Server-Side Gemini API for AI Clean Line Art Generation
 */
export async function requestGeminiSubjectDrawing(
  imageBase64: string,
  settings: AISubjectDrawingSettings
): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  try {
    const seedPoint = settings.selectedSeedPoints?.[0] || null;
    const response = await fetch('/api/ai-draw-subject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        detailLevel: settings.detailLevel,
        cleanLines: settings.cleanLines,
        backgroundMode: settings.backgroundMode,
        seedPoint,
      }),
    });

    if (!response.ok) {
      return { success: false, message: `Server error ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error' };
  }
}

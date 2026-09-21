/**
 * Optimized scanline flood-fill algorithm for the paint bucket tool.
 */

function hexToRgba(hex: string, opacity: number = 1.0): [number, number, number, number] {
  const clean = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16) || 0;
    g = parseInt(clean.substring(2, 4), 16) || 0;
    b = parseInt(clean.substring(4, 6), 16) || 0;
  }
  return [r, g, b, Math.round(opacity * 255)];
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  opacity: number = 1.0,
  tolerance: number = 32
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x = Math.floor(startX);
  const y = Math.floor(startY);

  if (x < 0 || x >= width || y < 0 || y >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetIdx = (y * width + x) * 4;
  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];
  const targetA = data[targetIdx + 3];

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillColorHex, opacity);

  // If already matches fill color within tolerance, skip
  const diffInitial =
    Math.abs(targetR - fillR) +
    Math.abs(targetG - fillG) +
    Math.abs(targetB - fillB) +
    Math.abs(targetA - fillA);

  if (diffInitial <= 4 && fillA > 0) return;

  function matchPixel(idx: number): boolean {
    const dr = Math.abs(data[idx] - targetR);
    const dg = Math.abs(data[idx + 1] - targetG);
    const db = Math.abs(data[idx + 2] - targetB);
    const da = Math.abs(data[idx + 3] - targetA);
    return (dr + dg + db + da) <= tolerance * 4;
  }

  function colorPixel(idx: number) {
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;
  }

  // Scanline Flood Fill queue
  const pixelStack: [number, number][] = [[x, y]];
  const visited = new Uint8Array(width * height);

  while (pixelStack.length > 0) {
    const [curX, curY] = pixelStack.pop()!;
    let currentY = curY;
    let currentX = curX;

    let pixelIdx = (currentY * width + currentX) * 4;
    const vIdx = currentY * width + currentX;

    if (visited[vIdx]) continue;

    // Scan up
    while (currentY >= 0 && matchPixel((currentY * width + currentX) * 4)) {
      currentY--;
    }
    currentY++;

    let reachLeft = false;
    let reachRight = false;

    // Scan down
    while (currentY < height && matchPixel((currentY * width + currentX) * 4)) {
      const idx = (currentY * width + currentX) * 4;
      const visitIndex = currentY * width + currentX;
      colorPixel(idx);
      visited[visitIndex] = 1;

      // Check left
      if (currentX > 0) {
        const leftIdx = (currentY * width + (currentX - 1)) * 4;
        const leftVisit = currentY * width + (currentX - 1);
        if (matchPixel(leftIdx) && !visited[leftVisit]) {
          if (!reachLeft) {
            pixelStack.push([currentX - 1, currentY]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      // Check right
      if (currentX < width - 1) {
        const rightIdx = (currentY * width + (currentX + 1)) * 4;
        const rightVisit = currentY * width + (currentX + 1);
        if (matchPixel(rightIdx) && !visited[rightVisit]) {
          if (!reachRight) {
            pixelStack.push([currentX + 1, currentY]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      currentY++;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

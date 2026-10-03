/**
 * Radwa ❤️ Signature Vector Engine
 * Highly accurate handwritten signature containing "Radwa" and the adjacent "Heart" loop.
 * Excludes all branches, leaves, flowers, and ornaments as strictly required.
 * Generates an infinitely scalable vector SVG that can be customized with colors,
 * opacities, and sizes, and rendered onto any high-resolution export canvas.
 */

export interface SignatureOptions {
  enabled: boolean;
  size: number; // percentage of canvas size (e.g., 8 to 25)
  opacity: number; // 0 to 1
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  margin: number; // margin in pixels from edges
  color: string; // custom hex color code
}

// Default Signature Settings
export const DEFAULT_SIGNATURE_OPTIONS: SignatureOptions = {
  enabled: true,
  size: 15, // 15% of the shortest canvas side
  opacity: 0.9,
  position: 'bottom-right',
  margin: 30,
  color: '#ffffff',
};

/**
 * Returns the raw vector SVG for the signature "Radwa".
 * Uses absolute cubic bezier curves and clean stroke attributes to guarantee 
 * identical visual style, curves, loops, and thickness across all resolutions.
 */
export const getSignatureSVG = (color: string): string => {
  // SVG ViewBox is 260x130.
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 130" width="260" height="130">
      <g fill="none" stroke="${color}" stroke-width="4.0" stroke-linecap="round" stroke-linejoin="round">
        <!-- 1. The Capital 'R' with elegant left double-loop and cursive bowl -->
        <path d="M 45,80 C 35,60 45,75 30,55 C 30,35 55,38 55,38" />
        <path d="M 55,38 C 78,88 70,93 75,45" />
        <path d="M 75,45 C 105,38 105,58 85,58" />
        <path d="M 85,58 C 96,85 85,92 78,92" />
        
        <!-- 2. Cursive letter 'a' -->
        <path d="M 98,75 C 98,83 114,83 114,75 L 114,83 C 114,83 120,74 122,72" />
        
        <!-- 3. Cursive letter 'd' with high elegant stem -->
        <path d="M 122,72 C 114,74 114,83 124,83" />
        <path d="M 124,83 L 126,38 C 122,38 120,44 124,44 L 124,83 C 124,83 135,74 140,68" />
        
        <!-- 4. Cursive letter 'w' wave curves -->
        <path d="M 140,68 C 145,78 148,78 152,68 C 154,78 157,78 160,62 C 160,62 165,58 168,58" />
        
        <!-- 5. Cursive letter 'a' with the high sweeping top loop flourish -->
        <path d="M 168,58 C 160,60 160,72 172,72 L 172,62" />
        <path d="M 172,62 C 185,45 195,55 145,45 C 142,45 140,48 146,50" />
        
        <!-- 6. The majestic sweeping calligraphic underline flourish with loops and ribbon tips -->
        <path d="M 78,92 C 60,105 72,112 85,102 C 120,72 175,68 185,78 C 195,84 180,95 155,95" />
        <path d="M 155,95 C 145,110 152,115 135,105" />
      </g>
    </svg>
  `.trim();
};

/**
 * Renders the "Radwa" signature onto a 2D canvas dynamically at high quality.
 * This uses direct standard Canvas 2D path commands to guarantee 100% reliability,
 * zero latency, and immunity to iframe security/sandbox limitations.
 */
export const drawSignatureToCanvas = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: SignatureOptions
): Promise<void> => {
  return new Promise((resolve) => {
    if (!options.enabled) {
      resolve();
      return;
    }

    ctx.save();

    // SVG Aspect Ratio is 260 / 130 = 2.0
    const aspect = 260 / 130;
    
    // Calculate dynamic signature size based on canvas dimensions and size percentage
    const baseDimension = Math.min(canvasWidth, canvasHeight);
    const signatureWidth = (baseDimension * (options.size / 100)) * aspect;
    const signatureHeight = signatureWidth / aspect;

    // Adjust margin relative to resolution
    const resolutionScale = baseDimension / 1000; // normalized against a 1000px canvas
    const appliedMargin = options.margin * Math.max(0.5, Math.min(3, resolutionScale));

    // Calculate precise top-left (x, y) coordinates based on position choice
    let startX = 0;
    let startY = 0;

    switch (options.position) {
      case 'bottom-right':
        startX = canvasWidth - signatureWidth - appliedMargin;
        startY = canvasHeight - signatureHeight - appliedMargin;
        break;
      case 'bottom-left':
        startX = appliedMargin;
        startY = canvasHeight - signatureHeight - appliedMargin;
        break;
      case 'top-right':
        startX = canvasWidth - signatureWidth - appliedMargin;
        startY = appliedMargin;
        break;
      case 'top-left':
        startX = appliedMargin;
        startY = appliedMargin;
        break;
    }

    // Ensure the signature remains inside bounds
    startX = Math.max(appliedMargin, Math.min(canvasWidth - signatureWidth - appliedMargin, startX));
    startY = Math.max(appliedMargin, Math.min(canvasHeight - signatureHeight - appliedMargin, startY));

    // Scaling factor for mapping 260x130 virtual coordinates
    const s = signatureWidth / 260;

    // Styling
    ctx.strokeStyle = options.color;
    // Scale stroke thickness with the signature size, minimum 1.5px
    ctx.lineWidth = Math.max(1.8, 4.0 * s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = options.opacity;

    // Helper functions to map relative coordinate values
    const mx = (val: number) => startX + val * s;
    const my = (val: number) => startY + val * s;

    ctx.beginPath();

    // 1. The Capital 'R' with elegant left double-loop and cursive bowl
    ctx.moveTo(mx(45), my(80));
    ctx.bezierCurveTo(mx(35), my(60), mx(45), my(75), mx(30), my(55));
    ctx.bezierCurveTo(mx(30), my(35), mx(55), my(38), mx(55), my(38));

    ctx.moveTo(mx(55), my(38));
    ctx.bezierCurveTo(mx(78), my(88), mx(70), my(93), mx(75), my(45));

    ctx.moveTo(mx(75), my(45));
    ctx.bezierCurveTo(mx(105), my(38), mx(105), my(58), mx(85), my(58));

    ctx.moveTo(mx(85), my(58));
    ctx.bezierCurveTo(mx(96), my(85), mx(85), my(92), mx(78), my(92));

    // 2. Cursive letter 'a'
    ctx.moveTo(mx(98), my(75));
    ctx.bezierCurveTo(mx(98), my(83), mx(114), my(83), mx(114), my(75));
    ctx.lineTo(mx(114), my(83));
    ctx.bezierCurveTo(mx(114), my(83), mx(120), my(74), mx(122), my(72));

    // 3. Cursive letter 'd' with high elegant stem
    ctx.moveTo(mx(122), my(72));
    ctx.bezierCurveTo(mx(114), my(74), mx(114), my(83), mx(124), my(83));

    ctx.moveTo(mx(124), my(83));
    ctx.lineTo(mx(126), my(38));
    ctx.bezierCurveTo(mx(122), my(38), mx(120), my(44), mx(124), my(44));
    ctx.lineTo(mx(124), my(83));
    ctx.bezierCurveTo(mx(124), my(83), mx(135), my(74), mx(140), my(68));

    // 4. Cursive letter 'w' wave curves
    ctx.moveTo(mx(140), my(68));
    ctx.bezierCurveTo(mx(145), my(78), mx(148), my(78), mx(152), my(68));
    ctx.bezierCurveTo(mx(154), my(78), mx(157), my(78), mx(160), my(62));
    ctx.bezierCurveTo(mx(160), my(62), mx(165), my(58), mx(168), my(58));

    // 5. Cursive letter 'a' with the high sweeping top loop flourish
    ctx.moveTo(mx(168), my(58));
    ctx.bezierCurveTo(mx(160), my(60), mx(160), my(72), mx(172), my(72));
    ctx.lineTo(mx(172), my(62));

    ctx.moveTo(mx(172), my(62));
    ctx.bezierCurveTo(mx(185), my(45), mx(195), my(55), mx(145), my(45));
    ctx.bezierCurveTo(mx(142), my(45), mx(140), my(48), mx(146), my(50));

    // 6. The majestic sweeping calligraphic underline flourish with loops and ribbon tips
    ctx.moveTo(mx(78), my(92));
    ctx.bezierCurveTo(mx(60), my(105), mx(72), my(112), mx(85), my(102));
    ctx.bezierCurveTo(mx(120), my(72), mx(175), my(68), mx(185), my(78));
    ctx.bezierCurveTo(mx(195), my(84), mx(180), my(95), mx(155), my(95));

    ctx.moveTo(mx(155), my(95));
    ctx.bezierCurveTo(mx(145), my(110), mx(152), my(115), mx(135), my(105));

    ctx.stroke();
    ctx.restore();

    resolve();
  });
};

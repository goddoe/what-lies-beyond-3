import * as THREE from 'three';

/**
 * Procedural PBR texture generator using Canvas2D.
 * Generates diffuse maps + Sobel-derived normal maps for various surface types.
 */
export class ProceduralTextures {
  constructor() {
    this._cache = new Map();
  }

  /**
   * Get textures for a surface type.
   * @param {string} type - 'concrete'|'tile'|'plaster'|'wood'|'metal'|'screen'|'rusty_metal'
   * @param {number} color - hex color
   * @param {object} opts - optional overrides
   * @returns {{ map: THREE.CanvasTexture, normalMap: THREE.CanvasTexture }}
   */
  get(type, color, opts = {}) {
    const key = `${type}_${color.toString(16)}`;
    if (this._cache.has(key)) return this._cache.get(key);

    let result;
    switch (type) {
      case 'concrete':    result = this._generateConcrete(color, opts); break;
      case 'tile':        result = this._generateTile(color, opts); break;
      case 'plaster':     result = this._generatePlaster(color, opts); break;
      case 'wood':        result = this._generateWood(color, opts); break;
      case 'metal':       result = this._generateMetal(color, opts); break;
      case 'screen':      result = this._generateScreen(color, opts); break;
      case 'rusty_metal': result = this._generateRustyMetal(color, opts); break;
      default:            result = this._generateConcrete(color, opts); break;
    }

    this._cache.set(key, result);
    return result;
  }

  dispose() {
    for (const { map, normalMap } of this._cache.values()) {
      map.dispose();
      normalMap.dispose();
    }
    this._cache.clear();
  }

  // ── Generators ──────────────────────────────────────

  _generateConcrete(color, opts) {
    const size = 256;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    // Base fill
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Noise grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Cracks
    ctx.strokeStyle = `rgba(${Math.max(0,c.r-40)},${Math.max(0,c.g-40)},${Math.max(0,c.b-40)},0.2)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Stains
    for (let i = 0; i < 5; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      const sr = 20 + Math.random() * 40;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      grad.addColorStop(0, `rgba(${Math.max(0,c.r-25)},${Math.max(0,c.g-25)},${Math.max(0,c.b-20)},0.15)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const normalMap = this._generateNormalFromCanvas(canvas);

    return { map, normalMap };
  }

  _generateTile(color, opts) {
    const size = 256;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    // Grout lines (darker background)
    const groutColor = `rgb(${Math.max(0,c.r-30)},${Math.max(0,c.g-30)},${Math.max(0,c.b-25)})`;
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, size, size);

    // Tile grid
    const tileCount = opts.tileCount || 4;
    const tileSize = size / tileCount;
    const groutWidth = 3;

    for (let tx = 0; tx < tileCount; tx++) {
      for (let ty = 0; ty < tileCount; ty++) {
        const x = tx * tileSize + groutWidth;
        const y = ty * tileSize + groutWidth;
        const tw = tileSize - groutWidth * 2;
        const th = tileSize - groutWidth * 2;

        // Slight color variation per tile
        const v = (Math.random() - 0.5) * 12;
        ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,c.r+v))},${Math.max(0,Math.min(255,c.g+v))},${Math.max(0,Math.min(255,c.b+v))})`;
        ctx.fillRect(x, y, tw, th);
      }
    }

    // Add subtle noise to tiles
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const normalMap = this._generateNormalFromCanvas(canvas);

    return { map, normalMap };
  }

  _generatePlaster(color, opts) {
    const size = 128;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Very fine noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    // Flat normal for ceiling — barely visible, saves GPU
    const normalMap = this._generateFlatNormal(size);

    return { map, normalMap };
  }

  _generateWood(color, opts) {
    const size = 128;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    // Base
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Wood grain lines (horizontal)
    for (let y = 0; y < size; y++) {
      const wave = Math.sin(y * 0.08 + Math.sin(y * 0.02) * 3) * 0.5 + 0.5;
      const v = wave * 20 - 10;
      ctx.fillStyle = `rgba(${Math.max(0,c.r-20)},${Math.max(0,c.g-15)},${Math.max(0,c.b-10)},${0.1 + wave * 0.15})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Knots
    for (let i = 0; i < 2; i++) {
      const kx = Math.random() * size;
      const ky = Math.random() * size;
      const kr = 8 + Math.random() * 12;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, `rgba(${Math.max(0,c.r-35)},${Math.max(0,c.g-30)},${Math.max(0,c.b-20)},0.4)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * 1.5, kr, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const normalMap = this._generateNormalFromCanvas(canvas);

    return { map, normalMap };
  }

  _generateMetal(color, opts) {
    const size = 128;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Brushed metal lines (vertical)
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let y = 0; y < size; y++) {
      const streak = (Math.random() - 0.5) * 18;
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const noise = (Math.random() - 0.5) * 6;
        d[i]     = Math.max(0, Math.min(255, d[i] + streak + noise));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + streak + noise));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + streak + noise));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle highlight
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.04)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const normalMap = this._generateNormalFromCanvas(canvas);

    return { map, normalMap };
  }

  _generateScreen(color, opts) {
    const size = 64;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    // Dark background
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Scanlines
    for (let y = 0; y < size; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,0.15)`;
      ctx.fillRect(0, y, size, 1);
    }

    // Static noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise * 0.5));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise * 1.5));
    }
    ctx.putImageData(imgData, 0, 0);

    // Glow center
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.6);
    grad.addColorStop(0, `rgba(${Math.min(255,c.r+30)},${Math.min(255,c.g+30)},${Math.min(255,c.b+40)},0.2)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    // No normal map for screens
    const normalMap = this._generateFlatNormal(size);

    return { map, normalMap };
  }

  _generateRustyMetal(color, opts) {
    const size = 128;
    const { canvas, ctx } = this._createCanvas(size, size);
    const c = this._hexToRgb(color);

    // Base metal
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, 0, size, size);

    // Rust patches
    for (let i = 0; i < 12; i++) {
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      const rr = 15 + Math.random() * 35;
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      const rustR = Math.min(255, c.r + 20 + Math.random() * 30);
      const rustG = Math.max(0, c.g - 10 + Math.random() * 15);
      const rustB = Math.max(0, c.b - 15);
      grad.addColorStop(0, `rgba(${rustR},${rustG},${rustB},0.3)`);
      grad.addColorStop(0.7, `rgba(${rustR},${rustG},${rustB},0.1)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }

    // Scratches
    ctx.strokeStyle = `rgba(${Math.min(255,c.r+30)},${Math.min(255,c.g+25)},${Math.min(255,c.b+20)},0.2)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 60);
      ctx.stroke();
    }

    // Noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      d[i]     = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const map = this._canvasToTexture(canvas, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const normalMap = this._generateNormalFromCanvas(canvas);

    return { map, normalMap };
  }

  // ── Helpers ──────────────────────────────────────

  _createCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return { canvas, ctx };
  }

  _canvasToTexture(canvas, opts = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = opts.wrapS || THREE.RepeatWrapping;
    tex.wrapT = opts.wrapT || THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Generate normal map from a canvas using Sobel filter on luminance.
   */
  _generateNormalFromCanvas(srcCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const srcData = srcCtx.getImageData(0, 0, w, h).data;

    // Extract grayscale heights
    const heights = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      heights[i] = (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
    }

    const { canvas: nCanvas, ctx: nCtx } = this._createCanvas(w, h);
    const nImgData = nCtx.createImageData(w, h);
    const nd = nImgData.data;

    const strength = 0.8;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Sample heights with wrapping
        const tl = heights[((y - 1 + h) % h) * w + ((x - 1 + w) % w)];
        const t  = heights[((y - 1 + h) % h) * w + x];
        const tr = heights[((y - 1 + h) % h) * w + ((x + 1) % w)];
        const l  = heights[y * w + ((x - 1 + w) % w)];
        const r  = heights[y * w + ((x + 1) % w)];
        const bl = heights[((y + 1) % h) * w + ((x - 1 + w) % w)];
        const b  = heights[((y + 1) % h) * w + x];
        const br = heights[((y + 1) % h) * w + ((x + 1) % w)];

        // Sobel
        const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
        const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

        const nx = -dX * strength;
        const ny = -dY * strength;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const idx = (y * w + x) * 4;
        nd[idx]     = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
        nd[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
        nd[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
        nd[idx + 3] = 255;
      }
    }

    nCtx.putImageData(nImgData, 0, 0);

    const tex = new THREE.CanvasTexture(nCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Generate flat normal map (for screens that don't need bumps)
   */
  _generateFlatNormal(size) {
    const { canvas, ctx } = this._createCanvas(size, size);
    ctx.fillStyle = 'rgb(128,128,255)'; // flat normal pointing up
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ── Wall Graffiti Text ─────────────────────────────────

  /**
   * Generate a transparent-background texture with stylized text for wall graffiti.
   * @param {string} text - The text to render
   * @param {string} style - 'scratch'|'chalk'|'paint'|'blood'|'carved'
   * @param {object} opts - { fontSize, width, height, opacity }
   * @returns {THREE.CanvasTexture}
   */
  generateWallText(text, style = 'scratch', opts = {}) {
    const fontSize = opts.fontSize || 28;
    const w = opts.width || 256;
    const h = opts.height || 128;
    const opacity = opts.opacity || 1.0;

    const { canvas, ctx } = this._createCanvas(w, h);
    // Transparent background
    ctx.clearRect(0, 0, w, h);

    switch (style) {
      case 'scratch':  this._renderScratch(ctx, text, w, h, fontSize, opacity); break;
      case 'chalk':    this._renderChalk(ctx, text, w, h, fontSize, opacity); break;
      case 'paint':    this._renderPaint(ctx, text, w, h, fontSize, opacity); break;
      case 'blood':    this._renderBlood(ctx, text, w, h, fontSize, opacity); break;
      case 'carved':   this._renderCarved(ctx, text, w, h, fontSize, opacity); break;
      default:         this._renderScratch(ctx, text, w, h, fontSize, opacity); break;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Scratched lines — thin, offset multiple passes, gray */
  _renderScratch(ctx, text, w, h, fontSize, opacity) {
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Multiple thin passes with slight offsets
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 2;
      const oy = (Math.random() - 0.5) * 2;
      const a = (0.25 + Math.random() * 0.15) * opacity;
      ctx.fillStyle = `rgba(180,175,170,${a})`;
      ctx.fillText(text, w / 2 + ox, h / 2 + oy);
    }

    // Scratch lines through text
    ctx.strokeStyle = `rgba(160,155,150,${0.2 * opacity})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const y = h / 2 + (Math.random() - 0.5) * fontSize;
      ctx.moveTo(w * 0.15, y);
      ctx.lineTo(w * 0.85, y + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }
  }

  /** Chalk — white/yellow, noise overlay, slightly blurred feel */
  _renderChalk(ctx, text, w, h, fontSize, opacity) {
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main text
    const isYellow = Math.random() > 0.5;
    const r = isYellow ? 240 : 230;
    const g = isYellow ? 220 : 225;
    const b = isYellow ? 160 : 220;

    // Multiple blurred passes for chalk effect
    for (let i = 0; i < 4; i++) {
      const ox = (Math.random() - 0.5) * 1.5;
      const oy = (Math.random() - 0.5) * 1.5;
      const a = (0.2 + Math.random() * 0.1) * opacity;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillText(text, w / 2 + ox, h / 2 + oy);
    }

    // Noise speckles around text area
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 60; i++) {
      const px = cx + (Math.random() - 0.5) * w * 0.7;
      const py = cy + (Math.random() - 0.5) * fontSize * 1.5;
      const sz = 1 + Math.random() * 1.5;
      ctx.fillStyle = `rgba(${r},${g},${b},${(0.05 + Math.random() * 0.1) * opacity})`;
      ctx.fillRect(px, py, sz, sz);
    }
  }

  /** Paint — thick strokes + drip dots, vivid colors */
  _renderPaint(ctx, text, w, h, fontSize, opacity) {
    ctx.font = `bold ${fontSize * 1.1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const colors = [
      [255, 60, 60],   // red
      [60, 200, 255],  // blue
      [255, 200, 40],  // yellow
      [255, 255, 255], // white
    ];
    const [cr, cg, cb] = colors[Math.floor(Math.random() * colors.length)];

    // Thick stroke
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.7 * opacity})`;
    ctx.lineWidth = 3;
    ctx.strokeText(text, w / 2, h / 2);

    // Fill
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.8 * opacity})`;
    ctx.fillText(text, w / 2, h / 2);

    // Spray/drip dots
    for (let i = 0; i < 25; i++) {
      const px = w / 2 + (Math.random() - 0.5) * w * 0.6;
      const py = h / 2 + (Math.random() - 0.3) * fontSize * 2;
      const r2 = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(px, py, r2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.15 + Math.random() * 0.2) * opacity})`;
      ctx.fill();
    }
  }

  /** Blood — dark red, dripping bezier curves downward */
  _renderBlood(ctx, text, w, h, fontSize, opacity) {
    ctx.font = `bold ${fontSize * 1.1}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = h * 0.35;

    // Main text — dark red
    ctx.fillStyle = `rgba(140,15,15,${0.9 * opacity})`;
    ctx.fillText(text, w / 2, textY);

    // Slightly brighter overlay
    ctx.fillStyle = `rgba(180,25,20,${0.4 * opacity})`;
    ctx.fillText(text, w / 2 + 0.5, textY + 0.5);

    // Dripping lines from text
    const metrics = ctx.measureText(text);
    const textLeft = w / 2 - metrics.width / 2;
    const textRight = w / 2 + metrics.width / 2;
    const dripCount = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < dripCount; i++) {
      const dx = textLeft + Math.random() * (textRight - textLeft);
      const dripLen = 15 + Math.random() * 40;
      const cxOff = (Math.random() - 0.5) * 8;

      ctx.beginPath();
      ctx.moveTo(dx, textY + fontSize * 0.4);
      ctx.bezierCurveTo(
        dx + cxOff, textY + fontSize * 0.4 + dripLen * 0.3,
        dx - cxOff, textY + fontSize * 0.4 + dripLen * 0.6,
        dx + cxOff * 0.5, textY + fontSize * 0.4 + dripLen
      );
      ctx.strokeStyle = `rgba(130,10,10,${(0.4 + Math.random() * 0.3) * opacity})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.stroke();

      // Drip blob at end
      ctx.beginPath();
      ctx.arc(dx + cxOff * 0.5, textY + fontSize * 0.4 + dripLen, 1.5 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,8,8,${0.5 * opacity})`;
      ctx.fill();
    }
  }

  /** Carved — deep gouged letters with shadow effect */
  _renderCarved(ctx, text, w, h, fontSize, opacity) {
    ctx.font = `bold ${fontSize * 1.2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow (deeper)
    ctx.fillStyle = `rgba(20,18,15,${0.5 * opacity})`;
    ctx.fillText(text, w / 2 + 2, h / 2 + 2);

    // Inner shadow
    ctx.strokeStyle = `rgba(40,35,30,${0.6 * opacity})`;
    ctx.lineWidth = 3;
    ctx.strokeText(text, w / 2, h / 2);

    // Main carved groove — darker than wall
    ctx.fillStyle = `rgba(50,45,40,${0.8 * opacity})`;
    ctx.fillText(text, w / 2, h / 2);

    // Highlight edge (top-left light)
    ctx.strokeStyle = `rgba(90,85,80,${0.3 * opacity})`;
    ctx.lineWidth = 1;
    ctx.strokeText(text, w / 2 - 1, h / 2 - 1);
  }

  // ── Helpers ──────────────────────────────────────

  _hexToRgb(hex) {
    // Slight brightness boost for textures — PBR lighting + tone mapping will dim them
    const boost = 1.25;
    return {
      r: Math.min(255, Math.round(((hex >> 16) & 0xff) * boost)),
      g: Math.min(255, Math.round(((hex >> 8) & 0xff) * boost)),
      b: Math.min(255, Math.round((hex & 0xff) * boost)),
    };
  }
}

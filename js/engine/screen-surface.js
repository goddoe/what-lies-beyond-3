import * as THREE from 'three';

/**
 * ScreenSurface — reusable in-world screen helper.
 *
 * A canvas-backed emissive plane whose content narrative code can update at
 * runtime (feeds, dashboards, terminal glow). Text here is ambient/decorative —
 * required reading happens in DOM overlays.
 *
 * Canvas capped at 512×384; texture updates only on draw calls, never per-frame.
 */
export class ScreenSurface {
  constructor({ width = 0.9, height = 0.6, background = '#0a1018' } = {}) {
    this.widthM = width;
    this.heightM = height;
    this.background = background;

    const pxW = 512;
    const pxH = Math.min(384, Math.round(pxW * (height / width)));
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxW;
    this.canvas.height = pxH;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.25,
      metalness: 0.1,
      emissive: new THREE.Color(0xaaccee),
      emissiveMap: this.texture,
      emissiveIntensity: 0.9,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
    this.powered = true;

    this._clear();
    this.texture.needsUpdate = true;
  }

  _clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** Custom draw. fn(ctx, w, h). */
  draw(fn) {
    this._clear();
    fn(this.ctx, this.canvas.width, this.canvas.height);
    this._scanlines();
    this.texture.needsUpdate = true;
  }

  /**
   * Convenience: monitor-style text lines.
   * lines: [{ text, color?, size?, dim? }] or plain strings.
   */
  drawText(lines, { title = null, font = 'monospace', color = '#9fd4a8' } = {}) {
    this.draw((ctx, w, h) => {
      let y = 26;
      if (title) {
        ctx.fillStyle = 'rgba(160,200,230,0.55)';
        ctx.font = `bold 15px ${font}`;
        ctx.fillText(title, 14, y);
        y += 14;
        ctx.strokeStyle = 'rgba(160,200,230,0.25)';
        ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(w - 14, y); ctx.stroke();
        y += 24;
      }
      for (const raw of lines) {
        const line = typeof raw === 'string' ? { text: raw } : raw;
        const size = line.size || 16;
        ctx.font = `${size}px ${font}`;
        ctx.fillStyle = line.color || (line.dim ? 'rgba(160,190,170,0.4)' : color);
        ctx.fillText(line.text, 14, y);
        y += size * 1.5;
        if (y > h - 10) break;
      }
    });
  }

  _scanlines() {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < canvas.height; y += 3) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }

  setPower(on) {
    this.powered = on;
    if (on) {
      this.material.emissiveIntensity = 0.9;
      this.texture.needsUpdate = true;
    } else {
      this.material.emissiveIntensity = 0.02;
      this._clear();
      this.ctx.fillStyle = '#04060a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.texture.needsUpdate = true;
    }
  }
}

/** Registry keyed by screen id so narrative code can find screens at runtime. */
export class ScreenRegistry {
  constructor() {
    this.map = new Map();
  }
  register(id, surface) {
    this.map.set(id, surface);
  }
  get(id) {
    return this.map.get(id) || null;
  }
}

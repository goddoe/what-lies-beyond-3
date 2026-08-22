import { State } from '../game-state.js';

/**
 * Hold-to-act overlay — powers two beats:
 *  - the weight-copy minigame (hold to copy; release when the load meter
 *    reddens — heat pauses progress, never fails)
 *  - the signature (simple hold-to-fill, no heat)
 *
 * Mobile: touch-hold the big button. Desktop: mouse-hold or hold Space.
 */
export class HoldOverlay {
  constructor(overlayManager) {
    this.om = overlayManager;
    this.el = document.getElementById('hold-overlay');
    this.titleEl = document.getElementById('hold-title');
    this.statusEl = document.getElementById('hold-status');
    this.barFill = document.getElementById('hold-bar-fill');
    this.heatWrap = document.getElementById('hold-heat-wrap');
    this.heatFill = document.getElementById('hold-heat-fill');
    this.btn = document.getElementById('hold-btn');

    this.holding = false;
    this.active = false;
    this._raf = null;

    const down = (e) => { e.preventDefault(); this.holding = true; };
    const up = (e) => { e.preventDefault(); this.holding = false; };
    this.btn.addEventListener('touchstart', down, { passive: false });
    this.btn.addEventListener('touchend', up, { passive: false });
    this.btn.addEventListener('touchcancel', up, { passive: false });
    this.btn.addEventListener('mousedown', down);
    document.addEventListener('mouseup', () => { this.holding = false; });

    document.addEventListener('keydown', (e) => {
      if (this.active && e.code === 'Space') { e.preventDefault(); this.holding = true; }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.holding = false;
    });
  }

  /**
   * @param {object} cfg
   *  title, buttonLabel, statusLines: {progress, hot, done} (strings),
   *  duration (sec of held time to complete), heat: bool,
   *  heatRiseTime / heatFallTime (sec), onProgress?, onDone
   */
  start(cfg) {
    this.cfg = cfg;
    this.progress = 0;   // 0..1
    this.heat = 0;       // 0..1
    this.holding = false;
    this.active = true;
    this._lastTs = null;
    this._doneFired = false;

    this.titleEl.textContent = cfg.title || '';
    this.btn.textContent = cfg.buttonLabel || '';
    this.statusEl.textContent = (cfg.statusLines && cfg.statusLines.progress) || '';
    this.barFill.style.width = '0%';
    this.heatWrap.style.display = cfg.heat ? 'block' : 'none';
    this.heatFill.style.width = '0%';
    this.heatFill.classList.remove('heat-hot');

    this.om.open(this.el, State.HOLD, {
      onClose: () => { this.active = false; this._stopLoop(); },
    });

    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  _loop(ts) {
    if (!this.active) return;
    if (this._lastTs === null) this._lastTs = ts;
    const delta = Math.min(0.05, (ts - this._lastTs) / 1000);
    this._lastTs = ts;

    const cfg = this.cfg;
    const heatMax = 1;

    if (cfg.heat) {
      if (this.holding) {
        this.heat += delta / (cfg.heatRiseTime || 5);
      } else {
        this.heat -= delta / (cfg.heatFallTime || 2.5);
      }
      this.heat = Math.max(0, Math.min(heatMax, this.heat));

      const hot = this.heat >= 0.85;
      this.heatFill.style.width = `${this.heat * 100}%`;
      this.heatFill.classList.toggle('heat-hot', hot);
      this.statusEl.textContent = hot
        ? (cfg.statusLines.hot || '')
        : (cfg.statusLines.progress || '');

      // Overheated: progress stalls (no fail)
      if (this.holding && !hot) {
        this.progress += delta / cfg.duration;
      }
    } else if (this.holding) {
      this.progress += delta / cfg.duration;
    } else if (cfg.decayWhenReleased) {
      this.progress = Math.max(0, this.progress - delta / (cfg.duration * 2));
    }

    this.progress = Math.min(1, this.progress);
    this.barFill.style.width = `${this.progress * 100}%`;
    if (this.cfg.onProgress) this.cfg.onProgress(this.progress, this.heat);

    if (this.progress >= 1 && !this._doneFired) {
      this._doneFired = true;
      this.statusEl.textContent = (cfg.statusLines && cfg.statusLines.done) || '';
      this.barFill.style.width = '100%';
      setTimeout(() => {
        const cb = cfg.onDone;
        this.active = false;
        this.om.close();
        if (cb) cb();
      }, 900);
      return;
    }

    this._raf = requestAnimationFrame(this._loop);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }
}

import { t } from '../data/i18n.js';

/**
 * Mobile Touch Controls — portrait-first, one-thumb navigable.
 *
 * Scheme:
 *  - Walk button (bottom-center, large): hold = forward, horizontal drag while
 *    holding = steer yaw. Full one-thumb navigation.
 *  - Back button (small, below walk).
 *  - Look zone: any other touch = drag-look (yaw + pitch). Pitch clamps ±72°
 *    and springs back toward level only when |pitch| > 25° so reading desk
 *    monitors isn't fought by the spring.
 *  - Tap in look zone = interact. A labeled contextual pill button also appears
 *    when an interactable is in reach (discoverable alternative to tapping).
 *  - Pause button top-left.
 */
export class TouchControls {
  constructor(player, camera, gameState) {
    this.player = player;
    this.camera = camera;
    this.gameState = gameState;

    // Camera rotation state
    this.yaw = 0;
    this.pitch = 0;
    this._initRotationFromCamera();

    // Sensitivity & limits
    this.sensitivity = 0.004;
    this.pitchLimit = Math.PI * 0.4;      // ±72°
    this.springGraceMs = 2000;            // hold the player's pitch this long after release
    this._lookReleasedAt = 0;
    this.springBackSpeed = 4.0;
    this.springThreshold = Math.PI / 7.2; // ~25° — below this, don't spring

    // Touch tracking
    this._lookTouch = null;
    this._fwdTouch = null;
    this._bwdTouch = null;

    // Callbacks
    this.onInteract = null;
    this.onPause = null;

    // Build UI
    this._container = null;
    this._fwdBtn = null;
    this._bwdBtn = null;
    this._pauseBtn = null;
    this._interactPill = null;
    this._createUI();

    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
    document.addEventListener('touchstart', this._onTouchStart, { passive: false });
    document.addEventListener('touchmove', this._onTouchMove, { passive: false });
    document.addEventListener('touchend', this._onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', this._onTouchEnd, { passive: false });

    this.camera.rotation.order = 'YXZ';
  }

  _initRotationFromCamera() {
    this.yaw = this.camera.rotation.y;
    this.pitch = this.camera.rotation.x;
  }

  /** Re-sync internal yaw/pitch after external camera moves (teleport, focus release). */
  syncFromCamera() {
    this.camera.rotation.order = 'YXZ';
    this.yaw = this.camera.rotation.y;
    this.pitch = this.camera.rotation.x;
  }

  _createUI() {
    const c = document.createElement('div');
    c.id = 'touch-controls';
    c.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:70;pointer-events:none;display:none;';

    const fwdSvg = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>`;
    const bwdSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    // Walk button — enlarged (84px visual, ~110px hit area via padding box)
    const fwd = document.createElement('button');
    fwd.innerHTML = fwdSvg;
    fwd.style.cssText = `
      position:absolute; bottom:calc(9% + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%);
      width:84px; height:84px; border-radius:50%;
      background:rgba(255,255,255,0.05);
      border:1.5px solid rgba(255,255,255,0.18);
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none;
      outline:none; padding:0;
      box-shadow:0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 13px rgba(0,0,0,0.001);
      transition:background 0.15s, border-color 0.15s;
    `;
    this._fwdBtn = fwd;

    // Back button
    const bwd = document.createElement('button');
    bwd.innerHTML = bwdSvg;
    bwd.style.cssText = `
      position:absolute; bottom:calc(1% + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%);
      width:48px; height:48px; border-radius:50%;
      background:rgba(255,255,255,0.03);
      border:1.5px solid rgba(255,255,255,0.12);
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none;
      outline:none; padding:0;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      transition:background 0.15s, border-color 0.15s;
    `;
    this._bwdBtn = bwd;

    // Pause button (top-left, safe-area aware)
    const pause = document.createElement('button');
    pause.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    pause.style.cssText = `
      position:absolute; top:calc(env(safe-area-inset-top, 0px) + 12px); left:12px;
      width:44px; height:44px; border-radius:10px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.12);
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none;
      outline:none; padding:0;
      box-shadow:0 1px 6px rgba(0,0,0,0.2);
    `;
    pause.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.onPause) this.onPause();
    });
    this._pauseBtn = pause;

    // Contextual interact pill — shown when an interactable is in reach
    const pill = document.createElement('button');
    pill.style.cssText = `
      position:absolute; bottom:calc(22% + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%);
      min-width:120px; height:48px; border-radius:24px;
      padding:0 1.4em;
      background:rgba(140,200,250,0.14);
      border:1px solid rgba(140,200,250,0.5);
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
      color:rgba(235,245,255,0.95); font-size:0.95rem; letter-spacing:0.05em;
      display:none; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none;
      outline:none;
      box-shadow:0 2px 12px rgba(0,0,0,0.35);
      font-family:inherit;
    `;
    pill.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.onInteract) this.onInteract();
    });
    this._interactPill = pill;

    c.appendChild(fwd);
    c.appendChild(bwd);
    c.appendChild(pause);
    c.appendChild(pill);
    document.body.appendChild(c);
    this._container = c;
  }

  /** Show/update or hide the contextual interact pill. */
  setInteractTarget(target) {
    if (!this._interactPill) return;
    if (target) {
      const verbKey = target.verb || this._defaultVerb(target.type);
      this._interactPill.textContent = t(verbKey);
      this._interactPill.style.display = 'flex';
    } else {
      this._interactPill.style.display = 'none';
    }
  }

  _defaultVerb(type) {
    switch (type) {
      case 'door': return 'verbOpen';
      case 'document': return 'verbRead';
      case 'monitor': case 'monitor_wall': return 'verbLook';
      case 'console': return 'verbUse';
      default: return 'verbUse';
    }
  }

  _isBtn(btn, el) {
    return el === btn || (el && btn.contains(el));
  }

  _handleTouchStart(e) {
    if (!this.gameState.is('PLAYING')) return;
    // taps on HUD chrome (phone badge, message banner) must stay native so
    // their click handlers fire — preventDefault would swallow them
    const first = e.changedTouches[0];
    const hudEl = first && document.elementFromPoint(first.clientX, first.clientY);
    if (hudEl && hudEl.closest && hudEl.closest('#phone-badge, #msg-banner')) return;
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);

      if (this._isBtn(this._fwdBtn, el)) {
        this._fwdTouch = { id: touch.identifier, lastX: touch.clientX };
        this.player.moveForward = true;
        this._fwdBtn.style.background = 'rgba(255,255,255,0.15)';
        this._fwdBtn.style.borderColor = 'rgba(255,255,255,0.35)';
      } else if (this._isBtn(this._bwdBtn, el)) {
        this._bwdTouch = { id: touch.identifier, lastX: touch.clientX };
        this.player.moveBackward = true;
        this._bwdBtn.style.background = 'rgba(255,255,255,0.1)';
        this._bwdBtn.style.borderColor = 'rgba(255,255,255,0.25)';
      } else if (this._isBtn(this._pauseBtn, el) || this._isBtn(this._interactPill, el)) {
        // handled by the buttons' own touchend listeners
      } else if (!this._lookTouch) {
        this._lookTouch = {
          id: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          startTime: performance.now(),
        };
      }
    }
  }

  _handleTouchMove(e) {
    if (!this.gameState.is('PLAYING')) return;
    e.preventDefault();

    for (const touch of e.changedTouches) {
      if (this._lookTouch && touch.identifier === this._lookTouch.id) {
        const dx = touch.clientX - this._lookTouch.lastX;
        const dy = touch.clientY - this._lookTouch.lastY;
        this.yaw -= dx * this.sensitivity;
        this.pitch -= dy * this.sensitivity;
        this.pitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.pitch));
        this._lookTouch.lastX = touch.clientX;
        this._lookTouch.lastY = touch.clientY;
      }

      // Walk/back button drag → steer yaw (one-thumb navigation)
      if (this._fwdTouch && touch.identifier === this._fwdTouch.id) {
        const dx = touch.clientX - this._fwdTouch.lastX;
        this.yaw -= dx * this.sensitivity;
        this._fwdTouch.lastX = touch.clientX;
      }
      if (this._bwdTouch && touch.identifier === this._bwdTouch.id) {
        const dx = touch.clientX - this._bwdTouch.lastX;
        this.yaw -= dx * this.sensitivity;
        this._bwdTouch.lastX = touch.clientX;
      }
    }
  }

  _handleTouchEnd(e) {
    for (const touch of e.changedTouches) {
      if (this._fwdTouch && touch.identifier === this._fwdTouch.id) {
        this.player.moveForward = false;
        this._fwdBtn.style.background = 'rgba(255,255,255,0.05)';
        this._fwdBtn.style.borderColor = 'rgba(255,255,255,0.18)';
        this._fwdTouch = null;
      }

      if (this._bwdTouch && touch.identifier === this._bwdTouch.id) {
        this.player.moveBackward = false;
        this._bwdBtn.style.background = 'rgba(255,255,255,0.03)';
        this._bwdBtn.style.borderColor = 'rgba(255,255,255,0.12)';
        this._bwdTouch = null;
      }

      if (this._lookTouch && touch.identifier === this._lookTouch.id) {
        const dt = performance.now() - this._lookTouch.startTime;
        const dx = Math.abs(touch.clientX - this._lookTouch.startX);
        const dy = Math.abs(touch.clientY - this._lookTouch.startY);

        if (dt < 250 && dx < 15 && dy < 15) {
          if (this.onInteract) this.onInteract();
        }

        this._lookReleasedAt = performance.now();
        this._lookTouch = null;
      }
    }
  }

  update(delta) {
    // Spring-back pitch only when it's steep — small pitches (reading a desk
    // monitor) shouldn't fight the player. After the finger lifts, hold the
    // player's aim for a grace period, then ease back in gently.
    if (!this._lookTouch && Math.abs(this.pitch) > this.springThreshold) {
      const sinceRelease = performance.now() - this._lookReleasedAt;
      if (sinceRelease > this.springGraceMs) {
        const ramp = Math.min(1, (sinceRelease - this.springGraceMs) / 1000);
        this.pitch += (0 - this.pitch) * Math.min(1, this.springBackSpeed * ramp * delta);
      }
    }

    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.player._mouseMovedThisFrame = true;
  }

  show() {
    if (this._container) this._container.style.display = '';
  }

  hide() {
    if (this._container) this._container.style.display = 'none';
    this.player.moveForward = false;
    this.player.moveBackward = false;
    this._fwdTouch = null;
    this._bwdTouch = null;
    this._lookTouch = null;
  }

  dispose() {
    document.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    document.removeEventListener('touchcancel', this._onTouchEnd);
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}

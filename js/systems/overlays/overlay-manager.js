import { State } from '../game-state.js';

/**
 * Overlay manager — centralizes the open/close invariants:
 * opening an overlay hides touch controls + crosshair and moves the FSM;
 * closing restores PLAYING and (on desktop) re-locks the pointer via the
 * click-to-play catcher.
 *
 * Exactly one overlay may be open at a time (no stacking needed in WLB3).
 */
export class OverlayManager {
  constructor(gameState, { isMobile }) {
    this.gameState = gameState;
    this.isMobile = isMobile;
    this.touchControls = null;   // set later (lazy import)
    this.player = null;          // set by main
    this.crosshair = document.getElementById('crosshair');
    this.current = null;         // { el, state, onClose }
    this._suppressUnlockPause = false;
  }

  /** True while an overlay owns the screen. */
  get isOpen() {
    return this.current !== null;
  }

  /**
   * @param {HTMLElement} el overlay root to show
   * @param {string} state FSM state to enter
   * @param {object} opts { onClose }
   */
  open(el, state, opts = {}) {
    if (this.current) this.close({ skipRelock: true });

    this.current = { el, state, onClose: opts.onClose || null };

    // Leaving pointer lock fires 'unlock' — don't let that pause the game
    this._suppressUnlockPause = true;
    if (!this.isMobile && this.player && this.player.isLocked) {
      try { this.player.controls.unlock(); } catch (e) { /* iOS */ }
    }
    setTimeout(() => { this._suppressUnlockPause = false; }, 300);

    this.gameState.set(state);
    if (this.touchControls) this.touchControls.hide();
    if (this.crosshair) this.crosshair.style.display = 'none';
    el.style.display = 'flex';
  }

  close(opts = {}) {
    if (!this.current) return;
    const { el, onClose } = this.current;
    this.current = null;

    el.style.display = 'none';
    if (onClose) onClose();

    if (opts.skipRelock) return;

    this.gameState.set(State.PLAYING);
    if (this.isMobile) {
      if (this.touchControls) this.touchControls.show();
      if (this.crosshair) this.crosshair.style.display = 'block';
    } else {
      // The close click is a user gesture — relock the pointer directly.
      // Only fall back to the click catcher if the lock didn't take
      // (e.g. Chrome's cooldown after an ESC-initiated unlock).
      this._suppressUnlockPause = true;
      try { this.player.lock(); } catch (e) { /* ignore */ }
      setTimeout(() => {
        this._suppressUnlockPause = false;
        // Check the DOM directly — controls.isLocked can be stale while
        // mouse-look is detached during a camera focus.
        if (!document.pointerLockElement && this.gameState.is(State.PLAYING) && !this.isOpen) {
          this.gameState.set(State.CLICK_TO_PLAY);
        }
      }, 400);
    }
  }

  /** Whether a pointer-unlock right now should be ignored (overlay transition). */
  get suppressUnlockPause() {
    return this._suppressUnlockPause || this.isOpen;
  }
}

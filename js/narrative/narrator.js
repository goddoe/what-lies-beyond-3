import { SilentProvider } from './voice.js';

/**
 * Narrator engine — chat-log style.
 *
 * Lines stack from bottom. Previous lines fade to dim.
 * New lines appear with typewriter effect below older ones.
 * No box/border — text shadow provides readability.
 */
export class Narrator {
  constructor() {
    this.container = document.getElementById('narrator-log');

    this.voiceProvider = new SilentProvider();

    // Narrator mode: 'inner' | 'inner_uneasy' | 'questioning' | 'cracking' | 'revealed' | 'dialogue'
    this.narratorMode = 'inner';

    // State
    this.queue = [];
    this.isTyping = false;
    this.currentText = '';
    this.currentMood = 'calm';
    this.typeSpeed = 35; // ms per character
    this.typeTimer = null;
    this.charIndex = 0;
    this.currentLineEl = null;

    // Visible lines management
    this.visibleLines = []; // { el, timers[] }
    this.maxVisibleLines = ('ontouchstart' in window && window.innerWidth < 1024) ? 2 : 5;

    // Queue processing
    this.processTimer = null;
    this.lineGap = 400; // ms gap between queued lines

    // Idle detection
    this.lastActivityTime = Date.now();
    this.idleCallback = null;
    this.idleTimeout = 15000;
    this.idleTimer = null;

    // Callbacks
    this.onLineStart = null;
    this.onLineEnd = null;
    this.onQueueEmpty = null;
  }

  setVoiceProvider(provider) {
    this.voiceProvider = provider;
  }

  /**
   * True when narrator is busy (typing or waiting to process next line).
   */
  get isBusy() {
    return this.isTyping || this.processTimer !== null;
  }

  /**
   * Enqueue a narrator line.
   * Lines with delay=0 (new trigger events) show immediately, interrupting
   * any current typing. Lines with delay>0 (followUps) queue normally.
   */
  say(text, options = {}) {
    const item = {
      text,
      mood: options.mood || this.currentMood,
      speed: options.speed || this.typeSpeed,
      duration: options.duration || 0,
      id: options.id || null,
      delay: options.delay || 0,
    };

    if (item.delay > 0) {
      // Delayed line (followUp) — queue normally
      this.queue.push(item);
      if (!this.isBusy) {
        this._processQueue();
      }
    } else if (!this.isBusy) {
      // Immediate line, narrator free — show now
      this._showLine(item);
    } else {
      // Immediate line, narrator busy — interrupt and show
      this.queue = []; // discard stale followUps from previous trigger
      if (this.isTyping && this.currentLineEl) {
        this._stopTyping();
        this.currentLineEl.textContent = this.currentText;
      }
      this._clearProcessTimer();
      this._showLine(item);
    }
  }

  /**
   * Immediately show text (skip queue). Used for endings.
   */
  sayImmediate(text, options = {}) {
    this.queue = [];
    this._stopTyping();
    this._clearProcessTimer();
    this._showLine({
      text,
      mood: options.mood || this.currentMood,
      speed: options.speed || this.typeSpeed,
      duration: options.duration || 0,
      id: options.id || null,
      delay: 0,
    });
  }

  /**
   * Clear all queued lines and remove visible lines.
   */
  clear() {
    this.queue = [];
    this._stopTyping();
    this._clearProcessTimer();
    this._removeAllLines();
  }

  setMood(mood) {
    this.currentMood = mood;
  }

  /**
   * Set narrator mode — affects visual style and typing speed.
   * @param {'inner'|'inner_uneasy'|'questioning'|'cracking'|'revealed'|'dialogue'} mode
   */
  setNarratorMode(mode) {
    this.narratorMode = mode;
  }

  // show/hide kept for compatibility
  show() { /* container is always visible */ }

  hide() {
    this._removeAllLines();
    this._clearProcessTimer();
  }

  /**
   * Skip: if typing → show full text.
   * If waiting for next line → advance immediately.
   */
  skip() {
    if (this.isTyping && this.currentText) {
      this._stopTyping();
      if (this.currentLineEl) {
        this.currentLineEl.textContent = this.currentText;
      }
      this._onTypeComplete();
    } else if (this.processTimer) {
      this._clearProcessTimer();
      if (this.queue.length > 0) {
        this._processQueue();
      } else {
        this.isTyping = false;
        if (this.onQueueEmpty) this.onQueueEmpty();
      }
    }
  }

  onIdle(callback, timeout = 15000) {
    this.idleCallback = callback;
    this.idleTimeout = timeout;
    this._resetIdleTimer();
  }

  notifyActivity() {
    this.lastActivityTime = Date.now();
    this._resetIdleTimer();
  }

  // ── Internal ────────────────────────────────────────

  _processQueue() {
    if (this.queue.length === 0) {
      this.isTyping = false;
      if (this.onQueueEmpty) this.onQueueEmpty();
      return;
    }

    const line = this.queue.shift();

    if (line.delay > 0) {
      this.processTimer = setTimeout(() => {
        this.processTimer = null;
        this._showLine(line);
      }, line.delay);
    } else {
      this._showLine(line);
    }
  }

  _showLine(line) {
    this.isTyping = true;
    this.currentText = line.text;
    this.currentMood = line.mood;
    this.charIndex = 0;

    // Dim all previous lines
    for (const entry of this.visibleLines) {
      if (!entry.el.classList.contains('narrator-old')) {
        entry.el.classList.add('narrator-old');
      }
    }

    // Create new line element with mode-based styling
    const el = document.createElement('div');
    el.className = `narrator-line mood-${line.mood} mode-${this.narratorMode}`;
    el.textContent = '';
    this.container.appendChild(el);
    this.currentLineEl = el;

    const entry = { el, timers: [] };
    this.visibleLines.push(entry);

    // Hard cap: no line lingers past ~20s, even if its normal fade path
    // never runs (skips, dimmed-while-typing, overlay interruptions).
    entry.timers.push(setTimeout(() => {
      const idx = this.visibleLines.indexOf(entry);
      if (idx >= 0) this.visibleLines.splice(idx, 1);
      this._removeLine(entry);
    }, 20000));

    // Cleanup excess visible lines
    while (this.visibleLines.length > this.maxVisibleLines) {
      const oldest = this.visibleLines.shift();
      this._removeLine(oldest);
    }

    if (this.onLineStart) this.onLineStart(line);

    // Voice
    this.voiceProvider.speak(line.text, line.mood, { lineId: line.id });

    // Typewriter — speed varies by narrator mode (introspective → tense)
    let speed = line.speed;
    if (this.narratorMode === 'inner') speed = Math.max(speed, 50);
    else if (this.narratorMode === 'inner_uneasy') speed = Math.max(speed, 48);
    else if (this.narratorMode === 'questioning') speed = Math.max(speed, 45);
    else if (this.narratorMode === 'cracking') speed = Math.max(speed, 42);

    this.typeTimer = setInterval(() => {
      this.charIndex++;
      this.currentLineEl.textContent = this.currentText.substring(0, this.charIndex);

      if (this.charIndex >= this.currentText.length) {
        this._stopTyping();
        this._onTypeComplete(line);
      }
    }, speed);
  }

  _onTypeComplete(line) {
    if (this.onLineEnd) this.onLineEnd(line);

    const fadeDuration = (line && line.duration) || this._calcFadeDelay(this.currentText);
    const entry = this.visibleLines.find(e => e.el === this.currentLineEl);

    // Schedule auto-fade for this line (independent of queue)
    if (entry) {
      const fadeTimer = setTimeout(() => {
        entry.el.classList.add('narrator-old');
      }, fadeDuration);

      const removeTimer = setTimeout(() => {
        entry.el.classList.add('narrator-gone');
        setTimeout(() => {
          if (entry.el.parentNode) entry.el.remove();
          const idx = this.visibleLines.indexOf(entry);
          if (idx >= 0) this.visibleLines.splice(idx, 1);
        }, 1000);
      }, fadeDuration + 3000);

      entry.timers.push(fadeTimer, removeTimer);
    }

    // Schedule next queue item (shorter wait since lines stack)
    const nextDelay = this._calcNextLineDelay(this.currentText);

    this.processTimer = setTimeout(() => {
      this.processTimer = null;
      if (this.queue.length > 0) {
        this.processTimer = setTimeout(() => {
          this.processTimer = null;
          this._processQueue();
        }, this.lineGap);
      } else {
        this.isTyping = false;
        if (this.onQueueEmpty) this.onQueueEmpty();
      }
    }, nextDelay);
  }

  /** How long before this line starts fading. */
  _calcFadeDelay(text) {
    return Math.max(5000, Math.min(12000, text.length * 120));
  }

  /** How long before we start the next queued line. */
  _calcNextLineDelay(text) {
    return Math.max(2000, Math.min(5000, text.length * 60));
  }

  _stopTyping() {
    if (this.typeTimer) {
      clearInterval(this.typeTimer);
      this.typeTimer = null;
    }
    this.isTyping = false;
  }

  _clearProcessTimer() {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
  }

  _removeLine(entry) {
    for (const t of entry.timers) clearTimeout(t);
    entry.timers = [];
    entry.el.classList.add('narrator-gone');
    setTimeout(() => {
      if (entry.el.parentNode) entry.el.remove();
    }, 1000);
  }

  _removeAllLines() {
    for (const entry of this.visibleLines) {
      for (const t of entry.timers) clearTimeout(t);
      if (entry.el.parentNode) entry.el.remove();
    }
    this.visibleLines = [];
  }

  _resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.idleCallback) {
      this.idleTimer = setTimeout(() => {
        this.idleCallback();
        this._resetIdleTimer();
      }, this.idleTimeout);
    }
  }

  reset() {
    this.clear();
    this.queue = [];
    this.currentMood = 'calm';
    this.isTyping = false;
    this.narratorMode = 'inner';
  }
}

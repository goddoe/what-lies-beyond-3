import { State } from '../game-state.js';
import { TERMINAL_SCRIPT } from '../../narrative/script-data.js';
import { getLanguage } from '../../data/i18n.js';

/**
 * Terminal overlay — the ASI conversation.
 * ASI lines print with a fast typewriter; player answers via large choice
 * buttons (tap-friendly; number keys 1-3 on desktop). No free typing.
 */
export class TerminalOverlay {
  constructor(overlayManager) {
    this.om = overlayManager;
    this.el = document.getElementById('terminal-overlay');
    this.bodyEl = document.getElementById('terminal-body');
    this.choicesEl = document.getElementById('terminal-choices');
    this.titleEl = document.getElementById('terminal-title');
    this.closeBtn = document.getElementById('terminal-close');

    this.onEvent = null;   // (eventName) => {}
    this.onFlag = null;    // (flag) => {}
    this.onEnd = null;     // set per-run

    this._typeTimer = null;
    this._current = null;
    this._running = false;
    this._skipRequested = false;

    this.closeBtn.addEventListener('click', () => this.close());

    // Number keys for choices + space to skip typing
    document.addEventListener('keydown', (e) => {
      if (!this._running) return;
      if (e.code === 'Space') {
        this._skipRequested = true;
        e.preventDefault();
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 3) {
        const btns = this.choicesEl.querySelectorAll('button');
        if (btns[num - 1]) btns[num - 1].click();
      }
    });

    // Tap the body to skip typing
    this.bodyEl.addEventListener('click', () => { this._skipRequested = true; });
  }

  /**
   * Run a conversation starting at node id.
   * @param {string} startId
   * @param {object} opts { title, onEnd, keepOpenOnEnd }
   */
  start(startId, opts = {}) {
    this.titleEl.textContent = opts.title || 'REVAN-TERM // SECURE';
    this.bodyEl.innerHTML = '';
    this.choicesEl.innerHTML = '';
    this.closeBtn.style.display = 'none';
    this.onEnd = opts.onEnd || null;
    this._keepOpen = !!opts.keepOpenOnEnd;
    this._closeDelay = opts.closeDelay || 2800;
    this._clickToClose = !!opts.clickToClose;
    this._running = true;

    this.om.open(this.el, State.TERMINAL, {
      onClose: () => { this._running = false; this._stopTyping(); },
    });

    this._showNode(startId);
  }

  close() {
    if (this.om.current && this.om.current.el === this.el) {
      this.om.close();
    }
  }

  _showNode(id) {
    const node = TERMINAL_SCRIPT[id];
    if (!node) { this._finish(); return; }
    this._current = node;
    this.choicesEl.innerHTML = '';

    if (node.event && this.onEvent) this.onEvent(node.event);

    // erase: backspace the previous line away before rendering this node
    if (node.erase) {
      const lines = this.bodyEl.querySelectorAll('.terminal-line');
      const last = lines[lines.length - 1];
      if (last && last.textContent.length) {
        this._eraseThenRender(last, node);
        return;
      }
    }

    this._renderNode(node);
  }

  /** Backspace a line char by char, then render the node. */
  _eraseThenRender(line, node) {
    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor';
    this._skipRequested = false;
    let text = line.textContent;
    setTimeout(() => {
      this._typeTimer = setInterval(() => {
        text = this._skipRequested ? '' : text.slice(0, -1);
        line.textContent = text;
        line.appendChild(cursor);
        this._scroll();
        if (!text.length) {
          this._stopTyping();
          line.remove();
          setTimeout(() => { if (this._running) this._renderNode(node); }, 500);
        }
      }, 32);
    }, 700);
  }

  _renderNode(node) {
    const lang = getLanguage();
    const text = node.text[lang] !== undefined ? (node.text[lang] || '') : node.text.ko;

    if (text === '') {
      // Silent node — go straight to choices/next
      this._afterLine(node);
      return;
    }

    const line = document.createElement('div');
    line.className = 'terminal-line' + (node.speaker === 'sys' ? ' term-sys' : node.speaker === 'player' ? ' term-player' : '');
    this.bodyEl.appendChild(line);

    // sys lines print instantly (unless typed) — ASI lines typewrite
    if (node.speaker === 'sys' && !node.typed) {
      line.textContent = text;
      this._scroll();
      setTimeout(() => this._afterLine(node), node.pause || 1300);
      return;
    }

    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor';
    line.appendChild(cursor);

    let i = 0;
    this._skipRequested = false;
    const speed = 22;
    this._typeTimer = setInterval(() => {
      if (this._skipRequested) i = text.length;
      i++;
      line.textContent = text.substring(0, i);
      if (i < text.length) line.appendChild(cursor);
      this._scroll();
      if (i >= text.length) {
        this._stopTyping();
        setTimeout(() => this._afterLine(node), node.pause || 1000);
      }
    }, speed);
  }

  _afterLine(node) {
    if (!this._running) return;

    if (node.choices && node.choices.length) {
      const lang = getLanguage();
      node.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        const num = document.createElement('span');
        num.className = 'choice-num';
        num.textContent = `${idx + 1}.`;
        btn.appendChild(num);
        btn.appendChild(document.createTextNode(choice.text[lang] || choice.text.ko));
        btn.addEventListener('click', () => {
          this.choicesEl.innerHTML = '';
          // Echo the choice as a player line
          const echo = document.createElement('div');
          echo.className = 'terminal-line term-player';
          echo.textContent = choice.text[lang] || choice.text.ko;
          this.bodyEl.appendChild(echo);
          this._scroll();
          if (choice.flag && this.onFlag) this.onFlag(choice.flag);
          setTimeout(() => this._showNode(choice.next), 350);
        });
        this.choicesEl.appendChild(btn);
      });
      // the choices panel just shrank the body — keep the last line in view
      requestAnimationFrame(() => this._scroll());
      return;
    }

    if (node.end) { this._finish(); return; }
    if (node.next) { this._showNode(node.next); return; }
    this._finish();
  }

  _finish() {
    this._running = false;
    const cb = this.onEnd;
    this.onEnd = null;
    if (this._keepOpen) {
      if (cb) cb();
      return;
    }
    if (this._clickToClose) {
      // Wait for an explicit click — the ending shouldn't advance on its own
      const hint = document.createElement('div');
      hint.className = 'terminal-line term-dismiss';
      hint.textContent = getLanguage() === 'ko' ? '[ 클릭하여 닫기 ]' : '[ click to close ]';
      this.bodyEl.appendChild(hint);
      this._scroll();
      const onClick = () => {
        this.el.removeEventListener('click', onClick);
        this.close();
        if (cb) cb();
      };
      setTimeout(() => this.el.addEventListener('click', onClick), 500);
      return;
    }
    // Show close affordance briefly, then auto-close
    setTimeout(() => {
      this.close();
      if (cb) cb();
    }, this._closeDelay || 2800);
  }

  _scroll() {
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  _stopTyping() {
    if (this._typeTimer) {
      clearInterval(this._typeTimer);
      this._typeTimer = null;
    }
  }
}

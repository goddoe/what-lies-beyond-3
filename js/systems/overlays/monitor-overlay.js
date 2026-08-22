import { State } from '../game-state.js';
import { DOCUMENTS } from '../../narrative/script-data.js';
import { getLanguage } from '../../data/i18n.js';

/**
 * Monitor / reading overlay — crisp DOM text for in-world screens & documents.
 */
export class MonitorOverlay {
  constructor(overlayManager) {
    this.om = overlayManager;
    this.el = document.getElementById('monitor-overlay');
    this.titleEl = document.getElementById('monitor-title');
    this.bodyEl = document.getElementById('monitor-body');
    this.onClosed = null;

    document.getElementById('monitor-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  /** Open a DOCUMENTS entry by id. */
  openDocument(docId, { onClose = null } = {}) {
    const doc = DOCUMENTS[docId];
    if (!doc) return false;
    const lang = getLanguage();

    this.titleEl.textContent = doc.title[lang] || doc.title.ko;
    this.bodyEl.innerHTML = '';
    for (const line of (doc.body[lang] || doc.body.ko)) {
      const div = document.createElement('div');
      div.className = 'doc-line' + (line.startsWith('※') || line.startsWith('*') ? ' doc-dim' : '');
      if (line.includes('경고') || line.includes('WARNING')) div.classList.add('doc-warn');
      div.textContent = line === '' ? ' ' : line;
      this.bodyEl.appendChild(div);
    }
    this.bodyEl.scrollTop = 0;

    this._onClose = onClose;
    this.om.open(this.el, State.FOCUS, { onClose: () => { if (this._onClose) this._onClose(); } });
    return true;
  }

  close() {
    if (this.om.current && this.om.current.el === this.el) {
      this.om.close();
    }
  }
}

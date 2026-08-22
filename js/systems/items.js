import { getLanguage } from '../data/i18n.js';

/**
 * Carried items — HUD chip representation (no in-hand 3D rendering).
 */
const ITEM_LABELS = {
  drives:   { ko: '이동식 드라이브 ×3', en: 'Portable drives ×3' },
  mac_case: { ko: '매킨토시 (폐기물)', en: 'Macintosh (e-waste)' },
  earbuds:  { ko: '이어버드', en: 'Earbuds' },
};

export class Items {
  constructor() {
    this.set = new Set();
    this.chip = document.getElementById('item-chip');
  }

  add(id, { silent = false } = {}) {
    if (this.set.has(id)) return false;
    this.set.add(id);
    this._render();
    if (!silent) this._popup(id);
    return true;
  }

  remove(id) {
    this.set.delete(id);
    this._render();
  }

  has(id) {
    return this.set.has(id);
  }

  all() {
    return this.set;
  }

  _label(id) {
    const entry = ITEM_LABELS[id];
    if (!entry) return id;
    return entry[getLanguage()] || entry.ko;
  }

  _render() {
    if (!this.chip) return;
    if (this.set.size === 0) {
      this.chip.style.display = 'none';
      return;
    }
    this.chip.style.display = 'block';
    this.chip.textContent = [...this.set].map(id => this._label(id)).join(' · ');
  }

  _popup(id) {
    const el = document.createElement('div');
    el.className = 'inventory-popup';
    el.textContent = this._label(id);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }
}

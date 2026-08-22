import { State } from '../game-state.js';
import { REPORTS } from '../../narrative/script-data.js';
import { getLanguage, t } from '../../data/i18n.js';

/**
 * Report composer — pick one option per slot, then send.
 * Options can carry honesty tags and suspicion deltas.
 */
export class ReportComposer {
  constructor(overlayManager, gameState) {
    this.om = overlayManager;
    this.gameState = gameState;
    this.el = document.getElementById('report-overlay');
    this.titleEl = document.getElementById('report-title');
    this.slotsEl = document.getElementById('report-slots');
    this.submitBtn = document.getElementById('report-submit');

    this._selections = {};
    this._report = null;
    this._onSubmit = null;

    this.submitBtn.addEventListener('click', () => this._submit());
  }

  open(reportId, { onSubmit = null } = {}) {
    const report = REPORTS[reportId];
    if (!report) return false;
    this._report = report;
    this._selections = {};
    this._onSubmit = onSubmit;

    const lang = getLanguage();
    this.titleEl.textContent = t('reportTitle');
    this.submitBtn.textContent = t('reportSubmit');
    this.submitBtn.disabled = true;
    this.slotsEl.innerHTML = '';

    for (const slot of report.slots) {
      const wrap = document.createElement('div');
      wrap.className = 'report-slot';

      const label = document.createElement('div');
      label.className = 'report-slot-label';
      label.textContent = slot.label[lang] || slot.label.ko;
      wrap.appendChild(label);

      for (const option of slot.options) {
        const btn = document.createElement('button');
        btn.className = 'report-option';
        btn.textContent = option.text[lang] || option.text.ko;
        btn.addEventListener('click', () => {
          this._selections[slot.id] = option;
          wrap.querySelectorAll('.report-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this._updateSubmit();
        });
        wrap.appendChild(btn);
      }

      this.slotsEl.appendChild(wrap);
    }

    this.om.open(this.el, State.REPORT);
    return true;
  }

  _updateSubmit() {
    const complete = this._report.slots.every(s => this._selections[s.id]);
    this.submitBtn.disabled = !complete;
  }

  _submit() {
    const picked = Object.values(this._selections);

    // Apply effects
    for (const option of picked) {
      if (option.honesty) this.gameState.honesty.push(option.honesty);
      if (option.suspicionDelta) this.gameState.suspicion += option.suspicionDelta;
    }

    const cb = this._onSubmit;
    this._onSubmit = null;
    const reportId = this._report.id;
    this._report = null;

    this.om.close();
    if (cb) cb({ reportId, picked });
  }
}

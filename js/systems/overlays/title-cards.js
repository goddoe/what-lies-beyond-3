import { t } from '../../data/i18n.js';
import { State } from '../game-state.js';

/**
 * Chapter title cards + time-skip cards.
 * Fade to black → text → fade back. Game input ignored while showing.
 */
export class TitleCards {
  constructor(gameState) {
    this.gameState = gameState;
    this.el = document.getElementById('title-card');
    this.chapterEl = document.getElementById('title-card-chapter');
    this.nameEl = document.getElementById('title-card-name');
    this.showing = false;
  }

  /**
   * @param {string|null} labelKey i18n key for the small label ("1장")
   * @param {string} nameKey i18n key for the big text ("정기 관찰")
   * @param {function} midCallback runs while the screen is fully black (teleports, prop swaps)
   * @param {function} done runs after fade back in
   */
  show(labelKey, nameKey, midCallback = null, done = null, holdMs = 2400) {
    if (this.showing) return;
    this.showing = true;

    const prevState = this.gameState.current;
    this.gameState.set(State.TITLE_CARD);

    this.chapterEl.textContent = labelKey ? t(labelKey) : '';
    this.nameEl.textContent = t(nameKey);

    this.el.style.display = 'flex';
    // force reflow so the transition runs
    void this.el.offsetWidth;
    this.el.classList.add('visible');

    setTimeout(() => {
      if (midCallback) midCallback();
    }, 1300);

    setTimeout(() => {
      this.el.classList.remove('visible');
      setTimeout(() => {
        this.el.style.display = 'none';
        this.showing = false;
        // Only restore if nothing else changed state meanwhile
        if (this.gameState.is(State.TITLE_CARD)) {
          this.gameState.set(prevState === State.TITLE_CARD ? State.PLAYING : prevState);
        }
        if (done) done();
      }, 1250);
    }, 1300 + holdMs);
  }
}

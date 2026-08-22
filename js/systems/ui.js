import { State } from './game-state.js';
import { setLanguage, updateAllText, t } from '../data/i18n.js';
import { getChapter } from '../narrative/chapters.js';

/**
 * UI manager: menus, crosshair, HUD elements, rotate prompt.
 */
export class UI {
  constructor(gameState, { isMobile }) {
    this.gameState = gameState;
    this.isMobile = isMobile;

    this.startMenu = document.getElementById('start-menu');
    this.clickToPlay = document.getElementById('click-to-play');
    this.pauseMenu = document.getElementById('pause-menu');
    this.crosshair = document.getElementById('crosshair');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.interactPromptText = document.getElementById('interact-prompt-text');
    this.rotatePrompt = document.getElementById('rotate-prompt');
    this.pauseChapter = document.getElementById('pause-chapter');

    this.btnStart = document.getElementById('btn-start');
    this.btnContinue = document.getElementById('btn-continue');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnReset = document.getElementById('btn-reset');
    this.btnLangKo = document.getElementById('btn-lang-ko');
    this.btnLangEn = document.getElementById('btn-lang-en');

    this.onStart = null;
    this.onContinue = null;
    this.onResume = null;
    this.onRestart = null;
    this.onReset = null;
    this.onLanguageChange = null;

    this._setupListeners();
    this._setupStateSync();
    this._setupOrientationWatch();
  }

  _setupListeners() {
    this.btnStart.addEventListener('click', () => { if (this.onStart) this.onStart(); });
    this.btnContinue.addEventListener('click', () => { if (this.onContinue) this.onContinue(); });
    this.btnResume.addEventListener('click', () => { if (this.onResume) this.onResume(); });
    this.btnRestart.addEventListener('click', () => { if (this.onRestart) this.onRestart(); });
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => { if (this.onReset) this.onReset(); });
    }
    this.btnLangKo.addEventListener('click', () => {
      setLanguage('ko');
      if (this.onLanguageChange) this.onLanguageChange('ko');
    });
    this.btnLangEn.addEventListener('click', () => {
      setLanguage('en');
      if (this.onLanguageChange) this.onLanguageChange('en');
    });
  }

  _setupStateSync() {
    this.gameState.on('stateChange', ({ to }) => this.syncToState(to));
  }

  _setupOrientationWatch() {
    if (!this.isMobile) return;
    const mq = window.matchMedia('(orientation: landscape)');
    const check = () => {
      const landscape = mq.matches;
      this.rotatePrompt.style.display = landscape ? 'flex' : 'none';
      this._landscape = landscape;
    };
    // Screen Orientation lock is not viable on iOS Safari — soft-pause instead
    if (mq.addEventListener) mq.addEventListener('change', check);
    else mq.addListener(check);
    check();
  }

  get isLandscapeBlocked() {
    return this.isMobile && !!this._landscape;
  }

  syncToState(state) {
    this.startMenu.style.display = 'none';
    this.clickToPlay.style.display = 'none';
    this.pauseMenu.style.display = 'none';
    this.crosshair.style.display = 'none';
    this.interactPrompt.style.display = 'none';

    switch (state) {
      case State.MENU:
        this.startMenu.style.display = 'flex';
        break;
      case State.CLICK_TO_PLAY:
        this.clickToPlay.style.display = 'flex';
        break;
      case State.PLAYING:
        this.crosshair.style.display = 'block';
        break;
      case State.PAUSED: {
        const ch = getChapter(this.gameState.chapter);
        this.pauseChapter.textContent = `${t(ch.labelKey)} — ${t(ch.nameKey)}`;
        this.pauseMenu.style.display = 'flex';
        break;
      }
      default:
        break; // overlays / cards / ending manage their own DOM
    }
  }

  /** Desktop interaction prompt with contextual verb. */
  showInteractPrompt(target) {
    if (this.isMobile) return; // mobile uses the touch pill
    if (target) {
      const verbKey = target.verb || 'verbUse';
      this.interactPromptText.textContent = `[E] ${t(verbKey)}`;
      this.interactPrompt.style.display = 'block';
    } else {
      this.interactPrompt.style.display = 'none';
    }
  }

  showContinueButton(show) {
    this.btnContinue.style.display = show ? 'block' : 'none';
  }

  showResetButton(show) {
    if (this.btnReset) this.btnReset.style.display = show ? 'block' : 'none';
  }

  init() {
    updateAllText();
    this.syncToState(this.gameState.current);
  }
}

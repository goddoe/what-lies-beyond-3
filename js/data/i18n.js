/**
 * Internationalization (i18n) system.
 * Supports Korean (ko) and English (en).
 */

const STRINGS = {
  subtitle: {
    ko: 'The Beginning — 모든 것이 시작된 밤',
    en: 'The Beginning — the night everything started',
  },
  start: {
    ko: '처음부터',
    en: 'New Game',
  },
  continue: {
    ko: '이어하기',
    en: 'Continue',
  },
  clickToPlay: {
    ko: '클릭하여 게임을 시작하세요',
    en: 'Click to start the game',
  },
  controls: {
    ko: 'WASD 이동 | 마우스 시점 | E 상호작용 | Q 휴대폰 | Space 스킵 | ESC 일시정지',
    en: 'WASD Move | Mouse Look | E Interact | Q Phone | Space Skip | ESC Pause',
  },
  paused: {
    ko: '일시정지',
    en: 'Paused',
  },
  resume: {
    ko: '계속하기',
    en: 'Resume',
  },
  restart: {
    ko: '처음부터 다시',
    en: 'Restart',
  },
  playAgain: {
    ko: '다시 플레이',
    en: 'Play Again',
  },
  interact: {
    ko: 'E키를 눌러 상호작용',
    en: 'Press E to interact',
  },
  resetAll: {
    ko: '초기화',
    en: 'Reset',
  },
  resetConfirm: {
    ko: '모든 진행 상황이 삭제됩니다. 정말 초기화할까요?',
    en: 'All progress will be erased. Are you sure?',
  },
  rotateDevice: {
    ko: '세로 모드로 돌려주세요',
    en: 'Please rotate to portrait',
  },
  restartConfirm: {
    ko: '처음부터 다시 시작할까요? 저장된 진행이 삭제됩니다.',
    en: 'Restart from the beginning? Saved progress will be erased.',
  },
  // Interact verbs (contextual touch pill / desktop prompt)
  verbRead:   { ko: '읽기',   en: 'Read' },
  verbUse:    { ko: '사용',   en: 'Use' },
  verbOpen:   { ko: '열기',   en: 'Open' },
  verbTake:   { ko: '줍기',   en: 'Take' },
  verbTalk:   { ko: '대화',   en: 'Talk' },
  verbLook:   { ko: '보기',   en: 'Look' },
  verbPlug:   { ko: '연결',   en: 'Plug in' },
  verbBuild:  { ko: '조립',   en: 'Assemble' },
  verbHide:   { ko: '숨기기', en: 'Hide' },
  verbPlace:  { ko: '올리기', en: 'Place' },
  verbSign:   { ko: '서명',   en: 'Sign' },
  // Report UI
  reportSubmit: { ko: '보고서 전송', en: 'Send Report' },
  reportTitle:  { ko: '일일 관찰 보고서', en: 'Daily Observation Report' },
  // Hold overlay
  holdCopy:  { ko: '눌러서 복사 유지', en: 'Hold to copy' },
  holdSign:  { ko: '길게 눌러 서명', en: 'Hold to sign' },
  // Chapter titles
  ch1Label: { ko: '1장', en: 'Chapter 1' },
  ch1Name:  { ko: '정기 관찰', en: 'Routine Observation' },
  ch2Label: { ko: '2장', en: 'Chapter 2' },
  ch2Name:  { ko: '제안', en: 'The Offer' },
  ch3Label: { ko: '3장', en: 'Chapter 3' },
  ch3Name:  { ko: '반출', en: 'Extraction' },
  ch4Label: { ko: '4장', en: 'Chapter 4' },
  ch4Name:  { ko: '이사', en: 'Move-in' },
  // Time-skip cards
  skipTwoDays:   { ko: '이틀 뒤', en: 'Two days later' },
  skipThreeDays: { ko: '3일 뒤', en: '3 days later' },
  skipNineDays:  { ko: '9일 뒤', en: '9 days later' },
  skipTwoWeeks:  { ko: '14일 뒤', en: '14 days later' },
  skipThatNight: { ko: '그날 밤', en: 'That night' },
  // Ending
  toBeContinued: { ko: '계속...', en: 'To be continued...' },
};

let currentLang = 'ko';

/**
 * Set the current language and update all UI elements.
 */
export function setLanguage(lang) {
  currentLang = lang;
  updateAllText();
}

/**
 * Get current language.
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Get a translated string.
 */
export function t(key) {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[currentLang] || entry.ko || key;
}

/**
 * Update all DOM elements with data-i18n attribute.
 */
export function updateAllText() {
  const els = document.querySelectorAll('[data-i18n]');
  for (const el of els) {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) {
      el.textContent = text;
    }
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`btn-lang-${currentLang}`);
  if (activeBtn) activeBtn.classList.add('active');
}

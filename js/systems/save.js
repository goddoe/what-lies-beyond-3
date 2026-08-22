/**
 * Save system — localStorage persistence.
 *
 * Two keys:
 *  - 'wlb3_save'   : in-progress run (chapter checkpoint + flags + choices).
 *                    Cleared on restart; used by "Continue".
 *  - 'wlb3_memory' : Part-2 contract. Written once when Part 1 completes.
 *                    KEEP THESE KEYS STABLE — the future Part 2 build reads them:
 *      {
 *        part1Completed: bool,
 *        completionTime: seconds,
 *        honesty: ['truthful'|'minimized'|'fabricated', ...],  // per report, in order
 *        greedScore: number,
 *        suspicionScore: number,
 *        guardScenePlayed: bool,
 *        walletFinalBalance: number,
 *        macVesselUsed: bool,
 *        hesitationSeconds: number,  // time stood at the router before plugging in
 *        language: 'ko'|'en',
 *      }
 */

const SAVE_KEY = 'wlb3_save';
const MEMORY_KEY = 'wlb3_memory';
const SAVE_VERSION = 1;

export class SaveSystem {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === SAVE_VERSION) {
          this.data = parsed;
        }
      }
    } catch (e) {
      this.data = null;
    }
    return this.data;
  }

  get hasSave() {
    return !!(this.data && this.data.chapter);
  }

  /** Snapshot current run state. Called at chapter boundaries and choice commits. */
  save(gameState, items, extra = {}) {
    this.data = {
      version: SAVE_VERSION,
      chapter: gameState.chapter,
      flags: [...gameState.flags],
      honesty: [...gameState.honesty],
      suspicion: gameState.suspicion,
      greed: gameState.greed,
      walletBalance: gameState.walletBalance,
      items: items ? [...items.all()] : [],
      playtimeSeconds: Math.round(gameState.getPlayTime()),
      updatedAt: Date.now(),
      ...extra,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage may be unavailable */ }
  }

  /**
   * Restore a loaded save into live state objects.
   * Saves are CHAPTER-GRANULAR: only durable cross-chapter data is restored
   * (chapter number, honesty/suspicion/greed, wallet, playtime). Flags and
   * items are deliberately NOT restored — applyChapterBaseline() rebuilds the
   * canonical chapter-start state, so resuming never mixes "chapter start"
   * narration with mid-chapter world progress.
   */
  restore(gameState) {
    if (!this.data) return false;
    gameState.chapter = this.data.chapter || 1;
    gameState.honesty = [...(this.data.honesty || [])];
    gameState.suspicion = this.data.suspicion || 0;
    gameState.greed = this.data.greed || 0;
    gameState.walletBalance = this.data.walletBalance || 0;
    gameState.playtimeSeconds = this.data.playtimeSeconds || 0;
    return true;
  }

  clear() {
    this.data = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /** Write the Part-2 contract when the cliffhanger plays. */
  writeMemory(gameState, lang) {
    const memory = {
      part1Completed: true,
      completionTime: Math.round(gameState.getPlayTime()),
      honesty: [...gameState.honesty],
      greedScore: gameState.greed,
      suspicionScore: gameState.suspicion,
      guardScenePlayed: gameState.hasFlag('guard_chat_done'),
      walletFinalBalance: gameState.walletBalance,
      macVesselUsed: gameState.hasFlag('mac_vessel'),
      hesitationSeconds: Math.round(gameState.hesitationSeconds),
      language: lang,
    };
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (e) { /* ignore */ }
    return memory;
  }

  static readMemory() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
}

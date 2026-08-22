/**
 * Central game state machine + event bus.
 *
 * MENU → CLICK_TO_PLAY → PLAYING ⇄ PAUSED
 * PLAYING ⇄ FOCUS / TERMINAL / REPORT / PHONE / HOLD  (overlay states)
 * PLAYING → TITLE_CARD → PLAYING  (chapter transitions)
 * PLAYING → ENDING  (cliffhanger)
 */

export const State = {
  MENU: 'MENU',
  CLICK_TO_PLAY: 'CLICK_TO_PLAY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  TITLE_CARD: 'TITLE_CARD',
  FOCUS: 'FOCUS',       // camera dollied to a screen, monitor overlay open
  TERMINAL: 'TERMINAL', // ASI conversation overlay
  REPORT: 'REPORT',     // report composer overlay
  PHONE: 'PHONE',       // phone/messages sheet
  HOLD: 'HOLD',         // hold-to-act overlay (copy / signature)
  ENDING: 'ENDING',
};

/** States in which the player character is "inside an overlay". */
export const OVERLAY_STATES = new Set([
  State.FOCUS, State.TERMINAL, State.REPORT, State.PHONE, State.HOLD,
]);

export class GameState {
  constructor() {
    this.current = State.MENU;
    this.previous = null;
    this.listeners = new Map();

    // Game-wide state
    this.chapter = 1;
    this.currentRoom = 'LOBBY';
    this.visitedRooms = new Set();

    // Narrative flags: plain string set — persisted by SaveSystem
    this.flags = new Set();

    // Choice records
    this.honesty = [];      // per-report: 'truthful' | 'minimized' | 'fabricated'
    this.suspicion = 0;     // boss suspicion accumulator
    this.greed = 0;         // greed accumulator (wallet peeks, quick accepts)
    this.walletBalance = 0; // shown on phone

    // Playthrough timer
    this.playStartTime = 0;
    this.playtimeSeconds = 0;

    // Cliffhanger callback data
    this.hesitationSeconds = 0; // time spent standing at the router before plugging in
  }

  set(newState) {
    if (newState === this.current) return;
    this.previous = this.current;
    this.current = newState;

    if (newState === State.PLAYING && !this.playStartTime) {
      this.playStartTime = Date.now();
    }

    this.emit('stateChange', { from: this.previous, to: newState });
  }

  is(state) {
    return this.current === state;
  }

  get inOverlay() {
    return OVERLAY_STATES.has(this.current);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data = {}) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) cb(data);
    }
  }

  enterRoom(roomId) {
    const wasNew = !this.visitedRooms.has(roomId);
    this.visitedRooms.add(roomId);
    this.currentRoom = roomId;
    this.emit('roomEnter', { roomId, firstVisit: wasNew });
    return wasNew;
  }

  setFlag(flag) {
    if (this.flags.has(flag)) return false;
    this.flags.add(flag);
    this.emit('flag', { flag });
    return true;
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  getPlayTime() {
    if (!this.playStartTime) return this.playtimeSeconds;
    return this.playtimeSeconds + (Date.now() - this.playStartTime) / 1000;
  }
}

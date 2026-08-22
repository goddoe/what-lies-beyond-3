import { PLAYER_START, HOME_START } from '../world/map-data.js';

/**
 * Chapter definitions — ordered. Each chapter knows where the player stands
 * when it begins (used both for transitions and save-resume).
 *
 * Pure data + tiny helpers; must stay importable in Node for tests.
 */
export const CHAPTERS = [
  {
    id: 1,
    labelKey: 'ch1Label',
    nameKey: 'ch1Name',
    start: PLAYER_START,
  },
  {
    id: 2,
    labelKey: 'ch2Label',
    nameKey: 'ch2Name',
    // Ch2 opens back at the desk, next morning (facing the desk, west)
    start: { position: [-1.3, 1.6, -18.35], rotation: [0, Math.PI / 2, 0] },
  },
  {
    id: 3,
    labelKey: 'ch3Label',
    nameKey: 'ch3Name',
    // Ch3 opens in the server room, at the drive bay (facing it, -Z)
    start: { position: [0.8, 1.6, 0.9 - 34], rotation: [0, 0, 0] },
  },
  {
    id: 4,
    labelKey: 'ch4Label',
    nameKey: 'ch4Name',
    start: HOME_START,
  },
];

export function getChapter(id) {
  return CHAPTERS.find(c => c.id === id) || CHAPTERS[0];
}

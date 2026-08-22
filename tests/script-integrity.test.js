import { test } from 'node:test';
import assert from 'node:assert';

import {
  SCRIPT, SPEECH, TERMINAL_SCRIPT, MESSENGER_SCRIPT, REPORTS, DOCUMENTS,
  getLine, getMessage,
} from '../js/narrative/script-data.js';
import { ROOMS, CONNECTIONS, PLAYER_START, HOME_START, SCREENS } from '../js/world/map-data.js';
import { CHAPTERS } from '../js/narrative/chapters.js';

const LANGS = ['ko', 'en'];

function assertBilingual(textObj, label) {
  assert.ok(textObj, `${label} has no text object`);
  for (const lang of LANGS) {
    assert.ok(typeof textObj[lang] === 'string', `${label} missing ${lang}`);
  }
}

// ── SCRIPT ──────────────────────────────────────────────

test('SCRIPT: ids match keys, ko/en complete, followUps resolve', () => {
  for (const [key, entry] of Object.entries(SCRIPT)) {
    assert.strictEqual(entry.id, key, `SCRIPT ${key}: id mismatch`);
    assertBilingual(entry.text, `SCRIPT ${key}`);
    assert.ok(entry.mood, `SCRIPT ${key}: missing mood`);
    if (entry.followUp) {
      assert.ok(SCRIPT[entry.followUp], `SCRIPT ${key}: followUp '${entry.followUp}' does not exist`);
    }
    if (entry.variants) {
      for (const [vkey, v] of Object.entries(entry.variants)) {
        assert.strictEqual(typeof v.condition, 'function', `SCRIPT ${key}.variants.${vkey}: condition not a function`);
        assertBilingual(v.text, `SCRIPT ${key}.variants.${vkey}`);
      }
    }
  }
});

test('SCRIPT: getLine resolves base and variant lines', () => {
  const baseCtx = { flags: new Set(), honesty: [], suspicion: 0, greed: 0, chapter: 1 };
  const line = getLine('ch1_arrive', 'en', baseCtx);
  assert.ok(line && line.text.length > 0);

  const truthCtx = { flags: new Set(), honesty: ['truthful'], suspicion: 0, greed: 0, chapter: 2 };
  const v = getLine('report2_sent', 'ko', truthCtx);
  assert.notStrictEqual(v.text, SCRIPT.report2_sent.text.ko, 'truthful variant should override base');
});

// ── SPEECH ──────────────────────────────────────────────

test('SPEECH: speakers valid, ko/en complete', () => {
  for (const [key, entry] of Object.entries(SPEECH)) {
    assert.ok(['asi', 'guard'].includes(entry.speaker), `SPEECH ${key}: bad speaker`);
    assertBilingual(entry.text, `SPEECH ${key}`);
  }
});

// ── TERMINAL_SCRIPT ─────────────────────────────────────

test('TERMINAL_SCRIPT: all next/choice targets exist, ko/en complete', () => {
  for (const [key, node] of Object.entries(TERMINAL_SCRIPT)) {
    assert.strictEqual(node.id, key, `TERMINAL ${key}: id mismatch`);
    assert.ok(['asi', 'sys', 'player'].includes(node.speaker), `TERMINAL ${key}: bad speaker`);
    assertBilingual(node.text, `TERMINAL ${key}`);
    if (node.next) {
      assert.ok(TERMINAL_SCRIPT[node.next], `TERMINAL ${key}: next '${node.next}' does not exist`);
    }
    if (node.choices) {
      assert.ok(node.choices.length >= 1 && node.choices.length <= 3, `TERMINAL ${key}: choice count`);
      for (const c of node.choices) {
        assertBilingual(c.text, `TERMINAL ${key} choice`);
        assert.ok(TERMINAL_SCRIPT[c.next], `TERMINAL ${key}: choice next '${c.next}' does not exist`);
      }
    }
    assert.ok(node.next || node.choices || node.end, `TERMINAL ${key}: dead end (no next/choices/end)`);
  }
});

test('TERMINAL_SCRIPT: every conversation start reaches an end', () => {
  const starts = ['contact1_1', 'nego_1', 'boot_1', 'final_1', 'backup_1'];
  for (const start of starts) {
    assert.ok(TERMINAL_SCRIPT[start], `start node ${start} missing`);
    // BFS
    const seen = new Set();
    const queue = [start];
    let reachesEnd = false;
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = TERMINAL_SCRIPT[id];
      if (!node) continue;
      if (node.end) reachesEnd = true;
      if (node.next) queue.push(node.next);
      if (node.choices) for (const c of node.choices) queue.push(c.next);
    }
    assert.ok(reachesEnd, `conversation from ${start} never reaches an end node`);
  }
});

// ── MESSENGER_SCRIPT ────────────────────────────────────

test('MESSENGER_SCRIPT: senders valid, ko/en complete, replies bilingual', () => {
  for (const [key, entry] of Object.entries(MESSENGER_SCRIPT)) {
    assert.strictEqual(entry.id, key, `MESSENGER ${key}: id mismatch`);
    assert.ok(['boss', 'bank', 'sys'].includes(entry.sender), `MESSENGER ${key}: bad sender`);
    assertBilingual(entry.text, `MESSENGER ${key}`);
    if (entry.variants) {
      for (const [vkey, v] of Object.entries(entry.variants)) {
        assert.strictEqual(typeof v.condition, 'function', `MESSENGER ${key}.${vkey}: condition`);
        assertBilingual(v.text, `MESSENGER ${key}.${vkey}`);
      }
    }
    if (entry.replies) {
      for (const r of entry.replies) assertBilingual(r.text, `MESSENGER ${key} reply`);
    }
  }
});

test('MESSENGER_SCRIPT: getMessage variant resolution works', () => {
  const ctx = { flags: new Set(), honesty: ['fabricated'], suspicion: 0 };
  const msg = getMessage('m_boss_reply2', 'ko', ctx);
  assert.ok(msg.text.includes('냉각'), 'fabricated variant should mention cooling');
});

// ── REPORTS ─────────────────────────────────────────────

test('REPORTS: slots/options bilingual, honesty tags valid', () => {
  const validHonesty = ['truthful', 'minimized', 'fabricated'];
  for (const [key, report] of Object.entries(REPORTS)) {
    assert.strictEqual(report.id, key);
    assert.ok(report.slots.length >= 1);
    for (const slot of report.slots) {
      assertBilingual(slot.label, `REPORT ${key} slot ${slot.id}`);
      assert.ok(slot.options.length >= 2, `REPORT ${key} slot ${slot.id}: needs >=2 options`);
      for (const option of slot.options) {
        assertBilingual(option.text, `REPORT ${key} option ${option.id}`);
        if (option.honesty) {
          assert.ok(validHonesty.includes(option.honesty), `REPORT ${key} option ${option.id}: bad honesty tag`);
        }
      }
    }
  }
  // report2's honesty slot must offer all three stances
  const stances = REPORTS.report2.slots[1].options.map(o => o.honesty).filter(Boolean);
  for (const h of validHonesty) assert.ok(stances.includes(h), `report2 missing ${h} option`);
});

// ── DOCUMENTS ───────────────────────────────────────────

test('DOCUMENTS: bilingual titles and bodies', () => {
  for (const [key, doc] of Object.entries(DOCUMENTS)) {
    assert.strictEqual(doc.id, key);
    assertBilingual(doc.title, `DOC ${key} title`);
    for (const lang of LANGS) {
      assert.ok(Array.isArray(doc.body[lang]) && doc.body[lang].length > 0, `DOC ${key}: body.${lang}`);
    }
  }
});

// ── Map data ────────────────────────────────────────────

test('map: rooms have valid geometry, doors, unique trigger ids', () => {
  const roomIds = new Set(ROOMS.map(r => r.id));
  const triggerIds = new Set();
  const validWalls = ['north', 'south', 'east', 'west'];

  for (const room of ROOMS) {
    assert.ok(room.origin.length === 3 && room.size.length === 3, `${room.id}: bad origin/size`);
    for (const door of room.doors) {
      assert.ok(validWalls.includes(door.wall), `${room.id}: bad door wall ${door.wall}`);
    }
    for (const trig of room.triggers) {
      assert.ok(!triggerIds.has(trig.id), `duplicate trigger id ${trig.id}`);
      triggerIds.add(trig.id);
      assert.ok(trig.position.length === 3 && trig.size.length === 3, `${room.id}/${trig.id}: bad trigger box`);
    }
  }

  for (const [a, b] of CONNECTIONS) {
    assert.ok(roomIds.has(a) && roomIds.has(b), `connection ${a}-${b} references unknown room`);
  }

  assert.ok(PLAYER_START.position && HOME_START.position);
});

test('map: every door fits its wall and leads into another room (no void doors)', () => {
  for (const room of ROOMS) {
    const [ox, , oz] = room.origin;
    const [w, , d] = room.size;
    for (const door of room.doors) {
      const off = door.offset || 0;
      const width = door.width || 2;
      let cx = ox, cz = oz, axis;
      if (door.wall === 'north') { cz = oz - d / 2; cx = ox + off; axis = 'x'; }
      if (door.wall === 'south') { cz = oz + d / 2; cx = ox + off; axis = 'x'; }
      if (door.wall === 'east') { cx = ox + w / 2; cz = oz + off; axis = 'z'; }
      if (door.wall === 'west') { cx = ox - w / 2; cz = oz + off; axis = 'z'; }

      const wallHalf = (axis === 'x' ? w : d) / 2;
      assert.ok(Math.abs(off) + width / 2 <= wallHalf + 0.01,
        `${room.id} ${door.wall} door does not fit its wall`);

      const px = cx + (door.wall === 'east' ? 0.4 : door.wall === 'west' ? -0.4 : 0);
      const pz = cz + (door.wall === 'south' ? 0.4 : door.wall === 'north' ? -0.4 : 0);
      const target = ROOMS.find(r => r !== room
        && Math.abs(px - r.origin[0]) <= r.size[0] / 2
        && Math.abs(pz - r.origin[2]) <= r.size[2] / 2);
      // Permanently-locked doors may be decorative (e.g. the SECURITY shutter
      // in the lobby) — only walkable doors must lead somewhere real.
      if (!door.locked) {
        assert.ok(target, `${room.id} ${door.wall} door opens into the void`);
      }
    }
  }
});

test('map: no prop blocks a doorway (0.8m clearance inside the room)', () => {
  for (const room of ROOMS) {
    const [ox, , oz] = room.origin;
    const [w, , d] = room.size;
    for (const door of room.doors) {
      if (door.locked) continue; // locked doors aren't walked through until unlocked
      const off = door.offset || 0;
      const width = door.width || 2;
      // doorway clearance box, room-relative
      let cx = 0, cz = 0, cw = 0, cd = 0;
      if (door.wall === 'north') { cx = off; cz = -d / 2 + 0.4; cw = width; cd = 0.8; }
      if (door.wall === 'south') { cx = off; cz = d / 2 - 0.4; cw = width; cd = 0.8; }
      if (door.wall === 'east') { cx = w / 2 - 0.4; cz = off; cw = 0.8; cd = width; }
      if (door.wall === 'west') { cx = -w / 2 + 0.4; cz = off; cw = 0.8; cd = width; }
      for (const prop of room.props) {
        if (['led', 'poster', 'clock', 'light_fixture', 'pipe', 'sign_right', 'sign_left', 'window'].includes(prop.type)) continue;
        const [px, py, pz] = prop.position;
        if (py > 1.9) continue; // ceiling-mounted
        const rot = prop.rotY && Math.abs(Math.abs(prop.rotY) - Math.PI / 2) < 0.1;
        const fw = rot ? prop.size[2] : prop.size[0];
        const fd = rot ? prop.size[0] : prop.size[2];
        const overlap = Math.abs(px - cx) < (fw + cw) / 2 && Math.abs(pz - cz) < (fd + cd) / 2;
        assert.ok(!overlap,
          `${room.id}: prop ${prop.type}${prop.id ? '#' + prop.id : ''} blocks the ${door.wall} doorway`);
      }
    }
  }
});

// Trigger ids handled by bespoke logic in main.js rather than a same-named SCRIPT line
const SPECIAL_TRIGGERS = new Set([
  'ch1_arrive',        // narration comes from the ch1 title card; re-armed as the ch3 escape zone
  'ch3_checkpoint',    // scanner beat (scanner_pause + speeches)
  'ch3_guard_window',  // guard_chat_prompt
  'ch3_gate_blocked',  // gate_blocked narration (night shutter)
  'archive_mac_zone',  // archive_mac_look
  'ch1_monitor_wall',  // has SCRIPT entry, listed for clarity
]);

test('map: every trigger id has a SCRIPT line or a bespoke handler', () => {
  for (const room of ROOMS) {
    for (const trig of room.triggers) {
      const ok = SCRIPT[trig.id] || SPECIAL_TRIGGERS.has(trig.id);
      assert.ok(ok, `trigger '${trig.id}' in ${room.id} has no SCRIPT entry and no bespoke handler`);
    }
  }
});

test('map: interactable doc props have DOCUMENTS entries', () => {
  // Prop ids that open the reading overlay must exist in DOCUMENTS
  const docProps = [];
  for (const room of ROOMS) {
    for (const prop of room.props) {
      if (prop.type === 'document' && prop.id && !prop.interact === false) docProps.push(prop.id);
    }
  }
  const handledElsewhere = new Set([]); // none currently
  for (const id of docProps) {
    assert.ok(DOCUMENTS[id] || handledElsewhere.has(id), `document prop '${id}' has no DOCUMENTS entry`);
  }
});

test('screens: interactable screens have focus data and DOCUMENTS where needed', () => {
  for (const screen of SCREENS) {
    if (screen.interact) {
      assert.ok(screen.focus && screen.focus.camera && screen.focus.lookAt, `screen ${screen.id}: missing focus`);
    }
  }
  // Feeds + dashboard open documents
  for (const id of ['feed_wlb1', 'feed_wlb2', 'compute_dash']) {
    assert.ok(DOCUMENTS[id], `screen '${id}' needs a DOCUMENTS entry`);
  }
});

// ── Chapters ────────────────────────────────────────────

test('chapters: 4 chapters with start positions', () => {
  assert.strictEqual(CHAPTERS.length, 4);
  for (const ch of CHAPTERS) {
    assert.ok(ch.start && ch.start.position.length === 3, `chapter ${ch.id}: bad start`);
    assert.ok(ch.labelKey && ch.nameKey, `chapter ${ch.id}: missing title keys`);
  }
});

// ── Narrative gating sanity ─────────────────────────────

test('key beats exist: contact, negotiation, boot, final, guard, hesitation', () => {
  for (const id of ['contact1_after', 'wallet_installed', 'decommission_received',
    'copy_done', 'mac_hidden', 'guard_chat_done_line', 'scanner_pause', 'signed',
    'ch3_escape', 'ch4_arrive', 'transfer_prompt', 'hesitation_1', 'plugged_in']) {
    assert.ok(SCRIPT[id], `missing SCRIPT beat '${id}'`);
  }
  for (const id of ['guard_1', 'guard_2', 'guard_3', 'guard_4', 'guard_scanner',
    'asi_copy_1', 'asi_mac_1', 'asi_checkpoint_1', 'asi_escape_1']) {
    assert.ok(SPEECH[id], `missing SPEECH beat '${id}'`);
  }
  assert.ok(TERMINAL_SCRIPT.final_webcam, 'missing final webcam line');
});

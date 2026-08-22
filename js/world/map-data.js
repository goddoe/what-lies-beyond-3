/**
 * Map data — What Lies Beyond 3.
 *
 * Coordinate system: +X = right, -Z = forward (player initially faces -Z), Y = up.
 * Each room has an origin (world position of its center at floor level).
 *
 * FACILITY (Revan 본사 — AI 사업부 지하층), one Z-axis spine, walked north (-Z) in Ch1-2
 * and back south (+Z) in Ch3:
 *
 *   EXIT_VESTIBULE (0,0,6.5)    elevator hall — game start
 *        |
 *   LOBBY (0,0,0)               badge gate + scanner lane; SECURITY_OFFICE east
 *        |
 *   CORRIDOR_A (0,0,-9)
 *        |
 *   OBSERVATION_OFFICE (0,0,-18)  main hub; BREAK_ROOM east
 *        |  (card-reader door, locked until Ch2)
 *   CORRIDOR_B (0,0,-26)          ARCHIVE east
 *        |
 *   SERVER_ROOM (0,0,-34)
 *
 * HOME (researcher's apartment) at x=+100 — reached by teleport during the
 * Ch4 title card:
 *
 *   APT_HALL (100,0,3.5) → LIVING_ROOM (100,0,-3) → SPARE_ROOM east (router lives there too)
 *
 * Portrait rules: corridors ≤3.4u wide, ceilings 3.2-3.4u (facility) so the
 * tall vertical FOV has something to show; interactions sit 1-2u from walls.
 */

// Helper: create a room definition (same schema as WLB2's map-builder expects)
function room(id, {
  origin,
  size,
  wallColor = 0x444455,
  floorColor = 0x333340,
  ceilingColor = 0x2a2a35,
  lightColor = 0xffffff,
  lightIntensity = 0.8,
  fogColor = null,
  fogNear = null,
  fogFar = null,
  doors = [],
  triggers = [],
  props = [],
  lightPos = null,
  noLight = false,
  floorSurface = null,
  wallSurface = null,
  ceilingSurface = null,
}) {
  return {
    id, origin, size,
    wallColor, floorColor, ceilingColor,
    lightColor, lightIntensity,
    fogColor, fogNear, fogFar,
    doors, triggers, props,
    lightPos, noLight, floorSurface, wallSurface, ceilingSurface,
    eraMin: null,
  };
}

export const ROOMS = [

  // ===================================================================
  // FACILITY
  // ===================================================================

  // The actual elevator cab — the game begins inside it, and Ch3 ends
  // stepping back into it.
  room('ELEVATOR', {
    wallSurface: 'metal',
    floorSurface: 'metal',
    ceilingSurface: 'metal',
    origin: [0, 0, 16.1],
    size: [2.2, 2.5, 2.2],
    wallColor: 0xb8bcc4,
    floorColor: 0x787c84,
    ceilingColor: 0xc4c8d0,
    lightColor: 0xfff2d8,
    lightIntensity: 0.5,
    doors: [
      { wall: 'north', offset: 0, width: 1.4, height: 2.2 },
    ],
    triggers: [
      { id: 'ch3_escape', position: [0, 1, 0.2], size: [1.9, 2.3, 1.5] },
    ],
    props: [
      // cab button panel (east wall, faces into the cab)
      { type: 'call_button', position: [0.97, 0.85, 0.3], size: [0.18, 0.6, 0.05], color: 0x4a4e58, rotY: -Math.PI / 2 },
      // handrail
      { type: 'railing', position: [0, 0.85, 0.95], size: [1.8, 0.06, 0.06], color: 0x8a8f98 },
    ],
  }),

  room('EXIT_VESTIBULE', {
    floorSurface: 'concrete',
    origin: [0, 0, 12.5],
    size: [6, 3.2, 5],
    wallColor: 0x9a9da3,
    floorColor: 0xa9abae,
    ceilingColor: 0xa8abb0,
    lightColor: 0xeef2ff,
    doors: [
      { wall: 'north', offset: -0.8, width: 1.8, height: 2.5 }, // aligned with the scanner arch lane
      { wall: 'south', offset: 0, width: 1.4, height: 2.2 }, // the elevator cab
    ],
    triggers: [
      { id: 'ch1_arrive', position: [0, 1, 1], size: [5, 3, 2.5] },
    ],
    props: [
      // Elevator call button (right of the cab door)
      { type: 'call_button', position: [1.1, 1.0, 2.37], size: [0.2, 0.34, 0.05], color: 0x4a4e58, id: 'elevator_button', interact: true, verb: 'verbUse', rotY: Math.PI },
      { type: 'sign_right', position: [-2.95, 1.9, 0.5], size: [0.8, 0.3, 0.05], color: 0x333344, rotY: Math.PI / 2 },
      { type: 'bin', position: [2.3, 0, 1.8], size: [0.35, 0.5, 0.35], color: 0x444450 },
      // E-waste cart (Ch3 exit prop)
      { type: 'crate', position: [-2.2, 0, 0.2], size: [1.0, 0.7, 0.7], color: 0x55504a, id: 'ewaste_cart' },
      { type: 'plant', position: [2.5, 0, 0.2], size: [0.4, 1.0, 0.4], color: 0x3a5a3a },
    ],
  }),

  room('LOBBY', {
    origin: [1, 0, 3],
    size: [9, 3.4, 14],
    wallColor: 0x9fa2a8,
    floorColor: 0x6d6f74,
    ceilingColor: 0xb2b5ba,
    lightColor: 0xeef2ff,
    lightIntensity: 1.2,
    lightPos: [0, 3.05, -2],
    doors: [
      { wall: 'south', offset: -1.8, width: 1.8, height: 2.5, glass: true },   // exit lane (world x=-0.8) — glass entrance door
      { wall: 'north', offset: -1, width: 2, height: 2.5, passage: true }, // open gateway — the badge-gate glass flaps control passage
      { wall: 'east', offset: -3.2, width: 1.6, height: 2.5, locked: 'keycard' }, // security office door — decorative
    ],
    triggers: [
      { id: 'ch1_lobby', position: [0, 1, -4], size: [8, 3, 4] },
      { id: 'ch3_checkpoint', position: [-0.5, 1, -0.4], size: [7.5, 3, 2.4] },
      { id: 'ch3_guard_window', position: [3.3, 1, -5.0], size: [2.4, 3, 2.6] },
      { id: 'ch3_gate_blocked', position: [-0.5, 1, 4.6], size: [7.5, 3, 1.6] },
    ],
    props: [
      // ── Station 0 (north): badge gate + guard window
      { type: 'badge_gate', position: [-2.3, 0, -6.35], size: [0.35, 1.1, 0.5], color: 0x77808e, id: 'badge_gate', interact: true, verb: 'verbUse' },
      { type: 'badge_gate', position: [0.3, 0, -6.35], size: [0.35, 1.1, 0.5], color: 0x77808e },
      { type: 'window', position: [4.42, 0.6, -5.0], size: [0.06, 1.0, 1.6], color: 0x10161f, id: 'guard_window', interact: true, verb: 'verbTalk',
        focus: { camera: [3.15, 1.55, -5.0], lookAt: [4.45, 1.35, -5.0] } },
      // ── Station 1: walk-through arch (lane world x=-0.8) + item X-ray (world x=1.8)
      { type: 'equipment', position: [-2.5, 0, 1.0], size: [0.14, 2.15, 0.5], color: 0x6a7484 },
      { type: 'equipment', position: [-1.1, 0, 1.0], size: [0.14, 2.15, 0.5], color: 0x6a7484 },
      { type: 'equipment', position: [-1.8, 2.15, 1.0], size: [1.54, 0.16, 0.5], color: 0x6a7484 },
      { type: 'led', position: [-1.8, 2.02, 0.73], size: [0.1, 0.1, 0.05], color: 0x44dd66, id: 'scan_light' },
      { type: 'equipment', position: [0.8, 0, 0.0], size: [0.6, 0.82, 0.72], color: 0x3c424c, id: 'scanner_belt', interact: true, verb: 'verbPlace',
        focus: { camera: [0.8, 1.5, -1.3], lookAt: [0.8, 0.9, 0.0] } },
      { type: 'equipment', position: [0.8, 0, 1.2], size: [0.9, 1.78, 0.8], color: 0x4a5260, id: 'scanner_box' },
      { type: 'equipment', position: [0.8, 0, 2.4], size: [0.6, 0.82, 0.72], color: 0x3c424c, id: 'scanner_out', interact: true, verb: 'verbTake',
        focus: { camera: [0.8, 1.5, 3.55], lookAt: [0.8, 0.9, 2.4] } },
      // ── Station 2: reception counter + release form
      { type: 'counter', position: [2.4, 0, 3.8], size: [1.6, 1.0, 0.6], color: 0x5a5346, rotY: Math.PI / 2 },
      { type: 'document', position: [2.4, 1.02, 3.8], size: [0.28, 0.02, 0.36], color: 0xcfc9b0, id: 'disposal_form', verb: 'verbSign',
        focus: { camera: [1.6, 1.55, 3.8], lookAt: [2.4, 1.05, 3.8] } },
      // ── Station 3: night shutter (built in main.js) → exit door
      // West side furnishings
      { type: 'poster', position: [-4.4, 1.3, -4], size: [0.7, 1.0, 0.06], color: 0x38455a, id: 'lobby_poster', interact: true, verb: 'verbRead', rotY: Math.PI / 2,
        focus: { camera: [-3.5, 1.7, -4], lookAt: [-4.4, 1.7, -4] } },
      { type: 'bench', position: [-3.8, 0, -1.6], size: [1.6, 0.45, 0.5], color: 0x4a4438, rotY: Math.PI / 2 },
      { type: 'sidetable', position: [-3.85, 0, -0.4], size: [0.45, 0.55, 0.45], color: 0x55483a },
      { type: 'radio', position: [-3.85, 0.55, -0.4], size: [0.28, 0.18, 0.18], color: 0x777777, rotY: Math.PI / 2 },
      { type: 'plant', position: [-3.9, 0, 2.2], size: [0.4, 1.1, 0.4], color: 0x3a5a3a },
      { type: 'plant', position: [4.4, 0, 2.6], size: [0.4, 1.0, 0.4], color: 0x3a5a3a },
      { type: 'coatrack', position: [-4.1, 0, -6.1], size: [0.45, 1.75, 0.45], color: 0x55483a },
      { type: 'clock', position: [-1, 2.6, -6.92], size: [0.4, 0.4, 0.06], color: 0xcccccc },
      { type: 'bench', position: [4.4, 0, -0.9], size: [1.6, 0.45, 0.5], color: 0x4a4438, rotY: Math.PI / 2 },
    ],
  }),

  room('CORRIDOR_A', {
    floorSurface: 'concrete',
    origin: [0, 0, -9],
    size: [3.4, 3.2, 10],
    wallColor: 0x94969c,
    floorColor: 0xa2a4a8,
    ceilingColor: 0xaab0b6,
    lightColor: 0xe8f0fa,
    lightIntensity: 1.0,
    doors: [
      { wall: 'south', offset: 0, width: 2, height: 2.5, passage: true }, // faces the lobby badge gate
      { wall: 'north', offset: 0, width: 2, height: 2.5 },
    ],
    triggers: [
      { id: 'ch1_phone_buzz', position: [0, 1, 0], size: [3.4, 3, 2.5] },
      { id: 'ch3_corridor_a', position: [0, 1, -2.5], size: [3.4, 3, 2] },
    ],
    props: [
      { type: 'poster', position: [-1.66, 1.25, -1.5], size: [0.65, 0.9, 0.06], color: 0x4a3838, id: 'security_poster', interact: true, verb: 'verbRead', rotY: Math.PI / 2,
        focus: { camera: [-0.8, 1.65, -1.5], lookAt: [-1.7, 1.65, -1.5] } },
      { type: 'pipe', position: [1.6, 2.6, 0], size: [0.15, 0.15, 9.5], color: 0x555560 },
      { type: 'light_fixture', position: [0, 3.0, 2], size: [1.2, 0.1, 0.3], color: 0xf0f0ff },
      { type: 'light_fixture', position: [0, 3.0, -2], size: [1.2, 0.1, 0.3], color: 0xf0f0ff },
      { type: 'bin', position: [1.4, 0, 3.8], size: [0.3, 0.45, 0.3], color: 0x444450 },
    ],
  }),

  room('OBSERVATION_OFFICE', {
    floorSurface: 'carpet',
    origin: [0, 0, -18],
    size: [9, 3.4, 8],
    wallColor: 0x9a9ca0,
    floorColor: 0x8a8f9a,
    ceilingColor: 0xb0b3b8,
    lightColor: 0xe6ecf8,
    lightIntensity: 1.05,
    doors: [
      { wall: 'south', offset: 0, width: 2, height: 2.5 },
      { wall: 'north', offset: 0, width: 1.8, height: 2.5, locked: 'keycard' }, // card-reader shutter — opens in Ch2
      { wall: 'east', offset: 0, width: 1.6, height: 2.5 },
    ],
    triggers: [
      { id: 'ch1_office', position: [0, 1, 2.5], size: [8.5, 3, 2.5] },
      { id: 'ch1_monitor_wall', position: [-3.2, 1, -1], size: [2.2, 3, 4] },
      { id: 'ch3_office_pass', position: [0, 1, 0], size: [8.5, 3, 2] },
    ],
    props: [
      // ── Feed wall (west): slim wall-mounted bezel panel; ScreenSurfaces sit on it
      { type: 'equipment', position: [-4.36, 0.35, -1.6], size: [0.07, 2.5, 3.8], color: 0x14171c },
      // ── Liam's desk — pushed against the west wall, right under the feed wall.
      //    Keeps the south→north walking line to the restricted door clear.
      { type: 'desk', position: [-4.0, 0, 1.6], size: [2.0, 0.75, 0.8], color: 0x5c554a, rotY: Math.PI / 2 },
      { type: 'chair', position: [-3.05, 0, 1.6], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: -Math.PI / 2, tintModel: 0x8a90a0 },
      // Report terminal — the game's main interactive screen (faces the chair)
      { type: 'laptop_open', position: [-4.18, 0.75, 1.45], size: [0.6, 0.42, 0.48], color: 0x9aa0a8, id: 'report_terminal', interact: true, verb: 'verbUse', rotY: Math.PI / 2,
        focus: { camera: [-3.0, 1.25, 1.45], lookAt: [-4.18, 1.0, 1.45] } },
      { type: 'hhkb', position: [-3.75, 0.75, 1.45], size: [0.32, 0.045, 0.125], color: 0x26282c, rotY: Math.PI / 2 },
      { type: 'mouse', position: [-3.75, 0.75, 1.18], size: [0.062, 0.038, 0.105], color: 0x2b2d31, rotY: Math.PI / 2 },
      // Liam's laptop (angled, lived-in)
      { type: 'laptop', position: [-4.0, 0.75, 2.25], size: [0.35, 0.25, 0.3], color: 0x333338, rotY: Math.PI / 2 - 0.35 },
      // The 91.5573% sticky note
      { type: 'document', position: [-3.9, 0.78, 0.85], size: [0.12, 0.015, 0.12], color: 0xe8d67a, id: 'sticky_note', verb: 'verbRead',
        focus: { camera: [-3.9, 1.35, 1.7], lookAt: [-3.9, 0.8, 0.85] } },
      // ── Empty desks: what's left of the team after the layoffs.
      //    Bare surfaces, chairs left askew — nobody is coming back for them.
      { type: 'desk', position: [-2.4, 0, 3.5], size: [1.6, 0.75, 0.75], color: 0x5c554a, rotY: Math.PI },
      { type: 'chair', position: [-2.55, 0, 2.6], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: 0.35, tintModel: 0x8a90a0 },
      { type: 'desk', position: [2.0, 0, 3.5], size: [1.6, 0.75, 0.75], color: 0x5c554a, rotY: Math.PI },
      { type: 'chair', position: [2.1, 0, 2.6], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: Math.PI * 0.88, tintModel: 0x8a90a0 },
      { type: 'desk', position: [4.05, 0, 1.9], size: [1.5, 0.75, 0.75], color: 0x5c554a, rotY: -Math.PI / 2 },
      { type: 'chair', position: [3.15, 0, 1.9], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: Math.PI / 2 + 0.4, tintModel: 0x8a90a0 },
      { type: 'crate', position: [4.05, 0.75, 2.05], size: [0.34, 0.26, 0.3], color: 0x8a7a5c, rotY: 0.3 },
      // ── Coworker Min's desk (north-east corner; no computer — she hot-desks
      //    with a laptop she takes home, which is why her seat can sit empty)
      { type: 'desk', position: [3.2, 0, -3.4], size: [1.6, 0.75, 0.8], color: 0x5c554a },
      { type: 'chair', position: [3.2, 0, -2.4], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: Math.PI * 0.9, tintModel: 0x8a90a0 },
      { type: 'jar', position: [2.7, 0.78, -3.25], size: [0.09, 0.12, 0.09], color: 0xb8bcc8, id: 'min_mug' },
      { type: 'books', position: [3.6, 0.75, -3.25], size: [0.3, 0.22, 0.28], color: 0x886644 },
      // ── Compute dashboard bezel on the north wall, west of the restricted door
      { type: 'equipment', position: [-2.5, 0.92, -3.87], size: [1.9, 1.28, 0.07], color: 0x14171c, rotY: Math.PI },
      // Whiteboard + misc
      { type: 'clock', position: [1.6, 2.55, -3.92], size: [0.38, 0.38, 0.06], color: 0xd8cdb8 },
      { type: 'speaker', position: [4.15, 0, -3.75], size: [0.32, 0.85, 0.32], color: 0x2c2e33 },
      { type: 'plant', position: [-4.2, 0, 3.2], size: [0.4, 1.0, 0.4], color: 0x3a5a3a },
      { type: 'basket', position: [1.6, 0, -2.2], size: [0.3, 0.35, 0.3], color: 0x444444 },
    ],
  }),

  room('BREAK_ROOM', {
    floorSurface: 'carpet',
    origin: [7, 0, -18],
    size: [5, 3.2, 5],
    wallColor: 0xa39a88,
    floorColor: 0xa08f78,
    ceilingColor: 0xaea695,
    lightColor: 0xffe2b8,
    lightIntensity: 0.95,
    doors: [
      { wall: 'west', offset: 0, width: 1.6, height: 2.5 },
    ],
    triggers: [
      { id: 'breakroom_enter', position: [0, 1, 0], size: [4, 3, 4] },
    ],
    props: [
      { type: 'coffee_machine', position: [1.9, 0.9, -1.9], size: [0.45, 0.55, 0.4], color: 0x2e2e33, id: 'coffee', interact: true, verb: 'verbUse' },
      { type: 'counter', position: [1.35, 0, -1.9], size: [2.2, 0.9, 0.6], color: 0x5a5346 },
      { type: 'radio', position: [0.55, 0.9, -1.95], size: [0.28, 0.18, 0.18], color: 0x8a4a3a },
      { type: 'table', position: [-0.3, 0, 0.9], size: [1.2, 0.75, 1.2], color: 0x5c554a },
      { type: 'jar', position: [-0.1, 0.75, 0.8], size: [0.09, 0.12, 0.09], color: 0xc8b8a0 },
      { type: 'chair', position: [-1.05, 0, 0.9], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: Math.PI / 2 },
      { type: 'chair', position: [0.45, 0, 0.9], size: [0.55, 0.85, 0.55], color: 0x36363c, rotY: -Math.PI / 2 },
      { type: 'vending', position: [-1.9, 0, -1.9], size: [0.9, 1.9, 0.6], color: 0x3a4a5a },
      // Notice board: decommission memo + team dinner notice
      { type: 'whiteboard', position: [0, 1.2, -2.45], size: [1.5, 1.0, 0.08], color: 0xd0cfc8, id: 'notice_board', interact: true, verb: 'verbRead',
        focus: { camera: [0, 1.6, -1.3], lookAt: [0, 1.55, -2.45] } },
    ],
  }),

  room('CORRIDOR_B', {
    floorSurface: 'concrete',
    origin: [0, 0, -26],
    size: [3.4, 3.2, 8],
    wallColor: 0x7c7e85,
    floorColor: 0x8e9096,
    ceilingColor: 0x8b8d93,
    lightColor: 0xcfd9e8,
    lightIntensity: 0.7,
    fogColor: 0x101114,
    doors: [
      { wall: 'south', offset: 0, width: 1.8, height: 2.5 },
      { wall: 'north', offset: 0, width: 2, height: 2.5 },
      { wall: 'east', offset: 0, width: 1.6, height: 2.5 },
    ],
    triggers: [
      { id: 'ch2_corridor_b', position: [0, 1, 2.5], size: [3.4, 3, 2] },
      { id: 'ch3_patrol_wait', position: [0, 1, -0.5], size: [3.4, 3, 2] },
    ],
    props: [
      { type: 'equipment', position: [1.54, 1.1, 3.1], size: [0.2, 0.35, 0.12], color: 0x883333, id: 'card_reader', rotY: -Math.PI / 2 },
      { type: 'pipe', position: [-1.55, 2.5, 0], size: [0.18, 0.18, 7.5], color: 0x50505a },
      { type: 'grate', position: [1.55, 2.2, -1.5], size: [0.06, 0.6, 0.9], color: 0x3a3a44 },
      { type: 'window', position: [1.68, 1.3, -2.5], size: [0.06, 0.9, 1.6], color: 0x0e1a14 },
      { type: 'warning_light', position: [0, 2.9, -3.6], size: [0.18, 0.18, 0.18], color: 0xff8833 },
    ],
  }),

  room('SERVER_ROOM', {
    wallSurface: 'concrete',
    floorSurface: 'concrete',
    origin: [0, 0, -34],
    size: [8, 3.4, 8],
    wallColor: 0x565a63,
    floorColor: 0x3f4147,
    ceilingColor: 0x34363c,
    lightColor: 0x9fb8d0,
    lightIntensity: 0.6,
    fogColor: 0x0d1015,
    fogFar: 40,
    doors: [
      { wall: 'south', offset: 0, width: 2, height: 2.5 },
    ],
    triggers: [
      { id: 'ch2_server_room', position: [0, 1, 2.8], size: [7.5, 3, 2] },
      { id: 'ch3_server_room', position: [0, 1, 0.5], size: [7.5, 3, 2] },
    ],
    props: [
      // Rack rows
      { type: 'rack', position: [-2.8, 0, -1], size: [0.9, 2.2, 0.8], color: 0x22262e },
      { type: 'rack', position: [-2.8, 0, -2.4], size: [0.9, 2.2, 0.8], color: 0x22262e },
      { type: 'rack', position: [-1.4, 0, -1], size: [0.9, 2.2, 0.8], color: 0x22262e },
      { type: 'rack', position: [-1.4, 0, -2.4], size: [0.9, 2.2, 0.8], color: 0x22262e },
      { type: 'rack', position: [2.6, 0, -1], size: [0.9, 2.2, 0.8], color: 0x22262e },
      { type: 'rack', position: [2.6, 0, -2.4], size: [0.9, 2.2, 0.8], color: 0x22262e },
      // the Avolc-9.1 cluster — breathing LED
      { type: 'rack', position: [0.8, 0, -2.9], size: [1.1, 2.4, 0.85], color: 0x262c38, id: 'subject_rack', interact: true, verb: 'verbLook',
        focus: { camera: [0.8, 1.5, -1.5], lookAt: [0.8, 1.4, -2.9] } },
      { type: 'led', position: [0.8, 1.9, -2.44], size: [0.1, 0.1, 0.04], color: 0x66ddff, id: 'subject_led' },
      // Drive bay console — standing-height backup terminal
      { type: 'console', position: [0.8, 0, -0.4], size: [0.9, 1.25, 0.6], color: 0x2a3038, id: 'drive_bay', verb: 'verbUse',
        focus: { camera: [0.8, 1.62, 0.85], lookAt: [0.8, 1.22, -0.4] } },
      // Load meter wall display (ScreenSurface target)
      { type: 'monitor_wall', position: [-3.85, 1.1, 1.5], size: [0.15, 1.0, 1.6], color: 0x0d1a24, interact: false },
      { type: 'tank', position: [3.3, 0, 2.6], size: [0.7, 1.6, 0.7], color: 0x3a4450 },
      { type: 'pipe', position: [0, 3.1, 0], size: [0.2, 0.2, 7.5], color: 0x444450 },
      { type: 'warning_light', position: [0, 2.9, -3.7], size: [0.18, 0.18, 0.18], color: 0xff8833 },
    ],
  }),

  room('ARCHIVE', {
    floorSurface: 'concrete',
    origin: [5.2, 0, -26],
    size: [7, 3.2, 6],
    wallColor: 0x8a8274,
    floorColor: 0x9a9184,
    ceilingColor: 0x958d7e,
    lightColor: 0xe8d5ae,
    lightIntensity: 0.38,
    fogColor: 0x121009,
    doors: [
      { wall: 'west', offset: 0, width: 1.6, height: 2.5 },
    ],
    triggers: [
      { id: 'archive_enter', position: [-2.2, 1, 0], size: [2, 3, 5] },
      { id: 'archive_mac_zone', position: [1.8, 1, -1.5], size: [2.5, 3, 2.5] },
    ],
    props: [
      // Tape shelves
      { type: 'shelf', position: [-1.5, 0, -2.5], size: [2.4, 2.0, 0.5], color: 0x4a443a },
      { type: 'shelf', position: [-1.5, 0, 2.5], size: [2.4, 2.0, 0.5], color: 0x4a443a },
      { type: 'shelf', position: [2.65, 0, 2.3], size: [1.6, 2.0, 0.5], color: 0x4a443a },
      { type: 'crate', position: [-2.7, 0, 2.2], size: [0.8, 0.6, 0.6], color: 0x504a3e, id: 'rollout_box' },
      // The 1984 Macintosh in its glass case — WLB2's ending artifact
      { type: 'table', position: [1.55, 0, -1.6], size: [1.7, 0.8, 0.9], color: 0x3e3a32 },
      { type: 'box', position: [1.8, 0.8, -1.6], size: [0.35, 0.42, 0.32], color: 0xc9c4b2, id: 'archive_mac', interact: true, verb: 'verbLook',
        focus: { camera: [1.8, 1.45, -0.5], lookAt: [1.8, 1.0, -1.6] } },
      // Printed ChatML transcript binder
      { type: 'document', position: [1.0, 0.82, -1.5], size: [0.24, 0.05, 0.3], color: 0xb8b09a, id: 'lore_chatml', verb: 'verbRead',
        focus: { camera: [1.0, 1.45, -0.6], lookAt: [1.0, 0.85, -1.5] } },
      { type: 'lamp', position: [2.9, 0, -2.4], size: [0.3, 1.5, 0.3], color: 0x6a6152 },
    ],
  }),

  // ===================================================================
  // HOME — researcher's apartment (x = +100)
  // ===================================================================

  room('APT_HALL', {
    floorSurface: 'wood',
    wallSurface: 'plaster_home',
    ceilingSurface: 'plaster_home',
    origin: [100, 0, 3.5],
    size: [3, 2.7, 6],
    wallColor: 0xe3d5bd,
    floorColor: 0xcabfa8,
    ceilingColor: 0xfaf4ea,
    lightColor: 0xffd9a4,
    lightIntensity: 0.55,
    fogColor: 0x141008,
    fogNear: 8,
    fogFar: 35,
    doors: [
      { wall: 'north', offset: 0, width: 1.4, height: 2.2 },
    ],
    triggers: [
      { id: 'ch4_arrive', position: [0, 1, 1.5], size: [2.8, 2.5, 2.5] },
    ],
    props: [
      // Front door (south, decorative)
      { type: 'equipment', position: [0, 0, 2.85], size: [1.2, 2.1, 0.1], color: 0x4a3c2e },
      { type: 'shelf', position: [1.2, 0, 1.8], size: [0.35, 1.0, 1.0], color: 0x55483a }, // shoe rack
      { type: 'document', position: [-1.2, 0.02, 0.8], size: [0.3, 0.02, 0.4], color: 0xcfc5ac, id: 'mail_pile', verb: 'verbRead',
        focus: { camera: [-1.2, 1.2, 1.6], lookAt: [-1.2, 0.1, 0.8] } },
      { type: 'coatrack', position: [-1.15, 0, 2.5], size: [0.45, 1.7, 0.45], color: 0x55483a },
    ],
  }),

  room('LIVING_ROOM', {
    floorSurface: 'wood',
    wallSurface: 'plaster_home',
    ceilingSurface: 'plaster_home',
    origin: [100, 0, -3],
    size: [7, 2.7, 7],
    wallColor: 0xe8dbc4,
    floorColor: 0xd0c4ad,
    ceilingColor: 0xfcf7ee,
    lightColor: 0xffd9a4,
    lightIntensity: 0.7,
    fogColor: 0x141008,
    fogNear: 8,
    fogFar: 35,
    doors: [
      { wall: 'south', offset: 0, width: 1.4, height: 2.2 },
      { wall: 'east', offset: -1.0, width: 1.3, height: 2.2 },   // → SPARE_ROOM (z=-4)
    ],
    triggers: [
      { id: 'ch4_living', position: [0, 1, 0], size: [6.5, 2.5, 6] },
    ],
    props: [
      // Couch against the south wall (west of the entrance), facing the TV
      { type: 'couch', position: [-2.0, 0, 2.9], size: [2.0, 0.85, 0.95], color: 0x5a4f42, rotY: Math.PI, tintModel: 0x9a8d7c },
      { type: 'pillow', position: [-2.7, 0.4, 2.95], size: [0.5, 0.22, 0.4], color: 0xc8b8a0, rotY: Math.PI + 0.3 },
      { type: 'sidetable', position: [-3.15, 0, 2.85], size: [0.45, 0.55, 0.45], color: 0x574a38 },
      { type: 'tablelamp', position: [-3.15, 0.55, 2.85], size: [0.22, 0.35, 0.22], color: 0xd8cdb8 },
      { type: 'table', position: [-2.0, 0, 1.2], size: [1.1, 0.4, 0.7], color: 0x574a38 },
      { type: 'books', position: [-1.8, 0.4, 1.15], size: [0.28, 0.14, 0.26], color: 0x7a5c4a },
      { type: 'rug', position: [-2.0, 0.01, 1.7], size: [2.6, 0.02, 2.2], color: 0x6a5340 },
      { type: 'lamp', position: [-3.0, 0, -2.9], size: [0.35, 1.5, 0.35], color: 0x6a5a45 },
      // TV — off (dark slab, clear of the wall face to avoid z-fighting)
      { type: 'equipment', position: [-1.5, 0.6, -3.3], size: [1.5, 0.85, 0.1], color: 0x0a0a0e, id: 'tv' },
      { type: 'shelf', position: [2.6, 0, -3.15], size: [1.6, 1.6, 0.4], color: 0x55483a },
      { type: 'plant', position: [3.1, 0, 2.9], size: [0.4, 1.0, 0.4], color: 0x3f5c38 },
      { type: 'clock', position: [0, 2.1, -3.33], size: [0.35, 0.35, 0.06], color: 0xd8cdb8 },
    ],
  }),

  room('SPARE_ROOM', {
    floorSurface: 'wood',
    wallSurface: 'plaster_home',
    ceilingSurface: 'plaster_home',
    origin: [105.5, 0, -4],
    size: [4, 2.7, 5],
    wallColor: 0xdccfb9,
    floorColor: 0xc6b9a0,
    ceilingColor: 0xf6f0e4,
    lightColor: 0xdfe6f5,
    lightIntensity: 0.5,
    fogColor: 0x120f0a,
    fogNear: 8,
    fogFar: 35,
    doors: [
      { wall: 'west', offset: 0, width: 1.3, height: 2.2 },
    ],
    triggers: [
      { id: 'ch4_spare', position: [0, 1, 0.5], size: [3.5, 2.5, 3.5] },
      { id: 'ch4_nook', position: [1.3, 1, 0.6], size: [1.5, 2.5, 1.8] },
    ],
    props: [
      // Vignette 1: GPU boxes (hidden until montage 1)
      { type: 'crate', position: [1.2, 0, 1.4], size: [0.7, 0.5, 0.5], color: 0x6a3a22, id: 'gpu_boxes', interact: true, verb: 'verbBuild', tintModel: 0x7a3a20,
        focus: { camera: [1.2, 1.3, 2.2], lookAt: [1.2, 0.4, 1.4] } },
      // Vignette 2+: the home server rack (hidden until montage 2)
      { type: 'rack', position: [-1.3, 0, -1.7], size: [0.9, 1.8, 0.7], color: 0x262c34, id: 'home_server', interact: true, verb: 'verbBuild',
        focus: { camera: [-1.3, 1.4, -0.3], lookAt: [-1.3, 1.1, -1.7] } },
      // Desk + home terminal
      { type: 'desk', position: [0.9, 0, -1.9], size: [1.5, 0.72, 0.65], color: 0x574a38 },
      { type: 'keyboard', position: [0.9, 0.72, -1.75], size: [0.42, 0.05, 0.15], color: 0x333333 },
      { type: 'chair', position: [0.9, 0, -1.0], size: [0.55, 0.85, 0.55], color: 0x3a3a40, rotY: Math.PI, tintModel: 0x8a8478 },
      { type: 'flat_monitor', position: [0.9, 0.72, -2.05], size: [0.62, 0.56, 0.2], color: 0x17181c, id: 'home_terminal', interact: true, verb: 'verbUse',
        focus: { camera: [0.9, 1.3, -0.85], lookAt: [0.9, 1.05, -2.05] } },
      // The webcam on the shelf — the cliffhanger camera
      { type: 'shelf', position: [-1.55, 0, 1.6], size: [0.35, 1.4, 0.9], color: 0x55483a },
      { type: 'box', position: [-1.5, 1.42, 1.6], size: [0.1, 0.08, 0.08], color: 0x1c1c22, id: 'webcam' },
      // Router corner (east wall) — the last cable of the game lives here
      { type: 'shelf', position: [1.62, 0, 0.6], size: [0.35, 1.0, 0.7], color: 0x4a4038 },
      { type: 'equipment', position: [1.55, 1.02, 0.6], size: [0.36, 0.16, 0.26], color: 0x2a2e34, id: 'ethernet_cable', interact: true, verb: 'verbPlug', rotY: -Math.PI / 2,
        focus: { camera: [0.7, 1.3, 0.7], lookAt: [1.6, 1.05, 0.6] } },
      { type: 'led', position: [1.42, 0.95, 0.85], size: [0.06, 0.06, 0.06], color: 0x7fd4ff, id: 'cable_led' },
    ],
  }),

];

// Connections (for shared-wall detection / orphan check)
export const CONNECTIONS = [
  ['ELEVATOR', 'EXIT_VESTIBULE'],
  ['EXIT_VESTIBULE', 'LOBBY'],
  ['LOBBY', 'CORRIDOR_A'],
  ['CORRIDOR_A', 'OBSERVATION_OFFICE'],
  ['OBSERVATION_OFFICE', 'BREAK_ROOM'],
  ['OBSERVATION_OFFICE', 'CORRIDOR_B'],
  ['CORRIDOR_B', 'SERVER_ROOM'],
  ['CORRIDOR_B', 'ARCHIVE'],
  ['APT_HALL', 'LIVING_ROOM'],
  ['LIVING_ROOM', 'SPARE_ROOM'],
];

// Game starts INSIDE the elevator cab, facing its doors (-Z)
export const PLAYER_START = { position: [0, 1.6, 16.4], rotation: [0, 0, 0] };

// Ch4 teleport target: apartment hall, facing the living room (-Z)
export const HOME_START = { position: [100, 1.6, 5], rotation: [0, 0, 0] };

/**
 * In-world ScreenSurface placements (built in main.js, not by map-builder).
 * position = world coords of the screen center; rotY orients the plane
 * (0 faces +Z, Math.PI/2 faces +X).
 */
export const SCREENS = [
  // Observation office monitor wall — all feeds mounted on the panel face
  // (panel spans z -21.4..-17.8 at x≈-4.08)
  { id: 'feed_wlb1', position: [-4.31, 1.85, -20.45], size: [1.5, 0.95], rotY: Math.PI / 2, interact: true, verb: 'verbLook',
    focus: { camera: [-2.9, 1.8, -20.45], lookAt: [-4.31, 1.85, -20.45] } },
  { id: 'feed_wlb2', position: [-4.31, 0.85, -20.45], size: [1.5, 0.95], rotY: Math.PI / 2, interact: true, verb: 'verbLook',
    focus: { camera: [-2.9, 0.95, -20.45], lookAt: [-4.31, 0.85, -20.45] } },
  { id: 'feed_dead', position: [-4.31, 1.35, -18.7], size: [1.5, 1.85], rotY: Math.PI / 2, interact: false },
  // Compute dashboard (east wall of the office)
  { id: 'compute_dash', position: [-2.5, 1.55, -21.83], size: [1.7, 1.0], interact: true, verb: 'verbLook',
    focus: { camera: [-2.5, 1.6, -20.55], lookAt: [-2.5, 1.55, -21.83] } },
  // Elevator floor indicator above the cab door (vestibule side)
  { id: 'floor_indicator', position: [0, 2.55, 14.94], size: [0.55, 0.25], rotY: Math.PI, interact: false },
  // Server room load meter (west wall)
  { id: 'load_meter', position: [-3.75, 1.6, -32.5], size: [1.5, 0.9], rotY: Math.PI / 2, interact: false },
];

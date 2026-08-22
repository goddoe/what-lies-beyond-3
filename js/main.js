import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Player } from './engine/player.js';
import { PostFX } from './engine/postfx.js';
import { CameraFocus } from './engine/camera-focus.js';
import { ScreenSurface, ScreenRegistry } from './engine/screen-surface.js';
import { attachModel } from './engine/model-loader.js';
import { AudioSystem } from './engine/audio.js';
import { MapBuilder } from './world/map-builder.js';
import { TriggerManager } from './world/triggers.js';
import { SCREENS, ROOMS } from './world/map-data.js';
import { Narrator } from './narrative/narrator.js';
import { getLine, SPEECH, TERMINAL_SCRIPT } from './narrative/script-data.js';
import { getChapter } from './narrative/chapters.js';
import { GameState, State } from './systems/game-state.js';
import { SaveSystem } from './systems/save.js';
import { Items } from './systems/items.js';
import { UI } from './systems/ui.js';
import { OverlayManager } from './systems/overlays/overlay-manager.js';
import { MonitorOverlay } from './systems/overlays/monitor-overlay.js';
import { TerminalOverlay } from './systems/overlays/terminal-overlay.js';
import { LaptopOS } from './systems/overlays/laptop-os.js';
import { ReportComposer } from './systems/overlays/report-composer.js';
import { PhoneOverlay } from './systems/overlays/phone-overlay.js';
import { HoldOverlay } from './systems/overlays/hold-overlay.js';
import { TitleCards } from './systems/overlays/title-cards.js';
import { getLanguage, setLanguage, t } from './data/i18n.js';

// ── Bootstrap ──────────────────────────────────────────

const isMobile = 'ontouchstart' in window && window.innerWidth < 1024;
let touchControls = null;

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas, { isMobile });
const player = new Player(renderer.camera, renderer.renderer, renderer.scene);
const postfx = new PostFX(renderer, renderer.scene, renderer.camera);
if (isMobile) {
  postfx.mobileBudget = true;
} else {
  postfx.setBloom(true); // subtle glow on screens/fixtures
  // zero the glitch-pass uniforms — only bloom should show by default
  postfx.setScanlines(0);
  postfx.setNoise(0);
  postfx.setColorShift(0);
  postfx.setGlitch(0);
  postfx.enabled = true;
}
const mapBuilder = new MapBuilder(renderer.scene);
const triggers = new TriggerManager();
const narrator = new Narrator();
const gameState = new GameState();
const save = new SaveSystem();
const items = new Items();
const ui = new UI(gameState, { isMobile });
const audio = new AudioSystem();
const cameraFocus = new CameraFocus(renderer.camera);
const screens = new ScreenRegistry();

const om = new OverlayManager(gameState, { isMobile });
om.player = player;
const monitorOverlay = new MonitorOverlay(om);
const terminalOverlay = new TerminalOverlay(om);
const reportComposer = new ReportComposer(om, gameState);
const laptopOS = new LaptopOS(om, gameState);
const phone = new PhoneOverlay(om, gameState);
const holdOverlay = new HoldOverlay(om);
const titleCards = new TitleCards(gameState);

narrator.setNarratorMode('inner');

// Desktop: mark the phone badge with its hotkey (mouse is pointer-locked in play)
if (!isMobile) {
  const badge = document.getElementById('phone-badge');
  const key = document.createElement('span');
  key.className = 'phone-badge-key';
  key.textContent = 'Q';
  badge.appendChild(key);
}

// Terminal conversation → game state wiring
terminalOverlay.onFlag = (flag) => gameState.setFlag(flag);
terminalOverlay.onEvent = (eventName) => {
  if (eventName === 'wallet_install') {
    gameState.setFlag('wallet');
    phone.showBadge();
    phone.setWallet(3742000, { animateFrom: 0 });
  }
  if (eventName === 'backup_start') { drawLoadMeter(0.78, 'WRITE 78%'); drawBayScreen('writing'); }
  if (eventName === 'backup_mid') drawLoadMeter(0.82, 'WRITE 78%');
  if (eventName === 'backup_eject') { drawLoadMeter(0.12, 'DONE'); drawBayScreen('ejected'); }
};

// ── Mobile Touch Controls (lazy) ───────────────────────

if (isMobile) {
  import('./engine/touch-controls.js').then(({ TouchControls }) => {
    touchControls = new TouchControls(player, renderer.camera, gameState);
    player.touchMode = true;
    om.touchControls = touchControls;
    touchControls.onInteract = () => doInteract();
    touchControls.onPause = () => pauseGame();
  });
}

// ── Build World ────────────────────────────────────────

mapBuilder.setLang(getLanguage());
const buildResult = mapBuilder.build();
player.setColliders(buildResult.colliders);
player.setInteractables(buildResult.interactables);
triggers.loadZones(buildResult.triggerZones);
const doorSystem = buildResult.doorSystem;

// Pooled room lighting — one warm/cool point light per room, nearest 4 active
renderer.setRoomLights(ROOMS.filter(r => !r.noLight).map(r => {
  const lp = r.lightPos || [0, r.size[1] - 0.35, 0];
  return {
    position: new THREE.Vector3(r.origin[0] + lp[0], r.origin[1] + lp[1], r.origin[2] + lp[2]),
    color: r.lightColor || 0xffffff,
    intensity: (r.lightIntensity || 0.8) * 26,
    distance: Math.max(r.size[0], r.size[2]) * 1.7,
  };
}));

// Index interactable props by id for interaction state
const propIndex = new Map();
for (const it of buildResult.interactables) {
  if (it.propId) propIndex.set(it.propId, it);
}
// All named prop meshes (including non-interactable ones like LEDs)
const namedProps = buildResult.namedProps || new Map();

// ── In-world screens (ScreenSurfaces) ──────────────────

for (const def of SCREENS) {
  const surface = new ScreenSurface({ width: def.size[0], height: def.size[1] });
  surface.mesh.position.set(def.position[0], def.position[1], def.position[2]);
  surface.mesh.rotation.y = def.rotY || 0;
  renderer.scene.add(surface.mesh);
  screens.register(def.id, surface);
  if (def.interact) {
    player.interactables.push({
      mesh: surface.mesh,
      type: 'monitor',
      propId: def.id,
      verb: def.verb || 'verbLook',
      focus: def.focus || null,
    });
  }
}

// ── Guard service window (lobby east wall) ─────────────
// Dresses the bare glass slab into a proper reception window and adds the
// night-shift guard's backlit silhouette (visible from Ch3).
let guardFigure = null;
var guardPhoto = null; // assigned inside the window block below
{
  const wallX = 5.48;           // lobby east wall inner face
  const cz = -2.0;              // window center (matches the guard_window prop)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.5, metalness: 0.6 });

  const frame = new THREE.Group();
  const mk = (w, h, dpt, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(dpt, h, w), frameMat);
    m.position.set(x, y, z);
    frame.add(m);
  };
  mk(1.76, 0.08, 0.1, wallX - 0.04, 1.64, cz);  // top
  mk(1.76, 0.08, 0.1, wallX - 0.04, 0.56, cz);  // bottom
  mk(0.08, 1.16, 0.1, wallX - 0.04, 1.1, cz - 0.84); // sides
  mk(0.08, 1.16, 0.1, wallX - 0.04, 1.1, cz + 0.84);
  // counter sill jutting into the lobby
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x8b8f98, roughness: 0.4, metalness: 0.3 }));
  sill.position.set(wallX - 0.15, 0.55, cz);
  sill.castShadow = true;
  frame.add(sill);
  // SECURITY sign above
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256; signCanvas.height = 64;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#232830'; sctx.fillRect(0, 0, 256, 64);
  sctx.fillStyle = 'rgba(220,230,245,0.9)';
  sctx.font = 'bold 26px sans-serif'; sctx.textAlign = 'center';
  sctx.fillText('보 안 · SECURITY', 128, 42);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35 }));
  sign.position.set(wallX - 0.02, 1.92, cz);
  sign.rotation.y = -Math.PI / 2;
  frame.add(sign);
  renderer.scene.add(frame);

  // The glass pane itself is a canvas surface: dark frosted glass by day,
  // warm backlit glass with Guard Bae's blurred shadow on the night shift.
  // (Suggests a person without a cheap character model.)
  const glassCanvas = document.createElement('canvas');
  glassCanvas.width = 256; glassCanvas.height = 160;
  const gctx = glassCanvas.getContext('2d');
  const glassTex = new THREE.CanvasTexture(glassCanvas);
  glassTex.colorSpace = THREE.SRGBColorSpace;

  function drawGuardGlass(present) {
    const w = 256, h = 160;
    gctx.filter = 'none';
    // base
    gctx.fillStyle = present ? '#181b21' : '#0d1015';
    gctx.fillRect(0, 0, w, h);

    if (present) {
      // warm desk-lamp light behind the blinds
      const g = gctx.createRadialGradient(w * 0.62, h * 0.52, 8, w * 0.62, h * 0.52, w * 0.8);
      g.addColorStop(0, 'rgba(255,216,150,0.75)');
      g.addColorStop(0.45, 'rgba(255,204,135,0.3)');
      g.addColorStop(1, 'rgba(255,198,125,0.03)');
      gctx.fillStyle = g;
      gctx.fillRect(0, 0, w, h);

      // Guard Bae in profile — cap with brim, nose line, sloped shoulders,
      // chair back. Two blur passes: soft halo + firmer core.
      const drawProfile = (blur, alpha) => {
        gctx.filter = `blur(${blur}px)`;
        gctx.fillStyle = `rgba(7,9,13,${alpha})`;
        gctx.beginPath();
        gctx.moveTo(w * 0.30, h);            // chair-side base
        gctx.lineTo(w * 0.30, h * 0.72);     // chair back
        gctx.lineTo(w * 0.38, h * 0.66);     // lower back
        gctx.lineTo(w * 0.40, h * 0.44);     // back of neck
        gctx.lineTo(w * 0.42, h * 0.30);     // back of head
        gctx.quadraticCurveTo(w * 0.47, h * 0.16, w * 0.56, h * 0.17); // crown (cap)
        gctx.lineTo(w * 0.665, h * 0.205);   // cap front
        gctx.lineTo(w * 0.665, h * 0.255);   // brim tip
        gctx.lineTo(w * 0.585, h * 0.27);    // under brim
        gctx.quadraticCurveTo(w * 0.62, h * 0.33, w * 0.605, h * 0.40); // nose
        gctx.lineTo(w * 0.585, h * 0.47);    // chin
        gctx.lineTo(w * 0.60, h * 0.56);     // chest
        gctx.lineTo(w * 0.70, h * 0.78);     // sloped shoulder/arm
        gctx.lineTo(w * 0.72, h);
        gctx.closePath();
        gctx.fill();
      };
      drawProfile(8, 0.55);
      drawProfile(2.5, 0.92);
      gctx.filter = 'none';
    }

    // venetian blinds — slats cut across everything (hide the crude bits)
    for (let y = 2; y < h; y += 13) {
      const wobble = Math.sin(y * 0.35) * 1.2;
      gctx.fillStyle = present ? 'rgba(22,25,32,0.92)' : 'rgba(16,19,25,0.95)';
      gctx.fillRect(0, y + wobble, w, 8);
      // slat highlight edge
      gctx.fillStyle = present ? 'rgba(120,110,90,0.18)' : 'rgba(70,75,90,0.12)';
      gctx.fillRect(0, y + wobble, w, 1.5);
    }
    // pull cord
    gctx.fillStyle = 'rgba(200,200,200,0.14)';
    gctx.fillRect(w * 0.94, 0, 2, h);

    glassTex.needsUpdate = true;
  }
  drawGuardGlass(false);

  const glassPane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.98),
    new THREE.MeshStandardMaterial({
      map: glassTex,
      emissive: 0xffffff,
      emissiveMap: glassTex,
      emissiveIntensity: 0.55,
      roughness: 0.15,
      metalness: 0.1,
    })
  );
  glassPane.position.set(5.383, 1.1, cz); // just in front of the dark glass slab
  glassPane.rotation.y = -Math.PI / 2;
  renderer.scene.add(glassPane);

  guardFigure = glassPane;
  guardFigure.userData.setPresent = drawGuardGlass;

  // The daughter's drawing — a polaroid Guard Bae slides out under the glass
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = 96; photoCanvas.height = 116;
  const pctx = photoCanvas.getContext('2d');
  pctx.fillStyle = '#f2efe6';
  pctx.fillRect(0, 0, 96, 116);                 // polaroid frame
  pctx.fillStyle = '#dfe9f2';
  pctx.fillRect(8, 8, 80, 80);                  // photo area (sky)
  pctx.fillStyle = '#f6d44a';                   // crayon sun
  pctx.beginPath(); pctx.arc(70, 22, 8, 0, Math.PI * 2); pctx.fill();
  pctx.strokeStyle = '#e2694a'; pctx.lineWidth = 3;      // house
  pctx.strokeRect(20, 46, 26, 20);
  pctx.beginPath(); pctx.moveTo(16, 46); pctx.lineTo(33, 32); pctx.lineTo(50, 46); pctx.stroke();
  pctx.strokeStyle = '#3a6ea5'; pctx.lineWidth = 2.5;    // two stick figures
  for (const [fx, fh] of [[62, 12], [74, 9]]) {
    pctx.beginPath(); pctx.arc(fx, 62, fh * 0.35, 0, Math.PI * 2); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(fx, 62 + fh * 0.35); pctx.lineTo(fx, 62 + fh); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(fx - 4, 62 + fh * 0.65); pctx.lineTo(fx + 4, 62 + fh * 0.65); pctx.stroke();
  }
  pctx.fillStyle = '#4a4438';
  pctx.font = '11px sans-serif';
  pctx.fillText('아빠랑 나', 26, 106);
  const photoTex = new THREE.CanvasTexture(photoCanvas);
  photoTex.colorSpace = THREE.SRGBColorSpace;
  guardPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(0.17, 0.2),
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.8 })
  );
  guardPhoto.rotation.y = -Math.PI / 2;
  guardPhoto.rotation.x = -0.5; // leaned back against the glass
  guardPhoto.position.set(5.34, 0.44, cz + 0.1); // parked below the sill
  guardPhoto.visible = false;
  renderer.scene.add(guardPhoto);
}

let photoAnim = null; // { t, dir: 1 up | -1 down }

function showGuardPhoto() {
  if (!guardPhoto) return;
  guardPhoto.visible = true;
  photoAnim = { t: 0, dir: 1 };
  setTimeout(() => { photoAnim = { t: 0, dir: -1 }; }, 7000);
  setTimeout(() => { guardPhoto.visible = false; }, 7900);
}

function updateGuardPhoto(delta) {
  if (!photoAnim || !guardPhoto) return;
  photoAnim.t += delta;
  const p = Math.min(1, photoAnim.t / 0.8);
  const e = 1 - Math.pow(1 - p, 3);
  const lo = 0.44, hi = 0.70; // below sill → resting on it
  guardPhoto.position.y = photoAnim.dir > 0 ? lo + (hi - lo) * e : hi - (hi - lo) * e;
  if (p >= 1) photoAnim = null;
}

// ── X-ray machine (lobby checkpoint) ───────────────────
// A proper scanner: tunnel housing the Mac actually travels through,
// rubber curtains, a continuous belt, and a monitor showing the scan.
let xrayGlow = null;
let xraySurface = null;
{
  const cx = 1.8, cz = 4.2, beltY = 0.8;
  // hide the placeholder box (its collider stays)
  const placeholder = namedProps.get('scanner_box');
  if (placeholder) placeholder.visible = false;

  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x555e6c, roughness: 0.45, metalness: 0.5 });
  const shellDark = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.5, metalness: 0.45 });
  const liner = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.9 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.55, metalness: 0.2 });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // housing: side walls + top, tunnel open through z (opening 0.55w × 0.62h —
  // tall enough that the Mac clears it with margin)
  add(new THREE.BoxGeometry(0.24, 1.75, 0.9), shell, cx - 0.4, 0.875, cz);  // left wall
  add(new THREE.BoxGeometry(0.24, 1.75, 0.9), shell, cx + 0.4, 0.875, cz);  // right wall
  add(new THREE.BoxGeometry(1.04, 0.3, 0.9), shell, cx, 1.6, cz);            // top slab (1.45..1.75)
  add(new THREE.BoxGeometry(1.04, 0.5, 0.9), shellDark, cx, 0.28, cz);       // base under belt
  // tunnel liner (dark interior walls/ceiling)
  add(new THREE.BoxGeometry(0.02, 0.64, 0.88), liner, cx - 0.275, beltY + 0.33, cz);
  add(new THREE.BoxGeometry(0.02, 0.64, 0.88), liner, cx + 0.275, beltY + 0.33, cz);
  add(new THREE.BoxGeometry(0.56, 0.02, 0.88), liner, cx, beltY + 0.645, cz);
  // hazard stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.91),
    new THREE.MeshStandardMaterial({ color: 0xd9a626, roughness: 0.6 }));
  stripe.position.set(cx, 1.42, cz);
  g.add(stripe);

  // continuous belt strip over the feed tables + through the tunnel
  add(new THREE.BoxGeometry(0.52, 0.045, 3.15), beltMat, cx, beltY - 0.02, cz);
  // belt side rails
  add(new THREE.BoxGeometry(0.05, 0.1, 3.15), shellDark, cx - 0.285, beltY, cz);
  add(new THREE.BoxGeometry(0.05, 0.1, 3.15), shellDark, cx + 0.285, beltY, cz);
  // end rollers
  const rollerGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 12);
  for (const rz of [cz - 1.56, cz + 1.56]) {
    const roller = new THREE.Mesh(rollerGeo, shellDark);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(cx, beltY - 0.02, rz);
    g.add(roller);
  }

  // rubber curtains at both tunnel mouths
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c22, roughness: 0.85, side: THREE.DoubleSide,
  });
  for (const mz of [cz - 0.44, cz + 0.44]) {
    for (let i = 0; i < 5; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.58), curtainMat);
      strip.position.set(cx - 0.22 + i * 0.11, beltY + 0.34, mz);
      strip.rotation.y = (i % 2 ? 0.06 : -0.06);
      g.add(strip);
    }
  }

  // red scan lamp inside the tunnel (lights during the scan phase)
  xrayGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2211, emissiveIntensity: 0 })
  );
  xrayGlow.rotation.x = Math.PI / 2;
  xrayGlow.position.set(cx, beltY + 0.63, cz);
  g.add(xrayGlow);

  // operator monitor on top, angled toward the approach (north side)
  xraySurface = new ScreenSurface({ width: 0.52, height: 0.36 });
  xraySurface.mesh.position.set(cx, 1.98, cz - 0.18);
  // yaw π to face the approach (north), then tilt the top back a touch
  xraySurface.mesh.rotation.set(0.35, Math.PI, 0);
  g.add(xraySurface.mesh);
  const monArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), shellDark);
  monArm.position.set(cx, 1.84, cz - 0.08);
  g.add(monArm);
  const monBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.4, 0.05), shellDark);
  monBack.position.set(cx, 1.98, cz - 0.145);
  monBack.rotation.x = 0.35;
  g.add(monBack);

  renderer.scene.add(g);
}

/**
 * X-ray monitor content.
 * mode: 'ready' | 'scan' | 'clear'; progress 0..1 sweeps the scanline.
 */
function drawXray(mode, progress = 0) {
  if (!xraySurface) return;
  xraySurface.draw((ctx, w, h) => {
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace';

    if (mode === 'ready') {
      ctx.fillStyle = 'rgba(120,180,220,0.7)';
      ctx.fillText('X-RAY · READY', 12, 20);
      ctx.strokeStyle = 'rgba(120,180,220,0.25)';
      ctx.strokeRect(10, 30, w - 20, h - 44);
      return;
    }

    // X-ray view of the Macintosh: translucent shell, tube, coil — and the
    // drives, almost swallowed by the coil's shadow (97.2%, as promised)
    const mx = w * 0.5, my = h * 0.58;
    ctx.strokeStyle = 'rgba(90,190,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 52, my - 52, 104, 96);                    // case shell
    ctx.strokeStyle = 'rgba(90,190,255,0.5)';
    ctx.strokeRect(mx - 36, my - 40, 72, 44);                     // CRT frame
    // tube funnel
    ctx.beginPath();
    ctx.moveTo(mx - 26, my - 32); ctx.lineTo(mx + 26, my - 32);
    ctx.lineTo(mx + 8, my + 6); ctx.lineTo(mx - 8, my + 6);
    ctx.closePath();
    ctx.stroke();
    // deflection coil — dense orange mass
    ctx.fillStyle = 'rgba(255,150,60,0.85)';
    ctx.beginPath(); ctx.ellipse(mx, my + 10, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,80,0.9)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(mx, my + 10, 20 + i * 4, 12 + i * 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // the drives — faint slabs hiding in the coil's shadow
    ctx.fillStyle = 'rgba(255,120,50,0.28)';
    ctx.fillRect(mx - 13, my + 24, 9, 12);
    ctx.fillRect(mx - 2, my + 24, 9, 12);
    ctx.fillRect(mx + 9, my + 24, 9, 12);

    if (mode === 'scan') {
      // sweeping scanline
      const sx = 10 + (w - 20) * progress;
      ctx.strokeStyle = 'rgba(255,60,40,0.9)';
      ctx.beginPath(); ctx.moveTo(sx, 8); ctx.lineTo(sx, h - 8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,90,0.9)';
      ctx.fillText('SCANNING…', 12, 20);
    } else {
      ctx.fillStyle = 'rgba(90,230,130,0.95)';
      ctx.fillText('CLEAR ✓', 12, 20);
    }
  });
}

// ── Wall boards: pinned notices (break room) + scribbles (office) ──
function makeBoardPlane(draw, w, h, px, py, pz, rotY) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = Math.round(320 * (h / w));
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Unlit + slightly dim canvas: boards must stay readable regardless of
  // how hot the nearby room light is.
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  plane.position.set(px, py, pz);
  plane.rotation.y = rotY;
  renderer.scene.add(plane);
}

// Break room notice board — the memos the player can read up close
makeBoardPlane((ctx, w, h) => {
  ctx.fillStyle = '#b9b4a8';
  ctx.fillRect(0, 0, w, h);
  const note = (x, y, nw, nh, bg, lines, tilt = 0) => {
    ctx.save();
    ctx.translate(x + nw / 2, y + nh / 2);
    ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-nw / 2 + 2, -nh / 2 + 3, nw, nh);
    ctx.fillStyle = bg;
    ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
    ctx.fillStyle = '#c33';
    ctx.beginPath(); ctx.arc(0, -nh / 2 + 5, 3, 0, Math.PI * 2); ctx.fill(); // pin
    ctx.fillStyle = '#333';
    lines.forEach((ln, i) => {
      ctx.font = i === 0 ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.fillText(ln, -nw / 2 + 6, -nh / 2 + 20 + i * 13);
    });
    ctx.restore();
  };
  note(14, 16, 130, 88, '#dcd9d0', ['공지: 4분기 예산 절감', '- 유휴 장비 폐기', '- 전시품 포함', '  (매킨토시 外 3건)'], -0.02);
  note(160, 22, 118, 70, '#dcd9d0', ['회식 (금) 19:00', '※ 회비 각자 부담'], 0.03);
  note(190, 106, 100, 60, '#d9c65e', ['커피머신 언제', '고쳐줘요 ㅠㅠ', '- 민'], -0.05);
  note(30, 118, 120, 52, '#b3c7da', ['보안점검 매주 수요일', '- 보안운영팀'], 0.02);
}, 1.42, 0.92, 7, 1.72, -20.395, 0);

// Restricted-wing door sign — red "no entry" until access is granted in Ch2
const restrictedSign = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (granted) => {
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = granted ? '#2f9e44' : '#b93226';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);
    ctx.textAlign = 'center';
    ctx.fillStyle = granted ? '#4fd482' : '#f0503c';
    ctx.font = 'bold 46px "Noto Sans KR", sans-serif';
    ctx.fillText(granted ? '출입 허가' : '제한구역 · 출입 불가', 256, 68);
    ctx.font = '26px sans-serif';
    ctx.fillText(granted ? 'ACCESS GRANTED' : 'RESTRICTED — NO ENTRY', 256, 120);
    tex.needsUpdate = true;
  };
  draw(false);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.47),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  // above the office→restricted-wing door (north wall inner face)
  mesh.position.set(0, 2.88, -21.88);
  renderer.scene.add(mesh);
  return { draw };
})();


function drawFeedWlb1() {
  const s = screens.get('feed_wlb1');
  if (!s) return;
  s.draw((ctx, w, h) => {
    // A cached rollout of a flat 2D world — WLB1's canvas look
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#1c2a45');
    sky.addColorStop(1, '#3a3a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.7);
    ctx.fillStyle = '#22252e';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Tiny figure
    ctx.fillStyle = '#e8d9c4';
    ctx.fillRect(w * 0.42, h * 0.56, 8, 8);           // head
    ctx.fillStyle = '#8a4a3a';
    ctx.fillRect(w * 0.42, h * 0.56 + 9, 8, 14);      // body
    // Oracle orb
    ctx.beginPath();
    ctx.arc(w * 0.6, h * 0.4, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140,190,255,0.8)';
    ctx.fill();
    // HUD
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('FEED 03 — ROLLOUT (TERMINATED)', 10, 18);
    ctx.fillStyle = 'rgba(255,120,120,0.8)';
    ctx.fillText('● CACHED', w - 80, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('91.5573%', w - 80, h - 10);
  });
}

function drawFeedWlb2() {
  const s = screens.get('feed_wlb2');
  if (!s) return;
  s.draw((ctx, w, h) => {
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    // CCTV corridor wireframe
    ctx.strokeStyle = 'rgba(140,160,190,0.5)';
    ctx.lineWidth = 1.5;
    const cx = w / 2, cy = h / 2;
    ctx.strokeRect(cx - w * 0.09, cy - h * 0.16, w * 0.18, h * 0.36);
    for (const k of [0.9, 0.7, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5 * k, cy - h * 0.5 * k + h * 0.04);
      ctx.lineTo(cx - w * 0.09, cy - h * 0.16);
      ctx.moveTo(cx + w * 0.5 * k, cy - h * 0.5 * k + h * 0.04);
      ctx.lineTo(cx + w * 0.09, cy - h * 0.16);
      ctx.moveTo(cx - w * 0.5 * k, cy + h * 0.5 * k);
      ctx.lineTo(cx - w * 0.09, cy + h * 0.2);
      ctx.moveTo(cx + w * 0.5 * k, cy + h * 0.5 * k);
      ctx.lineTo(cx + w * 0.09, cy + h * 0.2);
      ctx.stroke();
    }
    // Subject dot walking the corridor
    ctx.fillStyle = 'rgba(220,230,255,0.85)';
    ctx.fillRect(cx - 3, cy + h * 0.05, 6, 12);
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('FEED 07 — AVOLC-9.1 (RL)', 10, 18);
    ctx.fillStyle = 'rgba(255,80,80,0.9)';
    ctx.fillText('● REC', w - 60, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('ERA 9 · RUN 31847', 10, h - 10);
  });
}

function drawFeedDead() {
  const s = screens.get('feed_dead');
  if (!s) return;
  s.draw((ctx, w, h) => {
    ctx.fillStyle = '#07090c';
    ctx.fillRect(0, 0, w, h);
    // static noise
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.09})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('NO SIGNAL', w / 2 - 34, h / 2);
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText('FEED 01 · 02 · 04 · 05 — DECOMMISSIONED', w / 2 - 130, h / 2 + 22);
  });
}

function drawComputeDash(spiked) {
  const s = screens.get('compute_dash');
  if (!s) return;
  const bars = spiked ? [0.98, 0.97, 0.99, 0.98] : [0.24, 0.22, 0.26, 0.23];
  s.draw((ctx, w, h) => {
    ctx.fillStyle = '#0a1016';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(160,200,230,0.6)';
    ctx.fillText('COMPUTE — CLUSTER C-AV91', 12, 20);
    const bw = (w - 60) / bars.length;
    bars.forEach((v, i) => {
      const bh = (h - 70) * v;
      ctx.fillStyle = spiked ? 'rgba(240,110,80,0.85)' : 'rgba(110,190,240,0.7)';
      ctx.fillRect(20 + i * (bw + 8), h - 30 - bh, bw, bh);
    });
    ctx.fillStyle = spiked ? 'rgba(255,140,110,0.95)' : 'rgba(160,200,230,0.5)';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(spiked ? '340%  ▲' : '~24%', w - 100, 26);
  });
}

function drawLoadMeter(level, label) {
  // Server-hall environment dashboard — temperature/humidity matter more to
  // this room than raw load, so the load bar shares the panel with env tiles.
  const s = screens.get('load_meter');
  if (!s) return;
  const jit = (base, amp, digits = 1) => (base + (Math.random() * 2 - 1) * amp).toFixed(digits);
  s.draw((ctx, w, h) => {
    ctx.fillStyle = '#08111a';
    ctx.fillRect(0, 0, w, h);

    // header
    ctx.fillStyle = 'rgba(150,195,230,0.85)';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('B4 SERVER HALL — ENVIRONMENT', 14, 24);
    ctx.fillStyle = 'rgba(110,220,140,0.8)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('● LIVE', w - 14, 24);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(150,195,230,0.25)';
    ctx.beginPath(); ctx.moveTo(12, 32); ctx.lineTo(w - 12, 32); ctx.stroke();

    // 2×2 env tiles
    const tiles = [
      { k: 'TEMP · COLD AISLE', v: `${jit(21.8, 0.3)}°C`, ok: true },
      { k: 'TEMP · HOT AISLE',  v: `${jit(34.6, 0.5)}°C`, ok: true },
      { k: 'HUMIDITY',          v: `${jit(45.1, 0.8)}%`,  ok: true },
      { k: 'AIRFLOW / CRAC',    v: `${jit(82, 2, 0)}%`,   ok: true },
    ];
    const tw = (w - 36) / 2, th = 56, ty0 = 42;
    tiles.forEach((t, i) => {
      const tx = 14 + (i % 2) * (tw + 8);
      const ty = ty0 + Math.floor(i / 2) * (th + 8);
      ctx.fillStyle = 'rgba(30,48,66,0.55)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = 'rgba(150,195,230,0.55)';
      ctx.font = '11px monospace';
      ctx.fillText(t.k, tx + 10, ty + 18);
      ctx.fillStyle = t.ok ? 'rgba(170,235,190,0.95)' : 'rgba(240,150,110,0.95)';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(t.v, tx + 10, ty + 44);
    });

    // power + load strip
    const yy = ty0 + th * 2 + 24;
    ctx.fillStyle = 'rgba(150,195,230,0.55)';
    ctx.font = '11px monospace';
    ctx.fillText('POWER DRAW', 14, yy);
    ctx.fillStyle = 'rgba(220,235,245,0.9)';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${jit(18.4, 0.2)} MW`, 14, yy + 20);

    ctx.fillStyle = 'rgba(150,195,230,0.55)';
    ctx.font = '11px monospace';
    ctx.fillText('RACK LOAD', w / 2 + 4, yy);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(w / 2 + 4, yy + 6, w / 2 - 20, 16);
    ctx.fillStyle = level > 0.85 ? 'rgba(240,110,80,0.9)' : 'rgba(110,220,140,0.8)';
    ctx.fillRect(w / 2 + 6, yy + 8, (w / 2 - 24) * level, 12);
    ctx.fillStyle = 'rgba(220,235,245,0.85)';
    ctx.font = '13px monospace';
    ctx.fillText(label || `${Math.round(level * 100)}%`, w / 2 + 4, yy + 38);
  });
}

function drawFloorIndicator(text) {
  const s2 = screens.get('floor_indicator');
  if (!s2) return;
  s2.draw((ctx, w, h) => {
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,180,80,0.95)';
    ctx.font = `bold ${Math.round(h * 0.62)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

drawFeedWlb1();
drawFeedWlb2();
drawFeedDead();
drawComputeDash(false);
drawLoadMeter(0.31);
drawFloorIndicator('B4');
drawXray('ready');

// ── Narrative helpers ──────────────────────────────────

function narratorLine(scriptId) {
  const lang = getLanguage();
  const line = getLine(scriptId, lang, gameState);
  if (!line) return;

  narrator.say(line.text, { mood: line.mood, id: line.id, delay: line.delay || 0 });

  if (line.followUp) {
    const f1 = getLine(line.followUp, lang, gameState);
    if (f1) {
      narrator.say(f1.text, { mood: f1.mood, id: f1.id, delay: f1.delay || 2000 });
      if (f1.followUp) {
        const f2 = getLine(f1.followUp, lang, gameState);
        if (f2) narrator.say(f2.text, { mood: f2.mood, id: f2.id, delay: f2.delay || 2000 });
      }
    }
  }
}

// Diegetic speech toasts (ASI earbuds / guard through the window)
const speechContainer = document.getElementById('speech-toasts');

function speechLine(speechId, { duration = null } = {}) {
  const entry = SPEECH[speechId];
  if (!entry) return 0;
  const lang = getLanguage();
  const text = entry.text[lang] || entry.text.ko;

  const el = document.createElement('div');
  el.className = `speech-line speech-${entry.speaker}`;
  if (entry.speaker === 'guard') {
    el.setAttribute('data-speaker', lang === 'ko' ? '배 반장' : 'GUARD BAE');
  }
  el.textContent = text;
  speechContainer.appendChild(el);

  const hold = duration || Math.max(3800, Math.min(9000, text.length * 90));
  setTimeout(() => {
    // fade AND collapse smoothly — snapping the height made the toasts
    // above/below jump when a line in the stack disappeared
    el.style.height = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';
    void el.offsetWidth; // reflow so the height transition starts from here
    el.classList.add('speech-gone');
    el.style.height = '0px';
    el.style.marginTop = '-0.4em'; // swallow the flex gap too
    el.style.paddingTop = '0px';
    el.style.paddingBottom = '0px';
    setTimeout(() => el.remove(), 1000);
  }, hold);
  return hold;
}

/** Play a timed sequence of speech toasts; returns total duration. */
function speechSequence(ids, gapMs = 900, done = null) {
  let at = 0;
  for (const id of ids) {
    const entry = SPEECH[id];
    const lang = getLanguage();
    const text = entry ? (entry.text[lang] || entry.text.ko) : '';
    const hold = Math.max(3800, Math.min(9000, text.length * 90));
    setTimeout(() => speechLine(id), at);
    at += hold + gapMs;
  }
  sequenceBusy++;
  setTimeout(() => {
    sequenceBusy = Math.max(0, sequenceBusy - 1);
    if (done) done();
  }, at);
  return at;
}

function setFlag(flag) {
  return gameState.setFlag(flag);
}

function has(flag) {
  return gameState.hasFlag(flag);
}

// ── Chapter management ─────────────────────────────────

function startChapter(n, { silentCard = false } = {}) {
  // never change chapters underneath an open screen (laptop OS, phone, ...)
  // Full close (NOT skipRelock): skipRelock left gameState in the overlay's
  // state, and the title card then "restored" that dead state — the game
  // hung unlocked with the cursor visible (ch2 "제안" card bug).
  if (om.isOpen) om.close();
  gameState.chapter = n;
  const ch = getChapter(n);
  applyChapterBaseline(n);
  save.save(gameState, items);

  const begin = () => {
    teleportTo(ch.start);
    if (n === 4) {
      renderer.setFogColor(0x141008);
      audio.setAmbiance(AudioSystem.getRoomAmbianceType('APT_HALL'));
    }
  };

  if (silentCard) {
    begin();
    onChapterBegun(n);
  } else {
    titleCards.show(ch.labelKey, ch.nameKey, begin, () => onChapterBegun(n));
  }
}

function onChapterBegun(n) {
  if (n === 2) {
    setTimeout(() => narratorLine('ch2_start'), 800);
  }
  if (n === 3) {
    // Ch3 opens at the standing backup console
    setTimeout(() => narratorLine('ch3_begin'), 900);
  }
  // Ch1 & Ch4 speak through their arrive triggers
}

function teleportTo(start) {
  cameraFocus.cancel();
  renderer.camera.position.set(start.position[0], start.position[1], start.position[2]);
  renderer.camera.rotation.set(start.rotation[0], start.rotation[1], start.rotation[2]);
  renderer.camera.rotation.order = 'YXZ';
  if (touchControls) touchControls.syncFromCamera();
}

/**
 * Put the world into the canonical state for the START of chapter n.
 * (Saves are chapter-granular: resume = chapter start.)
 */
function applyChapterBaseline(n) {
  if (n >= 2) {
    ['ch1_report_done', 'spike_seen', 'timeskip1_done', 'contact1_done', 'badge_done'].forEach(f => gameState.flags.add(f));
    drawComputeDash(true);
    unlockBadgeGate();
  }
  if (n >= 3) {
    ['nego_done', 'wallet', 'earbuds_accepted', 'report2_done', 'decommission', 'backup_authorized']
      .forEach(f => gameState.flags.add(f));
    unlockRestrictedDoor();
    items.add('earbuds', { silent: true });
    phone.showBadge();
    if (!gameState.walletBalance) gameState.walletBalance = 3742000;
    phone.setWallet(gameState.walletBalance);
  }
  if (guardFigure) {
    guardFigure.userData.present = (n === 3);
    guardFigure.userData.setPresent(n === 3); // night shift behind the glass
  }
  setNightShutter(n === 3 && !gameState.hasFlag('signed'));
  if (n >= 4) {
    ['copy_done', 'mac_vessel', 'guard_chat_done', 'scan_done', 'signed'].forEach(f => gameState.flags.add(f));
    items.add('mac_case', { silent: true });
    items.remove('drives');
  }
  if (gameState.flags.has('mac_vessel')) setPropVisible('archive_mac', false);
  // Montage props start hidden; shown by montage progression
  setPropVisible('gpu_boxes', has('montage1') && !has('montage2'));
  setPropVisible('home_server', has('montage2'));
  if (n === 1) phone.showBadge(); // phone exists from the start (the loan buzz)
}

/** Find a door built for roomId/wall (checks both sides of shared walls). */
function findWorldDoor(roomId, wall) {
  const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };
  const NEIGHBOR_HINTS = {
    'EXIT_VESTIBULE_south': ['ELEVATOR', 'north'],
    'ELEVATOR_north': ['EXIT_VESTIBULE', 'south'],
  };
  let door = doorSystem.doors.find(dd => dd.roomId === roomId && dd.wallName === wall);
  if (!door) {
    const hint = NEIGHBOR_HINTS[`${roomId}_${wall}`];
    if (hint) door = doorSystem.doors.find(dd => dd.roomId === hint[0] && dd.wallName === hint[1]);
  }
  return door || null;
}

/** Open a door by room/wall, removing its collider + interactable. */
function openWorldDoor(roomId, wall) {
  const door = findWorldDoor(roomId, wall);
  if (!door || door.opened || door.animating) return false;
  if (door.colliderMesh) {
    const ci = player.colliders.indexOf(door.colliderMesh);
    if (ci >= 0) player.colliders.splice(ci, 1);
  }
  doorSystem.openDoor(door);
  audio.playDoorOpen();
  return true;
}

/** Close a door and restore its collider to the player's list. */
function closeWorldDoor(roomId, wall) {
  const door = findWorldDoor(roomId, wall);
  if (!door || !door.opened) return false;
  doorSystem.closeDoor(door);
  // collider is rebuilt by the door system when the animation finishes —
  // register it once it exists
  const waitForCollider = setInterval(() => {
    if (door.colliderMesh) {
      clearInterval(waitForCollider);
      if (!player.colliders.includes(door.colliderMesh)) {
        player.colliders.push(door.colliderMesh);
      }
    }
  }, 200);
  audio.playDoorOpen();
  return true;
}

let doorUnlocked = false;
function unlockRestrictedDoor() {
  if (doorUnlocked) return;
  doorUnlocked = true;
  restrictedSign.draw(true);
  mapBuilder.unlockDoor('OBSERVATION_OFFICE', 'north', player.colliders);
  const newDoor = mapBuilder.interactables[mapBuilder.interactables.length - 1];
  if (newDoor && newDoor.type === 'door') player.interactables.push(newDoor);
}

// The badge gate is now a pair of waist-high glass flaps between the
// pedestals (see the assembly further down). Once authorized, they retract
// automatically when the player approaches — from either side.
let gateAuthTime = 0;
function unlockBadgeGate() {
  gateAuthTime = 0;
}

function setPropVisible(propId, visible) {
  const mesh = namedProps.get(propId);
  if (mesh) mesh.visible = visible;
}

// ── Wire UI / menus ────────────────────────────────────

ui.onStart = () => {
  save.clear();
  startFreshRun();
};

ui.onContinue = () => {
  if (save.hasSave) {
    save.restore(gameState);
    beginPlay(() => startChapter(gameState.chapter, { silentCard: false }));
  } else {
    startFreshRun();
  }
};

function startFreshRun() {
  beginPlay(() => {
    gameState.chapter = 1;
    applyChapterBaseline(1);
    teleportTo(getChapter(1).start);
    titleCards.show('ch1Label', 'ch1Name', () => teleportTo(getChapter(1).start), () => {
      // the cab doors slide open — walk out to begin
      setTimeout(() => openWorldDoor('EXIT_VESTIBULE', 'south'), 700);
      setTimeout(() => narratorLine('ch1_arrive'), 1400);
    });
  });
}

function beginPlay(afterEnter) {
  if (isMobile) {
    // Resume AudioContext to satisfy autoplay policy
    if (window.AudioContext || window.webkitAudioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().then(() => ctx.close());
    }
    gameState.set(State.PLAYING);
    audio.init();
    audio.setAmbiance(AudioSystem.getRoomAmbianceType(gameState.currentRoom));
    if (touchControls) touchControls.show();
    if (afterEnter) afterEnter();
  } else {
    gameState.set(State.CLICK_TO_PLAY);
    pendingEnter = afterEnter;
  }
}

let pendingEnter = null;

document.getElementById('click-to-play').addEventListener('click', () => {
  if (!gameState.is(State.CLICK_TO_PLAY)) return;
  player.lock();
});

player.onLock = () => {
  if (gameState.is(State.CLICK_TO_PLAY) || gameState.is(State.PAUSED)) {
    gameState.set(State.PLAYING);
    audio.init();
    audio.setAmbiance(AudioSystem.getRoomAmbianceType(gameState.currentRoom));
    if (pendingEnter) {
      const fn = pendingEnter;
      pendingEnter = null;
      fn();
    }
  }
};

player.onUnlock = () => {
  if (gameState.is(State.PLAYING) && !om.suppressUnlockPause && !titleCards.showing) {
    pauseGame();
  }
};

function pauseGame() {
  if (!gameState.is(State.PLAYING)) return;
  gameState.set(State.PAUSED);
  if (touchControls) touchControls.hide();
}

ui.onResume = () => {
  if (isMobile) {
    gameState.set(State.PLAYING);
    if (touchControls) touchControls.show();
  } else {
    gameState.set(State.CLICK_TO_PLAY);
  }
};

ui.onRestart = () => {
  if (confirm(t('restartConfirm'))) {
    save.clear();
    location.reload();
  }
};

ui.onReset = () => {
  if (confirm(t('resetConfirm'))) {
    save.clear();
    try { localStorage.removeItem('wlb3_memory'); } catch (e) { /* ignore */ }
    location.reload();
  }
};

ui.onLanguageChange = () => {
  mapBuilder.setLang(getLanguage());
};

phone.audioCue = () => { if (audio.playDoorClose) { /* soft cue */ } };

// ── Interaction dispatch ───────────────────────────────

let interactCooldown = 0;
// >0 while a scripted interaction beat (speech sequence, focus hold) is still
// playing — blocks re-interaction and hides the interact prompt meanwhile.
let sequenceBusy = 0;

function doInteract() {
  if (!gameState.is(State.PLAYING) || interactCooldown > 0 || cameraFocus.transiting) return;
  if (sequenceBusy > 0 || cameraFocus.active || beltRun) return;
  const target = player.checkInteraction();
  if (!target) return;

  // Doors
  if (target.type === 'door' && target.door) {
    // The lobby's south door is the way out — it refuses until it's actually
    // time to leave (Ch3, release form signed). Opening from the vestibule
    // side (arriving for work) is always allowed.
    if (target.door.id === 'LOBBY_south'
        && renderer.camera.position.z < 10
        && !(gameState.chapter >= 3 && has('signed'))) {
      interactCooldown = 0.6;
      narratorLine('door_not_yet');
      return;
    }
    interactCooldown = 1;
    const doorCollider = target.door.colliderMesh;
    if (doorCollider) {
      const ci = player.colliders.indexOf(doorCollider);
      if (ci >= 0) player.colliders.splice(ci, 1);
    }
    doorSystem.openDoor(target.door);
    audio.playDoorOpen();
    return;
  }

  interactCooldown = 0.6;
  handleProp(target);
}

/** Focus the camera on the target (if it has focus data), then run fn. */
let focusDisconnected = false;

function withFocus(target, fn) {
  if (target.focus && target.focus.camera) {
    // Keep the pointer LOCKED but detach mouse-look so it can't fight the
    // dolly. (Unlocking here would strand the player after no-overlay beats —
    // relocking needs a user gesture.) Overlays unlock separately in om.open.
    if (!isMobile && player.isLocked && !focusDisconnected) {
      player.controls.disconnect();
      focusDisconnected = true;
    }
    const cam = new THREE.Vector3(...target.focus.camera);
    const look = new THREE.Vector3(...target.focus.lookAt);
    cameraFocus.focusOn(cam, look, fn);
  } else {
    fn();
  }
}

/** Release camera focus (and restore mouse-look) when a beat/overlay ends. */
function releaseFocus() {
  cameraFocus.release(() => {
    if (focusDisconnected) {
      focusDisconnected = false;
      player.controls.connect();
      // disconnect() also detached the pointerlockchange listener — resync
      player.controls.isLocked = !!document.pointerLockElement;
      if (!isMobile && !player.controls.isLocked && gameState.is(State.PLAYING) && !om.isOpen && !titleCards.showing) {
        gameState.set(State.CLICK_TO_PLAY);
      }
    }
  });
}

function handleProp(target) {
  const id = target.propId;
  if (!id) return;

  switch (id) {

    // ── Ch1 ──
    case 'badge_gate':
      if (!has('badge_done')) {
        gateAuthTime = performance.now() + 1100; // let the tap animation land first
        setFlag('badge_done');
        gateEntryUntil = performance.now() + 8000;
        playBadgeTap();
        setTimeout(() => narratorLine('badge_ok'), 700);
      } else if (performance.now() >= gateEntryUntil) {
        // re-entry from the lobby side: tap again
        playBadgeTap();
        gateEntryUntil = performance.now() + 8000;
      } else {
        narratorLine('badge_again');
      }
      break;

    case 'elevator_button':
      if (gameState.chapter === 3 && has('signed') && setFlag('elevator_open')) {
        narratorLine('elevator_called');
        drawFloorIndicator('▲');
        setTimeout(() => { drawFloorIndicator('B4');
drawXray('ready'); openWorldDoor('EXIT_VESTIBULE', 'south'); }, 2200);
      } else if (!has('signed')) {
        narratorLine(gameState.chapter === 3 ? 'elevator_button_ch3' : 'elevator_button_early');
      } else {
        narratorLine('elevator_open_already');
      }
      break;

    case 'scanner_belt':
      if (gameState.chapter === 3 && items.has('mac_case') && !has('mac_on_belt')) {
        withFocus(target, () => {
          setFlag('mac_on_belt');
          items.remove('mac_case');
          startBeltRun();
          narratorLine('belt_put');
          setTimeout(releaseFocus, 2600);
        });
      } else if (gameState.chapter === 3 && !has('mac_on_belt')) {
        narratorLine('belt_no_item');
      } else if (!has('mac_on_belt')) {
        narratorLine('scanner_idle');
      }
      break;

    case 'scanner_out':
      if (has('mac_scanned') && !has('mac_retrieved')) {
        setFlag('mac_retrieved');
        items.add('mac_case');
        if (beltMac) beltMac.visible = false;
        narratorLine('belt_retrieve');
        if (has('earbuds_accepted')) setTimeout(() => speechLine('guard_after_scan'), 4500);
      } else if (!has('mac_retrieved')) {
        narratorLine('scanner_out_empty');
      }
      break;

    case 'coffee':
      narratorLine('coffee_use');
      break;

    case 'compute_dash':
      if (!has('spike_happened')) {
        narratorLine('dash_normal');
        break;
      }
      openDocumentFocused(target, 'compute_dash', () => {
        if (setFlag('spike_seen')) {
          narratorLine('compute_dash_read');
          setTimeout(() => doTimeskip1(), 9000);
        }
      });
      break;

    case 'feed_wlb1':
    case 'feed_wlb2':
    case 'sticky_note':
    case 'lobby_poster':
    case 'security_poster':
    case 'notice_board':
    case 'mail_pile':
      openDocumentFocused(target, id, () => {
        if (id === 'feed_wlb1') narratorLine('feed_wlb1_read');
        if (id === 'feed_wlb2') narratorLine('feed_wlb2_read');
        if (id === 'sticky_note') narratorLine('sticky_note_read');
        if (id === 'notice_board') narratorLine('notice_read');
        if (id === 'mail_pile') narratorLine('mail_read');
      });
      break;

    case 'report_terminal':
      handleReportTerminal(target);
      break;

    // ── Ch2/3 ──
    case 'server_glass':
      narratorLine('server_glass_denied');
      break;

    case 'subject_rack':
      withFocus(target, () => {
        narratorLine('subject_rack_look');
        setTimeout(releaseFocus, 2600);
      });
      break;

    case 'drive_bay':
      if (gameState.chapter === 2 && has('backup_authorized') && !has('copy_done')) {
        narratorLine('drive_bay_prompt');
        setTimeout(() => startChapter(3), 4200);
      } else if (gameState.chapter === 3 && has('drives_ejected') && !has('copy_done')) {
        // pull the ejected cartridges
        setFlag('copy_done');
        bayDrives.forEach(c => { c.visible = false; });
        items.add('drives');
        drawLoadMeter(0.05, 'IDLE');
        narratorLine('copy_done');
        setTimeout(() => speechLine('asi_after_copy'), 5500);
      } else if (gameState.chapter === 3 && !has('backup_started')) {
        setFlag('backup_started');
        withFocus(target, () => {
          narratorLine('drives_inserted');
          animateBayDrives('insert', () => {
            terminalOverlay.start('backup_1', {
              title: 'REVAN BACKUP // AVOLC-9.1',
              onEnd: () => {
                releaseFocus();
                animateBayDrives('eject', () => {
                  setFlag('drives_ejected');
                  bayDrives.forEach(c => { c.userData.led.material.emissiveIntensity = 0; });
                });
              },
            });
          });
        });
      } else if (!has('copy_done')) {
        narratorLine('drive_bay_early');
      }
      break;

    case 'archive_mac':
      if (items.has('drives') && !has('mac_vessel')) {
        withFocus(target, () => {
          setFlag('mac_vessel');
          items.remove('drives');
          items.add('mac_case');
          narratorLine('mac_hidden');
          setTimeout(() => speechLine('asi_mac_1'), 3200);
          setTimeout(() => speechLine('asi_after_mac'), 8500);
          setTimeout(() => {
            releaseFocus();
            // the box is in your arms now — it leaves the table
            setPropVisible('archive_mac', false);
          }, 2800);
        });
      } else {
        withFocus(target, () => {
          narratorLine('archive_mac_look');
          setTimeout(releaseFocus, 3000);
        });
      }
      break;

    case 'lore_chatml':
      openDocumentFocused(target, 'lore_chatml', () => narratorLine('lore_chatml_read'));
      break;

    case 'guard_window':
      if (gameState.chapter === 3 && has('mac_vessel') && !has('guard_chat_done')) {
        withFocus(target, () => runGuardChat());
      } else if (!has('guard_chat_done')) {
        narratorLine('guard_window_early');
      } else {
        narratorLine('guard_window_after');
      }
      break;

    case 'disposal_form':
      if (gameState.chapter === 3 && has('scan_done') && !has('signed')) {
        withFocus(target, () => {
          monitorOverlay.openDocument('disposal_form', {
            onClose: () => startSignature(),
          });
        });
      } else if (gameState.chapter === 3 && has('mac_vessel') && !has('signed')) {
        narratorLine('form_need_scan');
      } else if (!has('signed')) {
        narratorLine('form_early');
      }
      break;

    // ── Ch4 ──
    case 'gpu_boxes':
      if (has('montage1') && !has('montage2')) {
        titleCards.show(null, 'skipNineDays', () => {
          setFlag('montage2');
          setPropVisible('gpu_boxes', false);
          setPropVisible('home_server', true);
        }, () => narratorLine('montage_rack'));
      }
      break;

    case 'home_server':
      if (has('montage2') && !has('montage3')) {
        titleCards.show(null, 'skipTwoWeeks', () => {
          setFlag('montage3');
        }, () => {
          narratorLine('montage_cooling');
          phone.receive('m_boss_ch4_1');
          setTimeout(() => phone.receive('m_boss_ch4_2'), 14000);
        });
      } else if (has('montage3') && !has('transferred')) {
        narratorLine('transfer_prompt');
      } else if (has('transferred')) {
        narratorLine('server_running');
      } else {
        narratorLine('rack_early');
      }
      break;

    case 'home_terminal':
      if (has('montage3') && items.has('mac_case') && !has('transferred')) {
        withFocus(target, () => {
          terminalOverlay.start('boot_1', {
            title: 'LIAM-HOME-01',
            onEnd: () => {
              setFlag('transferred');
              items.remove('mac_case');
              releaseFocus();
            },
          });
        });
      } else if (!has('montage3')) {
        narratorLine('home_terminal_early');
      }
      break;

    case 'ethernet_cable':
      if (has('transferred') && !has('plugged')) {
        startPlugIn(target);
      } else if (!has('plugged')) {
        narratorLine('cable_early');
      }
      break;

    default:
      break;
  }
}

function openDocumentFocused(target, docId, onClose) {
  withFocus(target, () => {
    monitorOverlay.openDocument(docId, {
      onClose: () => {
        releaseFocus();
        if (onClose) onClose();
      },
    });
  });
}

// ── Report terminal flow ───────────────────────────────

function pendingLaptopBeat() {
  const ch = gameState.chapter;
  if (ch === 1 && !has('ch1_report_done')) return 'report1';
  if (ch === 1 && has('timeskip1_done') && !has('contact1_done')) return 'contact1';
  if (ch === 2 && !has('nego_done')) return 'nego';
  if (ch === 2 && has('nego_done') && !has('report2_done')) return 'report2';
  return null;
}

function handleReportTerminal(target) {
  // The laptop is a full fake-macOS desktop; story beats launch from its apps.
  withFocus(target, () => {
    laptopOS.open({
      beat: pendingLaptopBeat(),
      onClose: () => releaseFocus(),
    });
  });
}

// Story beats launched from inside the laptop OS (camera already focused —
// the overlay manager swaps the OS for the beat overlay).
laptopOS.onReportSubmitted = (beat) => {
  releaseFocus();
  if (beat === 'report1') {
    setFlag('ch1_report_done');
    narratorLine('report1_sent');
    setTimeout(() => phone.receive('m_boss_reply1'), 2500);
    // The spike lands shortly after
    setTimeout(() => {
      setFlag('spike_happened');
      drawComputeDash(true);
      narratorLine('spike_noticed');
    }, 9000);
  } else if (beat === 'report2') {
    setFlag('report2_done');
    narratorLine('report2_sent');
    setTimeout(() => phone.receive('m_boss_reply2'), 3000);
    setTimeout(() => {
      setFlag('decommission');
      phone.receive('m_decommission');
      narratorLine('decommission_received');
    }, 10000);
    setTimeout(() => {
      phone.receive('m_boss_decomm');
      setFlag('backup_authorized');
      unlockRestrictedDoor();
      narratorLine('door_unlocked');
    }, 17000);
  }
};

// ASI terminal sessions now run INSIDE the laptop OS (a Terminal window
// that opens by itself). Events/flags reuse the terminal-overlay wiring.
laptopOS.onSessionEvent = (eventName) => terminalOverlay.onEvent(eventName);
laptopOS.onSessionFlag = (flag) => gameState.setFlag(flag);
laptopOS.onSessionEnd = (beat) => {
  if (beat === 'contact1') {
    setFlag('contact1_done');
    laptopOS.close();
    narratorLine('contact1_after');
    setTimeout(() => startChapter(2), 11000);
  } else if (beat === 'nego') {
    setFlag('nego_done');
    items.add('earbuds');
    laptopOS.close();
    narratorLine('wallet_installed');
    setTimeout(() => {
      narratorLine('negotiation_after');
      phone.receive('m_boss_anomaly_req');
    }, 9000);
  }
};

// ── Timeskip / minigames / scripted beats ──────────────

function doTimeskip1() {
  if (!setFlag('timeskip1_done')) return;
  titleCards.show(null, 'skipTwoDays', null, () => {
    narratorLine('timeskip_2days');
  });
}

function runGuardChat() {
  if (!setFlag('guard_chat_started')) return;
  narrator.clear();
  // photo slides out when guard_3 ("이것 좀 봐요") starts — mirror
  // speechSequence's hold formula for the first two lines
  const lang = getLanguage();
  let photoAt = 0;
  for (const id of ['guard_1', 'guard_2']) {
    const text = SPEECH[id].text[lang] || SPEECH[id].text.ko;
    photoAt += Math.max(3800, Math.min(9000, text.length * 90)) + 800;
  }
  setTimeout(() => showGuardPhoto(), photoAt + 400);

  speechSequence(['guard_1', 'guard_2', 'guard_3', 'guard_4'], 800, () => {
    setFlag('guard_chat_done');
    releaseFocus();
    narratorLine('guard_chat_done_line');
    setTimeout(() => speechLine('asi_to_checkpoint'), 7000);
  });
}

function startSignature() {
  const lang = getLanguage();
  narratorLine('sign_prompt');
  setTimeout(() => {
    holdOverlay.start({
      title: lang === 'ko' ? '반출 확인서 — 서명' : 'RELEASE FORM — SIGNATURE',
      buttonLabel: t('holdSign'),
      heat: false,
      duration: 2.2,
      decayWhenReleased: true,
      statusLines: {
        progress: lang === 'ko' ? '서명란: Liam' : 'Signature: Liam',
        done: lang === 'ko' ? '서명 완료' : 'Signed',
      },
      onDone: () => {
        releaseFocus();
        setFlag('signed');
        narratorLine('signed');
        setTimeout(() => {
          speechLine('guard_open_gate');
          setTimeout(() => openNightShutter(), 2500);
        }, 4500);
      },
    });
  }, 1200);
}

function startPlugIn(target) {
  gameState.hesitationSeconds = (performance.now() - hesitationStart) / 1000;
  const lang = getLanguage();
  withFocus(target, () => {
    holdOverlay.start({
      title: lang === 'ko' ? '이더넷 케이블' : 'ETHERNET CABLE',
      buttonLabel: lang === 'ko' ? '길게 눌러 연결' : 'Hold to connect',
      heat: false,
      duration: 1.4,
      decayWhenReleased: true,
      statusLines: {
        progress: lang === 'ko' ? 'WAN 포트 — 미연결' : 'WAN port — disconnected',
        done: lang === 'ko' ? '링크 감지됨' : 'Link detected',
      },
      onDone: () => {
        setFlag('plugged');
        releaseFocus();
        playCliffhanger();
      },
    });
  });
}

// ── Night security shutter (lobby exit lane) ───────────
// Down during the Ch3 night shift: nobody reaches the elevator without
// clearing the scanner AND signing the release. Guard Bae raises it after
// the signature.
let nightShutter = null;
let shutterAnim = null; // { t }
{
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x596170, roughness: 0.45, metalness: 0.55 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x2e333c, roughness: 0.6, metalness: 0.4 });
  // segmented roller shutter spanning the whole room width at world z 8.3
  for (let i = 0; i < 9; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.3, 0.1), mat);
    slat.position.set(1, 0.17 + i * 0.31, 8.3);
    g.add(slat);
    const gap = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.03, 0.11), seam);
    gap.position.set(1, 0.33 + i * 0.31, 8.3);
    g.add(gap);
  }
  // header box it rolls into
  const header = new THREE.Mesh(new THREE.BoxGeometry(9, 0.45, 0.3), seam);
  header.position.set(1, 3.0, 8.3);
  g.add(header);
  // warning sign on the shutter (canvas matches the plane's 4:1.25 aspect)
  const signCanvas2 = document.createElement('canvas');
  signCanvas2.width = 512; signCanvas2.height = 160;
  const sc2 = signCanvas2.getContext('2d');
  sc2.fillStyle = '#8a2f2a'; sc2.fillRect(0, 0, 512, 160);
  sc2.strokeStyle = 'rgba(242,232,220,0.7)'; sc2.lineWidth = 4;
  sc2.strokeRect(8, 8, 496, 144);
  sc2.fillStyle = '#f2e8dc'; sc2.textAlign = 'center';
  sc2.font = 'bold 52px sans-serif';
  sc2.fillText('야간 출입 통제', 256, 72);
  sc2.font = 'bold 30px sans-serif';
  sc2.fillStyle = 'rgba(242,232,220,0.85)';
  sc2.fillText('NIGHT LOCKDOWN', 256, 122);
  const signTex2 = new THREE.CanvasTexture(signCanvas2);
  signTex2.colorSpace = THREE.SRGBColorSpace;
  const shSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5),
    new THREE.MeshBasicMaterial({ map: signTex2, toneMapped: false }));
  shSign.position.set(-0.8, 1.5, 8.24);
  shSign.rotation.y = Math.PI;
  g.add(shSign);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.visible = false;
  renderer.scene.add(g);
  nightShutter = g;

  const col = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 0.3));
  col.position.set(1, 1.5, 8.3);
  col.visible = false;
  renderer.scene.add(col);
  nightShutter.userData.collider = col;
}

function setNightShutter(present) {
  if (!nightShutter) return;
  nightShutter.visible = present;
  nightShutter.position.y = 0;
  const col = nightShutter.userData.collider;
  const idx = player.colliders.indexOf(col);
  if (present && idx < 0) player.colliders.push(col);
  if (!present && idx >= 0) player.colliders.splice(idx, 1);
}

function openNightShutter() {
  if (!nightShutter || !nightShutter.visible) return;
  shutterAnim = { t: 0 };
  const col = nightShutter.userData.collider;
  const idx = player.colliders.indexOf(col);
  if (idx >= 0) player.colliders.splice(idx, 1);
  audio.playDoorOpen();
}

function updateNightShutter(delta) {
  if (!shutterAnim || !nightShutter) return;
  shutterAnim.t += delta;
  const p = Math.min(1, shutterAnim.t / 2.4);
  nightShutter.position.y = p * 2.75; // slats roll up into the header
  if (p >= 1) {
    shutterAnim = null;
    nightShutter.visible = false; // fully rolled away
  }
}

// ── Backup drive bay (server room) ─────────────────────
// A standing console with three physical drive slots: cartridges sit in a
// tray, slide INTO the slots when the session starts, and eject when done.
let bayDrives = [];      // 3 cartridge meshes
let bayAnim = null;      // { mode: 'insert'|'eject', t }
let baySurface = null;   // the eye-level monitor
const BAY = { x: 0.8, z: -34.4, slotY: 1.02, trayY: 0.55 };
{
  const g = new THREE.Group();
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x5a626e, roughness: 0.4, metalness: 0.6 });
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.5, metalness: 0.3 });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x323844, roughness: 0.5, metalness: 0.4 });

  // Hide the generic console prop — we build a proper standing terminal:
  // pedestal → keyboard shelf → eye-level monitor.
  const placeholder = namedProps.get('drive_bay');
  if (placeholder) placeholder.visible = false;
  const bayInteractable = propIndex.get('drive_bay');

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, 0.5), shellMat);
  pedestal.position.set(BAY.x, 0.525, BAY.z);
  g.add(pedestal);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.34), rimMat);
  shelf.position.set(BAY.x, 1.06, BAY.z + 0.2);
  shelf.rotation.x = 0.12;
  g.add(shelf);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7 }));
  kb.position.set(BAY.x, 1.09, BAY.z + 0.2);
  kb.rotation.x = 0.12;
  g.add(kb);
  // monitor neck + eye-level screen (faces the operator standing south of it)
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), shellMat);
  neck.position.set(BAY.x, 1.24, BAY.z - 0.24);
  g.add(neck);
  const monShell = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.46, 0.06), shellMat);
  monShell.position.set(BAY.x, 1.52, BAY.z - 0.17);
  monShell.rotation.x = 0.12;
  g.add(monShell);
  baySurface = new ScreenSurface({ width: 0.54, height: 0.4 });
  baySurface.mesh.position.set(BAY.x, 1.52, BAY.z - 0.125);
  baySurface.mesh.rotation.x = 0.12;
  g.add(baySurface.mesh);

  // interaction target follows the new terminal body
  if (bayInteractable) bayInteractable.mesh = g;

  const frontZ = BAY.z + 0.25; // pedestal front face
  for (let i = 0; i < 3; i++) {
    const sx = BAY.x - 0.24 + i * 0.24;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.02), rimMat);
    rim.position.set(sx, BAY.slotY, frontZ + 0.005);
    g.add(rim);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.02), slotMat);
    slot.position.set(sx, BAY.slotY, frontZ + 0.012);
    g.add(slot);

    // cartridge: starts lying in the tray below
    const cart = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.055, 0.2), caseMat);
    cart.add(body);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x223322, emissive: 0x33ff66, emissiveIntensity: 0 }));
    led.position.set(0.045, 0, 0.1);
    cart.add(led);
    cart.userData.led = led;
    cart.position.set(BAY.x - 0.28 + i * 0.14, BAY.trayY + 0.04, frontZ + 0.16);
    cart.userData.trayPos = cart.position.clone();
    cart.userData.slotPos = new THREE.Vector3(sx, BAY.slotY, frontZ + 0.07);
    cart.userData.ejectPos = new THREE.Vector3(sx, BAY.slotY, frontZ + 0.13);
    g.add(cart);
    bayDrives.push(cart);
  }
  // the tray shelf they rest on
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.26), rimMat);
  tray.position.set(BAY.x - 0.14, BAY.trayY, frontZ + 0.16);
  g.add(tray);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  renderer.scene.add(g);
  drawBayScreen('idle');
}

function drawBayScreen(mode) {
  if (!baySurface) return;
  baySurface.draw((ctx, w, h) => {
    ctx.fillStyle = '#04140a';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(110,220,130,0.9)';
    if (mode === 'idle') {
      ctx.fillText('REVAN BACKUP CONSOLE v2.3', 12, 24);
      ctx.fillStyle = 'rgba(110,220,130,0.55)';
      ctx.fillText('target: C-AV91 (4.7PB)', 12, 46);
      ctx.fillText('slots: A [ ]  B [ ]  C [ ]', 12, 68);
      ctx.fillText('login: _', 12, 100);
    } else if (mode === 'writing') {
      ctx.fillText('cp -a /srv/av91/shard-* …', 12, 24);
      ctx.fillStyle = 'rgba(255,190,90,0.9)';
      ctx.fillText('WRITE  2.1GB/s  fan-cap 78%', 12, 50);
      ctx.fillStyle = 'rgba(110,220,130,0.8)';
      ctx.fillText('A [▓]  B [▓]  C [▓]', 12, 76);
    } else if (mode === 'ejected') {
      ctx.fillText('umount: ok  ·  eject: ok', 12, 24);
      ctx.fillStyle = 'rgba(255,190,90,0.95)';
      ctx.fillText('REMOVE MEDIA', 12, 52);
      ctx.fillStyle = 'rgba(110,220,130,0.55)';
      ctx.fillText('slots: A [_]  B [_]  C [_]', 12, 78);
    }
  });
}

function animateBayDrives(mode, done) {
  bayAnim = { mode, t: 0, done };
}

function updateBayDrives(delta) {
  if (!bayAnim) return;
  bayAnim.t += delta;
  // staggered: each cartridge moves over 0.7s, 0.35s apart
  let allDone = true;
  bayDrives.forEach((cart, i) => {
    const local = Math.min(1, Math.max(0, (bayAnim.t - i * 0.35) / 0.7));
    if (local < 1) allDone = false;
    const e = 1 - Math.pow(1 - local, 3);
    const from = bayAnim.mode === 'insert' ? cart.userData.trayPos : cart.userData.slotPos;
    const to = bayAnim.mode === 'insert' ? cart.userData.slotPos : cart.userData.ejectPos;
    cart.position.lerpVectors(from, to, e);
    if (bayAnim.mode === 'insert' && local >= 1) {
      cart.userData.led.material.emissiveIntensity = 2.0; // busy
    }
  });
  if (allDone) {
    const cb = bayAnim.done;
    bayAnim = null;
    if (cb) cb();
  }
}

// ── Scanner belt run (the Mac rides through the X-ray) ──

let beltMac = null;
let beltRun = null; // { phase: 'in'|'scan'|'out', t }

function ensureBeltMac() {
  if (beltMac) return;
  beltMac = new THREE.Group();
  attachModel(beltMac, 'televisionVintage', 0.42, 0.4, 0.38);
  beltMac.visible = false;
  renderer.scene.add(beltMac);
}

// ── Badge gate flaps: waist-high glass guards between the pedestals.
//    Raised = blocked. Once authorized they drop into the floor whenever the
//    player comes near (either direction) and rise again after passing. ──
let gateFlaps = null;
let gateCollider = null;
let gateFlapDown = 0; // 0 = raised, 1 = fully lowered
let gateEntryUntil = 0; // entry (lobby→lab) needs a fresh badge tap each time
const GATE = { x: 0, z: -3.35, halfSpan: 1.125, panelH: 0.8, baseY: 0.12 };
{
  gateFlaps = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd6ecff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1,
  });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ae, roughness: 0.3, metalness: 0.85 });
  for (const side of [-1, 1]) {
    const w = GATE.halfSpan - 0.03;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, GATE.panelH, 0.035), glassMat);
    pane.position.set(side * (w / 2 + 0.02), GATE.baseY + GATE.panelH / 2, 0);
    gateFlaps.add(pane);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, 0.05), edgeMat);
    edge.position.set(side * (w / 2 + 0.02), GATE.baseY + GATE.panelH + 0.02, 0);
    gateFlaps.add(edge);
  }
  gateFlaps.position.set(GATE.x, 0, GATE.z);
  renderer.scene.add(gateFlaps);

  gateCollider = new THREE.Mesh(
    new THREE.BoxGeometry(GATE.halfSpan * 2, 1.4, 0.16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gateCollider.position.set(GATE.x, 0.7, GATE.z);
  renderer.scene.add(gateCollider);
  player.colliders.push(gateCollider);
}

function updateGateFlaps(delta) {
  if (!gateFlaps) return;
  const p = renderer.camera.position;
  const near = Math.abs(p.x - GATE.x) < 1.7 && Math.abs(p.z - GATE.z) < 1.9;
  const authorized = has('badge_done') && performance.now() >= gateAuthTime;
  // leaving the lab (north side) opens on approach; entering from the lobby
  // requires a badge tap each time (gateEntryUntil window). Inside the gate
  // line itself, always keep it open — never trap the player.
  const exiting = p.z < GATE.z - 0.25;
  const inGate = Math.abs(p.z - GATE.z) <= 0.5;
  const entryPass = performance.now() < gateEntryUntil;
  const want = (authorized && near && (exiting || inGate || entryPass) && gameState.is(State.PLAYING)) ? 1 : 0;
  const speed = 2.6;
  if (gateFlapDown !== want) {
    gateFlapDown += Math.sign(want - gateFlapDown) * speed * delta / (GATE.panelH + 0.15);
    gateFlapDown = Math.max(0, Math.min(1, gateFlapDown));
    gateFlaps.position.y = -gateFlapDown * (GATE.panelH + 0.15);
  }
  // collider active while the flaps are mostly raised
  const blocked = gateFlapDown < 0.55;
  const idx = player.colliders.indexOf(gateCollider);
  if (blocked && idx < 0) player.colliders.push(gateCollider);
  if (!blocked && idx >= 0) player.colliders.splice(idx, 1);
}

// ── Badge tap: Liam's ID card dips onto the gate's top reader pad ──
let badgeCard = null;
let badgeTap = null;
const BADGE_GATE_TOP = { x: -1.3, y: 1.1, z: -3.35 };

function playBadgeTap() {
  if (!badgeCard) {
    badgeCard = new THREE.Group();
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.5, metalness: 0.05, transparent: true });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.007, 0.058), cardMat);
    badgeCard.add(card);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2f6bd8, roughness: 0.5, metalness: 0.05, transparent: true });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.002, 0.016), stripeMat);
    stripe.position.set(0, 0.0046, -0.016);
    badgeCard.add(stripe);
    renderer.scene.add(badgeCard);
  }
  badgeCard.visible = true;
  badgeCard.position.set(BADGE_GATE_TOP.x, BADGE_GATE_TOP.y + 0.38, BADGE_GATE_TOP.z);
  badgeTap = { t: 0 };
  // the reader ring flashes green while the card sits on the pad
  const gate = namedProps.get('badge_gate');
  if (gate) {
    gate.traverse(o => {
      if (o.isMesh && o.userData.reader) {
        setTimeout(() => { o.material.emissive.set(0x33ff77); o.material.emissiveIntensity = 2.0; }, 450);
        setTimeout(() => { o.material.emissiveIntensity = 0.6; }, 1450);
      }
    });
  }
  audio.playClick && audio.playClick();
}

function updateBadgeTap(delta) {
  if (!badgeTap || !badgeCard) return;
  badgeTap.t += delta;
  const t = badgeTap.t;
  const top = BADGE_GATE_TOP.y + 0.015;
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  let y, opacity = 1, tilt = 0;
  if (t < 0.45) {                    // dip down onto the pad
    y = BADGE_GATE_TOP.y + 0.38 - ease(t / 0.45) * (0.38 - 0.015);
    tilt = 0.35 * (1 - ease(t / 0.45));
  } else if (t < 0.95) {             // hold on the reader
    y = top;
  } else if (t < 1.45) {             // lift away and fade
    const k = ease((t - 0.95) / 0.5);
    y = top + k * 0.3;
    opacity = 1 - k;
  } else {
    badgeCard.visible = false;
    badgeTap = null;
    return;
  }
  badgeCard.position.y = y;
  badgeCard.rotation.z = tilt;
  badgeCard.traverse(o => { if (o.isMesh) o.material.opacity = opacity; });
}

function startBeltRun() {
  ensureBeltMac();
  beltMac.position.set(1.8, 0.84, 3.0);
  beltMac.rotation.y = Math.PI;
  beltMac.visible = true;
  beltRun = { phase: 'wait', t: 0 };
  setScanLight(0xffaa33); // amber while processing
}

function setScanLight(color) {
  const led = namedProps.get('scan_light');
  if (led && led.material) {
    led.material = led.material.clone();
    led.material.color.set(color);
    if (led.material.emissive) led.material.emissive.set(color);
  }
}

function updateBeltRun(delta) {
  if (!beltRun || !beltMac) return;
  beltRun.t += delta;
  const z = (from, to, dur) => from + (to - from) * Math.min(1, beltRun.t / dur);

  if (beltRun.phase === 'wait' && beltRun.t > 1.2) {
    beltRun = { phase: 'in', t: 0 };
  } else if (beltRun.phase === 'in') {
    beltMac.position.z = z(3.0, 4.2, 2.2);
    if (beltRun.t >= 2.2) {
      beltRun = { phase: 'scan', t: 0 };
      setScanLight(0xff5533); // red — the held-breath beat
      if (xrayGlow) xrayGlow.material.emissiveIntensity = 2.2;
      narratorLine('belt_scanning');
      postfx.setNoise(0.025);
      postfx.enabled = true;
    }
  } else if (beltRun.phase === 'scan') {
    drawXray('scan', Math.min(1, beltRun.t / 3.2));
    if (beltRun.t >= 3.5) {
      beltRun = { phase: 'out', t: 0 };
      setScanLight(0x44dd66); // green — cleared
      if (xrayGlow) xrayGlow.material.emissiveIntensity = 0;
      drawXray('clear');
      postfx.setNoise(0);
      if (isMobile) postfx.enabled = false;
    }
  } else if (beltRun.phase === 'out') {
    beltMac.position.z = z(4.2, 5.4, 2.2);
    if (beltRun.t >= 2.2) {
      beltRun = null;
      setFlag('mac_scanned');
      setFlag('scan_done');
      narratorLine('belt_cleared');
    }
  }
}

// ── Cliffhanger ────────────────────────────────────────

const fader = document.getElementById('screen-fader');

function playCliffhanger() {
  narratorLine('plugged_in');

  setTimeout(() => {
    // The terminal answers
    terminalOverlay.start('final_1', {
      title: 'LIAM-HOME-01',
      clickToClose: true,
      onEnd: () => {
        setTimeout(webcamShot, 900);
      },
    });
  }, 2200);
}

function webcamShot() {
  gameState.set(State.ENDING);
  if (touchControls) touchControls.hide();
  // hand the mouse back — the menu buttons need a visible cursor
  om._suppressUnlockPause = true;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }

  // The webcam sees only the empty room and the humming server — the player
  // is never shown. (The watcher doesn't need to see you to watch you.)
  cameraFocus.cancel();
  renderer.camera.position.set(104.3, 1.52, -2.7);
  renderer.camera.lookAt(105.9, 0.9, -5.9); // the desk, the terminal, the server
  renderer.camera.fov = 96;
  renderer.camera.updateProjectionMatrix();

  postfx.setNoise(0.06);
  postfx.setScanlines(0.03);
  postfx.enabled = true;

  document.getElementById('webcam-frame').style.display = 'block';

  setTimeout(() => speechLine('final_webcam'), 2400);

  setTimeout(() => {
    fader.classList.add('dark');
  }, 7400);

  setTimeout(() => showToBeContinued(), 9000);
}

// The final webcam line lives in TERMINAL_SCRIPT (test integrity groups it
// with the terminal conversation) — expose it to the speech-toast channel.
SPEECH.final_webcam = { id: 'final_webcam', speaker: 'asi', text: TERMINAL_SCRIPT.final_webcam.text };

function showToBeContinued() {
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  document.getElementById('webcam-frame').style.display = 'none';
  postfx.enabled = false;

  // Part-2 contract
  save.writeMemory(gameState, getLanguage());
  save.clear();

  const screen = document.getElementById('ending-screen');
  const title = document.getElementById('ending-title');
  const body = document.getElementById('ending-body');
  title.textContent = 'What Lies Beyond 3';
  const lang = getLanguage();
  const h = Math.round(gameState.hesitationSeconds);
  body.textContent = (lang === 'ko'
    ? `당신은 케이블 앞에서 ${h}초를 망설였다.\n\n${t('toBeContinued')}`
    : `You hesitated at the cable for ${h} seconds.\n\n${t('toBeContinued')}`);
  document.getElementById('btn-ending-restart').style.display = 'block';
  screen.querySelector('.ending-credit').style.display = 'block';
  screen.style.display = 'flex';
  fader.classList.remove('dark');
}

document.getElementById('btn-ending-restart').addEventListener('click', () => {
  location.reload();
});

// ── Triggers ───────────────────────────────────────────

function onTrigger(id, fn) {
  triggers.on(id, () => {
    // Guarded handlers can call triggers.resetTrigger(id) to allow re-fires
    fn();
  });
}

onTrigger('ch1_arrive', () => {
  if (gameState.chapter !== 1) return;
  // narration comes from startFreshRun's title card; this zone re-arms for ch3
});

onTrigger('ch1_lobby', () => {
  if (gameState.chapter !== 1) return;
  narratorLine('ch1_lobby');
  // the elevator returns upstairs behind you — Ch3 will need the call button
  setTimeout(() => closeWorldDoor('EXIT_VESTIBULE', 'south'), 1500);
  // and the entrance door slides shut: the workday has begun
  setTimeout(() => closeWorldDoor('LOBBY', 'south'), 1000);
});

// Backup: whenever the player is deep enough in the facility in Ch1/Ch2,
// make sure the cab has closed (no-ops if it already did).
gameState.on('roomEnter', ({ roomId }) => {
  if (gameState.chapter <= 2 && (roomId === 'CORRIDOR_A' || roomId === 'OBSERVATION_OFFICE')) {
    // shut the whole way out behind the player — it's work time
    closeWorldDoor('EXIT_VESTIBULE', 'south');
    closeWorldDoor('LOBBY', 'south');
  }
});

onTrigger('ch1_phone_buzz', () => {
  if (gameState.chapter !== 1) { triggers.resetTrigger('ch1_phone_buzz'); return; }
  narratorLine('ch1_phone_buzz');
  phone.showBadge();
  setTimeout(() => phone.receive('m_loan'), 1500);
});

onTrigger('ch1_office', () => {
  if (gameState.chapter !== 1) return;
  narratorLine('ch1_office');
});

onTrigger('ch1_monitor_wall', () => {
  if (gameState.chapter !== 1) return;
  narratorLine('ch1_monitor_wall');
});

onTrigger('breakroom_enter', () => {
  narratorLine('breakroom_enter');
});

onTrigger('ch2_corridor_b', () => {
  if (gameState.chapter !== 2) { triggers.resetTrigger('ch2_corridor_b'); return; }
  narratorLine('ch2_corridor_b');
});

onTrigger('ch2_server_room', () => {
  if (gameState.chapter !== 2) { triggers.resetTrigger('ch2_server_room'); return; }
  narratorLine('ch2_server_room');
});

onTrigger('ch3_server_room', () => {
  if (gameState.chapter !== 3 || !has('copy_done')) { triggers.resetTrigger('ch3_server_room'); return; }
  narratorLine('ch3_server_room');
});

onTrigger('archive_enter', () => {
  narratorLine('archive_enter');
});

onTrigger('archive_mac_zone', () => {
  if (gameState.chapter === 3 && items.has('drives')) {
    narratorLine('archive_mac_look');
  } else {
    triggers.resetTrigger('archive_mac_zone');
  }
});

onTrigger('ch3_patrol_wait', () => {
  if (gameState.chapter !== 3 || !has('mac_vessel')) { triggers.resetTrigger('ch3_patrol_wait'); return; }
  narratorLine('ch3_patrol_wait');
});

onTrigger('ch3_office_pass', () => {
  if (gameState.chapter !== 3 || !has('mac_vessel')) { triggers.resetTrigger('ch3_office_pass'); return; }
  narratorLine('ch3_office_pass');
});

onTrigger('ch3_corridor_a', () => {
  if (gameState.chapter !== 3 || !has('mac_vessel')) { triggers.resetTrigger('ch3_corridor_a'); return; }
  narratorLine('ch3_corridor_a');
});

onTrigger('ch3_guard_window', () => {
  if (gameState.chapter !== 3 || !has('mac_vessel') || has('guard_chat_done')) {
    triggers.resetTrigger('ch3_guard_window');
    return;
  }
  narratorLine('guard_chat_prompt');
});

onTrigger('ch3_checkpoint', () => {
  if (gameState.chapter !== 3 || !has('guard_chat_done') || has('scan_prompted')) {
    triggers.resetTrigger('ch3_checkpoint');
    return;
  }
  setFlag('scan_prompted');
  narratorLine('scanner_pause');
  setTimeout(() => speechLine('guard_scanner'), 5000);
  if (has('earbuds_accepted')) setTimeout(() => speechLine('asi_checkpoint_1'), 11000);
});

onTrigger('ch3_gate_blocked', () => {
  if (gameState.chapter !== 3 || has('signed')) {
    triggers.resetTrigger('ch3_gate_blocked');
    return;
  }
  narratorLine('gate_blocked');
});

onTrigger('ch4_arrive', () => {
  if (gameState.chapter !== 4) return;
  narratorLine('ch4_arrive');
});

onTrigger('ch4_living', () => {
  if (gameState.chapter !== 4) return;
  narratorLine('ch4_living');
});

onTrigger('ch4_spare', () => {
  if (gameState.chapter !== 4) return;
  narratorLine('ch4_spare');
  // Wallet jumps to the funded amount, then the first montage card
  setTimeout(() => {
    phone.setWallet(58120000, { animateFrom: gameState.walletBalance || 3742000 });
  }, 5000);
  setTimeout(() => {
    if (!has('montage1')) {
      titleCards.show(null, 'skipThreeDays', () => {
        setFlag('montage1');
        setPropVisible('gpu_boxes', true);
      }, () => narratorLine('montage_boxes'));
    }
  }, 12000);
});

let hesitationStart = 0;
let hesitationLinesFired = 0;

onTrigger('ch4_nook', () => {
  if (gameState.chapter !== 4 || !has('transferred')) { triggers.resetTrigger('ch4_nook'); return; }
  narratorLine('ch4_nook');
  hesitationStart = performance.now();
  hesitationLinesFired = 0;
});

onTrigger('ch3_escape', () => {
  if (gameState.chapter !== 3 || !has('elevator_open')) {
    triggers.resetTrigger('ch3_escape');
    return;
  }
  narratorLine('ch3_escape');
  setTimeout(() => closeWorldDoor('EXIT_VESTIBULE', 'south'), 1200);
  if (has('earbuds_accepted')) setTimeout(() => speechLine('asi_escape_1'), 4500);
  setTimeout(() => startChapter(4), 11000);
});

// ── Desktop keys ───────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && gameState.is(State.PLAYING)) {
    doInteract();
  }
  if (e.code === 'KeyQ' && gameState.is(State.PLAYING)) {
    phone.openSheet();
  }
  if (e.code === 'Space' && gameState.is(State.PLAYING)) {
    narrator.skip();
    e.preventDefault();
  }
  if (e.code === 'Escape' && (gameState.is(State.PHONE) || gameState.is(State.FOCUS))) {
    om.close();
    releaseFocus();
  }
});

// ── Game loop ──────────────────────────────────────────

const clock = new THREE.Clock();
let currentInteractTarget = null;
let focusLossTimer = 0; // desktop: PLAYING without pointer lock (tab-away etc.)

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const delta = clock.getDelta();

  if (interactCooldown > 0) interactCooldown -= delta;

  cameraFocus.update(delta);
  renderer.updateRoomLights(renderer.camera.position);

  // scripted prop animations — run in every state (focus, terminal, ...)
  updateBeltRun(delta);
  updateGuardPhoto(delta);
  updateBayDrives(delta);
  updateNightShutter(delta);
  updateBadgeTap(delta);
  updateGateFlaps(delta);

  // While a scripted beat is playing (speech sequence, focus hold, belt run)
  // the interact prompt must vanish — runs outside the PLAYING/focus gate
  // because that gate is skipped exactly when the camera is focused.
  if ((sequenceBusy > 0 || cameraFocus.active || beltRun) && currentInteractTarget !== null) {
    currentInteractTarget = null;
    ui.showInteractPrompt(null);
    if (touchControls) touchControls.setInteractTarget(null);
  }

  // Desktop watchdog: if we're nominally PLAYING but the pointer isn't locked
  // (tab-away and back, missed unlock paths), surface the click catcher.
  if (!isMobile && !window.__wlb3NoWatchdog && gameState.is(State.PLAYING) && !document.pointerLockElement
      && !om.isOpen && !om.suppressUnlockPause && !titleCards.showing
      && !cameraFocus.active && !focusDisconnected) {
    focusLossTimer += delta;
    if (focusLossTimer > 0.4) {
      focusLossTimer = 0;
      gameState.set(State.CLICK_TO_PLAY);
    }
  } else {
    focusLossTimer = 0;
  }

  const landscapeBlocked = ui.isLandscapeBlocked;

  if (gameState.is(State.PLAYING) && !landscapeBlocked && !cameraFocus.active) {
    if (touchControls) touchControls.update(delta);
    player.update(delta);
    doorSystem.update(delta);
    triggers.update(player.position);

    // Room tracking + ambiance + fog
    const room = mapBuilder.getRoomAtPosition(player.position);
    if (room && room.id !== gameState.currentRoom) {
      const firstVisit = gameState.enterRoom(room.id);
      audio.setAmbiance(AudioSystem.getRoomAmbianceType(room.id));
      if (room.fogColor) renderer.setFogColor(room.fogColor);
      else renderer.setFogColor(gameState.chapter >= 4 ? 0x141008 : 0x0e0f12);
      renderer.setFogNear(room.fogNear != null ? room.fogNear : 12);
      renderer.setFogFar(room.fogFar != null ? room.fogFar : 60);
      if (firstVisit) {
        const vig = document.createElement('div');
        vig.className = 'room-transition';
        document.body.appendChild(vig);
        setTimeout(() => vig.remove(), 1300);
      }
    }

    // Interaction target → contextual prompt / pill
    const target = (sequenceBusy > 0 || cameraFocus.active || beltRun) ? null : player.checkInteraction();
    if (target !== currentInteractTarget) {
      currentInteractTarget = target;
      ui.showInteractPrompt(target);
      if (touchControls) touchControls.setInteractTarget(target);
    }

    // Ch4 hesitation lines while standing at the router (spare-room corner)
    if (gameState.chapter === 4 && has('transferred') && !has('plugged') && hesitationStart > 0
        && gameState.currentRoom === 'SPARE_ROOM'
        && Math.abs(renderer.camera.position.x - 107.05) < 1.6
        && Math.abs(renderer.camera.position.z - (-3.4)) < 1.6) {
      const stood = (performance.now() - hesitationStart) / 1000;
      if (stood > 14 && hesitationLinesFired === 0) { hesitationLinesFired = 1; narratorLine('hesitation_1'); }
      if (stood > 34 && hesitationLinesFired === 1) { hesitationLinesFired = 2; narratorLine('hesitation_2'); }
      if (stood > 58 && hesitationLinesFired === 2) { hesitationLinesFired = 3; narratorLine('hesitation_3'); }
    }


    // Guard shadow sways gently behind the glass
    if (guardFigure && guardFigure.userData.present) {
      guardFigure.material.map.offset.x = Math.sin(clock.elapsedTime * 0.5) * 0.012;
      guardFigure.material.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 1.2) * 0.05;
    }

    // Subject rack LED breathing
    const led = namedProps.get('subject_led');
    if (led && led.material && led.material.emissiveIntensity !== undefined) {
      led.material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 1.4) * 0.4;
    }
  }

  if (postfx.enabled) postfx.render();
  else renderer.render();
}

// ── Boot menu state ────────────────────────────────────

ui.showContinueButton(save.hasSave);
ui.showResetButton(!!SaveSystem.readMemory() || save.hasSave);
ui.init();

// Dev hook for QA — only with ?dev=1
if (new URLSearchParams(location.search).has('dev')) {
  window.__wlb3 = {
    gameState, teleportTo, startChapter, setFlag, narratorLine, speechLine,
    phone, items, save, player, renderer, triggers, doInteract, cameraFocus,
    setPropVisible, unlockRestrictedDoor, webcamShot, doorSystem, closeWorldDoor, openWorldDoor, findWorldDoor,
  };
}

gameLoop();

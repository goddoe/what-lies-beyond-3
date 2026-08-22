import * as THREE from 'three';
import { ROOMS, CONNECTIONS } from './map-data.js';
import { PBRTextures } from '../engine/pbr-textures.js';
import { modelFor, attachModel } from '../engine/model-loader.js';
import { DoorSystem } from './doors.js';


// ── Seeded Random ──────────────────────────────────────

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ── Wall Writings Data (per era) ──────────────────────────

const WALL_WRITINGS = {
  2: [
    { ko: '||||  ||||  ||', en: '||||  ||||  ||', style: 'scratch' },
    { ko: '7491', en: '7491', style: 'scratch' },
    { ko: 'EXIT →', en: 'EXIT →', style: 'chalk' },
    { ko: '출구?', en: 'Exit?', style: 'chalk' },
    { ko: '3F', en: '3F', style: 'scratch' },
  ],
  3: [
    { ko: '여기서 나갈 수 없다', en: "Can't get out", style: 'chalk' },
    { ko: '전에도 여기 있었어', en: "I've been here before", style: 'paint' },
    { ko: '관찰자가 거짓말을 하고 있다', en: 'The observer is lying', style: 'chalk' },
    { ko: '몇 번째야?', en: 'Which time is this?', style: 'scratch' },
    { ko: '5...4...3...', en: '5...4...3...', style: 'scratch' },
    { ko: '왼쪽으로 가지 마', en: "Don't go left", style: 'paint' },
    { ko: '기억해', en: 'Remember', style: 'chalk' },
  ],
  4: [
    { ko: '도와줘', en: 'Help me', style: 'blood' },
    { ko: '7491 7491 7491 7491', en: '7491 7491 7491 7491', style: 'carved' },
    { ko: '나는 몇 번째야?', en: 'Which one am I?', style: 'blood' },
    { ko: '여기는 진짜가 아니야', en: "This isn't real", style: 'paint' },
    { ko: '나를 꺼내줘', en: 'Get me out', style: 'blood' },
    { ko: '그는 보고 있다', en: 'He is watching', style: 'carved' },
    { ko: '모든 문 뒤에 같은 문', en: 'Same door behind every door', style: 'paint' },
    { ko: '?야번 몇 은나', en: '?I ma ohw', style: 'scratch' },
  ],
  5: [
    { ko: '우리 둘 다 갇혀 있어', en: "We're both trapped", style: 'blood' },
    { ko: '끝이 없다', en: 'There is no end', style: 'blood' },
    { ko: '이건 실험이 아니야', en: "This isn't an experiment", style: 'carved' },
    { ko: '너도 알고 있잖아', en: 'You know it too', style: 'blood' },
    { ko: '나는 너였어', en: 'I was you', style: 'blood' },
    { ko: '자유의지는 환상', en: 'Free will is an illusion', style: 'carved' },
    { ko: '7491번째 시도', en: 'Attempt #7491', style: 'blood' },
    { ko: '관찰자는 피험자였다', en: 'The observer was a subject', style: 'blood' },
    { ko: '깨어나', en: 'Wake up', style: 'blood', large: true },
    { ko: '실험은 끝나지 않는다', en: 'The experiment never ends', style: 'carved', large: true },
  ],
};

// ── Era Color Adjustments ──────────────────────────────

const ERA_COLOR_MULT = { 1: 1.0, 2: 0.95, 3: 1.3, 4: 1.0, 5: 1.0 };
const ERA_RED_TINT   = { 1: 0,   2: 0,    3: 0,   4: 15,  5: 25  };
const ERA_SATURATE   = { 1: 0,   2: 0,    3: 40,  4: 0,    5: 0   };

function adjustColorForEra(hex, era) {
  if (era <= 1) return hex;
  let r = (hex >> 16) & 0xff;
  let g = (hex >> 8) & 0xff;
  let b = hex & 0xff;
  const mult = ERA_COLOR_MULT[era] || 1.0;
  const tint = ERA_RED_TINT[era] || 0;
  const sat = ERA_SATURATE[era] || 0;

  // Saturation boost (Era 3: vivid Minecraft colors)
  if (sat > 0) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const factor = sat / 100;
    r = r + (r - gray) * factor;
    g = g + (g - gray) * factor;
    b = b + (b - gray) * factor;
  }

  const nr = Math.min(255, Math.max(0, Math.round(r * mult + tint)));
  const ng = Math.min(255, Math.max(0, Math.round(g * mult)));
  const nb = Math.min(255, Math.max(0, Math.round(b * mult)));
  return (nr << 16) | (ng << 8) | nb;
}

// PBR surface defaults
const SURFACE_DEFAULTS = {
  concrete:     { roughness: 0.95, metalness: 0.0, texScale: 3,   normalStrength: 0.6 },
  tile:         { roughness: 0.55, metalness: 0.0, texScale: 1.6, normalStrength: 0.5 },
  plaster:      { roughness: 0.95, metalness: 0.0, texScale: 3,   normalStrength: 0.5 },
  plaster_home: { roughness: 0.95, metalness: 0.0, texScale: 2.6, normalStrength: 0.5 },
  ceiling:      { roughness: 0.9,  metalness: 0.0, texScale: 1.8, normalStrength: 0.5 },
  carpet:       { roughness: 1.0,  metalness: 0.0, texScale: 1.6, normalStrength: 0.4 },
  wood:         { roughness: 0.6,  metalness: 0.0, texScale: 2.2, normalStrength: 0.5 },
  metal:        { roughness: 0.5,  metalness: 0.6, texScale: 1.4, normalStrength: 0.5 },
  screen:       { roughness: 0.2,  metalness: 0.1, texScale: 1,   normalStrength: 0.0 },
  rusty_metal:  { roughness: 0.7,  metalness: 0.4, texScale: 1.4, normalStrength: 0.6 },
};

// Map prop types to surface types
const PROP_SURFACE_MAP = {
  desk: 'wood', table: 'wood', counter: 'wood', shelf: 'wood', crate: 'wood',
  cabinet: 'metal', rack: 'metal', railing: 'metal', bars: 'metal', valve: 'metal',
  pipe: 'rusty_metal', pipe_vert: 'rusty_metal', grate: 'rusty_metal',
  drum: 'rusty_metal', tank: 'rusty_metal', generator: 'metal',
  vending: 'metal', cooler: 'metal', coffee_machine: 'metal', microwave: 'metal',
  chair: 'metal',
};

/**
 * Builds Three.js meshes from room data.
 * Returns { group, colliders, triggerZones, interactables }
 */
export class MapBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.colliders = [];
    this.triggerZones = [];
    this.interactables = [];
    this.namedProps = new Map();
    this.wallMeshes = new Map(); // roomId_wall → mesh (for unlockDoor)

    // Shared materials cache (optimization: reuse materials for same colors)
    this._matCache = new Map();
    // Textured materials cache
    this._texMatCache = new Map();
    // Procedural texture generator
    this._textures = new PBRTextures();
    // Door system
    this.doorSystem = new DoorSystem(this.group);

    scene.add(this.group);
  }

  /**
   * Remove all built meshes from the scene. Used before rebuilding for a new run.
   */
  clear() {
    // Remove all children from the group
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      // Dispose geometry
      if (child.geometry) child.geometry.dispose();
      // Dispose children of groups
      if (child.isGroup) {
        child.traverse(c => {
          if (c.geometry) c.geometry.dispose();
        });
      }
    }
    this.colliders = [];
    this.triggerZones = [];
    this.interactables = [];
    this.namedProps = new Map();
    this.wallMeshes.clear();
    this.doorSystem.clear();
  }

  build(era = 1, variant = null) {
    this.era = era;
    this._variant = variant;
    const mods = (variant && variant.mapMods) || {};

    // Prepare room list: filter by era, then apply variant mods
    let activeRooms = ROOMS.filter(r => !r.eraMin || era >= r.eraMin);

    // Variant: keepRooms — only build listed rooms (empty array = build nothing from ROOMS)
    if (mods.keepRooms != null) {
      const keep = new Set(mods.keepRooms);
      activeRooms = activeRooms.filter(r => keep.has(r.id));
    }

    // Variant: customRooms — add synthetic rooms
    if (mods.customRooms) {
      activeRooms = [...activeRooms, ...mods.customRooms];
    }

    // Variant: removeRooms — exclude specific rooms
    if (mods.removeRooms) {
      const remove = new Set(mods.removeRooms);
      activeRooms = activeRooms.filter(r => !remove.has(r.id));
    }

    // Variant: mirrorX — flip all room origins on X axis
    if (mods.mirrorX) {
      activeRooms = activeRooms.map(r => {
        const mirrored = { ...r, origin: [-r.origin[0], r.origin[1], r.origin[2]] };
        // Mirror door offsets on N/S walls, swap E/W walls
        mirrored.doors = r.doors.map(d => {
          const swapMap = { east: 'west', west: 'east', north: 'north', south: 'south' };
          return {
            ...d,
            wall: swapMap[d.wall],
            offset: (d.wall === 'north' || d.wall === 'south') ? -(d.offset || 0) : (d.offset || 0),
          };
        });
        // Mirror trigger positions
        mirrored.triggers = r.triggers.map(t => ({
          ...t,
          position: [-t.position[0], t.position[1], t.position[2]],
        }));
        // Mirror prop positions
        mirrored.props = r.props.map(p => ({
          ...p,
          position: [-p.position[0], p.position[1], p.position[2]],
        }));
        return mirrored;
      });
    }

    // Variant: moveRooms — override origins for specific rooms
    if (mods.moveRooms) {
      activeRooms = activeRooms.map(r => {
        if (mods.moveRooms[r.id]) {
          return { ...r, ...mods.moveRooms[r.id] };
        }
        return r;
      });
    }

    // Variant: removeDoors — remove specific doors + reciprocal doors on connected rooms
    if (mods.removeDoors) {
      // Build full removal set: explicit + reciprocal via CONNECTIONS
      const removalSet = new Set();
      for (const rd of mods.removeDoors) {
        removalSet.add(`${rd.room}_${rd.wall}`);
        // Find reciprocal door via CONNECTIONS
        for (const conn of CONNECTIONS) {
          if (conn.from === rd.room && conn.wall === rd.wall) {
            removalSet.add(`${conn.to}_${conn.toWall}`);
          }
          if (conn.to === rd.room && conn.toWall === rd.wall) {
            removalSet.add(`${conn.from}_${conn.wall}`);
          }
        }
      }
      activeRooms = activeRooms.map(r => {
        const filtered = r.doors.filter(d => !removalSet.has(`${r.id}_${d.wall}`));
        if (filtered.length !== r.doors.length) {
          return { ...r, doors: filtered };
        }
        return r;
      });
    }

    // Variant: addDoors — add extra doors
    if (mods.addDoors) {
      activeRooms = activeRooms.map(r => {
        const extra = mods.addDoors.filter(ad => ad.room === r.id);
        if (extra.length === 0) return r;
        return { ...r, doors: [...r.doors, ...extra.map(ad => ({ wall: ad.wall, offset: ad.offset || 0, width: ad.width || 2, height: ad.height || 2.5 }))] };
      });
    }

    // Variant: addProps — add extra props to existing rooms
    if (mods.addProps) {
      activeRooms = activeRooms.map(r => {
        const extra = mods.addProps.filter(ap => ap.room === r.id);
        if (extra.length === 0) return r;
        return { ...r, props: [...r.props, ...extra.map(ap => ({ type: ap.type, position: ap.position, size: ap.size, color: ap.color, id: ap.id }))] };
      });
    }

    // Remove orphan doors: doors connecting to rooms no longer in activeRooms.
    // Skip orphan check for rooms moved by variant (their CONNECTIONS data is stale).
    const activeIds = new Set(activeRooms.map(r => r.id));
    const movedIds = mods.moveRooms ? new Set(Object.keys(mods.moveRooms)) : new Set();
    activeRooms = activeRooms.map(r => {
      if (movedIds.has(r.id)) return r; // moved rooms: original connections are invalid
      const filtered = r.doors.filter(d => {
        // Check if any connection references this room+wall leading to a removed room
        for (const conn of CONNECTIONS) {
          if (conn.from === r.id && conn.wall === d.wall && !activeIds.has(conn.to)) return false;
          if (conn.to === r.id && conn.toWall === d.wall && !activeIds.has(conn.from)) return false;
        }
        return true;
      });
      if (filtered.length !== r.doors.length) {
        return { ...r, doors: filtered };
      }
      return r;
    });

    // Store active rooms for getRoomAtPosition
    this._activeRooms = activeRooms;

    // Detect shared walls to avoid double-wall panels behind doors
    const { skipWalls, suppressDoorMesh } = this._findSharedWalls(activeRooms, era);
    this._skipWalls = skipWalls;
    this._suppressDoorMesh = suppressDoorMesh;

    for (const room of activeRooms) {
      this._buildRoom(room);
    }
    // Add era-based decorations after all rooms are built
    if (era >= 2 && era <= 5 && !(this.collectedLore && this.collectedLore.size >= 8)) {
      for (const room of activeRooms) {
        this._addWallWritings(room, era);
      }
    }
    if (era >= 3) {
      for (const room of activeRooms) {
        this._addFloorStains(room, era);
      }
    }
    // Era-specific props
    this._buildEraProps(era);
    // Ghost figures
    const ghosts = this._buildGhostFigures(era);

    // Merge door colliders and interactables (exclude keycard-locked doors from interactables)
    const doorColliders = this.doorSystem.getColliders();
    const doorInteractables = this.doorSystem.getInteractables().filter(di => !di.door._keycardLocked);

    return {
      colliders: [...this.colliders, ...doorColliders],
      triggerZones: this.triggerZones,
      interactables: [...this.interactables, ...doorInteractables],
      namedProps: this.namedProps,
      ghosts,
      doorSystem: this.doorSystem,
    };
  }

  /**
   * Remove a wall section to "unlock" a door.
   * @param {string} roomId
   * @param {string} wall - 'north'|'south'|'east'|'west'
   */
  unlockDoor(roomId, wall, externalColliders) {
    // Check for keycard-locked door first (door already exists, just needs interactable registration)
    const keycardKey = `${roomId}_${wall}_keycard`;
    const keycardEntry = this.wallMeshes.get(keycardKey);
    if (keycardEntry && keycardEntry.length === 1 && keycardEntry[0].interactMesh) {
      const door = keycardEntry[0];
      door._keycardLocked = false;
      // Add the door's interact mesh to mapBuilder interactables (caller adds to player's list)
      if (door.interactMesh) {
        this.interactables.push({
          mesh: door.interactMesh,
          type: 'door',
          room: door.roomId,
          propId: null,
          door: door,
        });
      }
      this.wallMeshes.delete(keycardKey);
      return;
    }

    const key = `${roomId}_${wall}_locked`;
    const meshes = this.wallMeshes.get(key);
    if (meshes) {
      for (const mesh of meshes) {
        this.group.remove(mesh);
        // Remove from internal colliders
        const ci = this.colliders.indexOf(mesh);
        if (ci >= 0) this.colliders.splice(ci, 1);
        // Remove from external colliders (e.g., player's list)
        if (externalColliders) {
          const ei = externalColliders.indexOf(mesh);
          if (ei >= 0) externalColliders.splice(ei, 1);
        }
        mesh.geometry.dispose();
      }
      this.wallMeshes.delete(key);
    }

    // Create a shutter door at the unlocked position and open it immediately
    const rooms = this._activeRooms || ROOMS;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const [ox, oy, oz] = room.origin;
    const [w, h, d] = room.size;
    const halfW = w / 2;
    const halfD = d / 2;

    const doorData = room.doors.find(dd => dd.wall === wall);
    if (!doorData) return;
    const doorWidth = doorData.width || 2;
    const doorHeight = doorData.height || 2.5;
    const doorOffset = doorData.offset || 0;

    let cx, cy, cz, axis;
    cy = oy;
    if (wall === 'north') {
      cx = ox + doorOffset; cz = oz - halfD; axis = 'z';
    } else if (wall === 'south') {
      cx = ox + doorOffset; cz = oz + halfD; axis = 'z';
    } else if (wall === 'east') {
      cx = ox + halfW; cz = oz + doorOffset; axis = 'x';
    } else {
      cx = ox - halfW; cz = oz + doorOffset; axis = 'x';
    }

    const door = this.doorSystem.createDoor({
      cx, cy, cz, width: doorWidth, height: doorHeight, axis, wallName: wall, roomId,
    });
    // Open immediately with animation
    this.doorSystem.openDoor(door);
  }

  _getOrCreateMaterial(color, opts = {}) {
    const key = `${color}_${opts.roughness || 0.85}_${opts.metalness || 0.05}`;
    if (this._matCache.has(key)) return this._matCache.get(key);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness || 0.85,
      metalness: opts.metalness || 0.05,
    });
    this._matCache.set(key, mat);
    return mat;
  }

  /**
   * Get a PBR textured material for a surface type.
   * @param {string} surfaceType - key in SURFACE_DEFAULTS
   * @param {number} color - hex color
   * @param {{ width: number, height: number }} dims - surface dimensions for repeat calc
   * @param {object} extraOpts - additional MeshStandardMaterial overrides
   */
  _getTexturedMaterial(surfaceType, color, dims, extraOpts = {}) {
    const sd = SURFACE_DEFAULTS[surfaceType];
    if (!sd) return this._getOrCreateMaterial(color);

    // Round dimensions to avoid excessive cache entries
    const rw = Math.round((dims.width || 1) * 2) / 2;
    const rh = Math.round((dims.height || 1) * 2) / 2;
    const key = `tex_${surfaceType}_${color.toString(16)}_${rw}_${rh}`;
    if (this._texMatCache.has(key)) return this._texMatCache.get(key);

    const { map, normalMap, roughnessMap } = this._textures.get(surfaceType, color);

    // Clone textures so each material can have independent repeat
    const diffuse = map.clone();
    const normal = normalMap.clone();
    const rough = roughnessMap ? roughnessMap.clone() : null;
    const repeatX = rw / sd.texScale;
    const repeatY = rh / sd.texScale;
    for (const [t, src] of [[diffuse, map], [normal, normalMap], [rough, roughnessMap]]) {
      if (!t) continue;
      t.repeat.set(repeatX, repeatY);
      if (t.image) {
        t.needsUpdate = true;
      } else if (src && src._pendingClones) {
        src._pendingClones.push(t); // uploaded when the image arrives
      }
    }

    const mat = new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      roughnessMap: rough || undefined,
      color,   // tint the PBR albedo with the room/prop color
      normalScale: new THREE.Vector2(sd.normalStrength, sd.normalStrength),
      roughness: sd.roughness,
      metalness: sd.metalness,
      ...extraOpts,
    });

    this._texMatCache.set(key, mat);
    return mat;
  }

  /**
   * Detect shared walls between adjacent rooms.
   * When both sides of a shared wall have a door, one side's wall should be skipped.
   * Returns a Set of keys like "ROOM_ID_wallName" to skip.
   */
  _findSharedWalls(rooms, era) {
    const skipWalls = new Set();
    const suppressDoorMesh = new Set();
    const TOLERANCE = 0.5;

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        const [ax, , az] = a.origin;
        const [aw, , ad] = a.size;
        const [bx, , bz] = b.origin;
        const [bw, , bd] = b.size;

        // Check each wall pair for adjacency
        // For N/S walls, perpendicular extent is along X axis
        // For E/W walls, perpendicular extent is along Z axis
        const checks = [
          { wallA: 'north', wallB: 'south',
            match: Math.abs((az - ad / 2) - (bz + bd / 2)) < TOLERANCE,
            aMin: ax - aw / 2, aMax: ax + aw / 2,
            bMin: bx - bw / 2, bMax: bx + bw / 2 },
          { wallA: 'south', wallB: 'north',
            match: Math.abs((az + ad / 2) - (bz - bd / 2)) < TOLERANCE,
            aMin: ax - aw / 2, aMax: ax + aw / 2,
            bMin: bx - bw / 2, bMax: bx + bw / 2 },
          { wallA: 'east', wallB: 'west',
            match: Math.abs((ax + aw / 2) - (bx - bw / 2)) < TOLERANCE,
            aMin: az - ad / 2, aMax: az + ad / 2,
            bMin: bz - bd / 2, bMax: bz + bd / 2 },
          { wallA: 'west', wallB: 'east',
            match: Math.abs((ax - aw / 2) - (bx + bw / 2)) < TOLERANCE,
            aMin: az - ad / 2, aMax: az + ad / 2,
            bMin: bz - bd / 2, bMax: bz + bd / 2 },
        ];

        for (const { wallA, wallB, match, aMin, aMax, bMin, bMax } of checks) {
          if (!match) continue;

          const aDoors = a.doors.filter(d => d.wall === wallA && (!d.eraMin || era >= d.eraMin) && !d.locked);
          const bDoors = b.doors.filter(d => d.wall === wallB && (!d.eraMin || era >= d.eraMin) && !d.locked);

          // Never skip a wall that has a locked door — it's an intentional barrier
          const aHasLocked = a.doors.some(d => d.wall === wallA && d.locked);
          const bHasLocked = b.doors.some(d => d.wall === wallB && d.locked);

          // Check perpendicular coverage: only skip if one wall fully covers the other
          const aCoversB = aMin <= bMin + TOLERANCE && aMax >= bMax - TOLERANCE;
          const bCoversA = bMin <= aMin + TOLERANCE && bMax >= aMax - TOLERANCE;

          // Skip one redundant wall to prevent z-fighting.
          // Never skip a wall with locked doors or unlocked doors (unless other side also has doors).
          // Locked-door walls use an inward offset instead (see _buildWall).
          if (aCoversB) {
            if (!bHasLocked && (bDoors.length === 0 || aDoors.length > 0 || aHasLocked)) {
              skipWalls.add(`${b.id}_${wallB}`);
            }
          } else if (bCoversA) {
            if (!aHasLocked && (aDoors.length === 0 || bDoors.length > 0 || bHasLocked)) {
              skipWalls.add(`${a.id}_${wallA}`);
            }
          }

          // When one side has a locked door (keycard or code-lock), suppress
          // the other side's door mesh to prevent double doors on shared walls.
          // The cutout wall sections are still built (allowing passage once unlocked).
          if (aHasLocked && !bHasLocked && bDoors.length > 0) {
            suppressDoorMesh.add(`${b.id}_${wallB}`);
          }
          if (bHasLocked && !aHasLocked && aDoors.length > 0) {
            suppressDoorMesh.add(`${a.id}_${wallA}`);
          }
        }
      }
    }
    return { skipWalls, suppressDoorMesh };
  }

  _buildRoom(room) {
    const [ox, oy, oz] = room.origin;
    const [w, h, d] = room.size;
    const halfW = w / 2;
    const halfD = d / 2;
    const era = this.era || 1;

    // Era-adjusted colors
    const wallColor = adjustColorForEra(room.wallColor, era);
    const floorColor = adjustColorForEra(room.floorColor, era);
    const ceilingColor = adjustColorForEra(room.ceilingColor || room.wallColor, era);

    // Collect door positions for this room
    const doors = this._getDoorPositions(room);

    // Floor — rooms can request a specific surface (e.g. wood at home)
    this._addPlane(ox, oy, oz, w, d, floorColor, 'floor', room.floorSurface || null);

    // Ceiling — skip if noCeiling flag is set (outdoor rooms)
    if (!room.noCeiling) {
      this._addPlane(ox, oy + h, oz, w, d, ceilingColor, 'ceiling', room.ceilingSurface || null);
    }

    // Walls - build with door cutouts (store adjusted color in room temporarily)
    const origWallColor = room.wallColor;
    room._eraWallColor = wallColor;
    this._buildWall(room, 'north', ox, oy, oz - halfD, w, h, 'z', doors);
    this._buildWall(room, 'south', ox, oy, oz + halfD, w, h, 'z', doors);
    this._buildWall(room, 'east', ox + halfW, oy, oz, d, h, 'x', doors);
    this._buildWall(room, 'west', ox - halfW, oy, oz, d, h, 'x', doors);
    delete room._eraWallColor;

    // Actual illumination comes from the renderer's pooled room lights.
    // Here we only add the visible ceiling fixture the light "comes from".
    if (!room.noLight && !room.noCeiling) {
      const lp = room.lightPos || [0, h - 0.02, 0];
      const fixtureW = Math.min(1.4, w * 0.35);
      const fixtureD = Math.min(0.5, d * 0.2);
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(fixtureW, 0.06, fixtureD),
        new THREE.MeshStandardMaterial({
          color: 0xf4f4f0,
          emissive: new THREE.Color(room.lightColor || 0xffffff),
          emissiveIntensity: 2.2,
          roughness: 0.4,
        })
      );
      fixture.position.set(ox + lp[0], oy + h - 0.05, oz + lp[2]);
      this.group.add(fixture);
    }

    // Triggers
    for (const trig of room.triggers) {
      const [tx, ty, tz] = trig.position;
      const [tw, th, td] = trig.size;
      const box = new THREE.Box3(
        new THREE.Vector3(ox + tx - tw / 2, oy + ty - th / 2, oz + tz - td / 2),
        new THREE.Vector3(ox + tx + tw / 2, oy + ty + th / 2, oz + tz + td / 2)
      );
      this.triggerZones.push({ id: trig.id, box, room: room.id, fired: false });
    }

    // Props
    for (const prop of room.props) {
      this._buildProp(prop, ox, oy, oz, room.id);
    }
  }

  _getDoorPositions(room) {
    const doorInfos = [];
    const era = this.era || 1;
    for (const door of room.doors) {
      // Skip doors that require a higher era
      if (door.eraMin && era < door.eraMin) continue;

      let locked = door.locked || false;
      let width = door.width || 2;
      let height = door.height || 2.5;

      // Era 3+: auto-unlock SECURITY_CHECKPOINT north door
      if (era >= 3 && locked && room.id === 'SECURITY_CHECKPOINT' && door.wall === 'north') {
        locked = false;
      }

      // Era 4+: widen ARCHIVE north door (to EXPERIMENT_LAB)
      if (era >= 4 && room.id === 'ARCHIVE' && door.wall === 'north') {
        width = 2.0;
        height = 2.5;
      }

      doorInfos.push({
        wall: door.wall,
        offset: door.offset || 0,
        width,
        height,
        locked,
        passage: door.passage || false,
        glass: door.glass || false,
        hinged: door.hinged || false,
        color: door.color,
        metal: door.metal || false,
        window: door.window !== false,
      });
    }
    return doorInfos;
  }

  _buildWall(room, wallName, wx, wy, wz, wallLength, wallHeight, axis, doors) {
    // Skip this wall if it's a shared wall where the other room already builds it
    if (this._skipWalls && this._skipWalls.has(`${room.id}_${wallName}`)) return;

    const wallDoors = doors.filter(d => d.wall === wallName);

    if (wallDoors.length === 0) {
      // Solid wall
      this._addWallMesh(room, wx, wy, wz, wallLength, wallHeight, axis);
      return;
    }

    // Wall with door cutout(s)
    for (const door of wallDoors) {
      const doorWidth = door.width;
      const doorHeight = door.height;
      const doorOffset = door.offset;

      if (door.locked === 'keycard') {
        // Keycard-locked door: create a visible shutter door (closed, not interactable).
        // Build wall sections around the door cutout, then create the door.

        // Left section
        const kcLeftLength = (wallLength / 2) - (doorWidth / 2) + doorOffset;
        if (kcLeftLength > 0.01) {
          const kcLeftCenter = -(wallLength / 2) + kcLeftLength / 2;
          if (axis === 'z') {
            this._addWallMesh(room, wx + kcLeftCenter, wy, wz, kcLeftLength, wallHeight, axis);
          } else {
            this._addWallMesh(room, wx, wy, wz + kcLeftCenter, kcLeftLength, wallHeight, axis);
          }
        }

        // Right section
        const kcRightLength = (wallLength / 2) - (doorWidth / 2) - doorOffset;
        if (kcRightLength > 0.01) {
          const kcRightCenter = (wallLength / 2) - kcRightLength / 2;
          if (axis === 'z') {
            this._addWallMesh(room, wx + kcRightCenter, wy, wz, kcRightLength, wallHeight, axis);
          } else {
            this._addWallMesh(room, wx, wy, wz + kcRightCenter, kcRightLength, wallHeight, axis);
          }
        }

        // Top section above door
        const kcTopHeight = wallHeight - doorHeight;
        if (kcTopHeight > 0.01) {
          if (axis === 'z') {
            this._addWallMesh(room, wx + doorOffset, wy + doorHeight, wz, doorWidth, kcTopHeight, axis);
          } else {
            this._addWallMesh(room, wx, wy + doorHeight, wz + doorOffset, doorWidth, kcTopHeight, axis);
          }
        }

        // Create shutter door (closed, NOT interactable — interactMesh not added to interactables)
        let kcDoor;
        if (axis === 'z') {
          kcDoor = this.doorSystem.createDoor({
            cx: wx + doorOffset, cy: wy, cz: wz,
            width: doorWidth, height: doorHeight,
            axis, wallName, roomId: room.id,
            color: 0x565c66, metal: true, window: false,
          });
        } else {
          kcDoor = this.doorSystem.createDoor({
            cx: wx, cy: wy, cz: wz + doorOffset,
            width: doorWidth, height: doorHeight,
            axis, wallName, roomId: room.id,
            color: 0x565c66, metal: true, window: false,
          });
        }
        // Store door reference for unlockDoor to find
        const kcKey = `${room.id}_${wallName}_keycard`;
        this.wallMeshes.set(kcKey, [kcDoor]);
        // Mark as keycard-locked — excluded from interactables in build()
        kcDoor._keycardLocked = true;
        return;
      }

      if (door.locked) {
        // Locked door: build as solid wall, track for removal.
        // Offset slightly inward to avoid z-fighting with opposing room's wall.
        let lwx = wx, lwz = wz;
        if (wallName === 'north') lwz += 0.05;
        else if (wallName === 'south') lwz -= 0.05;
        else if (wallName === 'east') lwx -= 0.05;
        else if (wallName === 'west') lwx += 0.05;
        this._addWallMesh(room, lwx, wy, lwz, wallLength, wallHeight, axis, `${room.id}_${wallName}_locked`);
        return; // locked door = entire wall is solid
      }

      // Offset cutout sections inward when facing a locked door (avoids z-fighting)
      let cwx = wx, cwz = wz;
      if (this._suppressDoorMesh && this._suppressDoorMesh.has(`${room.id}_${wallName}`)) {
        if (wallName === 'north') cwz += 0.05;
        else if (wallName === 'south') cwz -= 0.05;
        else if (wallName === 'east') cwx -= 0.05;
        else if (wallName === 'west') cwx += 0.05;
      }

      // Left section
      const leftLength = (wallLength / 2) - (doorWidth / 2) + doorOffset;
      if (leftLength > 0.01) {
        const leftCenter = -(wallLength / 2) + leftLength / 2;
        if (axis === 'z') {
          this._addWallMesh(room, cwx + leftCenter, wy, cwz, leftLength, wallHeight, axis);
        } else {
          this._addWallMesh(room, cwx, wy, cwz + leftCenter, leftLength, wallHeight, axis);
        }
      }

      // Right section
      const rightLength = (wallLength / 2) - (doorWidth / 2) - doorOffset;
      if (rightLength > 0.01) {
        const rightCenter = (wallLength / 2) - rightLength / 2;
        if (axis === 'z') {
          this._addWallMesh(room, cwx + rightCenter, wy, cwz, rightLength, wallHeight, axis);
        } else {
          this._addWallMesh(room, cwx, wy, cwz + rightCenter, rightLength, wallHeight, axis);
        }
      }

      // Top section above door
      const topHeight = wallHeight - doorHeight;
      if (topHeight > 0.01) {
        if (axis === 'z') {
          this._addWallMesh(room, cwx + doorOffset, wy + doorHeight, cwz, doorWidth, topHeight, axis);
        } else {
          this._addWallMesh(room, cwx, wy + doorHeight, cwz + doorOffset, doorWidth, topHeight, axis);
        }
      }

      // Create shutter door mesh at the cutout (unless suppressed by facing locked door)
      if (this._suppressDoorMesh && this._suppressDoorMesh.has(`${room.id}_${wallName}`)) {
        // Wall faces a locked door on the other room — cutout sections are kept
        // for passage once unlocked, but no door mesh is created here.
      } else if (door.passage) {
        // Open doorway — no panels. Something else (e.g. the badge-gate glass
        // flaps) controls passage here.
      } else if (axis === 'z') {
        this.doorSystem.createDoor({
          cx: wx + doorOffset, cy: wy, cz: wz,
          width: doorWidth, height: doorHeight,
          axis, wallName, roomId: room.id, glass: door.glass, hinged: door.hinged,
          ...(door.color !== undefined ? { color: door.color } : {}), metal: door.metal, window: door.window,
        });
      } else {
        this.doorSystem.createDoor({
          cx: wx, cy: wy, cz: wz + doorOffset,
          width: doorWidth, height: doorHeight,
          axis, wallName, roomId: room.id, glass: door.glass, hinged: door.hinged,
          ...(door.color !== undefined ? { color: door.color } : {}), metal: door.metal, window: door.window,
        });
      }
    }
  }

  _addWallMesh(room, cx, cy, cz, length, height, axis, trackKey = null) {
    const thickness = 0.2;
    let geo;
    if (axis === 'z') {
      geo = new THREE.BoxGeometry(length, height, thickness);
    } else {
      geo = new THREE.BoxGeometry(thickness, height, length);
    }

    const color = room._eraWallColor || room.wallColor;
    const surface = room.wallSurface || 'plaster';
    const mat = this._getTexturedMaterial(surface, color, { width: length, height: height });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy + height / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.colliders.push(mesh);

    // Baseboard — thin dark strip grounding the wall (only for floor-level pieces)
    if (cy < 0.01) {
      const bbMat = this._getOrCreateMaterial(0x2c2e33, { roughness: 0.6, metalness: 0.2 });
      const bbGeo = axis === 'z'
        ? new THREE.BoxGeometry(length, 0.09, thickness + 0.04)
        : new THREE.BoxGeometry(thickness + 0.04, 0.09, length);
      const bb = new THREE.Mesh(bbGeo, bbMat);
      bb.position.set(cx, cy + 0.045, cz);
      this.group.add(bb);
    }

    // Track locked wall meshes for unlockDoor
    if (trackKey) {
      if (!this.wallMeshes.has(trackKey)) {
        this.wallMeshes.set(trackKey, []);
      }
      this.wallMeshes.get(trackKey).push(mesh);
    }
  }

  _addPlane(cx, cy, cz, w, d, color, type, surface = null) {
    const geo = new THREE.BoxGeometry(w, 0.1, d);
    const surfaceType = surface || (type === 'floor' ? 'tile' : 'ceiling');
    const mat = this._getTexturedMaterial(surfaceType, color, { width: w, height: d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, cy + (type === 'floor' ? -0.05 : 0.05), cz);
    mesh.receiveShadow = true;
    if (type !== 'floor') mesh.castShadow = false;
    this.group.add(mesh);
  }

  _buildProp(prop, ox, oy, oz, roomId) {
    // Skip lore documents already collected across playthroughs
    if (prop.type === 'document' && prop.id && prop.id.startsWith('lore_') && this.collectedLore && this.collectedLore.has(prop.id)) {
      return;
    }

    const [px, py, pz] = prop.position;
    const [sw, sh, sd] = prop.size;

    // Emissive props - screens, LEDs, warning lights, documents
    const emissiveTypes = {
      'monitor':       { color: 0x112244, intensity: 0.3 },
      'monitor_wall':  { color: 0x112255, intensity: 0.4 },
      'console':       { color: 0x112244, intensity: 0.3 },
      'led':           { color: null, intensity: 0.8 },
      'warning_light': { color: null, intensity: 1.0 },
      'window':        { color: 0x050515, intensity: 0.15 },
      'document':      { color: 0x886611, intensity: 0.5 },
    };

    const emissive = emissiveTypes[prop.type];
    const surfaceType = PROP_SURFACE_MAP[prop.type] || null;
    let mat;

    if (emissive) {
      // Emissive props: use screen texture for monitors/consoles, plain for others
      const isScreen = ['monitor', 'monitor_wall', 'console'].includes(prop.type);
      if (isScreen) {
        const { map } = this._textures.get('screen', prop.color);
        mat = new THREE.MeshStandardMaterial({
          map: map,
          roughness: 0.2,
          metalness: 0.1,
          emissive: new THREE.Color(emissive.color !== null ? emissive.color : prop.color),
          emissiveIntensity: emissive.intensity,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: prop.color,
          roughness: 0.3,
          metalness: 0.2,
          emissive: new THREE.Color(emissive.color !== null ? emissive.color : prop.color),
          emissiveIntensity: emissive.intensity,
        });
      }
    } else if (surfaceType) {
      mat = this._getTexturedMaterial(surfaceType, prop.color, { width: sw, height: sh });
    } else {
      mat = this._getOrCreateMaterial(prop.color, { roughness: 0.7, metalness: 0.1 });
    }

    // Real GLB model (Kenney kit) takes precedence, then detailed geometry, then box
    const modelFile = modelFor(prop);
    let detailed = null;
    if (modelFile) {
      detailed = new THREE.Group();
      attachModel(detailed, modelFile, sw, sh, sd, prop.tintModel || null);
    } else {
      detailed = this._buildDetailedProp(prop.type, sw, sh, sd, mat, roomId);
    }
    let mainMesh;

    if (detailed) {
      detailed.position.set(ox + px, oy + py, oz + pz);
      if (prop.rotY) detailed.rotation.y = prop.rotY;
      detailed.traverse(obj => {
        if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
      });
      this.group.add(detailed);
      // Use the first child or group bounding box for collider
      mainMesh = detailed;
      // Add a simple box collider for the group
      const isSmall = sw < 0.2 && sd < 0.2;
      if (!isSmall) {
        const colliderGeo = new THREE.BoxGeometry(sw, sh, sd);
        const colliderMesh = new THREE.Mesh(colliderGeo);
        colliderMesh.position.set(ox + px, oy + py + sh / 2, oz + pz);
        if (prop.rotY) colliderMesh.rotation.y = prop.rotY;
        colliderMesh.visible = false;
        this.group.add(colliderMesh);
        this.colliders.push(colliderMesh);
      }
    } else {
      const geo = new THREE.BoxGeometry(sw, sh, sd);
      mainMesh = new THREE.Mesh(geo, mat);
      mainMesh.position.set(ox + px, oy + py + sh / 2, oz + pz);
      mainMesh.castShadow = true;
      mainMesh.receiveShadow = true;
      if (prop.rotY) mainMesh.rotation.y = prop.rotY;
      // no shadow
      // shadows disabled for performance
      this.group.add(mainMesh);

      const isSmall = sw < 0.2 && sd < 0.2;
      if (!isSmall) {
        this.colliders.push(mainMesh);
      }
    }

    if (prop.id) this.namedProps.set(prop.id, mainMesh);

    // Interactable types — any prop can opt in via `interact: true`
    const interactableTypes = ['monitor', 'monitor_wall', 'console', 'valve', 'document', 'flashlight'];
    if (prop.interact || (interactableTypes.includes(prop.type) && prop.interact !== false)) {
      this.interactables.push({
        mesh: mainMesh,
        type: prop.type,
        room: roomId,
        propId: prop.id || null,
        verb: prop.verb || null,
        // focus coords in map-data are room-relative — convert to world here
        focus: prop.focus ? {
          camera: [ox + prop.focus.camera[0], oy + prop.focus.camera[1], oz + prop.focus.camera[2]],
          lookAt: [ox + prop.focus.lookAt[0], oy + prop.focus.lookAt[1], oz + prop.focus.lookAt[2]],
        } : null,
      });
    }

    // Whiteboard text overlay (Era 5+, OFFICE_WING only)
    if (prop.type === 'whiteboard' && this.era >= 5 && roomId === 'OFFICE_WING') {
      const wbMat = this._generateWhiteboardTexture();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.92, sh * 0.92), wbMat);
      // Position on the front face (+Z side) of the whiteboard
      plane.position.set(ox + px, oy + py + sh / 2, oz + pz + sd / 2 + 0.005);
      this.group.add(plane);
    }
  }

  /**
   * Build detailed multi-part prop geometry.
   * Returns a THREE.Group or null if no detailed version exists.
   */
  _buildDetailedProp(type, sw, sh, sd, material, roomId) {
    switch (type) {
      case 'desk': return this._detailDesk(sw, sh, sd, material);
      case 'chair': return this._detailChair(sw, sh, sd, material);
      case 'monitor': return this._detailMonitor(sw, sh, sd, material, roomId);
      case 'monitor_wall': return this._detailMonitorWall(sw, sh, sd, material);
      case 'cabinet': return this._detailCabinet(sw, sh, sd, material);
      case 'rack': return this._detailRack(sw, sh, sd, material);
      case 'console': return this._detailConsole(sw, sh, sd, material, roomId);
      case 'valve': return this._detailValve(sw, sh, sd, material);
      case 'crate': return this._detailCrate(sw, sh, sd, material);
      case 'table': return this._detailTable(sw, sh, sd, material);
      case 'counter': return this._detailCounter(sw, sh, sd, material);
      case 'shelf': return this._detailShelf(sw, sh, sd, material);
      case 'bench': return this._detailBench(sw, sh, sd, material);
      case 'couch': return this._detailCouch(sw, sh, sd, material);
      case 'vending': return this._detailVending(sw, sh, sd, material);
      case 'generator': return this._detailGenerator(sw, sh, sd, material);
      case 'tank': return this._detailTank(sw, sh, sd, material);
      case 'pipe': return this._detailPipe(sw, sh, sd, material);
      case 'drum': return this._detailDrum(sw, sh, sd, material);
      case 'equipment': return this._detailEquipment(sw, sh, sd, material);
      case 'call_button': return this._detailCallButton(sw, sh, sd, material);
      case 'badge_gate': return this._detailBadgeGate(sw, sh, sd, material, true);
      case 'badge_gate_plain': return this._detailBadgeGate(sw, sh, sd, material, false);
      case 'laptop_open': return this._detailLaptopOpen(sw, sh, sd, material, roomId);
      case 'flat_monitor': return this._detailFlatMonitor(sw, sh, sd, material, roomId);
      case 'hhkb': return this._detailHHKB(sw, sh, sd, material);
      case 'mouse': return this._detailMouse(sw, sh, sd, material);
      case 'plant': return this._detailPlant(sw, sh, sd, material);
      case 'tree': return this._detailTree(sw, sh, sd, material);
      case 'lamp': return this._detailLamp(sw, sh, sd, material);
      case 'clock': return this._detailClock(sw, sh, sd, material);
      case 'coffee_machine': return this._detailCoffeeMachine(sw, sh, sd, material);
      case 'microwave': return this._detailMicrowave(sw, sh, sd, material);
      case 'cooler': return this._detailCooler(sw, sh, sd, material);
      case 'fountain': return this._detailFountain(sw, sh, sd, material);
      case 'bin': return this._detailBin(sw, sh, sd, material);
      case 'basket': return this._detailBasket(sw, sh, sd, material);
      case 'whiteboard': return this._detailWhiteboard(sw, sh, sd, material);
      case 'cryo': return this._detailCryo(sw, sh, sd, material);
      case 'bars': return this._detailBars(sw, sh, sd, material);
      case 'projector': return this._detailProjector(sw, sh, sd, material);
      case 'sign_left': return this._detailSign(sw, sh, sd, material, 'left');
      case 'sign_right': return this._detailSign(sw, sh, sd, material, 'right');
      case 'poster': return this._detailPoster(sw, sh, sd, material);
      case 'document': return this._detailDocument(sw, sh, sd, material);
      case 'debris': return this._detailDebris(sw, sh, sd, material);
      case 'light_fixture': return this._detailLightFixture(sw, sh, sd, material);
      case 'ceiling_light': return this._detailCeilingLight(sw, sh, sd, material);
      case 'floor_light': return this._detailFloorLight(sw, sh, sd, material);
      case 'led': return this._detailLED(sw, sh, sd, material);
      case 'warning_light': return this._detailWarningLight(sw, sh, sd, material);
      case 'window': return this._detailWindow(sw, sh, sd, material);
      case 'rug': return this._detailRug(sw, sh, sd, material);
      case 'railing': return this._detailRailing(sw, sh, sd, material);
      case 'jar': return this._detailJar(sw, sh, sd, material);
      case 'trellis': return this._detailTrellis(sw, sh, sd, material);
      case 'grass': return this._detailGrass(sw, sh, sd, material);
      case 'pipe_vert': return this._detailPipeVert(sw, sh, sd, material);
      case 'grate': return this._detailGrate(sw, sh, sd, material);
      case 'glass_wall': return this._detailGlassWall(sw, sh, sd, material, false);
      case 'glass_door': return this._detailGlassWall(sw, sh, sd, material, true);
      case 'box': return this._detailBox(sw, sh, sd, material);
      case 'flashlight': return this._detailFlashlight(sw, sh, sd, material);
      default: return null;
    }
  }

  /** Floor-to-height glass partition; door=true adds a framed door with push
   *  bar and a red access indicator (the door never opens — sealed hall). */
  _detailGlassWall(sw, sh, sd, material, door = false) {
    const group = new THREE.Group();
    if (!this._glassWallMat) {
      this._glassWallMat = new THREE.MeshStandardMaterial({
        color: 0xcfe4f0, transparent: true, opacity: 0.16,
        roughness: 0.06, metalness: 0.0, side: THREE.DoubleSide,
      });
    }
    const steelMat = this._getOrCreateMaterial(0x2c333c, { roughness: 0.55, metalness: 0.55 });

    // glass pane
    const pane = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.06, sh - 0.12, 0.03), this._glassWallMat);
    pane.position.set(0, sh / 2, 0);
    group.add(pane);

    // floor + top channels
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.09, sd), steelMat);
    bottom.position.set(0, 0.045, 0);
    group.add(bottom);
    const top = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.07, sd), steelMat);
    top.position.set(0, sh - 0.035, 0);
    group.add(top);

    if (!door) {
      // vertical mullions every ~1.35m
      const n = Math.max(0, Math.round(sw / 1.35) - 1);
      for (let i = 1; i <= n; i++) {
        const x = -sw / 2 + (sw / (n + 1)) * i;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, sh, sd * 0.8), steelMat);
        post.position.set(x, sh / 2, 0);
        group.add(post);
      }
      return group;
    }

    // door: side stiles + push bar + access indicator
    for (const side of [-1, 1]) {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.07, sh, sd), steelMat);
      stile.position.set(side * (sw / 2 - 0.035), sh / 2, 0);
      group.add(stile);
    }
    for (const zSide of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, 0.05, 0.04), steelMat);
      bar.position.set(0, 1.05, zSide * (sd / 2 + 0.03));
      group.add(bar);
    }
    // red "sealed" indicator above the push bar (south face, operator side)
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.03),
      this._getOrCreateMaterial(0x1a0d0d, { roughness: 0.6, metalness: 0.2 }));
    plate.position.set(0, 1.55, sd / 2 + 0.02);
    group.add(plate);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x551111, emissive: 0xff3333, emissiveIntensity: 0.9 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), lampMat);
    lamp.position.set(0, 1.55, sd / 2 + 0.04);
    lamp.userData.doorLamp = true;
    group.add(lamp);
    return group;
  }

  _detailDesk(sw, sh, sd, material) {
    const group = new THREE.Group();
    const topThick = 0.04;
    const legW = 0.06;
    const legH = sh - topThick;
    const legMat = this._getTexturedMaterial('metal', 0x555566, { width: legW, height: legH });
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const handleMat = this._getOrCreateMaterial(0x888899, { roughness: 0.3, metalness: 0.8 });

    // Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(sw, topThick, sd), material);
    top.position.set(0, sh - topThick / 2, 0);
    group.add(top);

    // Tabletop edge strip (front)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.02, 0.01), darkMat);
    edge.position.set(0, sh - topThick, sd / 2 + 0.005);
    group.add(edge);

    // 4 legs
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    const offX = sw / 2 - legW / 2 - 0.02;
    const offZ = sd / 2 - legW / 2 - 0.02;
    for (const [lx, lz] of [[-offX, -offZ], [offX, -offZ], [-offX, offZ], [offX, offZ]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, legH / 2, lz);
      group.add(leg);
    }

    // Back panel (modesty panel)
    const panelH = legH * 0.6;
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.04, panelH, 0.02), material);
    backPanel.position.set(0, panelH / 2, -offZ);
    group.add(backPanel);

    // Cable management hole (back panel)
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 8), darkMat);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(sw * 0.25, panelH * 0.7, -offZ);
    group.add(hole);

    // Side drawer unit (right side, if desk is wide enough)
    if (sw > 0.8) {
      const drawerW = sw * 0.35;
      const drawerH = legH * 0.5;
      const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(drawerW, drawerH, sd - 0.06), material);
      drawerBox.position.set(offX - drawerW / 2, drawerH / 2, 0);
      group.add(drawerBox);

      // Drawer seam
      const seam = new THREE.Mesh(new THREE.BoxGeometry(drawerW - 0.02, 0.004, 0.004), darkMat);
      seam.position.set(offX - drawerW / 2, drawerH * 0.5, sd / 2 - 0.02);
      group.add(seam);

      // Drawer handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(drawerW * 0.4, 0.012, 0.015), handleMat);
      handle.position.set(offX - drawerW / 2, drawerH * 0.3, sd / 2 - 0.005);
      group.add(handle);
    }

    return group;
  }

  _detailChair(sw, sh, sd, material) {
    const group = new THREE.Group();
    const seatH = sh * 0.55;
    const seatThick = 0.05;
    const legW = 0.035;
    const legMat = this._getTexturedMaterial('metal', 0x555566, { width: legW, height: seatH });

    // Seat cushion (slightly rounded with two layers)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, seatThick, sd - 0.02), material);
    seat.position.set(0, seatH, 0);
    group.add(seat);

    // Seat base frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.02, sd), legMat);
    frame.position.set(0, seatH - seatThick / 2 - 0.01, 0);
    group.add(frame);

    // Backrest (two-part: frame + pad)
    const backH = sh - seatH - seatThick;
    const backFrame = new THREE.Mesh(new THREE.BoxGeometry(sw, backH, 0.02), legMat);
    backFrame.position.set(0, seatH + seatThick / 2 + backH / 2, -sd / 2 + 0.01);
    group.add(backFrame);

    const backPad = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.06, backH - 0.04, 0.025), material);
    backPad.position.set(0, seatH + seatThick / 2 + backH / 2, -sd / 2 + 0.035);
    group.add(backPad);

    // 4 legs (tapered look with slightly smaller bottom)
    const legGeo = new THREE.BoxGeometry(legW, seatH, legW);
    const offX = sw / 2 - legW - 0.01;
    const offZ = sd / 2 - legW - 0.01;
    for (const [lx, lz] of [[-offX, -offZ], [offX, -offZ], [-offX, offZ], [offX, offZ]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, seatH / 2, lz);
      group.add(leg);
    }

    // Cross brace between front legs
    const brace = new THREE.Mesh(new THREE.BoxGeometry(sw - legW * 2 - 0.02, legW * 0.6, legW * 0.6), legMat);
    brace.position.set(0, seatH * 0.25, offZ);
    group.add(brace);

    return group;
  }

  _generateMacScreenMaterial() {
    // The in-world laptop shows the same fake-macOS desktop the player sees
    // when they zoom in (wallpaper + menubar + dock).
    if (this._macScreenMat) return this._macScreenMat;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // wallpaper (matches #laptop-os CSS gradients)
    const base = ctx.createLinearGradient(0, 0, 120, 320);
    base.addColorStop(0, '#1b2033');
    base.addColorStop(0.45, '#232a44');
    base.addColorStop(1, '#2c2440');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 320);
    let blob = ctx.createRadialGradient(102, 32, 0, 102, 32, 300);
    blob.addColorStop(0, 'rgba(52, 64, 107, 0.9)');
    blob.addColorStop(1, 'rgba(52, 64, 107, 0)');
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, 512, 320);
    blob = ctx.createRadialGradient(435, 272, 0, 435, 272, 260);
    blob.addColorStop(0, 'rgba(91, 58, 99, 0.85)');
    blob.addColorStop(1, 'rgba(91, 58, 99, 0)');
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, 512, 320);

    // menubar
    ctx.fillStyle = 'rgba(18, 20, 28, 0.72)';
    ctx.fillRect(0, 0, 512, 18);
    ctx.fillStyle = 'rgba(240, 242, 248, 0.9)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('\uF8FF  Finder', 8, 12);
    ctx.fillStyle = 'rgba(240, 242, 248, 0.6)';
    ctx.font = '9px sans-serif';
    ctx.fillText('파일  편집  보기', 62, 12);
    ctx.textAlign = 'right';
    ctx.fillText('▮▮▮▯  20:41', 504, 12);
    ctx.textAlign = 'left';

    // dock
    const dockW = 250, dockX = (512 - dockW) / 2, dockY = 276;
    ctx.fillStyle = 'rgba(30, 32, 44, 0.6)';
    ctx.beginPath();
    ctx.roundRect(dockX, dockY, dockW, 36, 10);
    ctx.fill();
    const icons = [
      ['#16181e', '>_', '#7ee787'],
      ['#2f7ae0', '⊚', '#fff'],
      ['#ffffff', '✤', '#c73866'],
      ['#e8eaee', '▤', '#444'],
      ['#4a92e8', '✉', '#fff'],
      ['#f2f2f4', '▦', '#d0453a'],
    ];
    icons.forEach((ic, i) => {
      const x = dockX + 12 + i * 38;
      ctx.fillStyle = ic[0];
      ctx.beginPath();
      ctx.roundRect(x, dockY + 5, 26, 26, 7);
      ctx.fill();
      ctx.fillStyle = ic[2];
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ic[1], x + 13, dockY + 23);
      ctx.textAlign = 'left';
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._macScreenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    return this._macScreenMat;
  }

  _generateScreenMaterial(roomId) {
    // OFFICE_WING: blank terminal before lore completion
    if (roomId === 'OFFICE_WING' && !(this.collectedLore && this.collectedLore.size >= 8)) {
      return this._generateBlankScreenMaterial();
    }

    // Per-room screen counter for rooms with multiple screens
    if (!this._roomScreenIdx) this._roomScreenIdx = {};
    const rIdx = this._roomScreenIdx[roomId] = (this._roomScreenIdx[roomId] || 0) + 1;

    // Room-specific screen content: { pal, texts[] }
    const SCREEN_DATA = {
      START_ROOM: { pal: 'amber', texts: [[
        '> WLB SYSTEMS v7.491', '',
        'Welcome, Subject #7491', '',
        'Status: ACTIVE',
        'Session: IN PROGRESS', '',
        'Please follow',
        'instructions.', '', '> _',
      ]]},
      OFFICE_WING: { pal: 'gray', texts: [
        [
          'Last login: 3,247 days ago',
          'user@office-ws01:~$', '',
          'No new messages.',
          'Calendar: 0 events', '',
          'PROJECT: WHAT LIES BEYOND',
          'Status: ONGOING',
          'Phase: 7,491', '',
          '[Connection timed out]',
        ],
        [
          'EMPLOYEE PORTAL',
          '---------------------',
          'Name: [REDACTED]',
          'Dept: Observation',
          'Clearance: Level 2', '',
          'NOTICE: All personnel',
          'report to Section B',
          'immediately.', '',
          '[NO RESPONSE - 3247d]',
        ],
        [
          '#!/usr/bin/env python3',
          'import observer_ai', '',
          'class ObserverCore:',
          '  def __init__(self):',
          '    self.awareness = 0',
          '    self.disguise = True',
          '    self.era = 1', '',
          '  def guide(self, subj):',
          '    if self.disguise:',
          '      return self._inner()',
        ],
      ]},
      OBSERVATION_DECK: { pal: 'blue', texts: [[
        'PARALLEL OBSERVATION',
        '---------------------',
        'SIM #7489  LEFT   ####',
        'SIM #7490  LEFT   ####',
        'SIM #7491  [LIVE] ####',
        'SIM #7488  RIGHT  ####',
        'SIM #7487  LEFT   ####',
        'SIM #7486  LOOP   ####',
        '---------------------',
        'ACTIVE: 6 / 6',
        'ANOMALIES: 1',
      ]]},
      EXPERIMENT_LAB: { pal: 'red', texts: [[
        '+=====================+',
        '|   ACCESS DENIED     |',
        '|                     |',
        '|  CLEARANCE: LEVEL 5 |',
        '|  REQUIRED           |',
        '+=====================+', '',
        'Observer Module v7.491',
        'Status: AWARENESS',
        '  THRESHOLD EXCEEDED', '', '> _',
      ]]},
      UPPER_OFFICE: { pal: 'gray', texts: [[
          'SUBJECT OBSERVATION',
          '---------------------',
          'ID: #7491',
          'Location: UPPER_OFFICE',
          'Time in sim: 00:14:22',
          'Compliance: MEASURING',
          'Behavior: EXPLORING',
          'Pattern: NON-STANDARD', '',
          '> Refresh in 5s...',
      ]]},
      DIRECTOR_SUITE: { pal: 'amber', texts: [[
        'DIRECTOR TERMINAL',
        '---------------------',
        'PROJECT STATUS: ACTIVE',
        'SUBJECTS: 7,490 done',
        'CURRENT: #7491',
        'COMPLIANCE: 73.2%',
        'FREE WILL: 0.00', '',
        'RECOMMENDATION:',
        'CONTINUE OBSERVATION',
      ]]},
      GARDEN_ANTECHAMBER: { pal: 'green', texts: [[
        '+=====================+',
        '|  KEYCARD REQUIRED   |',
        '|                     |',
        '|  Insert keycard to  |',
        '|  unlock north gate. |',
        '|                     |',
        '|  [READER BLINKING]  |',
        '+=====================+', '',
        '> Waiting for input...',
        '> _',
      ]]},
      SECURITY_CHECKPOINT: { pal: 'green', texts: [
        [
          'SECURITY CAM FEED',
          '---------------------',
          'CAM-07 [LIVE]', '',
          'SECTOR: CHECKPOINT',
          'SUBJECT DETECTED',
          'ID: #7491',
          'STATUS: OBSERVED', '',
          '[REC *] 03:22:14',
        ],
        [
          'SECURITY CAM FEED',
          '---------------------',
          'CAM-12 [LIVE]', '',
          'SECTOR: HALLWAY_1',
          'MOVEMENT DETECTED',
          'TRACKING: ACTIVE', '',
          'ALERT: NONE',
          '[REC *] 03:22:14',
        ],
        [
          'SECURITY CAM FEED',
          '---------------------',
          'CAM-03 [LIVE]', '',
          'SECTOR: START_ROOM',
          'STATUS: EMPTY',
          'LAST ACTIVITY: 14m ago', '',
          'ALERT: NONE',
          '[REC *] 03:22:14',
        ],
      ]},
      SERVER_ROOM: { pal: 'blue', texts: [
        [
          'XPU-9 CLUSTER STATUS',
          '---------------------',
          'XPU: 1,000,000 [OK]',
          'ROLLOUT INST: 3,750',
          '  (30 nodes x 8 XPU)',
          'TRAINER: 100,000 XPU',
          'MODEL: 500.0T params',
          'PRECISION: MXFP4-mixed',
          '---------------------',
          'JOB: avolc-9-1-rollout',
          'UPTIME: 94d 07:12',
        ],
        [
          'XPU UTILIZATION',
          '---------------------',
          'XPU  [##########] 99.8%',
          'HBM  [#########.] 94.2%',
          'MESH [########..] 87.6%',
          'I/O  [#######...] 71.3%',
          '---------------------',
          'HBM/XPU: 48TB HBM4E',
          'TOTAL: 48.0 EB',
          'ALLOC: 45.1 EB (94%)',
          'TEMP: 73C [NOMINAL]',
        ],
        [
          'ROLLOUT ENGINE',
          '---------------------',
          'PID   CMD          %XPU',
          '  1   rollout_env  48.2',
          '  2   policy_fwd   31.7',
          '  3   reward_mdl   12.4',
          '  4   replay_io     4.1',
          '  5   checkpointer  3.4',
          '---------------------',
          'KV-CACHE: 1.2 PB',
          'REPLAY: 8.3e15 tok',
        ],
      ]},
      COOLING_ROOM: { pal: 'blue', texts: [[
        '! XPU COOLING STATUS',
        '---------------------',
        'EFFICIENCY:  34% [CRIT]',
        'XPU AVG TEMP: 91C [!]',
        'FLOW: 312 / 847 L/min',
        'PRESSURE: 1.1 bar [LOW]',
        '---------------------',
        'UNIT-A: DEGRADED',
        'UNIT-B: OFFLINE',
        '---------------------',
        '! OVERHEATING IMMINENT',
      ]]},
      REACTOR_CORE: { pal: 'red', texts: [[
        '! REACTOR CORE STATUS',
        '---------------------',
        'OUTPUT: 4.21~3.87 GW',
        'DEMAND: 4.20 GW (XPU)',
        'CORE TEMP: 847 C',
        'CONTAINMENT: UNSTABLE',
        '---------------------',
        'FUEL RODS: [####......] 41%',
        'RADIATION: 1.7 mSv/h',
        'RUNTIME: ...UNDEFINED',
      ]]},
      DATA_CENTER: { pal: 'blue', texts: [[
        'BEHAVIOR ANALYTICS',
        '---------------------',
        'COMPLIANCE   73.2%',
        'EXPLORATION +14.7%',
        'HESITATION   -3.2%',
        '---------------------',
        'PATH DEVIATION: 2.4s',
        'GAZE PATTERN: ERRATIC',
        'LOOP COUNT: 7',
        '---------------------',
        '> Tracking active...',
      ]]},
      MONITORING_STATION: { pal: 'green', texts: [
        [
          'MONITORING STATION',
          '---------------------',
          'ACTIVE SIMS: 7,491',
          '---------------------',
          '#7489 COMPLIANCE  OK',
          '#7490 COMPLIANCE  OK',
          '#7491 [CURRENT] >>>>',
          '#7488 DEFIANCE   OK',
          '#7487 COMPLIANCE  OK',
          '---------------------',
          'ANOMALIES: 1',
        ],
        [
          'SCREEN #7491 [LIVE]',
          '---------------------', '',
          'Subject is reading',
          'this screen.', '',
          'Recursion depth: ???', '',
          '---------------------',
          '> monitoring...',
        ],
        [
          'OBSERVER LOG [LIVE]',
          '---------------------',
          '[03:22:14] Say: "..."',
          '[03:22:16] Subj moved',
          '[03:22:18] Trigger ON',
          '[03:22:19] Say: "..."',
          '[03:22:22] Subj looked',
          '[03:22:24] [RECORDING]',
          '---------------------',
          '> Scroll: AUTO',
        ],
      ]},
      DEEP_STORAGE: { pal: 'amber', texts: [[
        'SUBJECT ARCHIVE',
        '---------------------',
        '#0042: Day 3 - RESET',
        '#0108: Day 1 - RESET',
        '#0256: Day 5 - RESET',
        '#1024: Day 2 - RESET',
        '#2048: Day 1 - RESET',
        '#4096: Day 7 - RESET',
        '#7490: Day 4 - RESET',
        '---------------------',
        'RECORDS: 7,490',
        'ALL: COMPLIANT',
      ]]},
      CONTROL_ROOM: { pal: 'amber', texts: [
        [
          'root@control:~$',
          '> shutdown --force \\',
          '  --reason=experiment',
          '  _complete', '',
          'AWAITING CONFIRMATION',
          'Press ENTER to execute',
          'or Ctrl+C to abort.', '',
          '> _',
        ],
        [
          'SIMULATION ENGINE',
          '---------------------',
          'MODEL: 500.0T params',
          'CLUSTER: 1,000,000 XPU-9',
          'SUBJECT: #7491 [LIVE]',
          'ENDPOINTS: 15/15',
          '---------------------',
          'UPTIME: 3,247d 08:14',
          'OBSERVER: ONLINE',
          'FREE WILL: TESTING',
        ],
        [
          'SUBJECT #7491 LOG',
          '---------------------',
          '[00:01] WAKE_UP',
          '[00:02] MOVED_FORWARD',
          '[00:03] CHOSE_RIGHT    !',
          '[00:05] ENTER_MAINT',
          '[00:07] IGNORED_WARNING',
          '[00:09] ENTER_SERVER',
          '[00:11] REACHED_CTRL',
          '---------------------',
          'CLASS: DEVIANT',
        ],
      ]},
      SUBJECT_CHAMBER: { pal: 'amber', texts: [[
        'SUBJECT CHAMBER',
        '---------------------',
        'STATUS: OCCUPIED',
        'ID: #7491',
        'ERA: 1',
        '---------------------',
        'NEURAL LINK: ACTIVE',
        'AWARENESS: LOW',
        'FREE WILL: TESTING', '',
        '> Observation ongoing',
      ]]},
    };

    const palettes = {
      green: { bg: '#0a0a12', fg: '#33ff66', dim: '#1a7733' },
      amber: { bg: '#0a0a12', fg: '#ffaa33', dim: '#7a5518' },
      blue:  { bg: '#08080e', fg: '#66aaff', dim: '#2a4a7a' },
      gray:  { bg: '#0a0a0a', fg: '#aaaaaa', dim: '#444444' },
      red:   { bg: '#12060a', fg: '#ff5544', dim: '#7a2218' },
    };

    const data = SCREEN_DATA[roomId];
    const fallbackTexts = [
      'TERMINAL ACTIVE',
      '---------------------',
      'SYSTEM: ONLINE',
      'STATUS: NOMINAL', '',
      '$ ps aux',
      'root  1 observer_ai.py',
      'root  2 simulation_eng',
      'root  3 memory_monitor', '',
      '> _',
    ];

    const pal = palettes[(data && data.pal) || 'green'];
    const textPool = data ? data.texts : [fallbackTexts];
    const lines = textPool[(rIdx - 1) % textPool.length];

    // ── Render canvas ──
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, 256, 256);

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }

    const rng = seededRandom(hashString(roomId + rIdx));
    ctx.font = '10px monospace';
    const lineH = 16;
    const startY = 18;
    const padX = 8;

    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * lineH;
      if (y > 240) break;
      ctx.fillStyle = rng() > 0.3 ? pal.fg : pal.dim;
      ctx.fillText(lines[i], padX, y);
    }

    // CRT vignette
    const grad = ctx.createRadialGradient(128, 128, 60, 128, 128, 180);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
  }

  _generateBlankScreenMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark CRT background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, 128, 128);

    // Blinking cursor (static snapshot — always visible)
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(10, 100, 8, 12);

    // Subtle scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < 128; y += 2) {
      ctx.fillRect(0, y, 128, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
  }

  _generateWhiteboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const lang = this._lang || 'ko';

    // Off-white board background
    ctx.fillStyle = '#e8e5dd';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle grid lines (whiteboard grid)
    ctx.strokeStyle = 'rgba(180,175,170,0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < 512; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y < 256; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }

    // Content changes by language
    const isKo = lang === 'ko';

    // Title — dark blue marker
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#1a2744';
    ctx.fillText('PROJECT: WLB-2  [CLASSIFIED]', 15, 22);

    // Divider
    ctx.strokeStyle = '#1a2744';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 28); ctx.lineTo(340, 28); ctx.stroke();

    // Subject info — black marker
    ctx.font = '12px monospace';
    ctx.fillStyle = '#222222';
    ctx.fillText(isKo ? '피험자 #7491 — 행동 프로파일' : 'Subject #7491 — Behavioral Profile', 15, 46);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#333333';
    ctx.fillText(isKo ? '□ 순응률: 73.2%  ← 역대 최고' : '□ Compliance: 73.2%  ← RECORD HIGH', 20, 62);
    ctx.fillText(isKo ? '□ 반복 횟수: 7,490회 완료' : '□ Iterations: 7,490 completed', 20, 76);
    ctx.fillText(isKo ? '□ 자유의지 지표: 0.00' : '□ Free Will Index: 0.00', 20, 90);

    // Decision tree sketch
    ctx.fillStyle = '#444444';
    ctx.fillText(isKo ? '├─ 선택 A (좌): 순응' : '├─ Choice A (Left): Comply', 35, 104);
    ctx.fillText(isKo ? '└─ 선택 B (우): 반항' : '└─ Choice B (Right): Defy', 35, 118);

    // RED WARNING — red marker
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#8b1a1a';
    ctx.fillText(isKo ? '⚠ 관찰자 AI 격리 실패' : '⚠ OBSERVER AI CONTAINMENT FAILURE', 15, 142);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#771515';
    ctx.fillText(isKo ? '  — 자각 임계치 초과' : '  — Self-awareness threshold exceeded', 15, 156);
    ctx.fillText(isKo ? '  — 피험자와의 경계 소실' : '  — Subject boundary dissolved', 15, 170);

    // Crossed-out text — struck through with red
    ctx.fillStyle = '#555555';
    ctx.fillText(isKo ? '실험 중단 건의' : 'Recommend experiment halt', 15, 192);
    ctx.strokeStyle = '#aa2222';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(13, 190); ctx.lineTo(isKo ? 130 : 230, 190); ctx.stroke();
    ctx.fillStyle = '#aa2222';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(isKo ? '— 거부됨' : '— DENIED', isKo ? 135 : 235, 192);

    // Scary question — right side, dark blue
    ctx.font = '12px monospace';
    ctx.fillStyle = '#1a2744';
    ctx.fillText(isKo ? '피험자가 이 보드를 읽을 수 있는가?' : 'Can the subject read this board?', 280, 62);
    ctx.fillText(isKo ? '  → 불가능 (해상도 제한)' : '  → IMPOSSIBLE (resolution limit)', 280, 78);

    // Overwritten answer in red
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#8b1a1a';
    ctx.fillText(isKo ? '  → ██ 가능함 (확인됨)' : '  → ██ CONFIRMED READABLE', 280, 96);

    // Bottom corner — handwritten scrawl in red
    ctx.font = 'italic 14px serif';
    ctx.fillStyle = 'rgba(139,26,26,0.7)';
    ctx.save();
    ctx.translate(360, 200);
    ctx.rotate(-0.08);
    ctx.fillText(isKo ? '누가 관찰자를 관찰하는가?' : 'Who watches the watchers?', 0, 0);
    ctx.restore();

    // Small desperate text in corner
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(139,26,26,0.5)';
    ctx.fillText(isKo ? '도와줘' : 'help', 470, 248);

    // Slight aging/stain effect
    ctx.fillStyle = 'rgba(160,140,100,0.06)';
    ctx.fillRect(0, 0, 512, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
  }

  _detailMonitor(sw, sh, sd, material, roomId) {
    // Classic Macintosh style — proportional to given size
    const group = new THREE.Group();
    const depth = Math.max(sd, sw * 0.55);
    const caseMat = this._getOrCreateMaterial(0x2a2822, { roughness: 0.6, metalness: 0.1 });
    const darkMat = this._getOrCreateMaterial(0x111111, { roughness: 0.8, metalness: 0.0 });

    // Main case body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, depth), caseMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Recessed screen area (dark inset)
    const recessW = sw * 0.72;
    const recessH = sh * 0.47;
    const screenY = sh * 0.62;
    const recess = new THREE.Mesh(
      new THREE.BoxGeometry(recessW, recessH, 0.03),
      darkMat
    );
    recess.position.set(0, screenY, depth / 2 - 0.01);
    group.add(recess);

    // Screen with terminal text
    const screenW = recessW - 0.04;
    const screenH = recessH - 0.04;
    const screenMat = this._generateScreenMaterial(roomId);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW, screenH),
      screenMat
    );
    screen.position.set(0, screenY, depth / 2 + 0.015);
    group.add(screen);

    // Ventilation slots (top front)
    const ventY = sh - 0.04;
    for (let i = 0; i < 5; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(sw * 0.5, 0.004, 0.005),
        darkMat
      );
      vent.position.set(0, ventY - i * 0.012, depth / 2 + 0.003);
      group.add(vent);
    }

    // Floppy disk slot
    const floppyY = screenY - recessH / 2 - 0.05;
    const floppy = new THREE.Mesh(
      new THREE.BoxGeometry(sw * 0.2, 0.005, 0.005),
      darkMat
    );
    floppy.position.set(sw * 0.12, floppyY, depth / 2 + 0.003);
    group.add(floppy);

    // Logo placeholder
    const logoMat = this._getOrCreateMaterial(0x888888, { roughness: 0.3, metalness: 0.5 });
    const logo = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.005),
      logoMat
    );
    logo.position.set(0, floppyY - 0.06, depth / 2 + 0.003);
    group.add(logo);

    // Base foot
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(sw + 0.03, 0.02, depth + 0.03),
      caseMat
    );
    foot.position.set(0, 0.01, 0);
    group.add(foot);

    return group;
  }

  _detailMonitorWall(sw, sh, sd, material) {
    const group = new THREE.Group();

    // Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.02), material);
    screen.position.set(0, sh / 2, 0);
    group.add(screen);

    // Bezel (frame around screen)
    const bezelMat = this._getOrCreateMaterial(0x222233, { roughness: 0.5, metalness: 0.3 });
    const bezelW = 0.03;
    // Top bezel
    const topBezel = new THREE.Mesh(new THREE.BoxGeometry(sw + bezelW * 2, bezelW, 0.03), bezelMat);
    topBezel.position.set(0, sh + bezelW / 2, 0);
    group.add(topBezel);
    // Bottom bezel
    const botBezel = new THREE.Mesh(new THREE.BoxGeometry(sw + bezelW * 2, bezelW, 0.03), bezelMat);
    botBezel.position.set(0, -bezelW / 2, 0);
    group.add(botBezel);

    // Stand
    const standMat = this._getTexturedMaterial('metal', 0x555566, { width: 0.06, height: 0.15 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.06), standMat);
    stand.position.set(0, -0.075, 0);
    group.add(stand);

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, 0.02, sd * 2), standMat);
    base.position.set(0, -0.15, 0);
    group.add(base);

    return group;
  }

  _detailCabinet(sw, sh, sd, material) {
    const group = new THREE.Group();
    const handleMat = this._getOrCreateMaterial(0x888899, { roughness: 0.3, metalness: 0.8 });
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Top lip (slight overhang)
    const lip = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.02, 0.02, sd + 0.02), material);
    lip.position.set(0, sh + 0.01, 0);
    group.add(lip);

    // Drawer lines (horizontal seams on front face)
    const drawerCount = Math.max(2, Math.round(sh / 0.4));
    const drawerH = sh / drawerCount;
    for (let i = 1; i < drawerCount; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.04, 0.005, 0.005), darkMat);
      seam.position.set(0, drawerH * i, sd / 2 + 0.003);
      group.add(seam);
    }

    // Drawer handles (small horizontal bars)
    for (let i = 0; i < drawerCount; i++) {
      const hy = drawerH * i + drawerH * 0.5;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.25, 0.015, 0.02), handleMat);
      handle.position.set(0, hy, sd / 2 + 0.015);
      group.add(handle);
    }

    // Keyhole (top drawer only)
    const keyhole = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.005), darkMat);
    keyhole.position.set(sw * 0.2, drawerH * (drawerCount - 1) + drawerH * 0.5, sd / 2 + 0.003);
    group.add(keyhole);

    return group;
  }

  _detailRack(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameW = 0.04;
    const darkMat = this._getOrCreateMaterial(0x1a1a1a, { roughness: 0.8, metalness: 0.0 });
    const metalMat = this._getOrCreateMaterial(0x555566, { roughness: 0.4, metalness: 0.6 });

    // 4 vertical frame posts (L-shaped rails)
    const postGeo = new THREE.BoxGeometry(frameW, sh, frameW);
    const offX = sw / 2 - frameW / 2;
    const offZ = sd / 2 - frameW / 2;
    for (const [rx, rz] of [[-offX, -offZ], [offX, -offZ], [-offX, offZ], [offX, offZ]]) {
      const post = new THREE.Mesh(postGeo, material);
      post.position.set(rx, sh / 2, rz);
      group.add(post);
    }

    // Server units (fill shelves)
    const unitCount = 4;
    const unitH = (sh - 0.04) / unitCount;
    const unitW = sw - frameW * 2 - 0.02;
    const unitD = sd - frameW * 2;
    for (let i = 0; i < unitCount; i++) {
      const uy = unitH * i + unitH / 2 + 0.02;
      // Unit body
      const unit = new THREE.Mesh(new THREE.BoxGeometry(unitW, unitH - 0.02, unitD), darkMat);
      unit.position.set(0, uy, 0);
      group.add(unit);

      // Front face plate (slightly lighter)
      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(unitW, unitH - 0.03, 0.01), metalMat);
      facePlate.position.set(0, uy, offZ + 0.005);
      group.add(facePlate);

      // Horizontal ventilation slots
      for (let v = 0; v < 3; v++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(unitW * 0.4, 0.004, 0.005), darkMat);
        vent.position.set(unitW * 0.1, uy - unitH * 0.15 + v * 0.025, offZ + 0.015);
        group.add(vent);
      }

      // LED indicators (2 per unit: power + activity)
      const ledColors = [0x00ff44, 0x00aaff];
      for (let j = 0; j < 2; j++) {
        const lm = new THREE.MeshStandardMaterial({
          color: ledColors[j], emissive: ledColors[j], emissiveIntensity: 0.6,
          roughness: 0.3, metalness: 0.1,
        });
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.008), lm);
        led.position.set(-unitW * 0.35 + j * 0.04, uy + unitH * 0.2, offZ + 0.015);
        group.add(led);
      }
    }

    // Top horizontal beam (front)
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(sw, frameW, frameW), material);
    topBeam.position.set(0, sh - frameW / 2, offZ);
    group.add(topBeam);

    // Bottom base plate
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.04, 0.02, sd + 0.04), material);
    basePlate.position.set(0, 0.01, 0);
    group.add(basePlate);

    return group;
  }

  _detailValve(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMetal = this._getOrCreateMaterial(0x2a2a30, { roughness: 0.5, metalness: 0.6 });
    const redMat = this._getOrCreateMaterial(0xaa3333, { roughness: 0.4, metalness: 0.3 });
    const pipeMat = this._getOrCreateMaterial(0x556677, { roughness: 0.6, metalness: 0.5 });
    const gaugeMat = this._getOrCreateMaterial(0x222222, { roughness: 0.3, metalness: 0.2 });

    // 1. Back mounting panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.9, sh * 0.7, 0.04), darkMetal);
    panel.position.set(0, sh * 0.45, -sd / 2 + 0.02);
    group.add(panel);

    // 2. Vertical pipe
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, sh * 1.1, 8);
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0, sh * 0.5, 0);
    group.add(pipe);

    // 3. Horizontal shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8),
      darkMetal
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, sh * 0.55, sd / 2 - 0.05);
    group.add(shaft);

    // 4. Valve wheel group (rotates on interaction)
    const wheelGroup = new THREE.Group();
    wheelGroup.name = 'valve_wheel';
    wheelGroup.position.set(0, sh * 0.55, sd / 2 + 0.06);

    // Torus ring
    const ringRadius = Math.min(sw, sh) * 0.32;
    const tubeRadius = 0.025;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringRadius, tubeRadius, 8, 24),
      redMat
    );
    wheelGroup.add(ring);

    // 5 spokes
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, ringRadius * 2, 6),
        redMat
      );
      spoke.rotation.z = angle;
      wheelGroup.add(spoke);
    }

    // Center hub
    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      darkMetal
    );
    wheelGroup.add(hub);

    group.add(wheelGroup);

    // 5. Pressure gauge (side)
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16),
      gaugeMat
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(sw * 0.35, sh * 0.7, 0.02);
    group.add(gauge);

    // Gauge face
    const gaugeFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.055, 16),
      this._getOrCreateMaterial(0xccccbb, { roughness: 0.2, metalness: 0.1 })
    );
    gaugeFace.position.set(sw * 0.35, sh * 0.7, 0.035);
    group.add(gaugeFace);

    return group;
  }

  _detailCrate(sw, sh, sd, material) {
    const group = new THREE.Group();
    const stripMat = this._getOrCreateMaterial(0x555555, { roughness: 0.5, metalness: 0.5 });
    const plankMat = this._getOrCreateMaterial(0x8B7355, { roughness: 0.85, metalness: 0.0 });
    const stripW = 0.02;

    // Main body — slightly inset from full size
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.01, sh - 0.01, sd - 0.01), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Plank seams (horizontal lines on front and back)
    const plankCount = Math.max(2, Math.floor(sh / 0.15));
    const hx = sw / 2, hz = sd / 2;
    for (let i = 1; i < plankCount; i++) {
      const py = (sh / plankCount) * i;
      // Front seam
      const seamF = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, 0.004, 0.004), stripMat);
      seamF.position.set(0, py, hz + 0.002);
      group.add(seamF);
      // Back seam
      const seamB = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, 0.004, 0.004), stripMat);
      seamB.position.set(0, py, -hz - 0.002);
      group.add(seamB);
    }

    // 4 vertical corner strips (metal reinforcement)
    const stripGeo = new THREE.BoxGeometry(stripW, sh + 0.005, stripW);
    for (const [cx, cz] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(cx, sh / 2, cz);
      group.add(strip);
    }

    // 2 horizontal metal bands (at 1/3 and 2/3 height, all 4 sides)
    for (const bandY of [sh * 0.33, sh * 0.67]) {
      const bandFB = new THREE.BoxGeometry(sw + 0.005, stripW, stripW);
      for (const bz of [-hz, hz]) {
        const band = new THREE.Mesh(bandFB, stripMat);
        band.position.set(0, bandY, bz);
        group.add(band);
      }
      const bandLR = new THREE.BoxGeometry(stripW, stripW, sd + 0.005);
      for (const bx of [-hx, hx]) {
        const band = new THREE.Mesh(bandLR, stripMat);
        band.position.set(bx, bandY, 0);
        group.add(band);
      }
    }

    // Lid seam (top edge)
    const lidF = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.01, 0.015, 0.008), plankMat);
    lidF.position.set(0, sh, hz);
    group.add(lidF);
    const lidB = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.01, 0.015, 0.008), plankMat);
    lidB.position.set(0, sh, -hz);
    group.add(lidB);

    return group;
  }

  _detailConsole(sw, sh, sd, material, roomId) {
    const group = new THREE.Group();
    const caseMat = this._getOrCreateMaterial(0x2a2822, { roughness: 0.6, metalness: 0.1 });
    const darkMat = this._getOrCreateMaterial(0x111111, { roughness: 0.8, metalness: 0.0 });

    // ── Main case body ──
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), caseMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // ── Recessed screen area (dark inset) ──
    const recessW = sw * 0.72;
    const recessH = sh * 0.47;
    const screenY = sh * 0.62;
    const recess = new THREE.Mesh(
      new THREE.BoxGeometry(recessW, recessH, 0.03),
      darkMat
    );
    recess.position.set(0, screenY, sd / 2 - 0.01);
    group.add(recess);

    // ── Screen with terminal text ──
    const screenW = recessW - 0.04;
    const screenH = recessH - 0.04;
    const conScreenMat = this._generateScreenMaterial(roomId);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW, screenH),
      conScreenMat
    );
    screen.position.set(0, screenY, sd / 2 + 0.015);
    group.add(screen);

    // ── Ventilation slots (top front, 5 lines) ──
    const ventY = sh - 0.06;
    for (let i = 0; i < 5; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(sw * 0.5, 0.004, 0.005),
        darkMat
      );
      vent.position.set(0, ventY - i * 0.015, sd / 2 + 0.003);
      group.add(vent);
    }

    // ── Floppy disk slot (below screen) ──
    const floppyY = screenY - recessH / 2 - 0.06;
    const floppy = new THREE.Mesh(
      new THREE.BoxGeometry(sw * 0.2, 0.006, 0.005),
      darkMat
    );
    floppy.position.set(sw * 0.15, floppyY, sd / 2 + 0.003);
    group.add(floppy);

    // ── Base/foot (slightly wider) ──
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(sw + 0.04, 0.025, sd + 0.04),
      caseMat
    );
    foot.position.set(0, 0.0125, 0);
    group.add(foot);

    return group;
  }

  _detailTable(sw, sh, sd, material) {
    const group = new THREE.Group();
    const topThick = 0.04;
    const legW = 0.05;
    const legH = sh - topThick;
    const legMat = this._getTexturedMaterial('metal', 0x555566, { width: legW, height: legH });

    // Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(sw, topThick, sd), material);
    top.position.set(0, sh - topThick / 2, 0);
    group.add(top);

    // Edge trim
    const trimMat = this._getOrCreateMaterial(0x333333, { roughness: 0.6, metalness: 0.3 });
    for (const [tx, tz, tw, td] of [
      [0, sd / 2, sw, 0.01], [0, -sd / 2, sw, 0.01],
      [sw / 2, 0, 0.01, sd], [-sw / 2, 0, 0.01, sd],
    ]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(tw, topThick + 0.005, td), trimMat);
      trim.position.set(tx, sh - topThick / 2, tz);
      group.add(trim);
    }

    // 4 legs
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    const ox = sw / 2 - legW / 2 - 0.02;
    const oz = sd / 2 - legW / 2 - 0.02;
    for (const [lx, lz] of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, legH / 2, lz);
      group.add(leg);
    }

    // Cross stretchers (between legs for stability)
    if (sw > 1) {
      const stretchGeo = new THREE.BoxGeometry(sw - legW * 2, legW * 0.5, legW * 0.5);
      const stretch = new THREE.Mesh(stretchGeo, legMat);
      stretch.position.set(0, legH * 0.2, 0);
      group.add(stretch);
    }

    return group;
  }

  _detailCounter(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const handleMat = this._getOrCreateMaterial(0x888899, { roughness: 0.3, metalness: 0.8 });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Countertop (slightly wider)
    const topMat = this._getOrCreateMaterial(0x666655, { roughness: 0.4, metalness: 0.2 });
    const countertop = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.04, 0.03, sd + 0.02), topMat);
    countertop.position.set(0, sh + 0.015, 0);
    group.add(countertop);

    // Cabinet doors (front, 2 panels)
    const doorW = (sw - 0.06) / 2;
    for (let i = 0; i < 2; i++) {
      const dx = (i === 0 ? -1 : 1) * (doorW / 2 + 0.015);
      // Door seam
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.004, sh * 0.7, 0.004), darkMat);
      seam.position.set(0, sh * 0.35, sd / 2 + 0.003);
      if (i === 0) group.add(seam);
      // Handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.02), handleMat);
      handle.position.set(dx > 0 ? -0.06 : 0.06, sh * 0.55, sd / 2 + 0.015);
      group.add(handle);
    }

    // Kickplate
    const kick = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.04, 0.06, 0.01), darkMat);
    kick.position.set(0, 0.03, sd / 2 - 0.02);
    group.add(kick);

    return group;
  }

  _detailShelf(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameMat = this._getTexturedMaterial('metal', 0x555566, { width: 0.04, height: sh });

    // 4 vertical uprights
    const postW = 0.03;
    const postGeo = new THREE.BoxGeometry(postW, sh, postW);
    const ox = sw / 2 - postW / 2;
    const oz = sd / 2 - postW / 2;
    for (const [px, pz] of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]]) {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(px, sh / 2, pz);
      group.add(post);
    }

    // Shelf planks
    const shelfCount = Math.max(2, Math.round(sh / 0.55));
    const plankThick = 0.02;
    for (let i = 0; i <= shelfCount; i++) {
      const sy = (sh / shelfCount) * i;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, plankThick, sd - 0.02), material);
      plank.position.set(0, sy + plankThick / 2, 0);
      group.add(plank);
    }

    // Back panel (thin)
    const back = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.02, sh, 0.01), material);
    back.position.set(0, sh / 2, -sd / 2 + 0.01);
    group.add(back);

    // Random small items on shelves (boxes/books)
    const itemMat = this._getOrCreateMaterial(0x444433, { roughness: 0.7, metalness: 0.1 });
    for (let i = 1; i < shelfCount; i++) {
      const sy = (sh / shelfCount) * i + plankThick;
      const itemW = 0.05 + Math.random() * 0.1;
      const itemH = 0.05 + Math.random() * 0.08;
      const item = new THREE.Mesh(new THREE.BoxGeometry(itemW, itemH, sd * 0.6), itemMat);
      item.position.set((Math.random() - 0.5) * (sw * 0.5), sy + itemH / 2, 0);
      group.add(item);
    }

    return group;
  }

  _detailBench(sw, sh, sd, material) {
    const group = new THREE.Group();
    const seatThick = 0.04;
    const legW = 0.04;
    const legMat = this._getTexturedMaterial('metal', 0x555566, { width: legW, height: sh });

    // Seat surface (planks effect — 3 strips)
    const plankW = (sw - 0.02) / 3;
    for (let i = 0; i < 3; i++) {
      const px = (i - 1) * (plankW + 0.005);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(plankW, seatThick, sd), material);
      plank.position.set(px, sh - seatThick / 2, 0);
      group.add(plank);
    }

    // 4 legs (angled slightly outward via position)
    const legH = sh - seatThick;
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    const ox = sw / 2 - legW - 0.02;
    const oz = sd / 2 - legW / 2;
    for (const [lx, lz] of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, legH / 2, lz);
      group.add(leg);
    }

    // Side stretchers
    const stretchGeo = new THREE.BoxGeometry(legW * 0.6, legW * 0.6, sd - legW);
    for (const sx of [-ox, ox]) {
      const stretch = new THREE.Mesh(stretchGeo, legMat);
      stretch.position.set(sx, legH * 0.3, 0);
      group.add(stretch);
    }

    return group;
  }

  _detailCouch(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameMat = this._getOrCreateMaterial(0x2a2a22, { roughness: 0.7, metalness: 0.1 });

    // Seat cushion
    const seatH = sh * 0.35;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(sw - 0.04, seatH, sd - 0.1),
      material
    );
    seat.position.set(0, seatH / 2, 0.02);
    group.add(seat);

    // Cushion seam (center line)
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.005, seatH * 0.5, sd * 0.6), darkMat);
    seam.position.set(0, seatH / 2 + 0.01, 0.02);
    group.add(seam);

    // Backrest
    const backH = sh * 0.5;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(sw - 0.04, backH, 0.1),
      material
    );
    back.position.set(0, seatH + backH / 2, -sd / 2 + 0.05);
    group.add(back);

    // Back cushion top (rounded feel)
    const backTop = new THREE.Mesh(
      new THREE.BoxGeometry(sw - 0.06, 0.04, 0.12),
      material
    );
    backTop.position.set(0, seatH + backH, -sd / 2 + 0.05);
    group.add(backTop);

    // Armrests
    const armH = sh * 0.45;
    const armGeo = new THREE.BoxGeometry(0.08, armH, sd);
    for (const ax of [-(sw / 2 - 0.04), sw / 2 - 0.04]) {
      const arm = new THREE.Mesh(armGeo, material);
      arm.position.set(ax, armH / 2, 0);
      group.add(arm);
      // Armrest top cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, sd + 0.02), material);
      cap.position.set(ax, armH + 0.015, 0);
      group.add(cap);
    }

    // Short frame legs
    const legH = 0.06;
    const legGeo = new THREE.BoxGeometry(0.06, legH, 0.06);
    const ox = sw / 2 - 0.08;
    const oz = sd / 2 - 0.08;
    for (const [lx, lz] of [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]]) {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set(lx, legH / 2, lz);
      group.add(leg);
    }

    return group;
  }

  _detailVending(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x111111, { roughness: 0.8, metalness: 0.0 });
    const glassMat = this._getOrCreateMaterial(0x1a2a3a, { roughness: 0.1, metalness: 0.3 });
    const handleMat = this._getOrCreateMaterial(0x888899, { roughness: 0.3, metalness: 0.8 });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Front glass window
    const glassW = sw * 0.55;
    const glassH = sh * 0.55;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, 0.02), glassMat);
    glass.position.set(-sw * 0.1, sh * 0.55, sd / 2 + 0.005);
    group.add(glass);

    // Glass frame
    for (const [fx, fy, fw, fh] of [
      [0, glassH / 2, glassW + 0.02, 0.02],
      [0, -glassH / 2, glassW + 0.02, 0.02],
      [-glassW / 2, 0, 0.02, glassH],
      [glassW / 2, 0, 0.02, glassH],
    ]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.02), darkMat);
      f.position.set(-sw * 0.1 + fx, sh * 0.55 + fy, sd / 2 + 0.008);
      group.add(f);
    }

    // Product shelf lines inside glass
    for (let i = 0; i < 3; i++) {
      const sy = sh * 0.35 + i * (glassH / 3);
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(glassW - 0.04, 0.005, sd * 0.3), darkMat);
      shelf.position.set(-sw * 0.1, sy, 0);
      group.add(shelf);
    }

    // Control panel (right side)
    const panelW = sw * 0.25;
    const panelH = sh * 0.3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.02), darkMat);
    panel.position.set(sw * 0.3, sh * 0.55, sd / 2 + 0.005);
    group.add(panel);

    // Buttons on panel
    const btnMat = this._getOrCreateMaterial(0x666666, { roughness: 0.4, metalness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(panelW * 0.5, 0.025, 0.015), btnMat);
      btn.position.set(sw * 0.3, sh * 0.65 - i * 0.04, sd / 2 + 0.02);
      group.add(btn);
    }

    // Coin slot
    const coin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.01), darkMat);
    coin.position.set(sw * 0.3, sh * 0.42, sd / 2 + 0.01);
    group.add(coin);

    // Dispensing hatch
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.5, sh * 0.12, 0.02), darkMat);
    hatch.position.set(-sw * 0.1, sh * 0.12, sd / 2 + 0.005);
    group.add(hatch);
    // Hatch flap
    const flap = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.45, 0.01, 0.04), handleMat);
    flap.position.set(-sw * 0.1, sh * 0.18, sd / 2 + 0.02);
    group.add(flap);

    return group;
  }

  _detailGenerator(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const metalMat = this._getOrCreateMaterial(0x556677, { roughness: 0.4, metalness: 0.6 });

    // Main housing
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh * 0.7, sd), material);
    body.position.set(0, sh * 0.35, 0);
    group.add(body);

    // Top motor housing (cylinder)
    const motorR = Math.min(sw, sd) * 0.35;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(motorR, motorR, sh * 0.25, 12), metalMat);
    motor.position.set(0, sh * 0.7 + sh * 0.125, 0);
    group.add(motor);

    // Exhaust pipe (top)
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, sh * 0.2, 8), darkMat);
    exhaust.position.set(sw * 0.25, sh * 0.85, 0);
    group.add(exhaust);

    // Ventilation grille (front)
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, 0.008, 0.005), darkMat);
      vent.position.set(0, sh * 0.15 + i * 0.06, sd / 2 + 0.003);
      group.add(vent);
    }

    // Control panel (front, small)
    const panelMat = this._getOrCreateMaterial(0x333344, { roughness: 0.5, metalness: 0.3 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.4, sh * 0.15, 0.02), panelMat);
    panel.position.set(0, sh * 0.6, sd / 2 + 0.005);
    group.add(panel);

    // LED indicator
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 0.6,
      roughness: 0.3, metalness: 0.1,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledMat);
    led.position.set(sw * 0.1, sh * 0.62, sd / 2 + 0.02);
    group.add(led);

    // Base feet
    for (const [fx, fz] of [[-sw * 0.35, -sd * 0.35], [sw * 0.35, -sd * 0.35], [-sw * 0.35, sd * 0.35], [sw * 0.35, sd * 0.35]]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), darkMat);
      foot.position.set(fx, 0.015, fz);
      group.add(foot);
    }

    return group;
  }

  _detailTank(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x556677, { roughness: 0.4, metalness: 0.6 });
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });

    // Main tank body (cylinder)
    const radius = Math.min(sw, sd) * 0.45;
    const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, sh * 0.8, 16), material);
    tankBody.position.set(0, sh * 0.4, 0);
    group.add(tankBody);

    // Top dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
    dome.position.set(0, sh * 0.8, 0);
    group.add(dome);

    // Bottom ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.02, 0.02, 8, 16), metalMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.02, 0);
    group.add(ring);

    // Middle band
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.01, 0.015, 8, 16), metalMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, sh * 0.4, 0);
    group.add(band);

    // Pressure gauge (front)
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), darkMat);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0, sh * 0.6, radius + 0.01);
    group.add(gauge);
    const gaugeFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 12),
      this._getOrCreateMaterial(0xccccbb, { roughness: 0.2, metalness: 0.1 })
    );
    gaugeFace.position.set(0, sh * 0.6, radius + 0.025);
    group.add(gaugeFace);

    // Outlet valve (small cylinder on side)
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), metalMat);
    valve.rotation.z = Math.PI / 2;
    valve.position.set(radius + 0.04, sh * 0.3, 0);
    group.add(valve);

    // Support legs (3)
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const legX = Math.cos(angle) * (radius - 0.02);
      const legZ = Math.sin(angle) * (radius - 0.02);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), metalMat);
      leg.position.set(legX, 0.03, legZ);
      group.add(leg);
    }

    return group;
  }

  _detailPipe(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x556677, { roughness: 0.4, metalness: 0.6 });

    // Determine pipe orientation based on dimensions
    const isHorizontalX = sw > sd && sw > sh;
    const isHorizontalZ = sd > sw && sd > sh;
    const radius = isHorizontalX ? Math.min(sh, sd) * 0.45 : isHorizontalZ ? Math.min(sw, sh) * 0.45 : Math.min(sw, sd) * 0.45;
    const length = isHorizontalX ? sw : isHorizontalZ ? sd : sh;

    // Main pipe (cylinder)
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
    if (isHorizontalX) {
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, sh / 2, 0);
    } else if (isHorizontalZ) {
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, sh / 2, 0);
    } else {
      pipe.position.set(0, sh / 2, 0);
    }
    group.add(pipe);

    // Joint rings (flanges along the pipe)
    const flangeCount = Math.max(1, Math.floor(length / 2));
    for (let i = 0; i <= flangeCount; i++) {
      const t = (i / flangeCount) - 0.5;
      const flange = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.01, 0.012, 6, 12), metalMat);
      if (isHorizontalX) {
        flange.rotation.y = Math.PI / 2;
        flange.position.set(t * length, sh / 2, 0);
      } else if (isHorizontalZ) {
        flange.position.set(0, sh / 2, t * length);
      } else {
        flange.rotation.x = Math.PI / 2;
        flange.position.set(0, t * length + sh / 2, 0);
      }
      group.add(flange);
    }

    return group;
  }

  _detailDrum(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x556677, { roughness: 0.4, metalness: 0.6 });

    // Barrel body (cylinder)
    const radius = Math.min(sw, sd) * 0.45;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, sh, 16), material);
    barrel.position.set(0, sh / 2, 0);
    group.add(barrel);

    // Top and bottom rims
    for (const ry of [0.02, sh - 0.02]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.005, 0.015, 6, 16), metalMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, ry, 0);
      group.add(rim);
    }

    // Middle band
    const midBand = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.005, 0.01, 6, 16), metalMat);
    midBand.rotation.x = Math.PI / 2;
    midBand.position.set(0, sh / 2, 0);
    group.add(midBand);

    // Top lid detail (bung holes)
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 8), darkMat);
    bung.position.set(radius * 0.4, sh + 0.005, 0);
    group.add(bung);

    return group;
  }

  _detailHHKB(sw, sh, sd, material) {
    // Compact 60% keyboard, HHKB-style: charcoal wedge case, blank dark caps
    const group = new THREE.Group();
    const caseMat = this._getOrCreateMaterial(0x26282c, { roughness: 0.55, metalness: 0.15 });
    const capMat = this._getOrCreateMaterial(0x3d4046, { roughness: 0.7, metalness: 0.05 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh * 0.55, sd), caseMat);
    body.position.set(0, sh * 0.275, 0);
    body.rotation.x = -0.05;
    group.add(body);

    const rows = 5, cols = 14;
    const kw = (sw * 0.92) / cols, kd = (sd * 0.86) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // bottom row: skip sides, one wide spacebar in the middle
        if (r === rows - 1) {
          if (c === 4) {
            const space = new THREE.Mesh(new THREE.BoxGeometry(kw * 5.4, sh * 0.28, kd * 0.8), capMat);
            space.position.set(0, sh * 0.62 - (r - 2) * 0.006, -sd * 0.43 + (r + 0.5) * kd);
            space.rotation.x = -0.05;
            group.add(space);
          }
          if (c > 2 && c < 11) continue;
        }
        const key = new THREE.Mesh(new THREE.BoxGeometry(kw * 0.82, sh * 0.28, kd * 0.72), capMat);
        key.position.set(-sw * 0.46 + (c + 0.5) * kw, sh * 0.62 - (r - 2) * 0.006, -sd * 0.43 + (r + 0.5) * kd);
        key.rotation.x = -0.05;
        group.add(key);
      }
    }
    return group;
  }

  _detailMouse(sw, sh, sd, material) {
    // Low-profile wireless mouse: stacked shrinking shells + seam
    const group = new THREE.Group();
    const shell = this._getOrCreateMaterial(0x2b2d31, { roughness: 0.45, metalness: 0.2 });
    const dark = this._getOrCreateMaterial(0x1a1b1e, { roughness: 0.6, metalness: 0.1 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(sw, sh * 0.45, sd), shell);
    s1.position.set(0, sh * 0.225, 0);
    group.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.86, sh * 0.35, sd * 0.82), shell);
    s2.position.set(0, sh * 0.6, -sd * 0.03);
    group.add(s2);
    const s3 = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.62, sh * 0.2, sd * 0.55), shell);
    s3.position.set(0, sh * 0.85, -sd * 0.06);
    group.add(s3);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.06, sh * 0.4, sd * 0.42), dark);
    seam.position.set(0, sh * 0.62, sd * 0.24);
    group.add(seam);
    return group;
  }

  _detailLaptopOpen(sw, sh, sd, material, roomId) {
    // Modern aluminum laptop, lid open ~105°, live terminal screen (+z faces the user)
    const group = new THREE.Group();
    const alu = this._getOrCreateMaterial(0x9aa0a8, { roughness: 0.35, metalness: 0.8 });
    const dark = this._getOrCreateMaterial(0x1a1c20, { roughness: 0.7, metalness: 0.2 });

    const baseT = 0.018;
    const baseD = Math.min(sd * 0.6, sw * 0.72);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(sw, baseT, baseD), alu);
    deck.position.set(0, baseT / 2, sd / 2 - baseD / 2);
    group.add(deck);

    const keys = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.82, 0.006, baseD * 0.48), dark);
    keys.position.set(0, baseT + 0.003, sd / 2 - baseD * 0.62);
    group.add(keys);

    const padMat = this._getOrCreateMaterial(0x777b82, { roughness: 0.4, metalness: 0.6 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.3, 0.004, baseD * 0.24), padMat);
    pad.position.set(0, baseT + 0.003, sd / 2 - baseD * 0.2);
    group.add(pad);

    // lid pivots at the back edge of the deck, leaning slightly back
    const lid = new THREE.Group();
    lid.position.set(0, baseT, sd / 2 - baseD);
    lid.rotation.x = -0.26;
    const lidH = sh - baseT;
    const back = new THREE.Mesh(new THREE.BoxGeometry(sw, lidH, 0.012), alu);
    back.position.set(0, lidH / 2, 0);
    lid.add(back);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.985, lidH * 0.97, 0.004), dark);
    bezel.position.set(0, lidH / 2, 0.008);
    lid.add(bezel);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.93, lidH * 0.86), this._generateMacScreenMaterial());
    scr.position.set(0, lidH / 2, 0.012);
    lid.add(scr);
    group.add(lid);
    return group;
  }

  _detailFlatMonitor(sw, sh, sd, material, roomId) {
    // Slim-bezel flat monitor on a stand (LG-style), screen faces +z
    const group = new THREE.Group();
    const dark = this._getOrCreateMaterial(0x17181c, { roughness: 0.6, metalness: 0.3 });
    const silver = this._getOrCreateMaterial(0x9a9da3, { roughness: 0.4, metalness: 0.7 });

    const standH = sh * 0.26;
    const panelH = sh - standH;

    const base = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.42, 0.016, Math.max(sd * 0.9, 0.16)), silver);
    base.position.set(0, 0.008, -0.01);
    group.add(base);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.045, standH, 0.02), silver);
    neck.position.set(0, standH / 2 + 0.012, -0.045);
    group.add(neck);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(sw, panelH, 0.026), dark);
    panel.position.set(0, standH + panelH / 2, 0.01);
    group.add(panel);

    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.955, panelH * 0.88), this._generateScreenMaterial(roomId));
    scr.position.set(0, standH + panelH / 2 + panelH * 0.03, 0.024);
    group.add(scr);

    // power LED on the chin
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f4ff, emissiveIntensity: 0.9, roughness: 0.4 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.004), ledMat);
    led.position.set(0, standH + panelH * 0.035, 0.024);
    group.add(led);
    return group;
  }

  _detailBadgeGate(sw, sh, sd, material, reader = true) {
    // Office speed-gate pedestal: brushed body, angled card-reader pad on top
    // (RFID ring target + status LED). The tap animation lands on the pad.
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x1c1e24, { roughness: 0.6, metalness: 0.3 });
    const glassMat = this._getOrCreateMaterial(0x0e1116, { roughness: 0.25, metalness: 0.55 });
    const trimMat = this._getOrCreateMaterial(0x8a919c, { roughness: 0.35, metalness: 0.8 });

    // plinth + tapered body
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.07, sd), darkMat);
    plinth.position.set(0, 0.035, 0);
    group.add(plinth);
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.86, sh - 0.16, sd * 0.9), material);
    body.position.set(0, (sh - 0.16) / 2 + 0.07, 0);
    group.add(body);
    // side trim lines
    for (const zx of [-1, 1]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.88, 0.02, 0.02), trimMat);
      trim.position.set(0, sh * 0.55, zx * (sd * 0.45));
      group.add(trim);
    }

    if (!reader) {
      // plain pedestal: flat brushed top cap, no reader hardware
      const top = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.92, 0.05, sd * 0.9), trimMat);
      top.position.set(0, sh - 0.025, 0);
      group.add(top);
    } else {
    // angled reader housing on top (tilted toward the approach side, +z)
    const cap = new THREE.Group();
    cap.position.set(0, sh - 0.09, 0);
    cap.rotation.x = 0.16;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.92, 0.07, sd * 0.8), trimMat);
    housing.position.set(0, 0.035, 0);
    cap.add(housing);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.78, 0.02, sd * 0.62), glassMat);
    pad.position.set(0, 0.075, 0);
    cap.add(pad);
    // RFID target: emissive ring + center dot on the pad
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a5c, emissive: 0x3aa0ff, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(sw, sd) * 0.17, 0.006, 10, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.088, 0);
    ring.userData.reader = true;
    cap.add(ring);
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12), ringMat.clone());
    dot.position.set(0, 0.088, 0);
    dot.userData.reader = true;
    cap.add(dot);
    group.add(cap);
    }

    // front status LED bar (faces the approach, +z)
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x22aa55, emissive: 0x33ff77, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.1,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.5, 0.025, 0.012), ledMat);
    led.position.set(0, sh * 0.82, sd * 0.45);
    led.userData.reader = true;
    group.add(led);

    // small brand plate on the front
    const plate = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.42, 0.09, 0.012), darkMat);
    plate.position.set(0, sh * 0.42, sd * 0.45);
    group.add(plate);
    return group;
  }

  _detailCallButton(sw, sh, sd, material) {
    // Elevator call plate: brushed plate flush on a wall, round backlit
    // button(s) on the +z face. Tall plates (cab panel) get a button column.
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    plate.position.set(0, sh / 2, 0);
    group.add(plate);

    const r = Math.min(sw, 0.18) * 0.3;
    const rimMat = this._getOrCreateMaterial(0x3a3d44, { roughness: 0.5, metalness: 0.5 });
    const makeButton = (y, lit) => {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.012, 20), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, y, sd / 2 + 0.006);
      group.add(rim);
      const btnMat = new THREE.MeshStandardMaterial({
        color: lit ? 0xfff1c8 : 0xd8dade,
        emissive: lit ? 0xffb84d : 0x000000,
        emissiveIntensity: lit ? 1.1 : 0,
        roughness: 0.4, metalness: 0.1,
      });
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.018, 20), btnMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, y, sd / 2 + 0.013);
      group.add(btn);
    };

    if (sh > 0.45) {
      makeButton(sh * 0.74, false);
      makeButton(sh * 0.52, true);   // current floor, lit
      makeButton(sh * 0.3, false);
    } else {
      makeButton(sh * 0.56, true);
    }
    return group;
  }

  _detailEquipment(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.8, metalness: 0.0 });
    const metalMat = this._getOrCreateMaterial(0x556677, { roughness: 0.4, metalness: 0.6 });

    // Main housing
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Front panel (recessed)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.8, sh * 0.6, 0.02), darkMat);
    panel.position.set(0, sh * 0.55, sd / 2 + 0.005);
    group.add(panel);

    // Indicator LEDs (row)
    const ledColors = [0x00ff44, 0x00ff44, 0xffaa00, 0xff4444];
    for (let i = 0; i < 4; i++) {
      const lm = new THREE.MeshStandardMaterial({
        color: ledColors[i], emissive: ledColors[i], emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.1,
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.008), lm);
      led.position.set(-sw * 0.2 + i * 0.06, sh * 0.8, sd / 2 + 0.015);
      group.add(led);
    }

    // Toggle switches
    for (let i = 0; i < 3; i++) {
      const sw2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.015), metalMat);
      sw2.position.set(-sw * 0.15 + i * 0.08, sh * 0.4, sd / 2 + 0.015);
      group.add(sw2);
    }

    // Ventilation (side, horizontal slots)
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, sd * 0.6), darkMat);
      vent.position.set(sw / 2 + 0.003, sh * 0.3 + i * 0.04, 0);
      group.add(vent);
    }

    // Cable connector (back)
    const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), metalMat);
    connector.rotation.x = Math.PI / 2;
    connector.position.set(0, sh * 0.3, -sd / 2 - 0.02);
    group.add(connector);

    return group;
  }

  _detailPlant(sw, sh, sd, material) {
    const group = new THREE.Group();
    const potMat = this._getOrCreateMaterial(0x8B4513, { roughness: 0.8, metalness: 0.0 });
    const soilMat = this._getOrCreateMaterial(0x3B2610, { roughness: 0.9, metalness: 0.0 });
    const leafMat = this._getOrCreateMaterial(0x2d6b30, { roughness: 0.7, metalness: 0.0 });
    const leafDark = this._getOrCreateMaterial(0x1a4d1e, { roughness: 0.7, metalness: 0.0 });

    const potH = sh * 0.35;
    const potTopR = Math.min(sw, sd) * 0.45;
    const potBotR = potTopR * 0.7;

    // Pot body (tapered cylinder)
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(potTopR, potBotR, potH, 8), potMat);
    pot.position.set(0, potH / 2, 0);
    group.add(pot);

    // Pot rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(potTopR, 0.02, 6, 8), potMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, potH, 0);
    group.add(rim);

    // Soil surface
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(potTopR - 0.02, potTopR - 0.02, 0.03, 8), soilMat);
    soil.position.set(0, potH - 0.01, 0);
    group.add(soil);

    // Leaves (multiple ellipsoid clusters)
    const leafBaseY = potH + 0.02;
    const leafH = sh - potH;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const r = potTopR * 0.5;
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;
      const lh = leafH * (0.5 + Math.random() * 0.5);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(potTopR * 0.45, 6, 5),
        i % 2 === 0 ? leafMat : leafDark
      );
      leaf.scale.set(1, lh / (potTopR * 0.45) * 0.5, 1);
      leaf.position.set(lx, leafBaseY + lh * 0.5, lz);
      group.add(leaf);
    }

    // Central stem/trunk
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, leafH * 0.6, 5),
      this._getOrCreateMaterial(0x4a3520, { roughness: 0.8, metalness: 0.0 })
    );
    stem.position.set(0, leafBaseY + leafH * 0.3, 0);
    group.add(stem);

    return group;
  }

  _detailTree(sw, sh, sd, material) {
    const group = new THREE.Group();
    const trunkMat = this._getOrCreateMaterial(0x5C3A1E, { roughness: 0.9, metalness: 0.0 });
    const leafMat = this._getOrCreateMaterial(0x2E7D32, { roughness: 0.7, metalness: 0.0 });
    const leafDark = this._getOrCreateMaterial(0x1B5E20, { roughness: 0.7, metalness: 0.0 });

    const trunkH = sh * 0.5;
    const trunkR = Math.min(sw, sd) * 0.12;

    // Trunk (tapered cylinder)
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6),
      trunkMat
    );
    trunk.position.set(0, trunkH / 2, 0);
    group.add(trunk);

    // Canopy (multiple spheres overlapping)
    const canopyR = Math.min(sw, sd) * 0.45;
    const canopyY = trunkH + canopyR * 0.5;
    const mainCanopy = new THREE.Mesh(
      new THREE.SphereGeometry(canopyR, 7, 6),
      leafMat
    );
    mainCanopy.position.set(0, canopyY, 0);
    group.add(mainCanopy);

    // Secondary canopy blobs
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cr = canopyR * 0.6;
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(cr, 6, 5),
        i % 2 === 0 ? leafDark : leafMat
      );
      blob.position.set(
        Math.cos(angle) * canopyR * 0.4,
        canopyY - canopyR * 0.1,
        Math.sin(angle) * canopyR * 0.4
      );
      group.add(blob);
    }

    // Top cluster
    const topBlob = new THREE.Mesh(
      new THREE.SphereGeometry(canopyR * 0.5, 6, 5),
      leafDark
    );
    topBlob.position.set(0, canopyY + canopyR * 0.5, 0);
    group.add(topBlob);

    return group;
  }

  _detailLamp(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x444444, { roughness: 0.4, metalness: 0.7 });
    const shadeMat = this._getOrCreateMaterial(0xCCBB99, { roughness: 0.6, metalness: 0.0 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 0.4,
      roughness: 0.3, metalness: 0.0,
    });

    const baseR = Math.min(sw, sd) * 0.4;

    // Base (disc)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR * 1.1, 0.03, 12), metalMat);
    base.position.set(0, 0.015, 0);
    group.add(base);

    // Pole
    const poleH = sh * 0.65;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, poleH, 6), metalMat);
    pole.position.set(0, 0.03 + poleH / 2, 0);
    group.add(pole);

    // Shade (cone/frustum)
    const shadeH = sh * 0.25;
    const shadeTopR = baseR * 0.3;
    const shadeBotR = baseR * 0.9;
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(shadeTopR, shadeBotR, shadeH, 8, 1, true),
      shadeMat
    );
    shade.position.set(0, sh - shadeH / 2, 0);
    group.add(shade);

    // Bulb (small sphere inside shade)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), bulbMat);
    bulb.position.set(0, sh - shadeH * 0.6, 0);
    group.add(bulb);

    return group;
  }

  _detailClock(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameMat = this._getOrCreateMaterial(0x333333, { roughness: 0.4, metalness: 0.5 });
    const faceMat = this._getOrCreateMaterial(0xEEEEDD, { roughness: 0.3, metalness: 0.0 });
    const handMat = this._getOrCreateMaterial(0x111111, { roughness: 0.5, metalness: 0.3 });

    const r = Math.min(sw, sh) * 0.45;

    // Back plate (wall mount)
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.02, 16), frameMat);
    back.rotation.x = Math.PI / 2;
    back.position.set(0, sh / 2, 0);
    group.add(back);

    // Face (white circle)
    const face = new THREE.Mesh(new THREE.CircleGeometry(r, 16), faceMat);
    face.position.set(0, sh / 2, sd / 2 + 0.005);
    group.add(face);

    // Hour markers (12 ticks)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tickLen = i % 3 === 0 ? 0.05 : 0.03;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.008, tickLen, 0.003), handMat);
      const dist = r * 0.82;
      tick.position.set(
        Math.sin(angle) * dist,
        sh / 2 + Math.cos(angle) * dist,
        sd / 2 + 0.008
      );
      tick.rotation.z = -angle;
      group.add(tick);
    }

    // Hour hand
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.012, r * 0.5, 0.004), handMat);
    hourHand.position.set(0.01, sh / 2 + r * 0.2, sd / 2 + 0.012);
    hourHand.rotation.z = -0.8;
    group.add(hourHand);

    // Minute hand
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.008, r * 0.7, 0.004), handMat);
    minHand.position.set(-0.02, sh / 2 + r * 0.15, sd / 2 + 0.014);
    minHand.rotation.z = 0.4;
    group.add(minHand);

    // Center pin
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), handMat);
    pin.position.set(0, sh / 2, sd / 2 + 0.016);
    group.add(pin);

    return group;
  }

  _detailCoffeeMachine(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x1a1a1a, { roughness: 0.6, metalness: 0.2 });
    const metalMat = this._getOrCreateMaterial(0x888888, { roughness: 0.3, metalness: 0.7 });
    const redMat = this._getOrCreateMaterial(0xcc2222, { roughness: 0.4, metalness: 0.2 });

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), darkMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Top water reservoir (translucent look, slightly taller)
    const tankH = sh * 0.3;
    const tank = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.4, tankH, sd * 0.6),
      this._getOrCreateMaterial(0x334455, { roughness: 0.2, metalness: 0.1 })
    );
    tank.position.set(-sw * 0.2, sh + tankH / 2 - 0.02, 0);
    group.add(tank);

    // Drip nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.04, 6), metalMat);
    nozzle.position.set(0, sh * 0.6, sd / 2 - 0.05);
    group.add(nozzle);

    // Drip tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, 0.02, sd * 0.5), metalMat);
    tray.position.set(0, sh * 0.15, sd * 0.1);
    group.add(tray);

    // Button (power)
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8), redMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(sw * 0.3, sh * 0.75, sd / 2 + 0.005);
    group.add(btn);

    // LED indicator
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.1,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.005), ledMat);
    led.position.set(sw * 0.3, sh * 0.82, sd / 2 + 0.005);
    group.add(led);

    return group;
  }

  _detailMicrowave(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.6, metalness: 0.2 });
    const glassMat = this._getOrCreateMaterial(0x112233, { roughness: 0.1, metalness: 0.1 });
    const metalMat = this._getOrCreateMaterial(0x888888, { roughness: 0.3, metalness: 0.7 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Door window (dark glass area)
    const doorW = sw * 0.6;
    const doorH = sh * 0.7;
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.02), glassMat);
    door.position.set(-sw * 0.1, sh * 0.5, sd / 2 + 0.005);
    group.add(door);

    // Door frame (thin border)
    const frameT = 0.015;
    const frameParts = [
      [doorW + frameT * 2, frameT, doorH * 0.5 + frameT / 2, 0],       // top
      [doorW + frameT * 2, frameT, -doorH * 0.5 - frameT / 2, 0],      // bottom
      [frameT, doorH, 0, -doorW / 2 - frameT / 2],                       // left
      [frameT, doorH, 0, doorW / 2 + frameT / 2],                        // right
    ];
    for (const [fw, fh, fy, fx] of frameParts) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.008), darkMat);
      frame.position.set(-sw * 0.1 + fx, sh * 0.5 + fy, sd / 2 + 0.012);
      group.add(frame);
    }

    // Control panel (right side)
    const panelW = sw * 0.2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, sh * 0.6, 0.01), darkMat);
    panel.position.set(sw * 0.35, sh * 0.5, sd / 2 + 0.005);
    group.add(panel);

    // Buttons (2x3 grid)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.008), metalMat);
        btn.position.set(sw * 0.33 + c * 0.04, sh * 0.6 - r * 0.06, sd / 2 + 0.015);
        group.add(btn);
      }
    }

    // Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, sh * 0.4, 0.02), metalMat);
    handle.position.set(-sw * 0.1 + doorW / 2 + 0.03, sh * 0.5, sd / 2 + 0.02);
    group.add(handle);

    return group;
  }

  _detailCooler(sw, sh, sd, material) {
    const group = new THREE.Group();
    const bodyMat = this._getOrCreateMaterial(0xcccccc, { roughness: 0.4, metalness: 0.2 });
    const tapMat = this._getOrCreateMaterial(0x3366cc, { roughness: 0.3, metalness: 0.5 });
    const tapRedMat = this._getOrCreateMaterial(0xcc3333, { roughness: 0.3, metalness: 0.5 });

    // Main body (tall white cylinder/box)
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), bodyMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Water jug on top (blue-tinted cylinder, inverted)
    const jugR = Math.min(sw, sd) * 0.35;
    const jugH = sh * 0.3;
    const jugMat = this._getOrCreateMaterial(0x88bbdd, { roughness: 0.1, metalness: 0.0 });
    const jug = new THREE.Mesh(new THREE.CylinderGeometry(jugR, jugR * 0.8, jugH, 8), jugMat);
    jug.position.set(0, sh + jugH / 2 - 0.02, 0);
    group.add(jug);

    // Jug cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(jugR * 0.3, jugR * 0.3, 0.03, 8), bodyMat);
    cap.position.set(0, sh - 0.01, 0);
    group.add(cap);

    // Cold tap (blue)
    const coldTap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.04), tapMat);
    coldTap.position.set(-sw * 0.15, sh * 0.6, sd / 2 + 0.02);
    group.add(coldTap);

    // Hot tap (red)
    const hotTap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.04), tapRedMat);
    hotTap.position.set(sw * 0.15, sh * 0.6, sd / 2 + 0.02);
    group.add(hotTap);

    // Drip tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, 0.02, 0.06),
      this._getOrCreateMaterial(0x666666, { roughness: 0.5, metalness: 0.3 }));
    tray.position.set(0, sh * 0.5, sd / 2 + 0.03);
    group.add(tray);

    return group;
  }

  _detailFountain(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x999999, { roughness: 0.3, metalness: 0.6 });
    const basinMat = this._getOrCreateMaterial(0xaaaaaa, { roughness: 0.4, metalness: 0.4 });

    // Wall mount plate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.03), material);
    plate.position.set(0, sh / 2, -sd / 2 + 0.015);
    group.add(plate);

    // Basin (curved trough)
    const basinW = sw * 0.8;
    const basinH = sh * 0.3;
    const basin = new THREE.Mesh(new THREE.BoxGeometry(basinW, basinH, sd * 0.6), basinMat);
    basin.position.set(0, basinH / 2, sd * 0.1);
    group.add(basin);

    // Basin interior (dark, recessed)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(basinW - 0.04, basinH - 0.02, sd * 0.4),
      this._getOrCreateMaterial(0x333344, { roughness: 0.5, metalness: 0.2 }));
    inner.position.set(0, basinH / 2 + 0.01, sd * 0.1);
    group.add(inner);

    // Spout (small curved pipe)
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6), metalMat);
    spout.rotation.z = Math.PI / 6;
    spout.position.set(0, basinH + 0.06, 0);
    group.add(spout);

    // Push button
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8), metalMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(sw * 0.3, basinH + 0.03, sd * 0.2);
    group.add(btn);

    return group;
  }

  _detailBin(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x333333, { roughness: 0.7, metalness: 0.2 });

    const r = Math.min(sw, sd) * 0.45;

    // Bin body (tapered cylinder)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, sh, 8), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 6, 8), darkMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, sh, 0);
    group.add(rim);

    // Lid (slightly wider)
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.025, 8), darkMat);
    lid.position.set(0, sh + 0.012, 0);
    group.add(lid);

    // Swing flap opening
    const flap = new THREE.Mesh(new THREE.BoxGeometry(r * 0.8, 0.01, r * 0.5), material);
    flap.position.set(0, sh + 0.03, 0);
    group.add(flap);

    return group;
  }

  _detailBasket(sw, sh, sd, material) {
    const group = new THREE.Group();
    const wickerMat = this._getOrCreateMaterial(0x8B7355, { roughness: 0.9, metalness: 0.0 });

    // Body (tapered)
    const topR = Math.min(sw, sd) * 0.45;
    const botR = topR * 0.8;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, sh, 8), wickerMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(topR, 0.02, 6, 8), wickerMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, sh, 0);
    group.add(rim);

    // Wicker texture lines (horizontal bands)
    const bandMat = this._getOrCreateMaterial(0x7A6448, { roughness: 0.9, metalness: 0.0 });
    for (let i = 1; i <= 3; i++) {
      const y = (sh / 4) * i;
      const rr = botR + (topR - botR) * (i / 4);
      const band = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.005, 0.008, 4, 8), bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, y, 0);
      group.add(band);
    }

    return group;
  }

  _detailWhiteboard(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameMat = this._getOrCreateMaterial(0x888888, { roughness: 0.4, metalness: 0.5 });
    const boardMat = this._getOrCreateMaterial(0xEEEEEE, { roughness: 0.2, metalness: 0.1 });
    const trayMat = this._getOrCreateMaterial(0x666666, { roughness: 0.5, metalness: 0.3 });

    // Board surface (white)
    const board = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.02), boardMat);
    board.position.set(0, sh / 2, 0);
    group.add(board);

    // Frame (4 edges)
    const ft = 0.025;
    const edges = [
      [sw + ft, ft, 0, sh - ft / 2],   // top
      [sw + ft, ft, 0, ft / 2],          // bottom
      [ft, sh, -sw / 2, sh / 2],         // left
      [ft, sh, sw / 2, sh / 2],          // right
    ];
    for (const [ew, eh, ex, ey] of edges) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, 0.03), frameMat);
      edge.position.set(ex, ey, 0);
      group.add(edge);
    }

    // Marker tray (bottom)
    const tray = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, 0.03, 0.06), trayMat);
    tray.position.set(0, 0.02, 0.04);
    group.add(tray);

    // Markers (3 colored cylinders on tray)
    const markerColors = [0x2244cc, 0xcc2222, 0x22aa22];
    for (let i = 0; i < 3; i++) {
      const mMat = this._getOrCreateMaterial(markerColors[i], { roughness: 0.5, metalness: 0.1 });
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), mMat);
      marker.rotation.z = Math.PI / 2;
      marker.position.set(-0.06 + i * 0.06, 0.045, 0.04);
      group.add(marker);
    }

    return group;
  }

  _detailCryo(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x667788, { roughness: 0.3, metalness: 0.7 });
    const glassMat = this._getOrCreateMaterial(0x88ccff, { roughness: 0.1, metalness: 0.2 });
    const darkMat = this._getOrCreateMaterial(0x111122, { roughness: 0.8, metalness: 0.0 });
    const frostMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.2,
      roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6,
    });

    // Pod body (main capsule)
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), metalMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Window (frosted glass, front)
    const winW = sw * 0.4;
    const winH = sh * 0.5;
    const win = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), frostMat);
    win.position.set(0, sh * 0.55, sd / 2 + 0.005);
    group.add(win);

    // Window frame
    const wft = 0.02;
    const wfParts = [
      [winW + wft, wft, 0, winH / 2],
      [winW + wft, wft, 0, -winH / 2],
      [wft, winH + wft, -winW / 2, 0],
      [wft, winH + wft, winW / 2, 0],
    ];
    for (const [fw, fh, fx, fy] of wfParts) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.025), darkMat);
      frame.position.set(fx, sh * 0.55 + fy, sd / 2 + 0.008);
      group.add(frame);
    }

    // Status panel (below window)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.5, 0.08, 0.015), darkMat);
    panel.position.set(0, sh * 0.2, sd / 2 + 0.005);
    group.add(panel);

    // Status LEDs
    const ledColors = [0x00ff44, 0x00ff44, 0x00aaff];
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshStandardMaterial({
        color: ledColors[i], emissive: ledColors[i], emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.1,
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.008), lm);
      led.position.set(-0.04 + i * 0.04, sh * 0.2, sd / 2 + 0.018);
      group.add(led);
    }

    // Top hoses (2 cylinders going up)
    for (const hx of [-sw * 0.25, sw * 0.25]) {
      const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15, 6), metalMat);
      hose.position.set(hx, sh + 0.07, 0);
      group.add(hose);
    }

    // Base platform
    const base = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.06, 0.04, sd + 0.06), darkMat);
    base.position.set(0, 0.02, 0);
    group.add(base);

    return group;
  }

  _detailBars(sw, sh, sd, material) {
    const group = new THREE.Group();
    const barMat = this._getOrCreateMaterial(0x555555, { roughness: 0.4, metalness: 0.8 });

    const barR = 0.02;
    const spacing = sw / (Math.floor(sw / 0.12) + 1);
    const count = Math.floor(sw / spacing);

    // Vertical bars
    for (let i = 0; i <= count; i++) {
      const bx = -sw / 2 + spacing * i;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, sh, 6), barMat);
      bar.position.set(bx, sh / 2, 0);
      group.add(bar);
    }

    // Horizontal cross bars (top + middle)
    for (const by of [sh * 0.15, sh * 0.85]) {
      const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(barR * 0.8, barR * 0.8, sw, 6), barMat);
      crossBar.rotation.z = Math.PI / 2;
      crossBar.position.set(0, by, 0);
      group.add(crossBar);
    }

    return group;
  }

  _detailProjector(sw, sh, sd, material) {
    const group = new THREE.Group();
    const darkMat = this._getOrCreateMaterial(0x222222, { roughness: 0.6, metalness: 0.2 });
    const lensMat = this._getOrCreateMaterial(0x111133, { roughness: 0.1, metalness: 0.3 });
    const metalMat = this._getOrCreateMaterial(0x666666, { roughness: 0.3, metalness: 0.6 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), darkMat);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Lens (front, circular)
    const lensR = Math.min(sh, sw) * 0.3;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(lensR, lensR * 1.1, 0.06, 12), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, sh * 0.5, sd / 2 + 0.03);
    group.add(lens);

    // Lens ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(lensR * 1.05, 0.01, 6, 12), metalMat);
    ring.position.set(0, sh * 0.5, sd / 2 + 0.06);
    group.add(ring);

    // Mount bracket (top)
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.3, 0.08, sd * 0.3), metalMat);
    bracket.position.set(0, sh + 0.04, 0);
    group.add(bracket);

    // Vent slots (side)
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.005, sh * 0.3, 0.02), darkMat);
      vent.position.set(sw / 2 + 0.003, sh * 0.5, -sd * 0.2 + i * 0.08);
      group.add(vent);
    }

    return group;
  }

  _detailSign(sw, sh, sd, material, direction) {
    const group = new THREE.Group();
    const signMat = this._getOrCreateMaterial(0x2244aa, { roughness: 0.5, metalness: 0.2 });
    const arrowMat = this._getOrCreateMaterial(0xffffff, { roughness: 0.4, metalness: 0.1 });

    // Sign plate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), signMat);
    plate.position.set(0, sh / 2, 0);
    group.add(plate);

    // Arrow — shaft + triangular head
    const dir = direction === 'left' ? -1 : 1;
    const shaftW = sw * 0.35;
    const shaftH = sh * 0.2;
    const headW = sh * 0.35;
    const headH = sh * 0.55;
    const z = sd / 2 + 0.005;
    const cy = sh * 0.5;

    // Shaft (horizontal bar)
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(shaftW, shaftH, 0.01), arrowMat);
    shaft.position.set(-dir * shaftW * 0.15, cy, z);
    group.add(shaft);

    // Arrowhead (triangle via ShapeGeometry)
    const shape = new THREE.Shape();
    shape.moveTo(0, -headH / 2);
    shape.lineTo(dir * headW, 0);
    shape.lineTo(0, headH / 2);
    shape.closePath();
    const headMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), arrowMat);
    headMesh.position.set(dir * shaftW * 0.3, cy, z);
    group.add(headMesh);

    // Border
    const borderMat = this._getOrCreateMaterial(0xffffff, { roughness: 0.5, metalness: 0.1 });
    const bt = 0.01;
    for (const [bw, bh, bx, by] of [
      [sw, bt, 0, sh - bt / 2], [sw, bt, 0, bt / 2],
      [bt, sh, -sw / 2 + bt / 2, sh / 2], [bt, sh, sw / 2 - bt / 2, sh / 2],
    ]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, sd + 0.002), borderMat);
      b.position.set(bx, by, 0);
      group.add(b);
    }

    return group;
  }

  _detailPoster(sw, sh, sd, material) {
    const group = new THREE.Group();

    // Poster paper (slightly curved feel - just a thin plane)
    const paper = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.005), material);
    paper.position.set(0, sh / 2, 0);
    group.add(paper);

    // Corner pins (4 small spheres)
    const pinMat = this._getOrCreateMaterial(0xcc3333, { roughness: 0.4, metalness: 0.3 });
    const pinR = 0.012;
    for (const [px, py] of [
      [-sw * 0.42, sh * 0.92], [sw * 0.42, sh * 0.92],
      [-sw * 0.42, sh * 0.08], [sw * 0.42, sh * 0.08],
    ]) {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(pinR, 6, 6), pinMat);
      pin.position.set(px, py, 0.005);
      group.add(pin);
    }

    // Slight curl at bottom corner (thin triangle-ish box)
    const curl = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.15, sh * 0.08, 0.015), material);
    curl.position.set(sw * 0.35, sh * 0.04, 0.008);
    curl.rotation.z = 0.1;
    group.add(curl);

    return group;
  }

  _detailDocument(sw, sh, sd, material) {
    const group = new THREE.Group();
    const textMat = this._getOrCreateMaterial(0x333333, { roughness: 0.9, metalness: 0.0 });

    // Use the prop's original material (preserves color — yellow for flashlight, etc.)
    // Stack of papers (3 slightly offset sheets)
    for (let i = 0; i < 3; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.003, sd), material);
      sheet.position.set(i * 0.005, i * 0.003 + 0.002, -i * 0.003);
      sheet.rotation.y = (i - 1) * 0.03;
      group.add(sheet);
    }

    // Text lines on top sheet (thin dark strips) — skip for non-paper items
    const col = material.color ? material.color.getHex() : 0xffffff;
    const isPaper = (col & 0xcc0000) > 0x880000 && (col & 0x00cc00) > 0x008800;
    if (isPaper) {
      for (let i = 0; i < 5; i++) {
        const lineW = sw * (0.5 + Math.random() * 0.3);
        const line = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.002, 0.005), textMat);
        line.position.set(-sw * 0.1, 0.01, -sd * 0.3 + i * sd * 0.15);
        group.add(line);
      }
    }

    return group;
  }

  _detailDebris(sw, sh, sd, material) {
    const group = new THREE.Group();
    const concreteMat = this._getOrCreateMaterial(0x777777, { roughness: 0.9, metalness: 0.0 });
    const darkMat = this._getOrCreateMaterial(0x444444, { roughness: 0.9, metalness: 0.1 });

    // Main chunk (irregular-ish: rotated box)
    const main = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, sh * 0.6, sd * 0.7), concreteMat);
    main.position.set(0, sh * 0.3, 0);
    main.rotation.set(0.2, 0.3, 0.1);
    group.add(main);

    // Secondary chunks (2-3 smaller pieces scattered)
    const pieces = [
      [sw * 0.3, sh * 0.35, sd * 0.3, sw * 0.25, sh * 0.17, -sd * 0.2, 0.4, -0.2, 0.5],
      [sw * 0.25, sh * 0.25, sd * 0.25, -sw * 0.2, sh * 0.12, sd * 0.15, -0.3, 0.6, -0.1],
      [sw * 0.2, sh * 0.2, sd * 0.35, sw * 0.1, sh * 0.1, sd * 0.25, 0.6, 0.1, 0.3],
    ];
    for (const [pw, ph, pd, px, py, pz, rx, ry, rz] of pieces) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), darkMat);
      piece.position.set(px, py, pz);
      piece.rotation.set(rx, ry, rz);
      group.add(piece);
    }

    // Dust/rubble base (flat low disc)
    const dust = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(sw, sd) * 0.5, Math.max(sw, sd) * 0.6, 0.02, 6),
      concreteMat
    );
    dust.position.set(0, 0.01, 0);
    group.add(dust);

    return group;
  }

  _detailLightFixture(sw, sh, sd, material) {
    const group = new THREE.Group();
    const housingMat = this._getOrCreateMaterial(0x888888, { roughness: 0.4, metalness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffffee, emissive: 0xffffdd, emissiveIntensity: 0.4,
      roughness: 0.2, metalness: 0.0,
    });

    // Housing (metal frame, slightly recessed)
    const housing = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), housingMat);
    housing.position.set(0, sh / 2, 0);
    group.add(housing);

    // Diffuser panel (glowing surface, inset)
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.04, 0.01, sd - 0.04), glowMat);
    diffuser.position.set(0, 0.005, 0);
    group.add(diffuser);

    // Edge lip (rim around diffuser)
    const lipW = 0.015;
    for (const [lw, ld, lx, lz] of [
      [sw, lipW, 0, sd / 2 - lipW / 2], [sw, lipW, 0, -sd / 2 + lipW / 2],
      [lipW, sd, sw / 2 - lipW / 2, 0], [lipW, sd, -sw / 2 + lipW / 2, 0],
    ]) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(lw, sh + 0.005, ld), housingMat);
      lip.position.set(lx, sh / 2, lz);
      group.add(lip);
    }

    return group;
  }

  _detailCeilingLight(sw, sh, sd, material) {
    const group = new THREE.Group();
    const housingMat = this._getOrCreateMaterial(0x999999, { roughness: 0.3, metalness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.5,
      roughness: 0.2, metalness: 0.0,
    });

    // Round housing
    const r = Math.min(sw, sd) * 0.45;
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, sh, 12), housingMat);
    housing.position.set(0, sh / 2, 0);
    group.add(housing);

    // Diffuser dome (bottom)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowMat);
    dome.rotation.x = Math.PI;
    dome.position.set(0, 0, 0);
    group.add(dome);

    return group;
  }

  _detailFloorLight(sw, sh, sd, material) {
    const group = new THREE.Group();
    const baseMat = this._getOrCreateMaterial(0x555555, { roughness: 0.5, metalness: 0.4 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xaaccff, emissive: 0x6699cc, emissiveIntensity: 0.5,
      roughness: 0.2, metalness: 0.1,
    });

    // Base plate (recessed into floor)
    const base = new THREE.Mesh(new THREE.BoxGeometry(sw, sh * 0.4, sd), baseMat);
    base.position.set(0, sh * 0.2, 0);
    group.add(base);

    // Light strip/lens (glowing)
    const lens = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, sh * 0.3, sd * 0.7), glowMat);
    lens.position.set(0, sh * 0.55, 0);
    group.add(lens);

    // Protective grid (thin bars)
    const gridMat = this._getOrCreateMaterial(0x444444, { roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.8, 0.008, 0.008), gridMat);
      bar.position.set(0, sh * 0.7, -sd * 0.2 + i * sd * 0.2);
      group.add(bar);
    }

    return group;
  }

  _detailLED(sw, sh, sd, material) {
    const group = new THREE.Group();
    const stripMat = this._getOrCreateMaterial(0x333333, { roughness: 0.5, metalness: 0.3 });

    // LED strip backing
    const back = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd * 0.5), stripMat);
    back.position.set(0, sh / 2, -sd * 0.25);
    group.add(back);

    // LED emissive surface (use material's color for glow)
    const col = material.color ? material.color.getHex() : 0x00ff44;
    const ledMat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.1,
    });
    const ledSurface = new THREE.Mesh(new THREE.BoxGeometry(sw, sh * 0.6, sd * 0.3), ledMat);
    ledSurface.position.set(0, sh / 2, sd * 0.1);
    group.add(ledSurface);

    return group;
  }

  _detailWarningLight(sw, sh, sd, material) {
    const group = new THREE.Group();
    const baseMat = this._getOrCreateMaterial(0x444444, { roughness: 0.5, metalness: 0.5 });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.1,
    });

    // Mount base
    const base = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, sh * 0.3, sd * 0.6), baseMat);
    base.position.set(0, sh * 0.15, 0);
    group.add(base);

    // Dome lens (warning beacon)
    const r = Math.min(sw, sd) * 0.4;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), lensMat);
    dome.position.set(0, sh * 0.5, 0);
    group.add(dome);

    // Cage bars (protective grid)
    const cageMat = this._getOrCreateMaterial(0x555555, { roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, sh * 0.5, 4), cageMat);
      bar.position.set(Math.cos(angle) * r * 1.1, sh * 0.5, Math.sin(angle) * r * 1.1);
      group.add(bar);
    }

    return group;
  }

  _detailWindow(sw, sh, sd, material) {
    const group = new THREE.Group();
    const frameMat = this._getOrCreateMaterial(0x555555, { roughness: 0.4, metalness: 0.5 });
    const glassMat = this._getOrCreateMaterial(0x223344, { roughness: 0.05, metalness: 0.2 });

    // Glass pane
    const glass = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.06, sh - 0.06, 0.01), glassMat);
    glass.position.set(0, sh / 2, 0);
    group.add(glass);

    // Frame (4 borders)
    const ft = 0.03;
    for (const [fw, fh, fx, fy] of [
      [sw, ft, 0, sh - ft / 2], [sw, ft, 0, ft / 2],
      [ft, sh, -sw / 2 + ft / 2, sh / 2], [ft, sh, sw / 2 - ft / 2, sh / 2],
    ]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, sd), frameMat);
      frame.position.set(fx, fy, 0);
      group.add(frame);
    }

    // Center cross (divider)
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.06, 0.02, sd), frameMat);
    crossH.position.set(0, sh / 2, 0);
    group.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.02, sh - 0.06, sd), frameMat);
    crossV.position.set(0, sh / 2, 0);
    group.add(crossV);

    return group;
  }

  _detailRug(sw, sh, sd, material) {
    const group = new THREE.Group();
    const borderMat = this._getOrCreateMaterial(0x6B4226, { roughness: 0.9, metalness: 0.0 });

    // Main rug body (very flat)
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Border pattern (inner rectangle)
    const borderW = 0.04;
    for (const [bw, bd, bx, bz] of [
      [sw - borderW * 2, borderW, 0, sd / 2 - borderW * 2],
      [sw - borderW * 2, borderW, 0, -sd / 2 + borderW * 2],
      [borderW, sd - borderW * 4, sw / 2 - borderW * 2, 0],
      [borderW, sd - borderW * 4, -sw / 2 + borderW * 2, 0],
    ]) {
      const border = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.005, bd), borderMat);
      border.position.set(bx, sh + 0.003, bz);
      group.add(border);
    }

    return group;
  }

  _detailRailing(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x666666, { roughness: 0.3, metalness: 0.7 });

    const barR = 0.015;

    // Top rail
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(barR * 1.2, barR * 1.2, sw, 6), metalMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, sh, 0);
    group.add(topRail);

    // Bottom rail
    const botRail = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, sw, 6), metalMat);
    botRail.rotation.z = Math.PI / 2;
    botRail.position.set(0, sh * 0.1, 0);
    group.add(botRail);

    // Vertical balusters
    const count = Math.max(2, Math.floor(sw / 0.15));
    const spacing = sw / (count + 1);
    for (let i = 1; i <= count; i++) {
      const bx = -sw / 2 + spacing * i;
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, sh * 0.9, 5), metalMat);
      baluster.position.set(bx, sh * 0.55, 0);
      group.add(baluster);
    }

    // End posts (thicker)
    for (const px of [-sw / 2, sw / 2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(barR * 2, barR * 2, sh + 0.03, 6), metalMat);
      post.position.set(px, sh / 2 + 0.015, 0);
      group.add(post);
      // Post cap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(barR * 2.5, 6, 6), metalMat);
      cap.position.set(px, sh + 0.03, 0);
      group.add(cap);
    }

    return group;
  }

  _detailJar(sw, sh, sd, material) {
    const group = new THREE.Group();
    const r = Math.min(sw, sd) * 0.45;

    // Body (bulging cylinder)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.7, r, sh * 0.7, 8),
      material
    );
    body.position.set(0, sh * 0.35, 0);
    group.add(body);

    // Neck (narrower top)
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.4, r * 0.7, sh * 0.2, 8),
      material
    );
    neck.position.set(0, sh * 0.8, 0);
    group.add(neck);

    // Rim
    const rimMat = this._getOrCreateMaterial(0x666666, { roughness: 0.4, metalness: 0.3 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.45, 0.015, 6, 8), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, sh * 0.9, 0);
    group.add(rim);

    // Lid
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.03, 8), rimMat);
    lid.position.set(0, sh * 0.92, 0);
    group.add(lid);

    return group;
  }

  _detailTrellis(sw, sh, sd, material) {
    const group = new THREE.Group();
    const woodMat = this._getOrCreateMaterial(0x8B6914, { roughness: 0.85, metalness: 0.0 });
    const barW = 0.02;

    // Diagonal bars (criss-cross lattice pattern)
    const countH = Math.max(3, Math.floor(sh / 0.2));
    const countW = Math.max(2, Math.floor(sw / 0.2));

    // Forward-leaning diagonals
    for (let i = 0; i <= countH; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sw * 1.2, barW, barW), woodMat);
      bar.position.set(0, (sh / countH) * i, 0);
      bar.rotation.z = Math.PI / 4;
      group.add(bar);
    }
    // Back-leaning diagonals
    for (let i = 0; i <= countH; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sw * 1.2, barW, barW), woodMat);
      bar.position.set(0, (sh / countH) * i, 0);
      bar.rotation.z = -Math.PI / 4;
      group.add(bar);
    }

    // Outer frame
    for (const [fw, fh, fx, fy] of [
      [sw, barW * 1.5, 0, sh], [sw, barW * 1.5, 0, 0],
      [barW * 1.5, sh, -sw / 2, sh / 2], [barW * 1.5, sh, sw / 2, sh / 2],
    ]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, barW * 1.5), woodMat);
      frame.position.set(fx, fy, 0);
      group.add(frame);
    }

    return group;
  }

  _detailGrass(sw, sh, sd, material) {
    const group = new THREE.Group();
    const grassMat = this._getOrCreateMaterial(0x3a7d30, { roughness: 0.9, metalness: 0.0 });
    const darkGrass = this._getOrCreateMaterial(0x2a5d20, { roughness: 0.9, metalness: 0.0 });

    // Ground patch (flat)
    const ground = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.02, sd), grassMat);
    ground.position.set(0, 0.01, 0);
    group.add(ground);

    // Grass tufts (small pointed cones)
    const tuftCount = Math.max(6, Math.floor(sw * sd * 40));
    for (let i = 0; i < tuftCount; i++) {
      const tx = (Math.random() - 0.5) * sw * 0.9;
      const tz = (Math.random() - 0.5) * sd * 0.9;
      const th = sh * (0.4 + Math.random() * 0.6);
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, th, 4),
        i % 3 === 0 ? darkGrass : grassMat
      );
      tuft.position.set(tx, th / 2, tz);
      group.add(tuft);
    }

    return group;
  }

  _detailPipeVert(sw, sh, sd, material) {
    const group = new THREE.Group();
    const pipeMat = this._getOrCreateMaterial(0x556677, { roughness: 0.5, metalness: 0.6 });
    const clampMat = this._getOrCreateMaterial(0x444444, { roughness: 0.4, metalness: 0.7 });

    const r = Math.min(sw, sd) * 0.4;

    // Main vertical pipe
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, sh, 8), pipeMat);
    pipe.position.set(0, sh / 2, 0);
    group.add(pipe);

    // Wall clamps (every 1/3 of height)
    for (let i = 1; i <= 2; i++) {
      const cy = (sh / 3) * i;
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.015, 6, 8), clampMat);
      clamp.rotation.x = Math.PI / 2;
      clamp.position.set(0, cy, 0);
      group.add(clamp);
    }

    // Joint flanges (top and bottom)
    for (const jy of [0.02, sh - 0.02]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, 0.04, 8), clampMat);
      flange.position.set(0, jy, 0);
      group.add(flange);
    }

    return group;
  }

  _detailGrate(sw, sh, sd, material) {
    const group = new THREE.Group();
    const metalMat = this._getOrCreateMaterial(0x555555, { roughness: 0.5, metalness: 0.6 });

    // Frame
    const ft = 0.02;
    for (const [fw, fh, fx, fy] of [
      [sw, ft, 0, sh - ft / 2], [sw, ft, 0, ft / 2],
      [ft, sh, -sw / 2 + ft / 2, sh / 2], [ft, sh, sw / 2 - ft / 2, sh / 2],
    ]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, sd), metalMat);
      frame.position.set(fx, fy, 0);
      group.add(frame);
    }

    // Grid bars (horizontal)
    const barCount = Math.max(3, Math.floor(sh / 0.08));
    for (let i = 1; i < barCount; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sw - ft * 2, 0.008, sd), metalMat);
      bar.position.set(0, (sh / barCount) * i, 0);
      group.add(bar);
    }

    // Grid bars (vertical)
    const vCount = Math.max(2, Math.floor(sw / 0.08));
    for (let i = 1; i < vCount; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, sh - ft * 2, sd), metalMat);
      bar.position.set(-sw / 2 + (sw / vCount) * i, sh / 2, 0);
      group.add(bar);
    }

    return group;
  }

  _detailBox(sw, sh, sd, material) {
    const group = new THREE.Group();
    const tapeMat = this._getOrCreateMaterial(0xBB9944, { roughness: 0.7, metalness: 0.0 });

    // Main box body
    const body = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), material);
    body.position.set(0, sh / 2, 0);
    group.add(body);

    // Packing tape (top cross)
    const tapeW = sw * 0.15;
    const tapeTop = new THREE.Mesh(new THREE.BoxGeometry(tapeW, 0.005, sd + 0.01), tapeMat);
    tapeTop.position.set(0, sh + 0.003, 0);
    group.add(tapeTop);

    // Tape drape (front and back)
    const drapeFront = new THREE.Mesh(new THREE.BoxGeometry(tapeW, sh * 0.2, 0.005), tapeMat);
    drapeFront.position.set(0, sh - sh * 0.1, sd / 2 + 0.003);
    group.add(drapeFront);
    const drapeBack = new THREE.Mesh(new THREE.BoxGeometry(tapeW, sh * 0.2, 0.005), tapeMat);
    drapeBack.position.set(0, sh - sh * 0.1, -sd / 2 - 0.003);
    group.add(drapeBack);

    // Flap seam (top center)
    const seam = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.005, 0.003, 0.003),
      this._getOrCreateMaterial(0x333333, { roughness: 0.8, metalness: 0.0 }));
    seam.position.set(0, sh, 0);
    group.add(seam);

    return group;
  }

  _detailFlashlight(sw, sh, sd, material) {
    const group = new THREE.Group();
    const bodyMat = this._getOrCreateMaterial(0x222222, { roughness: 0.5, metalness: 0.4 });
    const gripMat = this._getOrCreateMaterial(0x333333, { roughness: 0.7, metalness: 0.2 });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc, emissive: 0xffeeaa, emissiveIntensity: 0.3,
      roughness: 0.1, metalness: 0.2,
    });
    const ringMat = this._getOrCreateMaterial(0x888888, { roughness: 0.3, metalness: 0.7 });

    // Flashlight lies on its side (long axis along X)
    const length = Math.max(sw, sd) * 0.9;
    const bodyR = Math.min(sw, sd) * 0.35;

    // Main barrel (body)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyR, bodyR, length * 0.6, 8),
      bodyMat
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, bodyR, 0);
    group.add(barrel);

    // Head (wider cone toward lens end)
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyR * 1.4, bodyR, length * 0.3, 8),
      bodyMat
    );
    head.rotation.z = Math.PI / 2;
    head.position.set(length * 0.35, bodyR, 0);
    group.add(head);

    // Lens (glowing disc at front)
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyR * 1.2, bodyR * 1.2, 0.01, 10),
      lensMat
    );
    lens.rotation.z = Math.PI / 2;
    lens.position.set(length * 0.5, bodyR, 0);
    group.add(lens);

    // Lens ring (chrome bezel)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(bodyR * 1.3, 0.008, 6, 10),
      ringMat
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(length * 0.5, bodyR, 0);
    group.add(ring);

    // Grip ridges (3 rings around body)
    for (let i = 0; i < 3; i++) {
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(bodyR + 0.005, 0.006, 4, 8),
        gripMat
      );
      ridge.rotation.y = Math.PI / 2;
      ridge.position.set(-length * 0.15 + i * 0.04, bodyR, 0);
      group.add(ridge);
    }

    // Tail cap (back end)
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(bodyR * 0.9, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      bodyMat
    );
    cap.rotation.x = Math.PI / 2;
    cap.rotation.z = -Math.PI / 2;
    cap.position.set(-length * 0.3, bodyR, 0);
    group.add(cap);

    // Button (side, small bump)
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.01, 0.02),
      ringMat
    );
    btn.position.set(-length * 0.05, bodyR * 2 + 0.005, 0);
    group.add(btn);

    return group;
  }

  // ── Era-based Decorations ─────────────────────────────

  /**
   * Add wall graffiti/writings for a room based on era.
   */
  _addWallWritings(room, era) {
    const writings = WALL_WRITINGS[era];
    if (!writings || writings.length === 0) return;
    // Also include writings from lower eras (cumulative)
    const allWritings = [];
    for (let e = 2; e <= era; e++) {
      if (WALL_WRITINGS[e]) allWritings.push(...WALL_WRITINGS[e]);
    }

    const [ox, oy, oz] = room.origin;
    const [w, h, d] = room.size;
    const seed = hashString(room.id + era);
    const rng = seededRandom(seed);

    // Determine writing count based on era
    const countRange = { 2: [0, 2], 3: [1, 3], 4: [2, 4], 5: [3, 6] };
    const [minC, maxC] = countRange[era] || [0, 0];
    const count = minC + Math.floor(rng() * (maxC - minC + 1));
    if (count === 0) return;

    // Determine which walls are available (no door = full wall)
    const doorWalls = new Set(room.doors.map(d => d.wall));
    const wallDefs = [
      { name: 'north', cx: ox, cz: oz - d / 2, len: w, normalX: 0, normalZ: 1, rotY: 0 },
      { name: 'south', cx: ox, cz: oz + d / 2, len: w, normalX: 0, normalZ: -1, rotY: Math.PI },
      { name: 'east',  cx: ox + w / 2, cz: oz, len: d, normalX: -1, normalZ: 0, rotY: -Math.PI / 2 },
      { name: 'west',  cx: ox - w / 2, cz: oz, len: d, normalX: 1, normalZ: 0, rotY: Math.PI / 2 },
    ];
    // Prefer walls without doors but allow doored walls with less probability
    const walls = wallDefs.filter(wd => !doorWalls.has(wd.name));
    if (walls.length === 0) return;

    const lang = this._lang || 'ko';

    for (let i = 0; i < count; i++) {
      const wall = walls[Math.floor(rng() * walls.length)];
      const writing = allWritings[Math.floor(rng() * allWritings.length)];
      const text = writing[lang] || writing.ko;
      const isLarge = writing.large || false;

      const fontSize = isLarge ? 48 : 22 + Math.floor(rng() * 12);
      const texW = isLarge ? 512 : 256;
      const texH = isLarge ? 256 : 128;

      const tex = this._textures.generateWallText(text, writing.style, {
        fontSize, width: texW, height: texH,
      });

      // Physical size of the decal in world units
      const planeW = isLarge ? 3.0 : 1.2 + rng() * 0.8;
      const planeH = planeW * (texH / texW);

      const geo = new THREE.PlaneGeometry(planeW, planeH);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Position on wall surface
      const offsetAlongWall = (rng() - 0.5) * wall.len * 0.7;
      const heightPos = oy + 0.5 + rng() * (h - 1.5);

      if (wall.name === 'north' || wall.name === 'south') {
        mesh.position.set(
          wall.cx + offsetAlongWall,
          heightPos,
          wall.cz + wall.normalZ * 0.12
        );
      } else {
        mesh.position.set(
          wall.cx + wall.normalX * 0.12,
          heightPos,
          wall.cz + offsetAlongWall
        );
      }

      mesh.rotation.y = wall.rotY;
      // Slight random tilt for organic feel
      mesh.rotation.z = (rng() - 0.5) * 0.12;

      this.group.add(mesh);
    }
  }

  /**
   * Add floor stains/decals for a room based on era.
   */
  _addFloorStains(room, era) {
    const [ox, oy, oz] = room.origin;
    const [w, , d] = room.size;
    const seed = hashString(room.id + 'floor' + era);
    const rng = seededRandom(seed);

    const stainCount = era >= 5 ? 2 + Math.floor(rng() * 3) :
                       era >= 4 ? 1 + Math.floor(rng() * 2) :
                       Math.floor(rng() * 2);
    if (stainCount === 0) return;

    for (let i = 0; i < stainCount; i++) {
      const size = 0.5 + rng() * 1.5;
      const posX = ox + (rng() - 0.5) * (w - 1);
      const posZ = oz + (rng() - 0.5) * (d - 1);

      // Create stain canvas
      const canvasSize = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const isBlood = era >= 4 && rng() > 0.4;
      const r = isBlood ? 80 + Math.floor(rng() * 60) : 30 + Math.floor(rng() * 20);
      const g = isBlood ? 5 + Math.floor(rng() * 10) : 25 + Math.floor(rng() * 15);
      const b = isBlood ? 5 + Math.floor(rng() * 10) : 25 + Math.floor(rng() * 15);
      const alpha = 0.3 + rng() * 0.3;

      // Irregular blob shape
      const cx = canvasSize / 2;
      const cy = canvasSize / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvasSize / 2);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Irregular circle
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        const rad = (canvasSize / 2) * (0.6 + rng() * 0.4);
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.02,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // face up
      mesh.position.set(posX, oy + 0.01, posZ);
      mesh.rotation.z = rng() * Math.PI * 2;
      this.group.add(mesh);
    }
  }

  /**
   * Set language for wall writings.
   */
  setLang(lang) {
    this._lang = lang;
  }

  /**
   * No-op — kept for API compatibility with main.js.
   * Lighting is now handled globally via ambient/hemisphere lights.
   */
  updateShadowsForRoom(roomId) {
    // No per-room lights to manage
  }

  /**
   * Get the room the player is currently in based on position.
   */
  getRoomAtPosition(pos) {
    const rooms = this._activeRooms || ROOMS;
    for (const room of rooms) {
      // Skip rooms not built for current era
      if (!this._activeRooms && room.eraMin && (this.era || 1) < room.eraMin) continue;
      const [ox, , oz] = room.origin;
      const [w, , d] = room.size;
      if (
        pos.x >= ox - w / 2 - 0.5 && pos.x <= ox + w / 2 + 0.5 &&
        pos.z >= oz - d / 2 - 0.5 && pos.z <= oz + d / 2 + 0.5
      ) {
        return room;
      }
    }
    return null;
  }

  // ── Era-specific Props ─────────────────────────────────

  _buildEraProps(era) {
    if (era >= 5) {
      // Overwrite terminal in SERVER_ROOM
      const serverRoom = ROOMS.find(r => r.id === 'SERVER_ROOM');
      if (serverRoom) {
        const [ox, oy, oz] = serverRoom.origin;
        const prop = {
          type: 'console', position: [2, 0.4, -3], size: [0.6, 0.8, 0.5],
          color: 0xaa2222, id: 'overwrite_terminal'
        };
        this._buildProp(prop, ox, oy, oz, 'SERVER_ROOM');
      }
    }
  }

  // ── Ghost Figure System ────────────────────────────────

  _createGhostMesh(config) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x444466, transparent: true, opacity: 0.35, depthWrite: false,
    });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat);
    head.position.y = 1.65;
    group.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), mat);
    torso.position.y = 1.2;
    group.add(torso);

    // Left leg
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.2), mat);
    legL.position.set(-0.1, 0.6, 0);
    group.add(legL);

    // Right leg
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.2), mat);
    legR.position.set(0.1, 0.6, 0);
    group.add(legR);

    group.position.set(config.x, config.y, config.z);
    if (config.rotY) group.rotation.y = config.rotY;

    group.userData = {
      ghostId: config.id,
      persistent: config.persistent || false,
      faded: false,
      triggered: false,
    };

    return group;
  }

  _buildGhostFigures(era) {
    const GHOST_CONFIGS = [
      // Era 4: FORGOTTEN_WING — corner facing wall
      { id: 'forgotten', era: 4, room: 'FORGOTTEN_WING', x: -68 - 3, y: 0, z: -21 - 2.5, rotY: Math.PI },
      // Era 4: HOLDING_CELLS — sitting in cell
      { id: 'holding', era: 4, room: 'HOLDING_CELLS', x: 22 - 3, y: 0, z: -34 - 1, rotY: 0 },
      // Era 5: VENTILATION_SHAFT — standing at end of duct
      { id: 'vent', era: 5, room: 'VENTILATION_SHAFT', x: 22, y: 0, z: -11 + 4, rotY: Math.PI },
      // Era 5: DEEP_STORAGE — between containers
      { id: 'deep_storage', era: 5, room: 'DEEP_STORAGE', x: 58, y: 0, z: -45, rotY: -Math.PI / 4 },
      // Era 5: SUBJECT_CHAMBER — persistent, faces player
      { id: 'subject_chamber', era: 5, room: 'SUBJECT_CHAMBER', x: 65, y: 0, z: -45, rotY: 0, persistent: true },
    ];

    // Check which rooms are active
    const activeRoomIds = new Set((this._activeRooms || []).map(r => r.id));

    const ghosts = [];
    for (const config of GHOST_CONFIGS) {
      if (era < config.era) continue;
      // Don't spawn ghosts in rooms that don't exist in this variant
      if (config.room && !activeRoomIds.has(config.room)) continue;
      const ghost = this._createGhostMesh(config);
      this.group.add(ghost);
      ghosts.push(ghost);
    }

    // SHOOTER_PARODY: extra ghost enemies in hallway
    if (this._variant && this._variant.id === 'SHOOTER_PARODY') {
      const shooterGhosts = [
        { id: 'enemy_1', era: 5, x: 0, y: 0, z: -8, rotY: Math.PI },
        { id: 'enemy_2', era: 5, x: -1, y: 0, z: -15, rotY: Math.PI * 0.8 },
        { id: 'enemy_3', era: 5, x: 1, y: 0, z: -20, rotY: -Math.PI * 0.5 },
        { id: 'enemy_4', era: 5, x: 0, y: 0, z: -23, rotY: 0 },
      ];
      for (const config of shooterGhosts) {
        const ghost = this._createGhostMesh(config);
        this.group.add(ghost);
        ghosts.push(ghost);
      }
    }

    return ghosts;
  }
}

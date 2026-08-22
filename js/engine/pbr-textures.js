import * as THREE from 'three';
import { ProceduralTextures } from './textures.js';

/**
 * PBR texture provider — real CC0 material sets (ambientCG, 512px) from
 * assets/textures/, exposed through the same `.get(type, color)` interface
 * map-builder already uses. Unknown types (e.g. 'screen') fall back to the
 * procedural generator.
 *
 * Files expected: assets/textures/<Set>_{Color,NormalGL,Roughness}.jpg
 */
const SURFACE_SETS = {
  plaster: 'Plaster003',
  plaster_home: 'Plaster003',
  ceiling: 'OfficeCeiling001',
  tile: 'Tiles074',
  concrete: 'Concrete016',
  carpet: 'Carpet004',
  metal: 'Metal032',
  rusty_metal: 'Metal032',
  wood: 'WoodFloor043',
};

export class PBRTextures {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this._cache = new Map();
    this._fallback = new ProceduralTextures();
  }

  _load(file, { srgb = false } = {}) {
    const clones = [];
    const tex = this.loader.load(`assets/textures/${file}`, () => {
      // bump every clone handed out before the image arrived
      tex.needsUpdate = true;
      for (const c of clones) c.needsUpdate = true;
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex._pendingClones = clones; // plain property — kept out of userData so clone()'s JSON copy never sees it
    return tex;
  }

  /**
   * Same contract as ProceduralTextures.get: returns { map, normalMap } —
   * plus roughnessMap when a PBR set exists for the type.
   */
  get(type, color, opts = {}) {
    const set = SURFACE_SETS[type];
    if (!set) return this._fallback.get(type, color, opts);

    const key = `pbr_${set}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const result = {
      map: this._load(`${set}_Color.jpg`, { srgb: true }),
      normalMap: this._load(`${set}_NormalGL.jpg`),
      roughnessMap: this._load(`${set}_Roughness.jpg`),
    };
    this._cache.set(key, result);
    return result;
  }
}

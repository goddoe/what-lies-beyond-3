import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * GLB prop models (Kenney Furniture Kit, CC0) from assets/models/.
 *
 * Props are mapped by propId first, then by prop type. Loading is async:
 * map-builder inserts an empty Group synchronously (colliders come from the
 * declared prop size, so gameplay never waits) and the model pops in when
 * ready, auto-scaled to fit the prop's declared footprint.
 */

// propId → model file (specific hero props)
const MODEL_BY_ID = {
  archive_mac: 'televisionVintage',   // the 1984 Macintosh reads perfectly as a vintage CRT
  tv: 'televisionModern',
  ewaste_cart: 'cardboardBoxOpen',
  gpu_boxes: 'cardboardBoxClosed',
  min_mug: null,                      // keep procedural (tiny)
  webcam: null,                       // keep procedural (tiny black box)
};

// prop type → model file
const MODEL_BY_TYPE = {
  desk: 'desk',
  chair: 'chairDesk',
  couch: 'loungeSofa',
  table: 'table',
  shelf: 'bookcaseOpen',
  cabinet: 'bookcaseClosedDoors',
  plant: 'pottedPlant',
  basket: 'trashcan',
  bin: 'trashcan',
  bench: 'bench',
  coffee_machine: 'kitchenCoffeeMachine',
  microwave: 'kitchenMicrowave',
  vending: 'kitchenFridgeLarge',
  lamp: 'lampRoundFloor',
  crate: 'cardboardBoxClosed',
  counter: 'sideTableDrawers',
  rug: 'rugRectangle',
  keyboard: 'computerKeyboard',
  books: 'books',
  laptop: 'laptop',
  coatrack: 'coatRackStanding',
  speaker: 'speaker',
  radio: 'radio',
  pillow: 'pillowLong',
  sidetable: 'sideTableDrawers',
  tablelamp: 'lampRoundTable',
};

// Characters keep their proportions — scaled uniformly by height
const UNIFORM_TYPES = new Set(['books', 'laptop', 'keyboard']);
export function isCharacterModel(file) {
  return file && file.startsWith('char-');
}

const loader = new GLTFLoader();
const gltfCache = new Map(); // file → Promise<GLTF scene>

function loadModel(file) {
  if (!gltfCache.has(file)) {
    gltfCache.set(file, new Promise((resolve, reject) => {
      loader.load(`assets/models/${file}.glb`, g => resolve(g.scene), undefined, reject);
    }));
  }
  return gltfCache.get(file);
}

/** Which model file (if any) a prop should use. */
export function modelFor(prop) {
  if (prop.id !== undefined && prop.id in MODEL_BY_ID) return MODEL_BY_ID[prop.id];
  return MODEL_BY_TYPE[prop.type] || null;
}

/**
 * Fill `group` with the model, scaled so its footprint matches [sw, sh, sd]
 * (uniform scale fitted to the largest requested dimension ratio, bottom at y=0).
 */
export function attachModel(group, file, sw, sh, sd, tint = null, { uniform = false } = {}) {
  loadModel(file).then(scene => {
    const model = scene.clone(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;

    if (uniform || isCharacterModel(file)) {
      // Characters/organic shapes: keep proportions, fit by height
      model.scale.setScalar((sh / size.y) || 1);
    } else {
      // Furniture: geometry must match the declared prop box exactly, so
      // items placed on top (notes, monitors) sit on the surface and
      // colliders line up. Kenney's low-poly style tolerates mild stretch.
      model.scale.set(sw / size.x || 1, sh / size.y || 1, sd / size.z || 1);
    }

    // Re-measure and center on x/z, floor on y
    const scaled = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaled.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaled.min.y;

    model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        // Kenney characters ship as unlit (MeshBasicMaterial) — convert to a
        // lit material so they sit in the scene's lighting instead of glowing
        if (obj.material && obj.material.isMeshBasicMaterial) {
          obj.material = new THREE.MeshStandardMaterial({
            map: obj.material.map || null,
            color: obj.material.color,
            roughness: 0.85,
            metalness: 0.0,
          });
        }
        if (tint) {
          obj.material = obj.material.clone();
          const c = obj.material.color;
          c.multiply(new THREE.Color(tint));
          // mute the source hue so saturated kit colors take the tint
          const hsl = { h: 0, s: 0, l: 0 };
          c.getHSL(hsl);
          c.setHSL(hsl.h, hsl.s * 0.3, hsl.l);
        }
      }
    });

    group.add(model);
  }).catch(() => { /* keep the procedural fallback that's already in the group */ });
}

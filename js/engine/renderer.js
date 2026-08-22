import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Renderer {
  constructor(canvas, { isMobile = false } = {}) {
    this.canvas = canvas;
    this.isMobile = isMobile;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0f12);
    this.scene.fog = new THREE.Fog(0x0e0f12, 14, 55);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.6, 0);
    this._updateFov();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Soft shadows — only the nearest pooled light casts (see updateRoomLights)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Image-based lighting — a procedural studio environment gives standard
    // materials realistic reflections/speculars without any asset files.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Low base fill — real illumination comes from the pooled room lights.
    this.hemiLight = new THREE.HemisphereLight(0xbdc7d8, 0x3a3630, 0.55);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x8a94a8, 0.35);
    this.scene.add(this.ambientLight);

    // ── Pooled room lights ─────────────────────────────
    // A fixed-size pool keeps the scene's light count constant (no shader
    // recompilation); each frame the pool is re-assigned to the rooms nearest
    // the camera.
    this.lightPool = [];
    const POOL_SIZE = 4;
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 14, 1.8);
      // Only pool slot 0 (assigned to the nearest room) casts shadows —
      // one point-light cubemap is affordable, four are not.
      if (i === 0 && !isMobile) {
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.bias = -0.004;
        light.shadow.normalBias = 0.02;
        light.shadow.camera.near = 0.3;
        light.shadow.camera.far = 20;
      }
      this.scene.add(light);
      this.lightPool.push(light);
    }
    this._roomLightDefs = [];

    // Resize handler
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  /**
   * Register room light definitions: [{ position:Vector3, color, intensity, distance }]
   */
  setRoomLights(defs) {
    this._roomLightDefs = defs;
  }

  /** Assign the pooled lights to the nearest room lights. Call per-frame. */
  updateRoomLights(cameraPosition) {
    if (this._roomLightDefs.length === 0) return;
    const sorted = this._roomLightDefs
      .map(def => ({ def, d: cameraPosition.distanceToSquared(def.position) }))
      .sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.lightPool.length; i++) {
      const light = this.lightPool[i];
      const entry = sorted[i];
      if (entry) {
        light.position.copy(entry.def.position);
        light.color.set(entry.def.color);
        light.intensity = entry.def.intensity;
        light.distance = entry.def.distance;
      } else {
        light.intensity = 0;
      }
    }
  }

  // Portrait-first FOV: Three.js fov is vertical, so a fixed value gives a
  // claustrophobic horizontal view at 9:16. Target ~62° horizontal and derive
  // the vertical fov from aspect, clamped so neither extreme distorts.
  _updateFov() {
    const aspect = window.innerWidth / window.innerHeight;
    const hFov = 62 * Math.PI / 180;
    const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect) * 180 / Math.PI;
    this.camera.fov = Math.min(85, Math.max(55, vFov));
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this._updateFov();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setFogColor(color) {
    this.scene.fog.color.set(color);
    this.scene.background.set(color);
  }

  setExposure(value) {
    this.renderer.toneMappingExposure = value;
  }

  setFogNear(value) {
    this.scene.fog.near = value;
  }

  setFogFar(value) {
    this.scene.fog.far = value;
  }
}

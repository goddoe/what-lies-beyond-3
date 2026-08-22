import * as THREE from 'three';

/**
 * DoorSystem — manages shutter-style door meshes, animation, collision, and interaction.
 *
 * All doors open horizontally (left/right sliding panels).
 * - N/S walls: panels slide along X axis
 * - E/W walls: panels slide along Z axis
 *
 * Each door consists of:
 * - 2 sliding panels (left/right)
 * - 4 frame pieces (border around the doorway)
 * - 1 seam line (gap between panels)
 * - 2 LED indicators (red=closed, green=open) on both faces
 * - 1 invisible collider (blocks player when closed)
 * - 1 invisible interact mesh (slightly larger, for raycast detection)
 */
export class DoorSystem {
  constructor(parentGroup) {
    this.group = parentGroup;
    this.doors = [];
    this._animating = [];

    // Shared materials (created once, reused)
    this._panelMat = new THREE.MeshStandardMaterial({
      color: 0x4a5666,
      metalness: 0.65,
      roughness: 0.4,
      metalness: 0.7,
    });
    this._glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcfe4f5,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.1,
    });
    this._pushBarMat = new THREE.MeshStandardMaterial({
      color: 0x8a919c,
      roughness: 0.35,
      metalness: 0.8,
    });
    this._frameMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a44,
      roughness: 0.6,
      metalness: 0.5,
    });
    this._seamMat = new THREE.MeshStandardMaterial({
      color: 0x222228,
      roughness: 0.9,
      metalness: 0.1,
    });
    this._ledRedMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
    });
    this._ledGreenMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
    });
    // Invisible material for collider/interact meshes (must remain "visible" for raycasting)
    this._invisibleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  }

  /**
   * Create a horizontal shutter door at the given position.
   * @param {object} opts
   * @param {number} opts.cx - door center X
   * @param {number} opts.cy - door bottom Y (floor level)
   * @param {number} opts.cz - door center Z
   * @param {number} opts.width - door opening width
   * @param {number} opts.height - door opening height
   * @param {string} opts.axis - 'z' for N/S walls, 'x' for E/W walls
   * @param {string} opts.wallName - 'north'|'south'|'east'|'west'
   * @param {string} opts.roomId - room identifier
   * @returns {object} door instance
   */
  createDoor({ cx, cy, cz, width, height, axis, wallName, roomId, glass = false }) {
    const door = {
      id: `${roomId}_${wallName}`,
      cx, cy, cz, width, height, axis, wallName, roomId,
      opened: false,
      animating: false,
      animTime: 0,
    };

    const doorGroup = new THREE.Group();
    door.doorGroup = doorGroup;

    const panelThickness = 0.08;
    const frameSize = 0.08;
    const halfW = width / 2;
    const halfH = height / 2;
    const panelW = width / 2; // each panel covers half the opening

    // N/S walls (axis='z'): wall is thin along Z, extends along X. Panels slide along X.
    // E/W walls (axis='x'): wall is thin along X, extends along Z. Panels slide along Z.
    const isNS = axis === 'z';
    const panelMat = glass ? this._glassMat : this._panelMat;

    // slideAxis: the property name we'll animate ('x' or 'z')
    door.slideAxis = isNS ? 'x' : 'z';

    // glass doors get a horizontal push bar so the pane reads at a glance
    const addBar = (panel) => {
      if (!glass) return;
      const barGeo = isNS
        ? new THREE.BoxGeometry(panelW * 0.8, 0.05, panelThickness + 0.03)
        : new THREE.BoxGeometry(panelThickness + 0.03, 0.05, panelW * 0.8);
      const bar = new THREE.Mesh(barGeo, this._pushBarMat);
      bar.position.set(0, -halfH + 1.05, 0);
      panel.add(bar);
      const edgeGeo = isNS
        ? new THREE.BoxGeometry(panelW, 0.04, panelThickness + 0.015)
        : new THREE.BoxGeometry(panelThickness + 0.015, 0.04, panelW);
      const edge = new THREE.Mesh(edgeGeo, this._pushBarMat);
      edge.position.set(0, halfH - frameSize - 0.04, 0);
      panel.add(edge);
    };

    if (isNS) {
      // ── N/S wall: panels slide left/right along X ──
      const panelGeoL = new THREE.BoxGeometry(panelW, height - frameSize * 2, panelThickness);
      const panelL = new THREE.Mesh(panelGeoL, panelMat);
      panelL.position.set(cx - panelW / 2, cy + halfH, cz);
      addBar(panelL);
      doorGroup.add(panelL);
      door.panelA = panelL;
      door.panelAStart = panelL.position.x;
      door.panelATarget = cx - panelW / 2 - panelW;

      const panelGeoR = new THREE.BoxGeometry(panelW, height - frameSize * 2, panelThickness);
      const panelR = new THREE.Mesh(panelGeoR, panelMat);
      panelR.position.set(cx + panelW / 2, cy + halfH, cz);
      addBar(panelR);
      doorGroup.add(panelR);
      door.panelB = panelR;
      door.panelBStart = panelR.position.x;
      door.panelBTarget = cx + panelW / 2 + panelW;

      // Vertical seam between panels
      const seamGeo = new THREE.BoxGeometry(0.02, height - frameSize * 2, panelThickness + 0.01);
      const seam = new THREE.Mesh(seamGeo, this._seamMat);
      seam.position.set(cx, cy + halfH, cz);
      doorGroup.add(seam);
      door.seam = seam;

      // Frame: left, right, top, bottom
      const frameSideGeo = new THREE.BoxGeometry(frameSize, height, panelThickness + 0.02);
      const frameL = new THREE.Mesh(frameSideGeo, this._frameMat);
      frameL.position.set(cx - halfW + frameSize / 2, cy + halfH, cz);
      doorGroup.add(frameL);

      const frameR = new THREE.Mesh(frameSideGeo.clone(), this._frameMat);
      frameR.position.set(cx + halfW - frameSize / 2, cy + halfH, cz);
      doorGroup.add(frameR);

      const frameTBGeo = new THREE.BoxGeometry(width, frameSize, panelThickness + 0.02);
      const frameT = new THREE.Mesh(frameTBGeo, this._frameMat);
      frameT.position.set(cx, cy + height + frameSize / 2, cz);
      doorGroup.add(frameT);

      const frameB = new THREE.Mesh(frameTBGeo.clone(), this._frameMat);
      frameB.position.set(cx, cy - frameSize / 2, cz);
      doorGroup.add(frameB);

      // LEDs on both faces (offset along Z)
      const ledGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
      const ledOffset = panelThickness / 2 + 0.02;
      const ledFront = new THREE.Mesh(ledGeo, this._ledRedMat);
      ledFront.position.set(cx + halfW - frameSize / 2, cy + height + frameSize / 2, cz + ledOffset);
      doorGroup.add(ledFront);
      const ledBack = new THREE.Mesh(ledGeo.clone(), this._ledRedMat);
      ledBack.position.set(cx + halfW - frameSize / 2, cy + height + frameSize / 2, cz - ledOffset);
      doorGroup.add(ledBack);
      door.leds = [ledFront, ledBack];

      // Collider
      const colliderGeo = new THREE.BoxGeometry(width, height, 0.3);
      const colliderMesh = new THREE.Mesh(colliderGeo, this._invisibleMat);
      colliderMesh.position.set(cx, cy + halfH, cz);
      colliderMesh.renderOrder = -1;
      doorGroup.add(colliderMesh);
      door.colliderMesh = colliderMesh;

      // Interact mesh
      const interactGeo = new THREE.BoxGeometry(width + 0.4, height + 0.2, 0.6);
      const interactMesh = new THREE.Mesh(interactGeo, this._invisibleMat);
      interactMesh.position.set(cx, cy + halfH, cz);
      interactMesh.renderOrder = -1;
      doorGroup.add(interactMesh);
      door.interactMesh = interactMesh;

    } else {
      // ── E/W wall: panels slide left/right along Z ──
      const panelGeoL = new THREE.BoxGeometry(panelThickness, height - frameSize * 2, panelW);
      const panelL = new THREE.Mesh(panelGeoL, panelMat);
      panelL.position.set(cx, cy + halfH, cz - panelW / 2);
      addBar(panelL);
      doorGroup.add(panelL);
      door.panelA = panelL;
      door.panelAStart = panelL.position.z;
      door.panelATarget = cz - panelW / 2 - panelW;

      const panelGeoR = new THREE.BoxGeometry(panelThickness, height - frameSize * 2, panelW);
      const panelR = new THREE.Mesh(panelGeoR, panelMat);
      panelR.position.set(cx, cy + halfH, cz + panelW / 2);
      addBar(panelR);
      doorGroup.add(panelR);
      door.panelB = panelR;
      door.panelBStart = panelR.position.z;
      door.panelBTarget = cz + panelW / 2 + panelW;

      // Vertical seam between panels
      const seamGeo = new THREE.BoxGeometry(panelThickness + 0.01, height - frameSize * 2, 0.02);
      const seam = new THREE.Mesh(seamGeo, this._seamMat);
      seam.position.set(cx, cy + halfH, cz);
      doorGroup.add(seam);
      door.seam = seam;

      // Frame: top, bottom, left, right
      const frameTBGeo = new THREE.BoxGeometry(panelThickness + 0.02, frameSize, width);
      const frameT = new THREE.Mesh(frameTBGeo, this._frameMat);
      frameT.position.set(cx, cy + height + frameSize / 2, cz);
      doorGroup.add(frameT);

      const frameB = new THREE.Mesh(frameTBGeo.clone(), this._frameMat);
      frameB.position.set(cx, cy - frameSize / 2, cz);
      doorGroup.add(frameB);

      const frameSideGeo = new THREE.BoxGeometry(panelThickness + 0.02, height, frameSize);
      const frameL = new THREE.Mesh(frameSideGeo, this._frameMat);
      frameL.position.set(cx, cy + halfH, cz - halfW + frameSize / 2);
      doorGroup.add(frameL);

      const frameR = new THREE.Mesh(frameSideGeo.clone(), this._frameMat);
      frameR.position.set(cx, cy + halfH, cz + halfW - frameSize / 2);
      doorGroup.add(frameR);

      // LEDs on both faces (offset along X)
      const ledGeo = new THREE.BoxGeometry(0.03, 0.06, 0.06);
      const ledOffset = panelThickness / 2 + 0.02;
      const ledFront = new THREE.Mesh(ledGeo, this._ledRedMat);
      ledFront.position.set(cx + ledOffset, cy + height + frameSize / 2, cz + halfW - frameSize / 2);
      doorGroup.add(ledFront);
      const ledBack = new THREE.Mesh(ledGeo.clone(), this._ledRedMat);
      ledBack.position.set(cx - ledOffset, cy + height + frameSize / 2, cz + halfW - frameSize / 2);
      doorGroup.add(ledBack);
      door.leds = [ledFront, ledBack];

      // Collider
      const colliderGeo = new THREE.BoxGeometry(0.3, height, width);
      const colliderMesh = new THREE.Mesh(colliderGeo, this._invisibleMat);
      colliderMesh.position.set(cx, cy + halfH, cz);
      colliderMesh.renderOrder = -1;
      doorGroup.add(colliderMesh);
      door.colliderMesh = colliderMesh;

      // Interact mesh
      const interactGeo = new THREE.BoxGeometry(0.6, height + 0.2, width + 0.4);
      const interactMesh = new THREE.Mesh(interactGeo, this._invisibleMat);
      interactMesh.position.set(cx, cy + halfH, cz);
      interactMesh.renderOrder = -1;
      doorGroup.add(interactMesh);
      door.interactMesh = interactMesh;
    }

    this.group.add(doorGroup);
    this.doors.push(door);
    return door;
  }

  /**
   * Open a door with shutter animation.
   */
  openDoor(door) {
    if (door.opened || door.animating) return;
    door.animating = true;
    door.animTime = 0;
    this._animating.push(door);

    // Remove collider immediately so player can walk through
    if (door.colliderMesh) {
      door.colliderMesh.removeFromParent();
      if (door.colliderMesh.geometry) door.colliderMesh.geometry.dispose();
      door.colliderMesh = null;
    }
  }

  /**
   * Close an opened door: panels slide back, collider is rebuilt when shut.
   */
  closeDoor(door) {
    if (!door.opened || door.animating) return;
    door.animating = true;
    door.closing = true;
    door.animTime = 0;
    this._animating.push(door);
  }

  /**
   * Update door animations. Call from game loop.
   * @param {number} delta - frame delta in seconds
   */
  update(delta) {
    if (this._animating.length === 0) return;

    const DURATION = 0.9; // seconds
    const done = [];

    for (const door of this._animating) {
      door.animTime += delta;
      const t = Math.min(door.animTime / DURATION, 1);
      // Ease-out cubic: 1 - (1-t)^3
      const ease = 1 - Math.pow(1 - t, 3);

      const prop = door.slideAxis; // 'x' or 'z'
      const k = door.closing ? 1 - ease : ease; // closing runs the slide in reverse
      door.panelA.position[prop] = door.panelAStart + (door.panelATarget - door.panelAStart) * k;
      door.panelB.position[prop] = door.panelBStart + (door.panelBTarget - door.panelBStart) * k;
      // Seam follows panel B's direction
      const seamCenter = door.slideAxis === 'x' ? door.cx : door.cz;
      door.seam.position[prop] = seamCenter + (door.panelBTarget - door.panelBStart) * k;

      if (t >= 1) {
        done.push(door);
      }
    }

    for (const door of done) {
      door.animating = false;
      if (door.closing) {
        door.closing = false;
        door.opened = false;
        // rebuild the collider so the shut door blocks again
        const halfH = door.height / 2;
        const colliderGeo = door.slideAxis === 'x'
          ? new THREE.BoxGeometry(door.width, door.height, 0.3)
          : new THREE.BoxGeometry(0.3, door.height, door.width);
        const colliderMesh = new THREE.Mesh(colliderGeo, this._invisibleMat);
        colliderMesh.position.set(door.cx, door.cy + halfH, door.cz);
        colliderMesh.renderOrder = -1;
        door.doorGroup.add(colliderMesh);
        door.colliderMesh = colliderMesh;
        if (door.interactMesh) door.interactMesh.visible = true;
        const ci = this._animating.indexOf(door);
        if (ci >= 0) this._animating.splice(ci, 1);
        continue;
      }
      door.opened = true;

      // Switch LEDs to green
      for (const led of door.leds) {
        led.material = this._ledGreenMat;
      }

      // Hide the interact mesh while open — a later closeDoor() re-enables
      // it so the door stays reopenable (raycast skips invisible meshes)
      if (door.interactMesh) door.interactMesh.visible = false;

      // Remove from animating list
      const idx = this._animating.indexOf(door);
      if (idx >= 0) this._animating.splice(idx, 1);
    }
  }

  /**
   * Get all active collider meshes (closed doors).
   */
  getColliders() {
    const out = [];
    for (const door of this.doors) {
      if (door.colliderMesh && !door.opened) {
        out.push(door.colliderMesh);
      }
    }
    return out;
  }

  /**
   * Get all interactable descriptors for closed doors.
   */
  getInteractables() {
    const out = [];
    for (const door of this.doors) {
      if (door.interactMesh && !door.opened) {
        out.push({
          mesh: door.interactMesh,
          type: 'door',
          room: door.roomId,
          propId: null,
          door: door,
        });
      }
    }
    return out;
  }

  /**
   * Find a door instance by its interact mesh.
   */
  getDoorByInteractMesh(mesh) {
    for (const door of this.doors) {
      if (door.interactMesh === mesh) return door;
    }
    return null;
  }

  /**
   * Remove all door meshes and reset state. Used on map rebuild.
   */
  clear() {
    for (const door of this.doors) {
      if (door.doorGroup) {
        door.doorGroup.traverse(child => {
          if (child.geometry) child.geometry.dispose();
        });
        door.doorGroup.removeFromParent();
      }
    }
    this.doors = [];
    this._animating = [];
  }
}

import * as THREE from 'three';

/**
 * Camera focus — dolly the camera to a screen/prop and back.
 *
 * focusOn(): saves the current camera pose, then eases position + orientation
 * toward the target over ~0.6s. release() eases back to the saved pose.
 * While active, the game loop must not run player.update / touch look.
 */
export class CameraFocus {
  constructor(camera) {
    this.camera = camera;
    this.active = false;      // true while focused (including transit)
    this.transiting = false;

    this._savedPos = new THREE.Vector3();
    this._savedQuat = new THREE.Quaternion();

    this._fromPos = new THREE.Vector3();
    this._fromQuat = new THREE.Quaternion();
    this._toPos = new THREE.Vector3();
    this._toQuat = new THREE.Quaternion();

    this._t = 0;
    this._duration = 0.6;
    this._onDone = null;
    this._releasing = false;
  }

  /**
   * @param {THREE.Vector3} position  world position for the camera
   * @param {THREE.Vector3} lookAt    world point to look at
   */
  focusOn(position, lookAt, onDone) {
    this._savedPos.copy(this.camera.position);
    this._savedQuat.copy(this.camera.quaternion);

    this._startTransit(position, this._quatLookingAt(position, lookAt), onDone);
    this.active = true;
    this._releasing = false;
  }

  release(onDone) {
    if (!this.active) { if (onDone) onDone(); return; }
    this._startTransit(this._savedPos.clone(), this._savedQuat.clone(), () => {
      this.active = false;
      if (onDone) onDone();
    });
    this._releasing = true;
  }

  /** Instantly drop focus state without moving the camera (e.g. teleports). */
  cancel() {
    this.active = false;
    this.transiting = false;
    this._onDone = null;
  }

  _quatLookingAt(fromPos, lookAt) {
    const m = new THREE.Matrix4();
    m.lookAt(fromPos, lookAt, new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }

  _startTransit(toPos, toQuat, onDone) {
    this._fromPos.copy(this.camera.position);
    this._fromQuat.copy(this.camera.quaternion);
    this._toPos.copy(toPos);
    this._toQuat.copy(toQuat);
    this._t = 0;
    this.transiting = true;
    this._onDone = onDone || null;
  }

  update(delta) {
    if (!this.transiting) return;

    this._t += delta / this._duration;
    const t = Math.min(1, this._t);
    // ease-in-out
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.camera.position.lerpVectors(this._fromPos, this._toPos, e);
    this.camera.quaternion.slerpQuaternions(this._fromQuat, this._toQuat, e);

    if (t >= 1) {
      this.transiting = false;
      const cb = this._onDone;
      this._onDone = null;
      if (cb) cb();
    }
  }
}

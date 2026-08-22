import * as THREE from 'three';

/**
 * Manages invisible trigger zones (Box3).
 * Fires events when the player enters/exits zones.
 */
export class TriggerManager {
  constructor() {
    this.zones = [];       // { id, box, room, fired, active }
    this.playerPoint = new THREE.Vector3();
    this.activeZones = new Set();
    this.listeners = new Map();  // triggerId → [callback]
    this.enterListeners = [];    // global enter listeners
    this.exitListeners = [];     // global exit listeners

    // Cooldown: prevent rapid-fire triggers
    this.lastFireTime = 0;
    this.fireCooldown = 0; // instant trigger — chat-log narrator handles overlap
  }

  /**
   * Load trigger zones from map builder output.
   */
  loadZones(triggerZones) {
    this.zones = triggerZones.map(z => ({
      ...z,
      active: true,
    }));
  }

  /**
   * Replace all zones (used during map rebuild).
   * Preserves listener registrations but resets fired state.
   */
  setZones(triggerZones) {
    this.zones = triggerZones.map(z => ({
      ...z,
      active: true,
    }));
    this.activeZones.clear();
  }

  /**
   * Register a listener for a specific trigger ID.
   */
  on(triggerId, callback) {
    if (!this.listeners.has(triggerId)) {
      this.listeners.set(triggerId, []);
    }
    this.listeners.get(triggerId).push(callback);
  }

  /**
   * Register a global enter listener (called for any trigger).
   */
  onEnter(callback) {
    this.enterListeners.push(callback);
  }

  /**
   * Register a global exit listener.
   */
  onExit(callback) {
    this.exitListeners.push(callback);
  }

  /**
   * Reset a trigger so it can fire again.
   */
  resetTrigger(triggerId) {
    const zone = this.zones.find(z => z.id === triggerId);
    if (zone) {
      zone.fired = false;
    }
  }

  /**
   * Reset all triggers.
   */
  resetAll() {
    for (const zone of this.zones) {
      zone.fired = false;
    }
    this.activeZones.clear();
  }

  /**
   * Enable/disable a trigger zone.
   */
  setActive(triggerId, active) {
    const zone = this.zones.find(z => z.id === triggerId);
    if (zone) zone.active = active;
  }

  /**
   * Update: check player position against all zones.
   */
  update(playerPosition) {
    this.playerPoint.copy(playerPosition);
    const now = Date.now();

    for (const zone of this.zones) {
      if (!zone.active) continue;

      const inside = zone.box.containsPoint(this.playerPoint);

      if (inside && !this.activeZones.has(zone.id)) {
        // Player entered zone
        this.activeZones.add(zone.id);

        if (!zone.fired) {
          zone.fired = true;

          // Apply cooldown — delay fire if too soon after last trigger
          const elapsed = now - this.lastFireTime;
          if (elapsed >= this.fireCooldown) {
            this.lastFireTime = now;
            this._fireEnter(zone);
          } else {
            const delay = this.fireCooldown - elapsed;
            this.lastFireTime = now + delay;
            setTimeout(() => this._fireEnter(zone), delay);
          }
        }
      } else if (!inside && this.activeZones.has(zone.id)) {
        // Player exited zone
        this.activeZones.delete(zone.id);
        this._fireExit(zone);
      }
    }
  }

  _fireEnter(zone) {
    // Specific listeners
    const cbs = this.listeners.get(zone.id);
    if (cbs) {
      for (const cb of cbs) cb(zone);
    }

    // Global listeners
    for (const cb of this.enterListeners) {
      cb(zone);
    }
  }

  _fireExit(zone) {
    for (const cb of this.exitListeners) {
      cb(zone);
    }
  }

  /**
   * Get the current room based on which zones the player is in.
   */
  getCurrentRoom() {
    for (const zone of this.zones) {
      if (this.activeZones.has(zone.id) && zone.room) {
        return zone.room;
      }
    }
    return null;
  }
}

/**
 * Procedural ambient audio system using Web Audio API.
 * No external audio files needed - generates all sounds from oscillators and noise.
 *
 * Room ambiance types:
 * - 'office'    : warm low hum + occasional flicker
 * - 'server'    : deep electronic hum + data chirps
 * - 'industrial': low rumble + mechanical rhythm
 * - 'dark'      : eerie drone + deep sub-bass
 * - 'bright'    : gentle airy pad
 * - 'neutral'   : minimal background
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;       // AudioContext, created on first user interaction
    this.master = null;    // master gain
    this.ambience = null;  // current ambience nodes
    this.currentType = null;
    this.enabled = false;
    this.volume = 0.3;

    // Footstep state
    this.footstepTimer = 0;
    this.footstepInterval = 0.45; // seconds between steps
  }

  /**
   * Initialize audio context (must be called after user gesture).
   */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
  }

  /**
   * Set the room ambiance type.
   */
  setAmbiance(type) {
    if (!this.ctx || type === this.currentType) return;

    // Fade out old ambiance
    if (this.ambience) {
      this._fadeOutAmbience();
    }

    this.currentType = type;
    this.ambience = this._createAmbience(type);
  }

  /**
   * Trigger a footstep sound.
   * @param {number} delta - frame delta time
   * @param {boolean} isMoving - whether the player is moving
   * @param {string} roomType - affects footstep character
   */
  updateFootsteps(delta, isMoving, roomType) {
    if (!this.ctx || !this.enabled || !isMoving) {
      this.footstepTimer = 0;
      return;
    }

    this.footstepTimer += delta;
    if (this.footstepTimer >= this.footstepInterval) {
      this.footstepTimer -= this.footstepInterval;
      this._playFootstep(roomType);
    }
  }

  /**
   * Set master volume.
   */
  setVolume(v) {
    this.volume = v;
    if (this.master) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  // ═══════════════════════════════════════════════════
  //   AMBIANCE GENERATORS
  // ═══════════════════════════════════════════════════

  _createAmbience(type) {
    const nodes = [];
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(this.master);

    // Fade in
    gainNode.gain.setTargetAtTime(1, this.ctx.currentTime, 1.5);

    switch (type) {
      case 'office':
        nodes.push(this._createHum(gainNode, 100, 0.06));
        nodes.push(this._createHum(gainNode, 150, 0.03));
        break;

      case 'server':
        nodes.push(this._createHum(gainNode, 60, 0.08));
        nodes.push(this._createHum(gainNode, 120, 0.04));
        nodes.push(this._createNoise(gainNode, 0.015, 'highpass', 3000));
        break;

      case 'industrial':
        nodes.push(this._createHum(gainNode, 50, 0.1));
        nodes.push(this._createHum(gainNode, 100, 0.05));
        nodes.push(this._createNoise(gainNode, 0.02, 'lowpass', 400));
        break;

      case 'dark':
        nodes.push(this._createHum(gainNode, 40, 0.08));
        nodes.push(this._createHum(gainNode, 43, 0.06)); // slight detuning for unease
        nodes.push(this._createNoise(gainNode, 0.01, 'bandpass', 200));
        break;

      case 'bright':
        nodes.push(this._createHum(gainNode, 220, 0.03));
        nodes.push(this._createHum(gainNode, 330, 0.02));
        break;

      case 'neutral':
      default:
        nodes.push(this._createHum(gainNode, 80, 0.04));
        break;
    }

    return { nodes, gain: gainNode };
  }

  _createHum(destination, freq, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(destination);
    osc.start();

    return { osc, gain };
  }

  _createNoise(destination, volume, filterType, filterFreq) {
    // White noise via buffer source
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start();

    return { source, filter, gain };
  }

  _fadeOutAmbience() {
    const old = this.ambience;
    if (!old) return;

    old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);

    // Clean up after fade
    setTimeout(() => {
      for (const n of old.nodes) {
        if (n.osc) { try { n.osc.stop(); } catch (_) {} }
        if (n.source) { try { n.source.stop(); } catch (_) {} }
      }
      old.gain.disconnect();
    }, 3000);
  }

  // ═══════════════════════════════════════════════════
  //   FOOTSTEP GENERATOR
  // ═══════════════════════════════════════════════════

  _playFootstep(roomType) {
    const now = this.ctx.currentTime;

    // Short burst of filtered noise = footstep
    const bufferSize = this.ctx.sampleRate * 0.06; // 60ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Decay envelope
      const env = 1 - (i / bufferSize);
      data[i] = (Math.random() * 2 - 1) * env * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // Room type affects footstep character
    const isHard = roomType === 'server' || roomType === 'industrial' || roomType === 'dark';
    filter.frequency.value = isHard ? 2500 : 1500;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    // Slight random variation
    const vol = 0.08 + Math.random() * 0.04;
    gain.gain.value = vol;
    gain.gain.setTargetAtTime(0, now + 0.04, 0.02);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    // Slight pitch variation
    source.playbackRate.value = 0.9 + Math.random() * 0.2;
    source.start(now);
    source.stop(now + 0.08);
  }

  /**
   * Play a procedural door-opening sound.
   * Sequence: initial clunk (80Hz square) → sliding noise (bandpass) → end thunk (60Hz sine)
   */
  playDoorOpen() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    // ── 1. Initial clunk (mechanical latch release) ──
    const clunkOsc = this.ctx.createOscillator();
    const clunkGain = this.ctx.createGain();
    clunkOsc.type = 'square';
    clunkOsc.frequency.value = 80;
    clunkGain.gain.setValueAtTime(0.15, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(this.master);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.1);

    // ── 2. Sliding noise (panels moving) ──
    const slideLen = 0.7;
    const slideBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * slideLen, this.ctx.sampleRate);
    const slideData = slideBuf.getChannelData(0);
    for (let i = 0; i < slideData.length; i++) {
      const t = i / slideData.length;
      // Envelope: ramp up then taper
      const env = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
      slideData[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    const slideSource = this.ctx.createBufferSource();
    slideSource.buffer = slideBuf;
    const slideFilter = this.ctx.createBiquadFilter();
    slideFilter.type = 'bandpass';
    slideFilter.frequency.value = 800;
    slideFilter.Q.value = 1.5;
    const slideGain = this.ctx.createGain();
    slideGain.gain.value = 0.1;
    slideSource.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(this.master);
    slideSource.start(now + 0.06);

    // ── 3. End thunk (panels reaching end stops) ──
    const thunkOsc = this.ctx.createOscillator();
    const thunkGain = this.ctx.createGain();
    thunkOsc.type = 'sine';
    thunkOsc.frequency.value = 60;
    thunkGain.gain.setValueAtTime(0.0001, now + 0.75);
    thunkGain.gain.exponentialRampToValueAtTime(0.12, now + 0.76);
    thunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    thunkOsc.connect(thunkGain);
    thunkGain.connect(this.master);
    thunkOsc.start(now + 0.75);
    thunkOsc.stop(now + 0.95);
  }

  /**
   * Get room ambiance type from room ID.
   */
  static getRoomAmbianceType(roomId) {
    const map = {
      // Facility
      'ELEVATOR': 'neutral',
      'EXIT_VESTIBULE': 'neutral',
      'LOBBY': 'office',
      'CORRIDOR_A': 'neutral',
      'OBSERVATION_OFFICE': 'office',
      'BREAK_ROOM': 'office',
      'CORRIDOR_B': 'dark',
      'SERVER_ROOM': 'server',
      'ARCHIVE': 'dark',
      // Home
      'APT_HALL': 'neutral',
      'LIVING_ROOM': 'bright',
      'SPARE_ROOM': 'server',
      'UTILITY_NOOK': 'dark',
    };
    return map[roomId] || 'neutral';
  }
}

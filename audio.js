class SoundDirector {
  constructor() {
    this.ctx = null;
    this.humOsc = null;
    this.humGain = null;
    this.noiseNode = null;
    this.noiseGain = null;
    this.highResOsc = null;
    this.highResGain = null;
    this.listener = null;
    this.isIgnited = false;
    this.lastAlertTime = 0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    // 1. 低頻磁約束嗡鳴 (40~80Hz)
    this.humOsc = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();
    this.humOsc.type = 'triangle';
    this.humOsc.frequency.setValueAtTime(45, t);
    this.humGain.gain.setValueAtTime(0.01, t);
    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);
    this.humOsc.start();

    // 2. 高溫等離子體粉紅噪音 (Plasma Pink Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1400, t);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.001, t);

    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.ctx.destination);
    this.noiseNode.start();

    // 3. 高頻諧振音軌
    this.highResOsc = this.ctx.createOscillator();
    this.highResGain = this.ctx.createGain();
    this.highResOsc.type = 'sine';
    this.highResOsc.frequency.setValueAtTime(1046.5, t);
    this.highResGain.gain.setValueAtTime(0.0001, t);
    this.highResOsc.connect(this.highResGain);
    this.highResGain.connect(this.ctx.destination);
    this.highResOsc.start();
  }

  updateListener(camera) {
    if (!this.ctx || !this.listener) return;
    const t = this.ctx.currentTime;
    const p = camera.position;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    if (this.listener.positionX) {
      this.listener.positionX.setValueAtTime(p.x, t);
      this.listener.positionY.setValueAtTime(p.y, t);
      this.listener.positionZ.setValueAtTime(p.z, t);
      this.listener.forwardX.setValueAtTime(fwd.x, t);
      this.listener.forwardY.setValueAtTime(fwd.y, t);
      this.listener.forwardZ.setValueAtTime(fwd.z, t);
      this.listener.upX.setValueAtTime(up.x, t);
      this.listener.upY.setValueAtTime(up.y, t);
      this.listener.upZ.setValueAtTime(up.z, t);
    } else {
      this.listener.setPosition(p.x, p.y, p.z);
      this.listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  updateSoundscape(st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const maxT = Math.max(st.tempE0, st.tempI0);

    const humFreq = 38 + st.magField * 2.8 + st.plasmaCurrent * 3.5;
    this.humOsc.frequency.setTargetAtTime(humFreq, t, 0.1);
    const humVol = st.kinkDistortion > 0.2 ? 0.08 : 0.035;
    this.humGain.gain.setTargetAtTime(humVol, t, 0.1);

    const hissVol = Math.min(0.002 + maxT * 0.002, 0.07);
    this.noiseGain.gain.setTargetAtTime(hissVol, t, 0.15);

    if (st.qGain >= 1.0) {
      this.highResGain.gain.setTargetAtTime(0.025, t, 0.3);
      this.highResOsc.frequency.setTargetAtTime(1046.5 + Math.sin(t * 4) * 20, t, 0.2);
    } else {
      this.highResGain.gain.setTargetAtTime(0.0001, t, 0.5);
    }
  }

  playDirectionalCoilAlert(worldPos, severity) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.0;
    panner.maxDistance = 30.0;
    panner.rolloffFactor = 1.2;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(worldPos.x, t);
      panner.positionY.setValueAtTime(worldPos.y, t);
      panner.positionZ.setValueAtTime(worldPos.z, t);
    } else {
      panner.setPosition(worldPos.x, worldPos.y, worldPos.z);
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    const baseFreq = 320 + severity * 330;
    const dropFreq = baseFreq * (0.55 - severity * 0.2);
    const duration = 0.22 - severity * 0.06;

    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(dropFreq, 60), t + duration);

    const volume = 0.06 + severity * 0.06;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);

    if (navigator.vibrate && severity > 0.4) {
      navigator.vibrate(Math.floor(20 + severity * 30));
    }
  }

  playDisruptionBurst() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // 1. 瞬態電弧放電
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(800, t);
    snapOsc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
    snapGain.gain.setValueAtTime(0.8, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.035);

    // 2. 超重低頻下潛 (808 Sub Dive)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 1.2);

    // 3. 爆炸濾波噪聲
    const bufferSize = ctx.sampleRate * 0.9;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(4000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseNode.start(t);
    noiseNode.stop(t + 0.9);

    if (navigator.vibrate) navigator.vibrate([120, 30, 250, 40, 400]);
  }

  playIgnitionFanfare() {
    if (!this.ctx || this.isIgnited) return;
    this.isIgnited = true;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.5, 0.08), idx * 110);
    });
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
  }

  playRepairWelding() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900 + Math.random() * 600, t);
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
    if (navigator.vibrate && Math.random() < 0.3) navigator.vibrate(15);
  }

  playTone(freq, type = 'sine', duration = 0.2, volume = 0.06) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
}

const AudioSys = new SoundDirector();

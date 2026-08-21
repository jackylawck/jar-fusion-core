// =========================================================================
// 3A 級專業托卡馬克音效引擎 (Mastering Bus + Convolver + Sidechain Ducking)
// =========================================================================
class SoundDirector {
  constructor() {
    this.ctx = null;
    this.listener = null;
    this.isIgnited = false;
    this.lastAlertTime = 0;

    // 總線架構 (Audio Buses)
    this.masterBus = null;
    this.bgBus = null;          // 背景層 (嗡鳴、熱噪聲、諧振)
    this.sfxBus = null;         // 效果層 (警報、焊接、操作)
    this.reverbConvolver = null;// 托卡馬克金屬腔體卷積器
    this.reverbWetGain = null;
    this.masterCompressor = null;

    // 音源節點
    this.humOsc = null;
    this.humGain = null;
    this.noiseNode = null;
    this.noiseGain = null;
    this.highResOsc = null;
    this.highResGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    // 1. 主壓縮器 (Master Glue Compressor) - 塑造動態層次
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-16, t);
    this.masterCompressor.knee.setValueAtTime(6, t);
    this.masterCompressor.ratio.setValueAtTime(4.5, t);
    this.masterCompressor.attack.setValueAtTime(0.003, t);
    this.masterCompressor.release.setValueAtTime(0.2, t);
    this.masterCompressor.connect(this.ctx.destination);

    // 2. 主混音匯流排 (Master Bus)
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.setValueAtTime(0.9, t);
    this.masterBus.connect(this.masterCompressor);

    // 3. 金屬腔體卷積混響 (Tokamak Metallic Chamber Reverb)
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildMetallicIR(1.4, 0.22); // 1.4秒金屬漫反射脈衝
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(0.28, t); // 28% 空間濕訊號
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.masterBus);

    // 4. 背景音軌匯流排 (支援側鏈閃避 Sidechain Bus)
    this.bgBus = this.ctx.createGain();
    this.bgBus.gain.setValueAtTime(1.0, t);
    this.bgBus.connect(this.masterBus);

    // 5. 實效與警報匯流排 (SFX Bus -> 同時送入乾聲與混響)
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.setValueAtTime(1.0, t);
    this.sfxBus.connect(this.masterBus);
    this.sfxBus.connect(this.reverbConvolver);

    // --- 構建背景音軌 ---

    // A. 低頻磁約束嗡鳴 (40~80Hz)
    this.humOsc = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();
    this.humOsc.type = 'triangle';
    this.humOsc.frequency.setValueAtTime(45, t);
    this.humGain.gain.setValueAtTime(0.01, t);
    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.bgBus);
    this.humOsc.start();

    // B. 高溫等離子體粉紅噪音 (Plasma Pink Noise)
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
    this.noiseGain.connect(this.bgBus);
    this.noiseNode.start();

    // C. 高頻環向諧振 (Sine Wave)
    this.highResOsc = this.ctx.createOscillator();
    this.highResGain = this.ctx.createGain();
    this.highResOsc.type = 'sine';
    this.highResOsc.frequency.setValueAtTime(1046.5, t);
    this.highResGain.gain.setValueAtTime(0.0001, t);
    this.highResOsc.connect(this.highResGain);
    this.highResGain.connect(this.bgBus);
    this.highResOsc.start();
  }

  // 算法合成金屬腔體脈衝響應 (Algorithmic Metallic IR)
  buildMetallicIR(duration, decayTime) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      // 疊加金屬腔體多重高頻反射特徵調製
      const metallicComb = Math.sin(t * 880 * Math.PI) * 0.15 + Math.sin(t * 1760 * Math.PI) * 0.08;
      const decay = Math.exp(-t / decayTime);
      left[i] = ((Math.random() * 2 - 1) + metallicComb) * decay;
      right[i] = ((Math.random() * 2 - 1) + metallicComb) * decay;
    }
    return impulse;
  }

  // 側鏈閃避：在重大事件或警報時壓低背景音景
  triggerSidechainDucking(duckGain = 0.35, holdTime = 0.1, releaseTime = 0.45) {
    if (!this.ctx || !this.bgBus) return;
    const t = this.ctx.currentTime;
    this.bgBus.gain.cancelScheduledValues(t);
    this.bgBus.gain.setValueAtTime(this.bgBus.gain.value, t);
    this.bgBus.gain.linearRampToValueAtTime(duckGain, t + 0.015); // 15ms 快速下壓
    this.bgBus.gain.setValueAtTime(duckGain, t + holdTime);
    this.bgBus.gain.linearRampToValueAtTime(1.0, t + holdTime + releaseTime); // 平滑回彈
  }

  // 零延遲聽眾位置與朝向嚴格同步
  updateListener(camera) {
    if (!this.ctx || !this.listener) return;
    const p = camera.position;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    if (this.listener.positionX) {
      this.listener.positionX.value = p.x;
      this.listener.positionY.value = p.y;
      this.listener.positionZ.value = p.z;
      this.listener.forwardX.value = fwd.x;
      this.listener.forwardY.value = fwd.y;
      this.listener.forwardZ.value = fwd.z;
      this.listener.upX.value = up.x;
      this.listener.upY.value = up.y;
      this.listener.upZ.value = up.z;
    } else {
      this.listener.setPosition(p.x, p.y, p.z);
      this.listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  // 實時分層動態混音
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

  // 3D 空間定位警報 (含側鏈閃避與混響注入)
  playDirectionalCoilAlert(worldPos, severity) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 觸發側鏈壓低背景音
    this.triggerSidechainDucking(0.4, 0.08, 0.35);

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
    // 連接至 SFX Bus（同時獲得金屬混響與主壓縮器處理）
    panner.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + duration);

    if (navigator.vibrate && severity > 0.4) {
      navigator.vibrate(Math.floor(20 + severity * 30));
    }
  }

  // 大破裂極限衝擊音效 (多層瞬態 + 808 下潛 + 側鏈抽吸)
  playDisruptionBurst() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // 強力側鏈：徹底壓碎背景噪聲
    this.triggerSidechainDucking(0.05, 0.4, 1.2);

    // 1. 瞬態電弧放電
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(800, t);
    snapOsc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
    snapGain.gain.setValueAtTime(0.85, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxBus);
    snapOsc.start(t);
    snapOsc.stop(t + 0.035);

    // 2. 超重低頻下潛 (808 Sub Dive)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subDistort = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 1.5);
    }
    subDistort.curve = curve;

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(26, t + 0.85);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    subOsc.connect(subDistort);
    subDistort.connect(subGain);
    subGain.connect(this.masterBus); // 低頻下潛直通 Master，避開混響保持衝擊力
    subOsc.start(t);
    subOsc.stop(t + 1.3);

    // 3. 爆炸濾波噪聲衝擊波
    const bufferSize = ctx.sampleRate * 1.0;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(4000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(110, t + 0.95);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxBus);
    noiseNode.start(t);
    noiseNode.stop(t + 0.95);

    if (navigator.vibrate) {
      navigator.vibrate([120, 30, 250, 40, 400]);
    }
  }

  // 點火成功情緒和弦 (Ignition Fanfare)
  playIgnitionFanfare() {
    if (!this.ctx || this.isIgnited) return;
    this.isIgnited = true;
    this.triggerSidechainDucking(0.5, 0.2, 0.8);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.55, 0.08), idx * 110);
    });
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
  }

  // 焊接電弧聲效 (帶觸覺微震)
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
    gain.connect(this.sfxBus);
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
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + duration);
  }
}

const AudioSys = new SoundDirector();

// =========================================================================
// J.A.R. 聚變核心 3D - 遊戲控制器與情感導演系統 (GameController v3.2)
// =========================================================================

// --- 1. 生涯進度與成就管理器 (Career & Progress) ---
const CareerManager = {
  data: {
    maxQ: 0.0,
    totalSurvivalSeconds: 0,
    currentMissionIndex: 0,
    rank: '實習操作員'
  },

  load() {
    try {
      const saved = localStorage.getItem('JAR_FUSION_CAREER');
      if (saved) this.data = Object.assign(this.data, JSON.parse(saved));
    } catch(e) {}
    this.updateRank();
  },

  save() {
    try {
      localStorage.setItem('JAR_FUSION_CAREER', JSON.stringify(this.data));
    } catch(e) {}
  },

  recordMetrics(q, dt) {
    if (q > this.data.maxQ) this.data.maxQ = q;
    this.data.totalSurvivalSeconds += dt;
    this.updateRank();
    this.save();
  },

  updateRank() {
    const q = this.data.maxQ;
    const m = this.data.currentMissionIndex;
    if (m >= 2 && q >= 1.5) this.data.rank = '深空聚變大師 (Master)';
    else if (m >= 1 && q >= 1.1) this.data.rank = '托卡馬克首席工程師 (Chief)';
    else if (q >= 0.9) this.data.rank = '資深值班操作員 (Senior)';
    else this.data.rank = '實習操作員 (Trainee)';
  }
};

// --- 2. 情境任務鏈狀態機 (Scenario Mission Engine) ---
const MissionEngine = {
  missions: [
    {
      id: 0,
      nameZh: '任務 1：為深空基地供電',
      nameEn: 'Mission 1: Deep Space Base Power',
      descZh: '維持 Q ≥ 1.05 持續 20 秒',
      descEn: 'Maintain Q ≥ 1.05 for 20 seconds',
      targetQ: 1.05,
      requiredDuration: 20,
      currentProgress: 0,
      timeLimit: 60
    },
    {
      id: 1,
      nameZh: '任務 2：躍遷引擎超載充能',
      nameEn: 'Mission 2: Warp Core Overcharge',
      descZh: '維持 Te ≥ 18 keV 且 Q ≥ 1.20 持續 25 秒',
      descEn: 'Maintain Te ≥ 18 keV and Q ≥ 1.20 for 25s',
      targetQ: 1.20,
      targetTe: 18.0,
      requiredDuration: 25,
      currentProgress: 0,
      timeLimit: 75
    }
  ],

  active: true,
  timer: 0,

  getCurrent() {
    return this.missions[CareerManager.data.currentMissionIndex] || this.missions[0];
  },

  update(st, dt) {
    if (!this.active || st.gameOver) return;
    const m = this.getCurrent();
    this.timer += dt;

    let conditionMet = st.qGain >= m.targetQ;
    if (m.targetTe) conditionMet = conditionMet && st.tempE0 >= m.targetTe;

    if (conditionMet) {
      m.currentProgress = Math.min(m.currentProgress + dt, m.requiredDuration);
      if (m.currentProgress >= m.requiredDuration) {
        this.active = false;
        GameController.triggerMissionVictory(m);
      }
    } else {
      m.currentProgress = Math.max(0, m.currentProgress - dt * 0.5);
    }
  },

  nextMission() {
    CareerManager.data.currentMissionIndex++;
    if (CareerManager.data.currentMissionIndex >= this.missions.length) {
      CareerManager.data.currentMissionIndex = 0;
    }
    CareerManager.save();
    this.reset();
  },

  reset() {
    const m = this.getCurrent();
    m.currentProgress = 0;
    this.timer = 0;
    this.active = true;
  }
};

// --- 3. 事故黑盒子歸因分析器 (Incident Analyzer) ---
const IncidentAnalyzer = {
  analyze(st) {
    let cause = '未知物理失穩';
    let advice = '請保持各項參數在綠色安全區間內運行。';

    if (st.q95 < 2.0) {
      cause = 'q95 < 2.0 MHD 撕裂模大破裂 (Kink Tearing Disruption)';
      advice = '等離子體電流 I_p 過高或環向磁場 B_T 不足。請嘗試提升磁場至 7.0T 以上或降低電流。';
    } else if (st.betaN > 2.8) {
      cause = 'Troyon β_N 壓力極限突破 (Troyon Limit Exceeded)';
      advice = '等離子體熱壓力過大引發邊緣失穩。在加熱功率接近臨界值時，應及時開啟偏濾器排熱。';
    } else if (st.greenwaldRatio > 1.0) {
      cause = '格林沃德密度超限引發輻射坍縮 (Greenwald Density Collapse)';
      advice = '燃料注入過多導致等離子體冷卻猝滅。請減少燃料顆粒注入頻率，或提高加熱功率平衡能量。';
    } else if (st.maxIntegrity <= 0) {
      cause = '第一壁材料累積熱疲勞融毀 (First Wall Melted)';
      advice = '第一壁長時間承受高溫熱流衝擊。下次請在失穩發生時第一時間長按故障線圈進行電弧焊接修復。';
    }

    return {
      cause,
      advice,
      q: st.qGain.toFixed(2),
      temp: `${Math.max(st.tempE0, st.tempI0).toFixed(1)} keV`,
      q95: st.q95.toFixed(2),
      greenwald: st.greenwaldRatio.toFixed(2)
    };
  }
};

// --- 4. GameController 主物件 ---
const GameController = {
  camera: null,
  hasDisrupted: false,
  hasIgnited: false,

  haptics: {
    pulseCoilAlert(severity, baseFreq) {
      if (!navigator.vibrate) return;
      const duration = Math.round(15 + severity * 45);
      const pitchRatio = Math.max(0.2, Math.min(1.0, (baseFreq - 60) / 600));
      const pause = Math.round(25 * (1 / pitchRatio));
      navigator.vibrate([duration, pause, Math.round(duration * 0.6)]);
    },

    triggerIgnitionBurst() {
      if (!navigator.vibrate) return;
      navigator.vibrate([40, 30, 80, 40, 160]);
    },

    triggerDisruption() {
      if (!navigator.vibrate) return;
      navigator.vibrate([140, 30, 90, 30, 50, 20, 20]);
    },

    pulseWelding() {
      if (navigator.vibrate && Math.random() < 0.35) navigator.vibrate(12);
    }
  },

  init(camera) {
    this.camera = camera;
    CareerManager.load();
    AudioSys.init();
    MissionEngine.reset();
    this.hasDisrupted = false;
    this.hasIgnited = false;
  },

  update(st, now, dt, coilMeshes) {
    if (!AudioSys.ctx) return;

    if (this.camera) AudioSys.updateListener(this.camera);
    AudioSys.updateSoundscape(st);

    // 推進任務與生涯累積
    if (!st.gameOver) {
      MissionEngine.update(st, dt);
      CareerManager.recordMetrics(st.qGain, dt);
    }

    // 連續點火張力調製
    if (st.qGain >= 1.0 && !this.hasIgnited) {
      this.hasIgnited = true;
      AudioSys.playIgnitionFanfare();
      this.haptics.triggerIgnitionBurst();
    } else if (st.qGain < 0.75) {
      this.hasIgnited = false;
      AudioSys.isIgnited = false;
    }

    // 故障線圈警報
    this.updateCoilAlerts(st, now, coilMeshes);

    // ELM 爆發
    if (st.elmBurst) {
      AudioSys.triggerSidechainDucking(0.5, 0.05, 0.25);
      AudioSys.playTone(340, 'sawtooth', 0.12, 0.09);
      if (navigator.vibrate) navigator.vibrate(40);
    }

    // 大破裂觸發事故歸因報告
    if (st.gameOver && !this.hasDisrupted) {
      this.hasDisrupted = true;
      AudioSys.playDisruptionBurst();
      this.haptics.triggerDisruption();
      
      const report = IncidentAnalyzer.analyze(st);
      UI.showIncidentReport(report);
    }
  },

  updateCoilAlerts(st, now, coilMeshes) {
    if (st.failingCoilIndex === -1 || !coilMeshes) {
      AudioSys.lastAlertTime = 0;
      return;
    }

    const failedMesh = coilMeshes[st.failingCoilIndex];
    if (!failedMesh) return;

    const severity = Math.min(1.0, st.kinkDistortion * 0.5 + Math.max(0, st.tempE0 - 18) * 0.04);
    const alertInterval = (0.85 - severity * 0.67) * 1000;

    if (now - AudioSys.lastAlertTime > alertInterval) {
      AudioSys.lastAlertTime = now;
      const coilWorldPos = new THREE.Vector3();
      failedMesh.getWorldPosition(coilWorldPos);
      AudioSys.playDirectionalCoilAlert(coilWorldPos, severity);
      const baseFreq = 320 + severity * 330;
      this.haptics.pulseCoilAlert(severity, baseFreq);
    }
  },

  triggerMissionVictory(mission) {
    CareerManager.updateRank();
    AudioSys.playIgnitionFanfare();
    UI.showVictoryModal(mission, CareerManager.data.rank);
  },

  restartSimulation() {
    FusionPhysics.state.tempE0 = 2.5;
    FusionPhysics.state.tempI0 = 1.8;
    FusionPhysics.state.density0 = 1.2;
    FusionPhysics.state.integrity = 100.0;
    FusionPhysics.state.maxIntegrity = 100.0;
    FusionPhysics.state.kinkDistortion = 0.0;
    FusionPhysics.state.failingCoilIndex = -1;
    FusionPhysics.state.gameOver = false;

    this.hasDisrupted = false;
    this.hasIgnited = false;
    MissionEngine.reset();
    UI.hideModals();
  },

  injectPellet() {
    FusionPhysics.injectPellet();
    AudioSys.triggerSidechainDucking(0.7, 0.05, 0.15);
    AudioSys.playTone(650, 'triangle', 0.08, 0.08);
    if (navigator.vibrate) navigator.vibrate(20);
  },

  purgeDivertor() {
    FusionPhysics.purgeDivertor();
    AudioSys.triggerSidechainDucking(0.6, 0.08, 0.3);
    AudioSys.playTone(180, 'sine', 0.28, 0.12);
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  },

  repairCoil(index) {
    FusionPhysics.repairCoil(index);
    AudioSys.playTone(920, 'square', 0.18, 0.09);
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
  },

  triggerWelding() {
    AudioSys.playRepairWelding();
    this.haptics.pulseWelding();
  }
};

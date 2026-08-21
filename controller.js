// =========================================================================
// J.A.R. 聚變核心 3D - 遊戲控制器與情感導演系統 (GameController v8.0)
// =========================================================================

const CareerManager = {
  data: {
    maxQ: 0.0,
    totalSurvivalSeconds: 0,
    missionsCompleted: 0,
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
    const m = this.data.missionsCompleted;
    if (m >= 5 && q >= 1.5) this.data.rank = '深空聚變大師 (Master)';
    else if (m >= 3 && q >= 1.1) this.data.rank = '托卡馬克首席工程師 (Chief)';
    else if (q >= 0.9) this.data.rank = '資深值班操作員 (Senior)';
    else this.data.rank = '實習操作員 (Trainee)';
  }
};

const DynamicMissionEngine = {
  currentQuest: null,
  timer: 0,

  generateQuest(st) {
    if (st.tempE0 < 10.0) {
      return {
        id: 'IGNITE_PREHEAT',
        titleZh: '階段任務：核心電離預熱',
        titleEn: 'Objective: Core Ionization Preheat',
        descZh: '提升微波加熱使 Te ≥ 15 keV，且維持 q95 > 2.5',
        descEn: 'Heat core to Te ≥ 15 keV while keeping q95 > 2.5',
        check: (s) => s.tempE0 >= 15.0 && s.q95 > 2.5,
        targetDuration: 12.0,
        currentProgress: 0.0
      };
    } else if (st.isHMode && st.betaN > 2.2) {
      return {
        id: 'ELM_SURVIVE',
        titleZh: '緊急應變：邊緣輸運壘壓力洩放',
        titleEn: 'Warning: Relieve ETB Pressure Barrier',
        descZh: '控制偏濾器將 β_N 穩定在 2.4 以下，避免觸發 Type-I ELM',
        descEn: 'Purge divertor to keep β_N < 2.4 to prevent ELM burst',
        check: (s) => s.betaN < 2.4 && s.qGain > 0.8,
        targetDuration: 15.0,
        currentProgress: 0.0
      };
    } else {
      return {
        id: 'SUSTAINED_BURNING',
        titleZh: '終極目標：實現自持燃燒點火',
        titleEn: 'Ultimate: Achieve Self-Sustained Burning',
        descZh: '保持能量增益 Q ≥ 1.10 超過 20 秒',
        descEn: 'Maintain Fusion Gain Q ≥ 1.10 for 20s',
        check: (s) => s.qGain >= 1.10,
        targetDuration: 20.0,
        currentProgress: 0.0
      };
    }
  },

  update(st, dt) {
    if (!this.currentQuest) {
      this.currentQuest = this.generateQuest(st);
    }

    const q = this.currentQuest;
    this.timer += dt;

    if (q.check(st)) {
      q.currentProgress = Math.min(q.currentProgress + dt, q.targetDuration);
      if (q.currentProgress >= q.targetDuration) {
        CareerManager.data.missionsCompleted++;
        GameController.triggerMissionVictory(q);
        this.currentQuest = this.generateQuest(st);
      }
    } else {
      q.currentProgress = Math.max(0, q.currentProgress - dt * 0.6);
    }
  },

  reset() {
    this.currentQuest = null;
    this.timer = 0;
  }
};

const IncidentAnalyzer = {
  analyze(st) {
    let cause = '未知物理失穩';
    let advice = '請保持各項參數在綠色安全區間內運行。';
    let triggerMetric = '';

    if (st.deltaZ > 0.35) {
      cause = 'VDE 垂直位移不穩定性撞壁 (Vertical Displacement Collision)';
      advice = '等離子體伸長率過高且極向控制線圈飽和。請在加熱時保持等離子體電流 I_p 穩定。';
      triggerMetric = `δZ = ${st.deltaZ.toFixed(2)}m (極限: 0.35m)`;
    } else if (st.peakDivertorHeatFlux_MW_m2 > 12.0) {
      cause = '偏濾器靶板 Eich 熱流通量超限融毀 (Divertor Heatflux Exhaust Failure)';
      advice = '刮削層 λ_q 過窄導致靶板局部熱流過載。請適時開啟偏濾器排氣或提高環向磁場 B_T。';
      triggerMetric = `q_div = ${st.peakDivertorHeatFlux_MW_m2.toFixed(1)} MW/m² (極限: 12.0)`;
    } else if (st.q95 < 2.0) {
      cause = 'q95 < 2.0 MHD 撕裂模大破裂 (Kink Tearing Disruption)';
      advice = '等離子體電流 Ip 過高導致磁力線失穩。請提高環向磁場 B_T 或下調電流。';
      triggerMetric = `q95 = ${st.q95.toFixed(2)} (臨界值: 2.0)`;
    } else if (st.betaN > 2.8) {
      cause = 'Troyon β_N 壓力極限突破 (Troyon Limit Exceeded)';
      advice = '等離子體熱壓力過大引發邊緣失穩。在加熱功率接近臨界值時，應及時開啟偏濾器排熱。';
      triggerMetric = `β_N = ${st.betaN.toFixed(2)} (臨界值: 2.8)`;
    } else if (st.greenwaldRatio > 1.0) {
      cause = '格林沃德密度超限引發輻射坍縮 (Greenwald Collapse)';
      advice = '燃料注入過多導致等離子體猝滅。請減少燃料注入頻率或提高加熱功率。';
      triggerMetric = `n/n_G = ${st.greenwaldRatio.toFixed(2)} (臨界值: 1.0)`;
    } else if (st.maxIntegrity <= 0) {
      cause = '第一壁材料累積熱疲勞融毀 (First Wall Melted)';
      advice = '第一壁長時間承受高溫熱流衝擊。下次請在失穩發生時第一時間長按故障線圈修復。';
      triggerMetric = `Integrity = 0.0%`;
    }

    return {
      cause,
      advice,
      triggerMetric,
      q: st.qGain.toFixed(2),
      temp: `${Math.max(st.tempE0, st.tempI0).toFixed(1)} keV`,
      q95: st.q95.toFixed(2),
      greenwald: st.greenwaldRatio.toFixed(2)
    };
  }
};

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
      if (navigator.vibrate) navigator.vibrate([40, 30, 80, 40, 160]);
    },
    triggerDisruption() {
      if (navigator.vibrate) navigator.vibrate([140, 30, 90, 30, 50, 20, 20]);
    },
    pulseWelding() {
      if (navigator.vibrate && Math.random() < 0.35) navigator.vibrate(12);
    }
  },

  init(camera) {
    this.camera = camera;
    CareerManager.load();
    AudioSys.init();
    DynamicMissionEngine.reset();
    this.hasDisrupted = false;
    this.hasIgnited = false;
  },

  update(st, now, dt, coilMeshes, telemetryHistory) {
    if (!AudioSys.ctx) return;

    if (this.camera) AudioSys.updateListener(this.camera);
    AudioSys.updateSoundscape(st);

    if (!st.gameOver) {
      DynamicMissionEngine.update(st, dt);
      CareerManager.recordMetrics(st.qGain, dt);
    }

    if (st.qGain >= 1.0 && !this.hasIgnited) {
      this.hasIgnited = true;
      AudioSys.playIgnitionFanfare();
      this.haptics.triggerIgnitionBurst();
    } else if (st.qGain < 0.75) {
      this.hasIgnited = false;
      AudioSys.isIgnited = false;
    }

    this.updateCoilAlerts(st, now, coilMeshes);

    if (st.elmBurst) {
      AudioSys.triggerSidechainDucking(0.5, 0.05, 0.25);
      AudioSys.playTone(340, 'sawtooth', 0.12, 0.09);
      if (navigator.vibrate) navigator.vibrate(40);
    }

    if (st.gameOver && !this.hasDisrupted) {
      this.hasDisrupted = true;
      AudioSys.playDisruptionBurst();
      this.haptics.triggerDisruption();
      
      const report = IncidentAnalyzer.analyze(st);
      UI.showIncidentReport(report, telemetryHistory);
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

  triggerMissionVictory(quest) {
    CareerManager.updateRank();
    AudioSys.playIgnitionFanfare();
    UI.showVictoryModal(quest, CareerManager.data.rank);
  },

  restartSimulation() {
    FusionPhysics.initProfiles();
    FusionPhysics.state.integrity = 100.0;
    FusionPhysics.state.maxIntegrity = 100.0;
    FusionPhysics.state.kinkDistortion = 0.0;
    FusionPhysics.state.magneticIslandWidth = 0.0;
    FusionPhysics.state.deltaZ = 0.0;
    FusionPhysics.state.failingCoilIndex = -1;
    FusionPhysics.state.gameOver = false;

    this.hasDisrupted = false;
    this.hasIgnited = false;
    DynamicMissionEngine.reset();
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

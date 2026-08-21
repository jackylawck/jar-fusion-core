// =========================================================================
// J.A.R. 聚變核心 3D - 遊戲控制器與敘事導演系統 (controller.js v15.0 Gold)
// =========================================================================

const CareerManager = {
  data: {
    pilotId: 'JAR-' + Math.floor(1000 + Math.random() * 9000),
    maxQ: 0.0,
    totalSurvivalSeconds: 0,
    missionsCompleted: 0,
    achievements: [],
    tutorialPassed: false,
    rankZh: '見習操作員',
    rankEn: 'Junior Intern'
  },

  load() {
    try {
      const saved = localStorage.getItem('JAR_FUSION_CAREER_V15');
      if (saved) this.data = Object.assign(this.data, JSON.parse(saved));
    } catch(e) {}
    this.updateRank();
  },

  save() {
    try {
      localStorage.setItem('JAR_FUSION_CAREER_V15', JSON.stringify(this.data));
    } catch(e) {}
  },

  recordMetrics(q, dt) {
    if (q > this.data.maxQ) this.data.maxQ = q;
    this.data.totalSurvivalSeconds += dt;
    this.checkAchievements();
    this.updateRank();
    this.save();
  },

  checkAchievements() {
    const unlock = (id, titleZh, titleEn) => {
      if (!this.data.achievements.includes(id)) {
        this.data.achievements.push(id);
        const isZh = I18N.currentLang === 'zh';
        UI.showAchievementToast(isZh ? titleZh : titleEn);
        AudioSys.playTone(880, 'sine', 0.5, 0.12);
      }
    };

    if (this.data.maxQ >= 1.0) unlock('IGNITION_REACHED', '🏆 成就解鎖：聚變能量增益突破 (Q ≥ 1.0)', '🏆 Achievement: Fusion Gain Breakeven (Q ≥ 1.0)');
    if (this.data.maxQ >= 5.0) unlock('HIGH_GAIN_BURNING', '🔥 成就解鎖：超高能量自持燃燒 (Q ≥ 5.0)', '🔥 Achievement: High-Gain Burning (Q ≥ 5.0)');
    if (this.data.totalSurvivalSeconds >= 120) unlock('STABLE_CONFINEMENT', '⏱️ 成就解鎖：百秒超長脈衝磁約束', '⏱️ Achievement: 100s Long-Pulse Confinement');
  },

  updateRank() {
    const q = this.data.maxQ;
    const m = this.data.missionsCompleted;
    
    if (m >= 5 && q >= 1.5) {
      this.data.rankZh = '研究院長';
      this.data.rankEn = 'Director General';
    } else if (m >= 3 && q >= 1.1) {
      this.data.rankZh = '技術總監';
      this.data.rankEn = 'Chief Engineer';
    } else if (q >= 1.0) {
      this.data.rankZh = '首席控制師';
      this.data.rankEn = 'Lead Controller';
    } else if (this.data.totalSurvivalSeconds >= 30) {
      this.data.rankZh = '值班工程師';
      this.data.rankEn = 'Duty Engineer';
    } else {
      this.data.rankZh = '見習操作員';
      this.data.rankEn = 'Junior Intern';
    }
  }
};

const DynamicMissionEngine = {
  currentQuest: null,
  timer: 0,

  generateQuest(st) {
    const diffMultiplier = 1.0 + Math.min(CareerManager.data.missionsCompleted * 0.05, 0.4);

    if (st.tempE0 < 10.0) {
      const targetT = 15.0 * diffMultiplier;
      return {
        id: 'LUNAR_GRID_PREHEAT',
        titleZh: '危機任務：月面阿爾忒彌斯基地電網瀕臨崩潰',
        titleEn: 'Mission: Artemis Lunar Grid Blackout Imminent',
        descZh: `預熱核心並使電子溫度 Te ≥ ${targetT.toFixed(1)} keV，重啟深空基地供電回路。`,
        descEn: `Preheat core until Te ≥ ${targetT.toFixed(1)} keV to restore lunar life support.`,
        check: (s) => s.tempE0 >= targetT && s.q95 > 2.2,
        targetDuration: 10.0,
        currentProgress: 0.0
      };
    } else if (st.isHMode && st.betaN > 2.2) {
      return {
        id: 'SOLAR_STORM_DEFENSE',
        titleZh: '緊急應變：強烈太陽風暴引發邊緣等離子體高壓',
        titleEn: 'Alert: Relieve Solar Flare Overpressure Shock',
        descZh: '啟動偏濾器排熱將 β_N 壓制在 2.4 以下，避免邊緣破裂損毀磁體。',
        descEn: 'Purge divertor to keep β_N < 2.4 to protect coils from solar shockwave.',
        check: (s) => s.betaN < 2.4 && s.qGain > 0.8,
        targetDuration: 12.0,
        currentProgress: 0.0
      };
    } else {
      const targetQ = 1.05 * diffMultiplier;
      return {
        id: 'DEEP_SPACE_IGNITION',
        titleZh: '終極使命：全人類首座深空微型太陽點火',
        titleEn: 'Ultimate: Ignite Humanity First Deep-Space Sun',
        descZh: `維持自持燃燒增益 Q ≥ ${targetQ.toFixed(2)} 超過 15 秒，締造能源奇蹟。`,
        descEn: `Maintain self-sustained gain Q ≥ ${targetQ.toFixed(2)} for 15s to make history.`,
        check: (s) => s.qGain >= targetQ,
        targetDuration: 15.0,
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
      q.currentProgress = Math.max(0, q.currentProgress - dt * 0.5);
    }
  },

  reset() {
    this.currentQuest = null;
    this.timer = 0;
  }
};

const IncidentAnalyzer = {
  analyze(st) {
    const isZh = I18N.currentLang === 'zh';
    let cause = isZh ? '未知物理失穩' : 'Unidentified Physical Disruption';
    let advice = isZh ? '請保持各項參數在綠色安全區間內運行。' : 'Maintain plasma parameters within the stable operational window.';
    let triggerMetric = '';

    if (st.deltaZ > 0.35) {
      cause = isZh ? 'VDE 垂直位移不穩定性撞壁' : 'VDE Vertical Displacement Wall Collision';
      advice = isZh ? '等離子體伸長率過高且極向控制飽和。請保持電流 I_p 穩定。' : 'Elongation too high; control coils saturated. Stabilize plasma current.';
      triggerMetric = `δZ = ${st.deltaZ.toFixed(2)}m`;
    } else if (st.peakDivertorHeatFlux_MW_m2 > 12.0) {
      cause = isZh ? '偏濾器靶板熱流通量超限融毀' : 'Divertor Heatflux Exhaust Failure';
      advice = isZh ? '刮削層過窄導致靶板過熱。請開啟偏濾器排氣或提高 B_T。' : 'SOL width too narrow. Purge divertor exhaust or increase B_T.';
      triggerMetric = `q_div = ${st.peakDivertorHeatFlux_MW_m2.toFixed(1)} MW/m²`;
    } else if (st.q95 < 2.0) {
      cause = isZh ? 'q95 < 2.0 MHD 撕裂模大破裂' : 'q95 < 2.0 MHD Tearing Mode Disruption';
      advice = isZh ? '等離子體電流 Ip 過高。請提高環向磁場 B_T 或下調電流。' : 'Current Ip too high. Increase Toroidal Field B_T or decrease Ip.';
      triggerMetric = `q95 = ${st.q95.toFixed(2)}`;
    } else if (st.betaN > 2.8) {
      cause = isZh ? 'Troyon β_N 壓力極限突破' : 'Troyon β_N Pressure Limit Exceeded';
      advice = isZh ? '等離子體熱壓力過大。加熱功率過高時請及時開啟偏濾器排熱。' : 'Thermal pressure too high. Purge divertor when heating close to limits.';
      triggerMetric = `β_N = ${st.betaN.toFixed(2)}`;
    } else if (st.greenwaldRatio > 1.0) {
      cause = isZh ? '格林沃德密度超限輻射坍縮' : 'Greenwald Limit Density Collapse';
      advice = isZh ? '燃料注入過多導致等離子體猝滅。請減少燃料注入頻率。' : 'Over-fueling quenched plasma. Reduce fuel pellet injection frequency.';
      triggerMetric = `n/n_G = ${st.greenwaldRatio.toFixed(2)}`;
    } else if (st.maxIntegrity <= 0) {
      cause = isZh ? '第一壁材料累積熱疲勞融毀' : 'First Wall Cumulative Thermal Failure';
      advice = isZh ? '第一壁承受長時間高溫。失穩時請第一時間長按故障線圈維修。' : 'First wall melted. Hold-to-repair failing coils immediately when alerted.';
      triggerMetric = `Integrity = 0%`;
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

    if (st.isOnline && !st.gameOver) {
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
    UI.showVictoryModal(quest, (I18N.currentLang === 'zh' ? CareerManager.data.rankZh : CareerManager.data.rankEn));
  },

  restartSimulation() {
    FusionPhysics.state.isOnline = false;
    FusionPhysics.state.tempE0 = 0.8;
    FusionPhysics.state.tempI0 = 0.8;
    FusionPhysics.state.density0 = 0.5;
    FusionPhysics.state.heatECRH = 0.0;
    FusionPhysics.state.heatNBI = 0.0;
    FusionPhysics.state.magField = 6.0;
    FusionPhysics.state.plasmaCurrent = 1.2;

    FusionPhysics.state.integrity = 100.0;
    FusionPhysics.state.maxIntegrity = 100.0;
    FusionPhysics.state.kinkDistortion = 0.0;
    FusionPhysics.state.magneticIslandWidth = 0.0;
    FusionPhysics.state.deltaZ = 0.0;
    FusionPhysics.state.failingCoilIndex = -1;
    FusionPhysics.state.gameOver = false;

    FusionPhysics.initProfiles();

    this.hasDisrupted = false;
    this.hasIgnited = false;
    DynamicMissionEngine.reset();
    UI.resetControlsToStandby();
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

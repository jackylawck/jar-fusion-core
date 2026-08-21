const I18N = {
  currentLang: (navigator.language && navigator.language.toLowerCase().startsWith('zh')) ? 'zh' : 'en',

  dict: {
    zh: {
      toggleBtn: 'English',
      wallIntegrity: '第一壁材料狀態 (First Wall Integrity)',
      poloidalFlux: '極向磁通量表面 Ψ(R,Z)',
      dualTemp: '雙溫分離 (Te / Ti)',
      safetyFactor: '安全因子 q₉₅ / 歸一化 β_N',
      energyGain: '聚變能量增益 Q (P_fus/P_in)',
      densityLimit: '密度極限 n/n_G',
      ecrhPower: '微波加熱 P_ECRH (→Te)',
      nbiPower: '中性束注入 P_NBI (→Ti)',
      toroidalField: '環向磁場 B_T',
      plasmaCurrent: '等離子體電流 I_p',
      injectFuel: '注入 D-T 燃料顆粒',
      divertorPurge: '開啟偏濾器排熱',
      repairing: '正在修復線圈',
      incidentTitle: '事故黑盒子歸因診斷 (Incident Report)',
      primaryCause: '主因判定',
      tacticalAdvice: '首席工程師建議',
      restartCore: '重啟反應爐循環'
    },
    en: {
      toggleBtn: '中文',
      wallIntegrity: 'First Wall Material Integrity',
      poloidalFlux: 'Poloidal Flux Surfaces Ψ(R,Z)',
      dualTemp: 'Two-Fluid Temp (Te / Ti)',
      safetyFactor: 'Safety Factor q₉₅ / Norm β_N',
      energyGain: 'Fusion Gain Q (P_fus/P_in)',
      densityLimit: 'Greenwald Limit n/n_G',
      ecrhPower: 'ECRH Heating P_ECRH (→Te)',
      nbiPower: 'NBI Heating P_NBI (→Ti)',
      toroidalField: 'Toroidal Field B_T',
      plasmaCurrent: 'Plasma Current I_p',
      injectFuel: 'Inject D-T Fuel Pellet',
      divertorPurge: 'Purge Divertor Exhaust',
      repairing: 'REPAIRING COIL',
      incidentTitle: 'Incident Black Box Diagnostic',
      primaryCause: 'PRIMARY CAUSE',
      tacticalAdvice: 'CHIEF ENGINEER ADVICE',
      restartCore: 'RESTART REACTOR CYCLE'
    }
  },

  t(key) { return this.dict[this.currentLang][key] || key; },

  applyLanguage(dom) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = this.t(key);
    });
    if (dom && dom.btnLangToggle) dom.btnLangToggle.innerText = this.t('toggleBtn');
  },

  toggleLanguage(dom) {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    this.applyLanguage(dom);
  }
};

const UIViewModel = {
  fromState(st) {
    const isQUnstable = st.q95 < 2.0 || st.betaN > 2.8;
    const isGreenwaldOver = st.greenwaldRatio > 1.0;
    const isIgnition = st.qGain >= 1.0;
    const maxT = Math.max(st.tempE0, st.tempI0);
    const scanlineSpeed = Math.max(6.0 - maxT * 0.25, 0.8).toFixed(2);

    let atmosphereBg = '';
    if (maxT > 20.0) {
      atmosphereBg = `radial-gradient(ellipse at 50% 55%, rgba(244, 63, 94, ${Math.min(0.05 + maxT * 0.003, 0.18)}) 0%, transparent 70%)`;
    } else if (isIgnition) {
      atmosphereBg = `radial-gradient(ellipse at 50% 55%, rgba(74, 222, 128, 0.12) 0%, transparent 70%)`;
    } else {
      atmosphereBg = `radial-gradient(ellipse at 50% 55%, rgba(0, 240, 255, 0.06) 0%, transparent 65%)`;
    }

    return {
      teText: st.tempE0.toFixed(1),
      tiText: st.tempI0.toFixed(1),
      q95BetaText: `q: ${st.q95.toFixed(2)} | β: ${st.betaN.toFixed(2)}`,
      q95BetaColor: isQUnstable ? '#ef4444' : '#38bdf8',
      qText: st.qGain.toFixed(2),
      isIgnition,
      greenwaldText: st.greenwaldRatio.toFixed(2),
      greenwaldColor: isGreenwaldOver ? '#ef4444' : '#38bdf8',
      integrityText: `${st.integrity.toFixed(1)}% [Max: ${st.maxIntegrity.toFixed(1)}%]`,
      integrityWidth: `${st.integrity}%`,
      integrityMaxWidth: `${st.maxIntegrity}%`,
      scanlineSpeed,
      atmosphereBg,
      fluxInfoText: `κ: ${TOKAMAK_GEO.kappa} | Δ_Shaf: ${st.shafranovShift.toFixed(2)}m`
    };
  }
};

const UI = {
  dom: {},
  lastUpdateTime: 0,
  updateIntervalMs: 50,

  init() {
    this.dom = {
      valTe: document.getElementById('val-te'),
      valTi: document.getElementById('val-ti'),
      valQ95Beta: document.getElementById('val-q95-beta'),
      valQ: document.getElementById('val-q'),
      valGreenwald: document.getElementById('val-greenwald'),
      integrityVal: document.getElementById('integrity-val'),
      integrityBar: document.getElementById('integrity-bar'),
      integrityMaxBar: document.getElementById('integrity-max-bar'),
      cardQ: document.getElementById('card-q'),
      alertMsg: document.getElementById('alert-msg'),
      fluxInfo: document.getElementById('flux-info'),
      fluxCanvas: document.getElementById('fluxCanvas'),
      fluxCtx: document.getElementById('fluxCanvas').getContext('2d'),
      scanlines: document.getElementById('scanlines'),
      atmosphere: document.getElementById('atmosphere-glow'),
      repairHud: document.getElementById('repair-hud'),
      repairProgressBar: document.getElementById('repair-progress-bar'),
      btnLangToggle: document.getElementById('btn-lang-toggle'),
      labelHeatEcrh: document.getElementById('label-heat-ecrh'),
      labelHeatNbi: document.getElementById('label-heat-nbi'),
      labelMag: document.getElementById('label-mag'),
      labelIp: document.getElementById('label-ip'),
      
      careerRank: document.getElementById('career-rank'),
      careerStat: document.getElementById('career-stat'),
      missionName: document.getElementById('mission-name'),
      missionDesc: document.getElementById('mission-desc'),
      missionTimer: document.getElementById('mission-timer'),
      missionProgressBar: document.getElementById('mission-progress-bar'),
      
      incidentModal: document.getElementById('incident-modal'),
      reportCause: document.getElementById('report-cause'),
      reportQ: document.getElementById('report-q'),
      reportTemp: document.getElementById('report-temp'),
      reportQ95: document.getElementById('report-q95'),
      reportGreenwald: document.getElementById('report-greenwald'),
      reportAdvice: document.getElementById('report-advice'),
      btnRestart: document.getElementById('btn-restart'),
      
      victoryModal: document.getElementById('victory-modal'),
      victoryRank: document.getElementById('victory-rank'),
      btnNextMission: document.getElementById('btn-next-mission')
    };

    I18N.applyLanguage(this.dom);
    this.dom.btnLangToggle.onclick = () => I18N.toggleLanguage(this.dom);

    document.getElementById('slider-heat-ecrh').oninput = (e) => {
      FusionPhysics.state.heatECRH = parseFloat(e.target.value);
      this.dom.labelHeatEcrh.innerText = `${FusionPhysics.state.heatECRH.toFixed(1)} MW`;
    };
    document.getElementById('slider-heat-nbi').oninput = (e) => {
      FusionPhysics.state.heatNBI = parseFloat(e.target.value);
      this.dom.labelHeatNbi.innerText = `${FusionPhysics.state.heatNBI.toFixed(1)} MW`;
    };
    document.getElementById('slider-mag').oninput = (e) => {
      FusionPhysics.state.magField = parseFloat(e.target.value);
      this.dom.labelMag.innerText = `${FusionPhysics.state.magField.toFixed(1)} T`;
    };
    document.getElementById('slider-ip').oninput = (e) => {
      FusionPhysics.state.plasmaCurrent = parseFloat(e.target.value);
      this.dom.labelIp.innerText = `${FusionPhysics.state.plasmaCurrent.toFixed(1)} MA`;
    };

    document.getElementById('btn-fuel').onclick = () => GameController.injectPellet();
    document.getElementById('btn-cool').onclick = () => GameController.purgeDivertor();
    this.dom.btnRestart.onclick = () => GameController.restartSimulation();
    this.dom.btnNextMission.onclick = () => {
      MissionEngine.nextMission();
      this.hideModals();
    };
  },

  showIncidentReport(report) {
    this.dom.reportCause.innerText = report.cause;
    this.dom.reportQ.innerText = report.q;
    this.dom.reportTemp.innerText = report.temp;
    this.dom.reportQ95.innerText = report.q95;
    this.dom.reportGreenwald.innerText = report.greenwald;
    this.dom.reportAdvice.innerText = report.advice;
    this.dom.incidentModal.classList.remove('hidden');
  },

  showVictoryModal(mission, rank) {
    this.dom.victoryRank.innerText = rank;
    this.dom.victoryModal.classList.remove('hidden');
  },

  hideModals() {
    this.dom.incidentModal.classList.add('hidden');
    this.dom.victoryModal.classList.add('hidden');
  },

  renderPoloidalFlux(shafranovShift, kappa, delta) {
    const ctx = this.dom.fluxCtx;
    const w = this.dom.fluxCanvas.width;
    const h = this.dom.fluxCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const numSurfaces = 6;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.1) {
      const rWall = 60;
      const x = cx + (rWall * Math.cos(a + delta * Math.sin(a)));
      const y = cy + (rWall * kappa * Math.sin(a));
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    for (let i = 1; i <= numSurfaces; i++) {
      const rho = i / numSurfaces;
      const r = 50 * rho;
      const shiftX = (shafranovShift * 60) * (1 - Math.pow(rho, 2));

      ctx.strokeStyle = i === numSurfaces ? '#38bdf8' : `rgba(0, 240, 255, ${0.15 + rho * 0.45})`;
      ctx.lineWidth = i === numSurfaces ? 1.5 : 1.0;
      ctx.beginPath();

      for (let a = 0; a <= Math.PI * 2; a += 0.1) {
        const px = cx + shiftX + (r * Math.cos(a + delta * Math.sin(a)));
        const py = cy + (r * kappa * Math.sin(a));
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx + shafranovShift * 60, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  updateHUD(st, now) {
    this.renderPoloidalFlux(st.shafranovShift, TOKAMAK_GEO.kappa, TOKAMAK_GEO.delta);

    if (now && now - this.lastUpdateTime < this.updateIntervalMs) return;
    this.lastUpdateTime = now || performance.now();

    const vm = UIViewModel.fromState(st);
    const d = this.dom;

    d.valTe.innerText = vm.teText;
    d.valTi.innerText = vm.tiText;
    d.valQ95Beta.innerText = vm.q95BetaText;
    d.valQ95Beta.style.color = vm.q95BetaColor;

    d.valQ.innerText = vm.qText;
    d.valGreenwald.innerText = vm.greenwaldText;
    d.valGreenwald.style.color = vm.greenwaldColor;

    d.integrityVal.innerText = vm.integrityText;
    d.integrityBar.style.width = vm.integrityWidth;
    d.integrityMaxBar.style.width = vm.integrityMaxWidth;

    if (vm.isIgnition) d.cardQ.classList.add('hud-ignition');
    else d.cardQ.classList.remove('hud-ignition');

    d.fluxInfo.innerText = vm.fluxInfoText;
    d.scanlines.style.animationDuration = `${vm.scanlineSpeed}s`;
    d.atmosphere.style.background = vm.atmosphereBg;

    // 更新生涯徽章
    d.careerRank.innerText = CareerManager.data.rank;
    d.careerStat.innerText = `Q_max: ${CareerManager.data.maxQ.toFixed(2)} | 存活: ${Math.floor(CareerManager.data.totalSurvivalSeconds)}s`;

    // 更新任務目標 HUD
    const m = MissionEngine.getCurrent();
    const isZh = I18N.currentLang === 'zh';
    d.missionName.innerText = isZh ? m.nameZh : m.nameEn;
    d.missionDesc.innerText = isZh ? m.descZh : m.descEn;
    const progressPct = (m.currentProgress / m.requiredDuration) * 100;
    d.missionProgressBar.style.width = `${progressPct}%`;
    const remainingTime = Math.max(0, m.timeLimit - MissionEngine.timer);
    const mins = Math.floor(remainingTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(remainingTime % 60).toString().padStart(2, '0');
    d.missionTimer.innerText = `${mins}:${secs}`;
  }
};

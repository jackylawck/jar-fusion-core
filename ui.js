// =========================================================================
// J.A.R. 聚變核心 3D - 國際化介面與視圖渲染 (ui.js v8.3)
// =========================================================================

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
      solHeatLabel: 'SOL 靶板熱流 / 密度極限',
      ecrhPower: '微波加熱 P_ECRH (→Te)',
      nbiPower: '中性束注入 P_NBI (→Ti)',
      toroidalField: '環向磁場 B_T',
      plasmaCurrent: '等離子體電流 I_p',
      injectFuel: '注入 D-T 燃料顆粒',
      divertorPurge: '開啟偏濾器排熱',
      loadStl: '📁 載入 3D 打印 STL 核心',
      repairing: '正在修復線圈',
      incidentTitle: '事故黑盒子歸因診斷 (Incident Report)',
      primaryCause: '主因判定',
      tacticalAdvice: '首席工程師建議',
      restartCore: '重啟反應爐 (回到待機)',
      powerStandby: '🟢 系統主電源：待機中',
      powerRunning: '🔴 系統主電源：運行中',
      modeStandard: '標準模式',
      modeAdvanced: '科研模式',
      hideHud: '精簡視圖',
      showHud: '完整儀表',
      missionActive: 'MISSION ACTIVE',
      reportQ: '突破時 Q 值',
      reportTemp: '等離子體溫度',
      reportQ95: '安全因子 q95',
      reportGreenwald: '密度比 n/nG',
      telemetryTitle: '破裂前 5 秒黑盒子時序回放 (TELEMETRY HISTORY)',
      victoryTitle: '任務圓滿達成 (MISSION SUCCESS)',
      victoryDesc: '深空基地電網已成功接入聚變核心，能量輸出穩定！',
      unlockRank: '解鎖階級：',
      nextMission: '進入下一階段挑戰',
      diagTitle: '📐 3D 核心幾何診斷報告',
      diagTris: '三角面數',
      diagTurb: '湍流係數',
      diagImpact: '輸運影響',
      diagAdviceSafe: '幾何對稱度極高，等離子體流動阻力低，能量約束時間獲得增益。',
      diagAdviceRough: '模型稜角增加了邊界熱擴散與雜質脫附，建議適當提高磁場 B_T。'
    },
    en: {
      toggleBtn: '中文',
      wallIntegrity: 'First Wall Material Integrity',
      poloidalFlux: 'Poloidal Flux Surfaces Ψ(R,Z)',
      dualTemp: 'Two-Fluid Temp (Te / Ti)',
      safetyFactor: 'Safety Factor q₉₅ / Norm β_N',
      energyGain: 'Fusion Gain Q (P_fus/P_in)',
      solHeatLabel: 'SOL Heatflux / Density Limit',
      ecrhPower: 'ECRH Heating P_ECRH (→Te)',
      nbiPower: 'NBI Heating P_NBI (→Ti)',
      toroidalField: 'Toroidal Field B_T',
      plasmaCurrent: 'Plasma Current I_p',
      injectFuel: 'Inject D-T Fuel Pellet',
      divertorPurge: 'Purge Divertor Exhaust',
      loadStl: '📁 Load 3D Print STL Core',
      repairing: 'REPAIRING COIL',
      incidentTitle: 'Incident Black Box Diagnostic',
      primaryCause: 'PRIMARY CAUSE',
      tacticalAdvice: 'CHIEF ENGINEER ADVICE',
      restartCore: 'RESTART REACTOR (STANDBY)',
      powerStandby: '🟢 CORE POWER: STANDBY',
      powerRunning: '🔴 CORE POWER: ONLINE',
      modeStandard: 'STANDARD',
      modeAdvanced: 'RESEARCH',
      hideHud: 'HIDE HUD',
      showHud: 'SHOW HUD',
      missionActive: 'MISSION ACTIVE',
      reportQ: 'Q at Failure',
      reportTemp: 'Core Temp',
      reportQ95: 'Safety q95',
      reportGreenwald: 'Density n/nG',
      telemetryTitle: '5-SEC TELEMETRY HISTORY REPLAY',
      victoryTitle: 'MISSION SUCCESS',
      victoryDesc: 'Deep space base grid successfully connected to fusion core. Power output stable!',
      unlockRank: 'Rank Unlocked:',
      nextMission: 'NEXT MISSION CHALLENGE',
      diagTitle: '📐 3D CORE GEOMETRY DIAGNOSTIC',
      diagTris: 'Triangles',
      diagTurb: 'Turbulence',
      diagImpact: 'Transport Penalty',
      diagAdviceSafe: 'High symmetry geometric structure. Low plasma drag with enhanced tau_E.',
      diagAdviceRough: 'Sharp edges increased turbulent transport and impurity desorption.'
    }
  },

  t(key) { return this.dict[this.currentLang][key] || key; },

  applyLanguage(dom) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = this.t(key);
    });
    if (dom && dom.btnLangToggle) dom.btnLangToggle.innerText = this.t('toggleBtn');
    if (dom && dom.btnPower) {
      dom.btnPower.innerText = FusionPhysics.state.isOnline ? this.t('powerRunning') : this.t('powerStandby');
    }
    CareerManager.updateRank();
  },

  toggleLanguage(dom) {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    this.applyLanguage(dom);
  }
};

const UIViewModel = {
  fromState(st) {
    const isQUnstable = st.q95 < 2.0 || st.betaN > 2.8 || st.deltaZ > 0.25;
    const isIgnition = st.qGain >= 1.0;
    const maxT = Math.max(st.tempE0, st.tempI0);
    const scanlineSpeed = Math.max(6.0 - maxT * 0.25, 0.8).toFixed(2);

    let atmosphereBg = '';
    if (maxT > 20.0 || st.peakDivertorHeatFlux_MW_m2 > 10.0) {
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
      divHeatText: `${st.peakDivertorHeatFlux_MW_m2.toFixed(1)} MW/m²`,
      divHeatColor: st.peakDivertorHeatFlux_MW_m2 > 10.0 ? '#ef4444' : '#cbd5e1',
      integrityText: `${st.integrity.toFixed(1)}% [Max: ${st.maxIntegrity.toFixed(1)}%]`,
      integrityWidth: `${st.integrity}%`,
      integrityMaxWidth: `${st.maxIntegrity}%`,
      scanlineSpeed,
      atmosphereBg,
      fluxInfoText: `κ: ${TOKAMAK_GEO.kappa} | δZ: ${st.deltaZ.toFixed(2)}m`
    };
  }
};

const UI = {
  dom: {},
  lastUpdateTime: 0,
  updateIntervalMs: 50,
  _toastTimer: null,
  isHudHidden: false,

  init() {
    this.dom = {
      valTe: document.getElementById('val-te'),
      valTi: document.getElementById('val-ti'),
      valQ95Beta: document.getElementById('val-q95-beta'),
      valQ: document.getElementById('val-q'),
      valDivHeat: document.getElementById('val-div-heat'),
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
      btnModeToggle: document.getElementById('btn-mode-toggle'),
      btnHudToggle: document.getElementById('btn-hud-toggle'),
      labelHeatEcrh: document.getElementById('label-heat-ecrh'),
      labelHeatNbi: document.getElementById('label-heat-nbi'),
      labelMag: document.getElementById('label-mag'),
      labelIp: document.getElementById('label-ip'),
      btnPower: document.getElementById('btn-power'),
      hudArea: document.getElementById('hud'),
      
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

    // 🟢 主電源按鈕
    if (this.dom.btnPower) {
      this.dom.btnPower.onclick = () => {
        const online = FusionPhysics.togglePower();
        if (online) {
          this.dom.btnPower.innerText = I18N.t('powerRunning');
          this.dom.btnPower.style.background = 'linear-gradient(135deg, #ef4444, #991b1b)';
          this.dom.btnPower.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
          document.getElementById('slider-heat-ecrh').value = 12;
          document.getElementById('slider-heat-nbi').value = 12;
          this.dom.labelHeatEcrh.innerText = '12.0 MW';
          this.dom.labelHeatNbi.innerText = '12.0 MW';
          AudioSys.playTone(520, 'sine', 0.4, 0.1);
        } else {
          this.resetControlsToStandby();
        }
      };
    }

    // 模式切換 (標準 vs 科研)
    if (this.dom.btnModeToggle) {
      this.dom.btnModeToggle.onclick = () => {
        const isAdv = FusionPhysics.toggleMode();
        this.dom.btnModeToggle.innerHTML = isAdv ? `🔥 ${I18N.t('modeAdvanced')}` : `🟢 ${I18N.t('modeStandard')}`;
        this.dom.btnModeToggle.style.borderColor = isAdv ? '#ef4444' : '#00f0ff';
        this.dom.btnModeToggle.style.color = isAdv ? '#ef4444' : '#00f0ff';
      };
    }

    // HUD 折疊視圖切換
    if (this.dom.btnHudToggle) {
      this.dom.btnHudToggle.onclick = () => {
        this.isHudHidden = !this.isHudHidden;
        this.dom.hudArea.style.display = this.isHudHidden ? 'none' : 'grid';
        this.dom.btnHudToggle.innerHTML = this.isHudHidden ? `👁️ ${I18N.t('showHud')}` : `👁️ ${I18N.t('hideHud')}`;
      };
    }

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
      DynamicMissionEngine.reset();
      this.hideModals();
    };
  },

  resetControlsToStandby() {
    if (this.dom.btnPower) {
      this.dom.btnPower.innerText = I18N.t('powerStandby');
      this.dom.btnPower.style.background = 'linear-gradient(135deg, #10b981, #047857)';
      this.dom.btnPower.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
    }
    document.getElementById('slider-heat-ecrh').value = 0;
    document.getElementById('slider-heat-nbi').value = 0;
    this.dom.labelHeatEcrh.innerText = '0.0 MW';
    this.dom.labelHeatNbi.innerText = '0.0 MW';
  },

  showSTLDiagnosis(diag) {
    let toast = document.getElementById('stl-diag-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'stl-diag-toast';
      document.getElementById('ui-layer').appendChild(toast);
    }

    const isZh = I18N.currentLang === 'zh';
    const adviceText = (parseFloat(diag.complexityFactor) > 1.3) ? I18N.t('diagAdviceRough') : I18N.t('diagAdviceSafe');

    toast.innerHTML = `
      <div class="toast-header">
        <span>${I18N.t('diagTitle')}</span>
        <b class="toast-rating">${diag.rating}</b>
      </div>
      <div class="toast-body">
        <div>${I18N.t('diagTris')}: <b>${diag.triangleCount}</b> | ${I18N.t('diagTurb')}: <b>${diag.complexityFactor}x</b></div>
        <div class="toast-stat">${I18N.t('diagImpact')}: <span style="color:#ef4444">${diag.transportPenalty}</span></div>
        <div class="toast-advice">${adviceText}</div>
      </div>
    `;

    toast.className = 'toast-show';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = 'toast-hide';
    }, 6000);
  },

  showIncidentReport(report, telemetryHistory) {
    this.dom.reportCause.innerText = report.cause;
    this.dom.reportQ.innerText = report.q;
    this.dom.reportTemp.innerText = report.temp;
    this.dom.reportQ95.innerText = report.q95;
    this.dom.reportGreenwald.innerText = report.greenwald;
    this.dom.reportAdvice.innerText = report.advice;

    this.renderTelemetryReplay(telemetryHistory, report.triggerMetric);
    this.dom.incidentModal.classList.remove('hidden');
  },

  renderTelemetryReplay(history, triggerMetric) {
    const canvas = document.getElementById('telemetryCanvas');
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.3); ctx.lineTo(w, h * 0.3);
    ctx.moveTo(0, h * 0.6); ctx.lineTo(w, h * 0.6);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText('β_N Limit (2.8)', 6, h * 0.3 - 3);
    ctx.fillText('q95 Limit (2.0)', 6, h * 0.6 - 3);

    const len = history.length;
    const dx = w / (len - 1);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const y = h - (history[i].betaN / 4.0) * (h - 24) - 12;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * dx, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const y = h - (history[i].q95 / 5.0) * (h - 24) - 12;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * dx, y);
    }
    ctx.stroke();

    const lastX = w - 4;
    const lastY = h - (history[len - 1].betaN / 4.0) * (h - 24) - 12;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('— β_N', 10, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('— q95', 60, 12);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`🚨 ${triggerMetric}`, w - 210, 12);
  },

  showVictoryModal(mission, rank) {
    this.dom.victoryRank.innerText = rank;
    this.dom.victoryModal.classList.remove('hidden');
  },

  hideModals() {
    this.dom.incidentModal.classList.add('hidden');
    this.dom.victoryModal.classList.add('hidden');
  },

  renderPoloidalFlux(shafranovShift, kappa, delta, deltaZ) {
    const ctx = this.dom.fluxCtx;
    const w = this.dom.fluxCanvas.width;
    const h = this.dom.fluxCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - (deltaZ * 25.0);
    const numSurfaces = 6;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.1) {
      const rWall = 60;
      const x = cx + (rWall * Math.cos(a + delta * Math.sin(a)));
      const y = (h / 2) + (rWall * kappa * Math.sin(a));
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
    this.renderPoloidalFlux(st.shafranovShift, TOKAMAK_GEO.kappa, TOKAMAK_GEO.delta, st.deltaZ);

    if (now && now - this.lastUpdateTime < this.updateIntervalMs) return;
    this.lastUpdateTime = now || performance.now();

    const vm = UIViewModel.fromState(st);
    const d = this.dom;

    d.valTe.innerText = vm.teText;
    d.valTi.innerText = vm.tiText;
    d.valQ95Beta.innerText = vm.q95BetaText;
    d.valQ95Beta.style.color = vm.q95BetaColor;

    d.valQ.innerText = vm.qText;
    d.valDivHeat.innerText = vm.divHeatText;
    d.valDivHeat.style.color = vm.divHeatColor;

    d.integrityVal.innerText = vm.integrityText;
    d.integrityBar.style.width = vm.integrityWidth;
    d.integrityMaxBar.style.width = vm.integrityMaxWidth;

    if (vm.isIgnition) d.cardQ.classList.add('hud-ignition');
    else d.cardQ.classList.remove('hud-ignition');

    d.fluxInfo.innerText = vm.fluxInfoText;
    d.scanlines.style.animationDuration = `${vm.scanlineSpeed}s`;
    d.atmosphere.style.background = vm.atmosphereBg;

    d.careerRank.innerText = CareerManager.data.rank;
    const isZh = I18N.currentLang === 'zh';
    const surviveLabel = isZh ? '存活' : 'Alive';
    d.careerStat.innerText = `Q_max: ${CareerManager.data.maxQ.toFixed(2)} | ${surviveLabel}: ${Math.floor(CareerManager.data.totalSurvivalSeconds)}s`;

    const q = DynamicMissionEngine.currentQuest;
    if (q) {
      d.missionName.innerText = isZh ? q.titleZh : q.titleEn;
      d.missionDesc.innerText = isZh ? q.descZh : q.descEn;
      const progressPct = (q.currentProgress / q.targetDuration) * 100;
      d.missionProgressBar.style.width = `${progressPct}%`;
      const elapsed = Math.floor(DynamicMissionEngine.timer);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
      d.missionTimer.innerText = `${mins}:${secs}`;
    }
  }
};

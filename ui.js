// =========================================================================
// J.A.R. 聚變核心 3D - 介面控制器 (ui.js v9.1)
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
      ecrhPower: '微波加熱 P_ECRH',
      nbiPower: '中性束注入 P_NBI',
      toroidalField: '環向磁場 B_T',
      plasmaCurrent: '等離子體電流 I_p',
      pumpingSpeed: '偏濾器抽速 S_pump',
      fluxExpansion: '磁通擴展比 f_exp',
      csFluxRate: '中心螺線管磁通率 dPhi/dt',
      deltaShape: '三角形形變度 delta',
      neonSeeding: '氖氣雜質冷卻注入',
      injectFuel: '注入 D-T 燃料顆粒',
      divertorPurge: '開啟偏濾器排熱',
      loadStl: '📁 載入 3D 打印 STL 核心',
      repairing: '正在修復線圈',
      incidentTitle: '事故黑盒子歸因診斷 (Incident Report)',
      primaryCause: '主因判定',
      tacticalAdvice: '國家能源研究院專家建議',
      restartCore: '重啟反應爐 (回到安全待機)',
      powerStandby: '🟢 系統主電源：待機中',
      powerRunning: '🔴 系統主電源：運行中',
      modeEasy: '🟢 簡易科普模式 (必穩定)',
      modeStandard: '🟡 工程標準模式 (6 參數)',
      modeAdvanced: '🔴 博士科研模式 (9 參數)',
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
      unlockRank: '解鎖國家級官銜：',
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
      ecrhPower: 'ECRH Heating P_ECRH',
      nbiPower: 'NBI Heating P_NBI',
      toroidalField: 'Toroidal Field B_T',
      plasmaCurrent: 'Plasma Current I_p',
      pumpingSpeed: 'Divertor Pump Speed',
      fluxExpansion: 'Flux Expansion f_exp',
      csFluxRate: 'CS Loop Flux dPhi/dt',
      deltaShape: 'Triangularity delta',
      neonSeeding: 'Neon Gas Seeding',
      injectFuel: 'Inject D-T Fuel Pellet',
      divertorPurge: 'Purge Divertor Exhaust',
      loadStl: '📁 Load 3D Print STL Core',
      repairing: 'REPAIRING COIL',
      incidentTitle: 'Incident Black Box Diagnostic',
      primaryCause: 'PRIMARY CAUSE',
      tacticalAdvice: 'NATIONAL ACADEMY ADVICE',
      restartCore: 'RESTART REACTOR (STANDBY)',
      powerStandby: '🟢 CORE POWER: STANDBY',
      powerRunning: '🔴 CORE POWER: ONLINE',
      modeEasy: '🟢 EASY (STABLE)',
      modeStandard: '🟡 STANDARD (6 PARAMS)',
      modeAdvanced: '🔴 RESEARCH (9 PARAMS)',
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
    this.updateDropdownOptions(dom);
    CareerManager.updateRank();
  },

  toggleLanguage(dom) {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    this.applyLanguage(dom);
  },

  updateDropdownOptions(dom) {
    if (!dom.selectMode) return;
    dom.selectMode.options[0].text = this.t('modeEasy');
    dom.selectMode.options[1].text = this.t('modeStandard');
    dom.selectMode.options[2].text = this.t('modeAdvanced');
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
      selectMode: document.getElementById('select-mode'),
      btnHudToggle: document.getElementById('btn-hud-toggle'),
      controlsPanel: document.getElementById('controls-panel'),
      btnPower: document.getElementById('btn-power'),
      hudArea: document.getElementById('hud'),
      
      careerRank: document.getElementById('career-rank'),
      careerStat: document.getElementById('career-stat'),
      missionName: document.getElementById('mission-name'),
      missionDesc: document.getElementById('mission-desc'),
      missionTimer: document.getElementById('mission-timer'),
      missionProgressBar: document.getElementById('mission-progress-bar'),
      missionPctLabel: document.getElementById('mission-pct-label'),
      
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
    this.renderDynamicControlSliders();

    this.dom.btnLangToggle.onclick = () => I18N.toggleLanguage(this.dom);

    // 模式切換下拉選單事件
    if (this.dom.selectMode) {
      this.dom.selectMode.onchange = (e) => {
        FusionPhysics.gameMode = parseInt(e.target.value, 10);
        this.renderDynamicControlSliders();
        AudioSys.playTone(440 + FusionPhysics.gameMode * 120, 'sine', 0.2, 0.08);
      };
    }

    if (this.dom.btnHudToggle) {
      this.dom.btnHudToggle.onclick = () => {
        this.isHudHidden = !this.isHudHidden;
        this.dom.hudArea.style.display = this.isHudHidden ? 'none' : 'grid';
        this.dom.btnHudToggle.innerHTML = this.isHudHidden ? `👁️ ${I18N.t('showHud')}` : `👁️ ${I18N.t('hideHud')}`;
      };
    }

    document.getElementById('btn-fuel').onclick = () => GameController.injectPellet();
    document.getElementById('btn-cool').onclick = () => GameController.purgeDivertor();
    this.dom.btnRestart.onclick = () => GameController.restartSimulation();
    this.dom.btnNextMission.onclick = () => {
      DynamicMissionEngine.reset();
      this.hideModals();
    };
  },

  renderDynamicControlSliders() {
    const mode = FusionPhysics.gameMode;
    const p = FusionPhysics.state;
    const cp = this.dom.controlsPanel;

    let html = `
      <div class="control-group">
        <label><span>${I18N.t('ecrhPower')}</span>: <span id="lbl-ecrh">${p.heatECRH.toFixed(1)} MW</span></label>
        <input type="range" id="slider-heat-ecrh" min="0" max="40" step="0.5" value="${p.heatECRH}">
      </div>
      <div class="control-group">
        <label><span>${I18N.t('nbiPower')}</span>: <span id="lbl-nbi">${p.heatNBI.toFixed(1)} MW</span></label>
        <input type="range" id="slider-heat-nbi" min="0" max="40" step="0.5" value="${p.heatNBI}">
      </div>
      <div class="control-group">
        <label><span>${I18N.t('toroidalField')}</span>: <span id="lbl-mag">${p.magField.toFixed(1)} T</span></label>
        <input type="range" id="slider-mag" min="2" max="15" step="0.2" value="${p.magField}">
      </div>
      <div class="control-group">
        <label><span>${I18N.t('plasmaCurrent')}</span>: <span id="lbl-ip">${p.plasmaCurrent.toFixed(1)} MA</span></label>
        <input type="range" id="slider-ip" min="0.4" max="3.0" step="0.1" value="${p.plasmaCurrent}">
      </div>
    `;

    if (mode >= 1) {
      html += `
        <div class="control-group">
          <label><span>${I18N.t('pumpingSpeed')}</span>: <span id="lbl-pump">${p.pumpingSpeed.toFixed(1)} m³/s</span></label>
          <input type="range" id="slider-pump" min="1" max="30" step="1" value="${p.pumpingSpeed}">
        </div>
        <div class="control-group">
          <label><span>${I18N.t('fluxExpansion')}</span>: <span id="lbl-fexp">${p.fluxExpansion.toFixed(1)}</span></label>
          <input type="range" id="slider-fexp" min="2" max="10" step="0.5" value="${p.fluxExpansion}">
        </div>
      `;
    }

    if (mode === 2) {
      html += `
        <div class="control-group">
          <label><span>${I18N.t('csFluxRate')}</span>: <span id="lbl-cs">${p.csFluxRate.toFixed(2)} V-s/s</span></label>
          <input type="range" id="slider-cs" min="0" max="2.0" step="0.05" value="${p.csFluxRate}">
        </div>
        <div class="control-group">
          <label><span>${I18N.t('deltaShape')}</span>: <span id="lbl-delta">${p.triangularityDelta.toFixed(2)}</span></label>
          <input type="range" id="slider-delta" min="0.1" max="0.6" step="0.02" value="${p.triangularityDelta}">
        </div>
        <div class="control-group">
          <label><span>${I18N.t('neonSeeding')}</span>: <span id="lbl-neon">${p.neonSeeding.toFixed(1)}</span></label>
          <input type="range" id="slider-neon" min="0" max="5.0" step="0.2" value="${p.neonSeeding}">
        </div>
      `;
    }

    html += `
      <div class="btn-row">
        <button class="btn-power" id="btn-power">${p.isOnline ? I18N.t('powerRunning') : I18N.t('powerStandby')}</button>
        <button class="btn-fuel" id="btn-fuel">${I18N.t('injectFuel')}</button>
        <button class="btn-divertor" id="btn-cool">${I18N.t('divertorPurge')}</button>
        <button class="btn-stl" id="btn-load-stl">${I18N.t('loadStl')}</button>
        <input type="file" id="stl-file-input" accept=".stl" style="display:none;">
      </div>
    `;

    cp.innerHTML = html;
    this.bindDynamicSliderEvents();
  },

  bindDynamicSliderEvents() {
    const bind = (id, lblId, prop, unit) => {
      const el = document.getElementById(id);
      if (el) {
        el.oninput = (e) => {
          FusionPhysics.state[prop] = parseFloat(e.target.value);
          document.getElementById(lblId).innerText = `${FusionPhysics.state[prop].toFixed(1)} ${unit}`;
        };
      }
    };

    bind('slider-heat-ecrh', 'lbl-ecrh', 'heatECRH', 'MW');
    bind('slider-heat-nbi', 'lbl-nbi', 'heatNBI', 'MW');
    bind('slider-mag', 'lbl-mag', 'magField', 'T');
    bind('slider-ip', 'lbl-ip', 'plasmaCurrent', 'MA');
    bind('slider-pump', 'lbl-pump', 'pumpingSpeed', 'm³/s');
    bind('slider-fexp', 'lbl-fexp', 'fluxExpansion', '');
    bind('slider-cs', 'lbl-cs', 'csFluxRate', 'V-s/s');
    bind('slider-delta', 'lbl-delta', 'triangularityDelta', '');
    bind('slider-neon', 'lbl-neon', 'neonSeeding', '');

    const bp = document.getElementById('btn-power');
    if (bp) {
      bp.onclick = () => {
        const online = FusionPhysics.togglePower();
        if (online) {
          bp.innerText = I18N.t('powerRunning');
          bp.style.background = 'linear-gradient(135deg, #ef4444, #991b1b)';
          this.syncSlidersFromPhysics();
          AudioSys.playTone(520, 'sine', 0.4, 0.1);
        } else {
          this.resetControlsToStandby();
        }
      };
    }

    const bStl = document.getElementById('btn-load-stl');
    const sInput = document.getElementById('stl-file-input');
    if (bStl && sInput) bStl.onclick = () => sInput.click();
    document.getElementById('btn-fuel').onclick = () => GameController.injectPellet();
    document.getElementById('btn-cool').onclick = () => GameController.purgeDivertor();
  },

  syncSlidersFromPhysics() {
    const p = FusionPhysics.state;
    const setVal = (id, lblId, val, unit) => {
      const el = document.getElementById(id);
      const lbl = document.getElementById(lblId);
      if (el) el.value = val;
      if (lbl) lbl.innerText = `${val.toFixed(1)} ${unit}`;
    };
    setVal('slider-heat-ecrh', 'lbl-ecrh', p.heatECRH, 'MW');
    setVal('slider-heat-nbi', 'lbl-nbi', p.heatNBI, 'MW');
    setVal('slider-mag', 'lbl-mag', p.magField, 'T');
    setVal('slider-ip', 'lbl-ip', p.plasmaCurrent, 'MA');
  },

  resetControlsToStandby() {
    const bp = document.getElementById('btn-power');
    if (bp) {
      bp.innerText = I18N.t('powerStandby');
      bp.style.background = 'linear-gradient(135deg, #10b981, #047857)';
      bp.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
    }
    const setZero = (id, lblId, unit) => {
      const el = document.getElementById(id);
      const lbl = document.getElementById(lblId);
      if (el) el.value = 0;
      if (lbl) lbl.innerText = `0.0 ${unit}`;
    };
    setZero('slider-heat-ecrh', 'lbl-ecrh', 'MW');
    setZero('slider-heat-nbi', 'lbl-nbi', 'MW');
  },

  showSTLDiagnosis(diag) {
    let toast = document.getElementById('stl-diag-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'stl-diag-toast';
      document.getElementById('ui-layer').appendChild(toast);
    }

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

  // 強化左側示波器：即時呼吸磁表面 + 磁軸微震動 + 等壓面流動
  renderPoloidalFlux(shafranovShift, kappa, delta, deltaZ, now) {
    const ctx = this.dom.fluxCtx;
    const w = this.dom.fluxCanvas.width;
    const h = this.dom.fluxCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const t = (now || performance.now()) * 0.003;
    const pulse = FusionPhysics.state.isOnline ? Math.sin(t) * 1.5 : 0;

    const cx = w / 2;
    const cy = h / 2 - (deltaZ * 25.0);
    const numSurfaces = 6;

    // 真空室邊界壁
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

    // 磁通量閉合等值面 (動態脈動)
    for (let i = 1; i <= numSurfaces; i++) {
      const rho = i / numSurfaces;
      const r = (50 + pulse * (1 - rho)) * rho;
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

    // 磁軸中心點 (紅光發亮)
    ctx.fillStyle = FusionPhysics.state.isOnline ? '#f43f5e' : '#64748b';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = FusionPhysics.state.isOnline ? 8 : 0;
    ctx.beginPath();
    ctx.arc(cx + shafranovShift * 60, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  },

  updateHUD(st, now) {
    this.renderPoloidalFlux(st.shafranovShift, TOKAMAK_GEO.kappa, TOKAMAK_GEO.delta, st.deltaZ, now);

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

    // 右側任務 HUD 即時更新 (帶百分比跳動)
    const q = DynamicMissionEngine.currentQuest;
    if (q) {
      d.missionName.innerText = isZh ? q.titleZh : q.titleEn;
      d.missionDesc.innerText = isZh ? q.descZh : q.descEn;
      const progressPct = Math.min((q.currentProgress / q.targetDuration) * 100, 100);
      d.missionProgressBar.style.width = `${progressPct}%`;
      d.missionPctLabel.innerText = `${Math.floor(progressPct)}%`;
      const elapsed = Math.floor(DynamicMissionEngine.timer);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
      d.missionTimer.innerText = `${mins}:${secs}`;
    }
  }
};

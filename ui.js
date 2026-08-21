// --- 國際化雙語字典與狀態機 ---
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
      disruption: '💥 大破裂 (MAJOR DISRUPTION)！第一壁材料熔毀，等離子體崩解！',
      elmAlert: '⚡ Type-I ELM 邊緣爆發！強熱流衝擊第一壁！',
      q95Alert: '⚠️ MHD 撕裂警報：q95 < 2.0！提高磁場 B 或降低電流 I_p！',
      betaAlert: '⚠️ 接近 Troyon Beta_N 極限！壓力梯度過大！',
      greenwaldAlert: '⚠️ 格林沃德密度超限 (n > n_G)！引發輻射坍縮！',
      coilAlert: '🚨 磁場線圈局部撕裂！按住故障線圈 0.8 秒緊急修復！',
      hModeActive: '✨ H-Mode 高約束模式已啟動 (Confinement Enhanced)'
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
      disruption: '💥 MAJOR DISRUPTION! First wall melted, confinement lost!',
      elmAlert: '⚡ Type-I ELM Burst! High heat flux impacting first wall!',
      q95Alert: '⚠️ MHD Tearing Alert: q95 < 2.0! Increase B or decrease I_p!',
      betaAlert: '⚠️ Troyon Beta_N Limit exceeded! Pressure gradient too high!',
      greenwaldAlert: '⚠️ Greenwald density exceeded (n > n_G)! Radiation collapse!',
      coilAlert: '🚨 Local magnetic tear! Hold failing coil for 0.8s to weld!',
      hModeActive: '✨ H-Mode Active (Confinement Enhanced)'
    }
  },

  t(key) {
    return this.dict[this.currentLang][key] || key;
  },

  applyLanguage(dom) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = this.t(key);
    });
    if (dom && dom.btnLangToggle) {
      dom.btnLangToggle.innerText = this.t('toggleBtn');
    }
  },

  toggleLanguage(dom) {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    this.applyLanguage(dom);
  }
};

// --- 視圖模型轉換器 (UIViewModel: 解耦物理與 DOM) ---
const UIViewModel = {
  fromState(st) {
    const isQUnstable = st.q95 < 2.0 || st.betaN > 2.8;
    const isGreenwaldOver = st.greenwaldRatio > 1.0;
    const isIgnition = st.qGain >= 1.0;

    let alertKey = '';
    if (st.gameOver) alertKey = 'disruption';
    else if (st.elmBurst) alertKey = 'elmAlert';
    else if (st.q95 < 2.0) alertKey = 'q95Alert';
    else if (st.betaN > 2.8) alertKey = 'betaAlert';
    else if (st.greenwaldRatio > 1.0) alertKey = 'greenwaldAlert';
    else if (st.failingCoilIndex !== -1) alertKey = 'coilAlert';
    else if (st.isHMode) alertKey = 'hModeActive';

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
      alertText: alertKey ? I18N.t(alertKey) : '',
      scanlineSpeed,
      atmosphereBg,
      fluxInfoText: `κ: ${TOKAMAK_GEO.kappa} | Δ_Shaf: ${st.shafranovShift.toFixed(2)}m`
    };
  }
};

// --- UI 主控模組 (快取 + 節流) ---
const UI = {
  dom: {},
  lastUpdateTime: 0,
  updateIntervalMs: 50, // 20Hz 節流 (每 50ms 刷新一次 DOM 文字，大幅節省 CPU)

  init() {
    // 1. 全域快取所有 DOM 節點引用
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
      labelIp: document.getElementById('label-ip')
    };

    // 2. 初始化語言與切換綁定
    I18N.applyLanguage(this.dom);
    this.dom.btnLangToggle.onclick = () => I18N.toggleLanguage(this.dom);

    // 3. 輸入事件綁定
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

    document.getElementById('btn-fuel').onclick = () => FusionPhysics.injectPellet();
    document.getElementById('btn-cool').onclick = () => FusionPhysics.purgeDivertor();
  },

  // 繪製 2D 磁通量表面分析儀 (與 3D 渲染同步流暢繪製)
  renderPoloidalFlux(shafranovShift, kappa, delta) {
    const ctx = this.dom.fluxCtx;
    const w = this.dom.fluxCanvas.width;
    const h = this.dom.fluxCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const numSurfaces = 6;

    // 真空室 D 型內壁
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

    // 嵌套磁通量等高線
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

    // 磁軸 O-point
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx + shafranovShift * 60, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  // 實時 HUD 更新 (帶有 ViewModel 轉換與 20Hz 節流)
  updateHUD(st, now) {
    // 1. 2D 磁通量分析儀維持每幀繪製
    this.renderPoloidalFlux(st.shafranovShift, TOKAMAK_GEO.kappa, TOKAMAK_GEO.delta);

    // 2. DOM 數據節流檢查
    if (now && now - this.lastUpdateTime < this.updateIntervalMs) return;
    this.lastUpdateTime = now || performance.now();

    // 3. 透過 ViewModel 計算所有顯示數據
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

    d.alertMsg.innerText = vm.alertText;
    d.fluxInfo.innerText = vm.fluxInfoText;

    d.scanlines.style.animationDuration = `${vm.scanlineSpeed}s`;
    d.atmosphere.style.background = vm.atmosphereBg;
  }
};

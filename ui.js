const I18N = {
  // 自動偵測使用者系統/瀏覽器習慣語言（包含 zh-HK, zh-TW, zh-CN 優先轉中文，其餘英文）
  currentLang: (navigator.language && navigator.language.toLowerCase().startsWith('zh')) ? 'zh' : 'en',

  dict: {
    zh: {
      toggleBtn: 'English',
      wallIntegrity: '第一壁材料狀態 (First Wall Integrity)',
      poloidalFlux: '極向磁通量表面 Ψ(R,Z)',
      dualTemp: '雙溫分離 (Te / Ti)',
      safetyFactor: '安全因子 q₉₅ / 歸一化 β_N',
      energyGain: '聚變能量增益 Q (P_fus/P_in)',
      densityLimit: '密度極限 n₀ / n_G',
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
      densityLimit: 'Greenwald Limit n₀ / n_G',
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

  applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = this.t(key);
    });
    document.getElementById('btn-lang-toggle').innerText = this.t('toggleBtn');
  },

  toggleLanguage() {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    this.applyLanguage();
  }
};

const UI = {
  fluxCanvas: document.getElementById('fluxCanvas'),
  fluxCtx: document.getElementById('fluxCanvas').getContext('2d'),
  repairHud: document.getElementById('repair-hud'),
  repairProgressBar: document.getElementById('repair-progress-bar'),

  init() {
    // 依使用者習慣自動載入
    I18N.applyLanguage();
    document.getElementById('btn-lang-toggle').onclick = () => I18N.toggleLanguage();

    document.getElementById('slider-heat-ecrh').oninput = (e) => {
      FusionPhysics.state.heatECRH = parseFloat(e.target.value);
      document.getElementById('label-heat-ecrh').innerText = `${FusionPhysics.state.heatECRH.toFixed(1)} MW`;
    };
    document.getElementById('slider-heat-nbi').oninput = (e) => {
      FusionPhysics.state.heatNBI = parseFloat(e.target.value);
      document.getElementById('label-heat-nbi').innerText = `${FusionPhysics.state.heatNBI.toFixed(1)} MW`;
    };
    document.getElementById('slider-mag').oninput = (e) => {
      FusionPhysics.state.magField = parseFloat(e.target.value);
      document.getElementById('label-mag').innerText = `${FusionPhysics.state.magField.toFixed(1)} T`;
    };
    document.getElementById('slider-ip').oninput = (e) => {
      FusionPhysics.state.plasmaCurrent = parseFloat(e.target.value);
      document.getElementById('label-ip').innerText = `${FusionPhysics.state.plasmaCurrent.toFixed(1)} MA`;
    };

    document.getElementById('btn-fuel').onclick = () => FusionPhysics.injectPellet();
    document.getElementById('btn-cool').onclick = () => FusionPhysics.purgeDivertor();
  },

  renderPoloidalFlux(shafranovShift, kappa, delta) {
    const ctx = this.fluxCtx;
    const w = this.fluxCanvas.width;
    const h = this.fluxCanvas.height;
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

  updateHUD(st) {
    document.getElementById('val-te').innerText = `Te: ${st.tempE0.toFixed(1)}`;
    document.getElementById('val-ti').innerText = `Ti: ${st.tempI0.toFixed(1)}`;
    document.getElementById('val-q95-beta').innerText = `q: ${st.q95.toFixed(2)} | β: ${st.betaN.toFixed(2)}`;
    document.getElementById('val-q95-beta').style.color = (st.q95 < 2.0 || st.betaN > 2.8) ? '#ef4444' : '#38bdf8';

    document.getElementById('val-q').innerText = st.qGain.toFixed(2);
    document.getElementById('val-q').style.color = st.qGain >= 1.0 ? '#4ade80' : '#38bdf8';

    document.getElementById('val-greenwald').innerText = st.greenwaldRatio.toFixed(2);
    document.getElementById('val-greenwald').style.color = st.greenwaldRatio > 1.0 ? '#ef4444' : '#38bdf8';

    document.getElementById('integrity-val').innerText = `${st.integrity.toFixed(1)}% [Max: ${st.maxIntegrity.toFixed(1)}%]`;
    document.getElementById('integrity-bar').style.width = `${st.integrity}%`;
    document.getElementById('integrity-max-bar').style.width = `${st.maxIntegrity}%`;

    const cardQ = document.getElementById('card-q');
    if (st.qGain >= 1.0) cardQ.classList.add('hud-ignition');
    else cardQ.classList.remove('hud-ignition');

    const alertMsg = document.getElementById('alert-msg');
    if (st.gameOver) {
      alertMsg.innerText = I18N.t('disruption');
    } else if (st.elmBurst) {
      alertMsg.innerText = I18N.t('elmAlert');
    } else if (st.q95 < 2.0) {
      alertMsg.innerText = I18N.t('q95Alert');
    } else if (st.betaN > 2.8) {
      alertMsg.innerText = I18N.t('betaAlert');
    } else if (st.greenwaldRatio > 1.0) {
      alertMsg.innerText = I18N.t('greenwaldAlert');
    } else if (st.failingCoilIndex !== -1) {
      alertMsg.innerText = I18N.t('coilAlert');
    } else {
      alertMsg.innerText = st.isHMode ? I18N.t('hModeActive') : '';
    }

    this.renderPoloidalFlux(st.shafranovShift, TOKAMAK_GEO.kappa, TOKAMAK_GEO.delta);
    document.getElementById('flux-info').innerText = `κ: ${TOKAMAK_GEO.kappa} | Δ_Shaf: ${st.shafranovShift.toFixed(2)}m`;
  }
};

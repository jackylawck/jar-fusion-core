// =========================================================================
// J.A.R. 聚變核心 3D - 科研級 1D 徑向輸運與 MHD 穩定性求解器 (physics.js v4.0)
// 特性：1D 徑向有限差分離散、Bosch-Hale 反應率、自洽雜質冷卻 (Z_eff)、
//      Rutherford 磁島寬度演化、ETB 週期性崩塌 (Type-I ELM)、自洽冷卻顆粒注入
// =========================================================================

const COILS_COUNT = 10;
const RADIAL_GRIDS = 21; // 徑向網格節點數 rho ∈ [0, 1]

const TOKAMAK_GEO = {
  R0: 1.85,      // 大半徑 (m)
  a: 0.57,       // 小半徑 (m)
  kappa: 1.75,   // 伸長率
  delta: 0.35,   // 三角形形變度
  volume: 20.5,  // 真空室等效體積 (m^3)
  Z_eff: 1.65,   // 雜質有效電荷數 (考慮碳/鎢壁雜質)
  impurityFrac: 0.025 // 雜質濃度比例 (2.5%)
};

// 1. Bosch-Hale (1992) D-T 聚變反應截面參數化
function getBoschHaleSigmaV(Ti_keV) {
  if (Ti_keV < 0.2) return 0;
  const T = Math.min(Ti_keV, 100);
  const BG = 34.3827;
  const C1 = 1.17302e-9, C2 = 1.51361e-2, C3 = 7.51886e-2, C4 = 4.60643e-3;
  const C5 = 1.35000e-2, C6 = -1.06750e-4, C7 = 1.36600e-5;

  const theta = T / (1.0 - (T * (C2 + T * (C4 + T * C6))) / (1.0 + T * (C3 + T * (C5 + T * C7))));
  const xi = Math.pow(Math.pow(BG, 2) / (4.0 * theta), 1.0 / 3.0);
  const sigV = C1 * theta * Math.sqrt(xi / (Math.pow(BG, 2) * Math.pow(T, 3))) * Math.exp(-3.0 * xi) * 1e-6;
  return isNaN(sigV) ? 0 : sigV;
}

const FusionPhysics = {
  // 1D 網格物理場 (rho = r/a, 0 為磁軸, 1 為邊緣截面)
  grid: {
    rho: new Float32Array(RADIAL_GRIDS),
    Te: new Float32Array(RADIAL_GRIDS),     // 電子溫度 (keV)
    Ti: new Float32Array(RADIAL_GRIDS),     // 離子溫度 (keV)
    n: new Float32Array(RADIAL_GRIDS),      // 電子/離子密度 (10^20 m^-3)
    qProfile: new Float32Array(RADIAL_GRIDS)// 安全因子剖面 q(r)
  },

  state: {
    // 監控與 HUD 映射標量
    tempE0: 2.5,
    tempI0: 1.8,
    density0: 1.2,
    magField: 6.0,
    plasmaCurrent: 1.2,

    heatECRH: 10.0, // MW (沉積於 core rho < 0.3)
    heatNBI: 10.0,  // MW (沉積於 mid-core rho < 0.6)

    q95: 3.5,
    betaN: 1.2,
    shafranovShift: 0.08,
    greenwaldRatio: 0.35,
    pFusion: 0.0,
    qGain: 0.0,
    isHMode: false,
    elmBurst: false,

    // MHD 撕裂模與磁島動態 (Rutherford Equation)
    magneticIslandWidth: 0.0, // 歸一化磁島寬度 w/a
    kinkDistortion: 0.0,
    kinkTimer: 0.0,
    failingCoilIndex: -1,

    // ETB 與 ELM 週期性崩塌積分器
    pedestalPressure: 0.0,
    elmTimer: 0.0,

    // 第一壁材料完整度
    maxIntegrity: 100.0,
    integrity: 100.0,
    gameOver: false
  },

  initProfiles() {
    const dr = 1.0 / (RADIAL_GRIDS - 1);
    for (let i = 0; i < RADIAL_GRIDS; i++) {
      const r = i * dr;
      this.grid.rho[i] = r;
      // 初始拋物線自洽分佈
      this.grid.Te[i] = Math.max((this.state.tempE0 - 0.1) * Math.pow(1 - r * r, 1.5) + 0.1, 0.1);
      this.grid.Ti[i] = Math.max((this.state.tempI0 - 0.1) * Math.pow(1 - r * r, 1.5) + 0.1, 0.1);
      this.grid.n[i] = Math.max((this.state.density0 - 0.15) * Math.pow(1 - r * r, 1.0) + 0.15, 0.15);
      // 單調遞增 q 剖面 (q0 ~ 1.05, q95 ~ 3.5)
      this.grid.qProfile[i] = 1.05 + 2.5 * Math.pow(r, 2);
    }
  },

  // 1D 徑向有限差分輸運方程求解器 (∂T/∂t = 1/r ∂/∂r (r χ ∂T/∂r) + Sources - Losses)
  solve1DTransport(dt) {
    const g = this.grid;
    const s = this.state;
    const geo = TOKAMAK_GEO;
    const N = RADIAL_GRIDS;
    const dr = 1.0 / (N - 1);

    // 1. 判斷 H-Mode 門檻與邊緣輸運壘 (ETB)
    const pTotalHeat = s.heatECRH + s.heatNBI + s.pFusion * 0.2;
    const pThresholdH = 0.0488 * Math.pow(s.density0, 0.717) * Math.pow(s.magField, 0.8) * Math.pow(geo.R0, 1.0);
    s.isHMode = pTotalHeat > pThresholdH;

    // 基礎輸運係數 chi (m^2/s)
    const chi_core = s.isHMode ? 0.45 : 0.95;
    const chi_edge = s.isHMode ? 0.08 : 1.60; // H-Mode 邊緣形成極低擴散的 ETB 輸送壘

    let totalFusionPower_W = 0;
    let volIntegralTe = 0, volIntegralTi = 0, volIntegralN = 0;
    const E_fus_J = 17.6 * 1.60218e-13;

    // 臨時緩衝導數數組
    const dTe = new Float32Array(N);
    const dTi = new Float32Array(N);
    const dn = new Float32Array(N);

    // 2. 遍歷網格節點計算徑向流 (Flux) 與源項
    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      const Te = g.Te[i];
      const Ti = g.Ti[i];
      const n_20 = g.n[i];
      const n_SI = n_20 * 1e20;

      // 局部輸運擴散率 χ(r)
      const chi = (r > 0.8) ? chi_edge : chi_core;

      // (A) 聚變反應源項 (Bosch-Hale)
      const sigV = getBoschHaleSigmaV(Ti);
      const dVol = 4.0 * Math.PI * Math.PI * geo.R0 * Math.pow(geo.a, 2) * geo.kappa * (r === 0 ? 0.25 * dr : r) * dr;
      const pFus_density = 0.25 * Math.pow(n_SI, 2) * sigV * E_fus_J; // W/m^3
      const pAlpha_local_MW_m3 = (pFus_density * 0.2) / 1e6;
      totalFusionPower_W += pFus_density * dVol;

      // (B) 輔助加熱沉積剖面 (高斯分佈)
      const pECRH_local = (s.heatECRH / geo.volume) * 2.8 * Math.exp(-Math.pow(r / 0.25, 2)); // ECRH 沉積於核心
      const pNBI_local = (s.heatNBI / geo.volume) * 2.1 * Math.exp(-Math.pow(r / 0.55, 2));  // NBI 沉積於離子

      // (C) 輻射損失：軔致輻射 + 雜質線輻射 (Z_eff) + 同步輻射
      const pBrem_local = 5.35e-3 * geo.Z_eff * Math.pow(n_20, 2) * Math.sqrt(Math.max(Te, 0.05));
      const pImpurity_local = 1.2e-2 * (geo.impurityFrac * geo.Z_eff) * Math.pow(n_20, 2) / (Math.sqrt(Te) + 0.1);
      const pSync_local = 6.2e-4 * Math.sqrt(n_20) * Math.pow(s.magField, 2.5) * Math.pow(Te, 2);
      const pRad_total = pBrem_local + pImpurity_local + (r < 0.4 ? pSync_local : 0);

      // (D) 庫侖碰撞能量交換 (Equipartition)
      const tau_ei = Math.max(0.12 * Math.pow(Te, 1.5) / Math.max(n_20, 0.1), 0.005);
      const q_ei = 1.5 * n_SI * 1.60218e-16 * ((Te - Ti) / tau_ei) / 1e6; // MW/m^3

      // (E) 徑向熱傳導擴散 (1/r ∂/∂r (r χ ∂T/∂r))
      let diffTe = 0, diffTi = 0, diffN = 0;
      if (i > 0 && i < N - 1) {
        const r_plus = r + 0.5 * dr;
        const r_minus = r - 0.5 * dr;
        const gradTe_plus = (g.Te[i + 1] - g.Te[i]) / dr;
        const gradTe_minus = (g.Te[i] - g.Te[i - 1]) / dr;
        diffTe = (chi / Math.max(r, 0.01)) * ((r_plus * gradTe_plus - r_minus * gradTe_minus) / dr);

        const gradTi_plus = (g.Ti[i + 1] - g.Ti[i]) / dr;
        const gradTi_minus = (g.Ti[i] - g.Ti[i - 1]) / dr;
        diffTi = (chi / Math.max(r, 0.01)) * ((r_plus * gradTi_plus - r_minus * gradTi_minus) / dr);

        const gradN_plus = (g.n[i + 1] - g.n[i]) / dr;
        const gradN_minus = (g.n[i] - g.n[i - 1]) / dr;
        diffN = (0.35 * chi / Math.max(r, 0.01)) * ((r_plus * gradN_plus - r_minus * gradN_minus) / dr);
      }

      // (F) 熱容與節點導數合成 (3/2 n ∂T/∂t)
      const heatCap = Math.max(1.5 * n_SI * 1.60218e-16 / 1e6, 0.01);
      dTe[i] = diffTe + (pECRH_local + 0.5 * pAlpha_local_MW_m3 - pRad_total - q_ei) / heatCap;
      dTi[i] = diffTi + (pNBI_local + 0.5 * pAlpha_local_MW_m3 + q_ei) / heatCap;
      dn[i] = diffN - 0.02 * n_20; // 邊界粒子抽吸損失

      // 體積加權統計
      const weight = 2.0 * r * dr;
      volIntegralTe += Te * weight;
      volIntegralTi += Ti * weight;
      volIntegralN += n_20 * weight;
    }

    // 3. 邊界條件與有限步進更新
    for (let i = 0; i < N; i++) {
      if (i === 0) {
        // 磁軸對稱邊界條件 ∂T/∂r = 0
        g.Te[0] = g.Te[1];
        g.Ti[0] = g.Ti[1];
        g.n[0] = g.n[1];
      } else if (i === N - 1) {
        // 刮削層 (SOL) 邊緣固定低溫邊界
        g.Te[N - 1] = 0.08;
        g.Ti[N - 1] = 0.08;
        g.n[N - 1] = 0.12;
      } else {
        g.Te[i] = Math.max(g.Te[i] + dTe[i] * dt, 0.08);
        g.Ti[i] = Math.max(g.Ti[i] + dTi[i] * dt, 0.08);
        g.n[i] = Math.max(g.n[i] + dn[i] * dt, 0.12);
      }
    }

    // 4. 更新標量狀態與安全因子剖面 q(r)
    s.tempE0 = g.Te[0];
    s.tempI0 = g.Ti[0];
    s.density0 = g.n[0];
    s.pFusion = totalFusionPower_W / 1e6;
    const pTotalIn = s.heatECRH + s.heatNBI;
    s.qGain = pTotalIn > 0 ? (s.pFusion / pTotalIn) : 0;

    // 更新 q(r) 剖面 (依據等離子體電流 Ip 與電導率)
    const shapeFactor = (1 + Math.pow(geo.kappa, 2)) / 2.0;
    s.q95 = (5.0 * Math.pow(geo.a, 2) * s.magField / (geo.R0 * s.plasmaCurrent)) * shapeFactor;
    for (let i = 0; i < N; i++) {
      g.qProfile[i] = 1.05 + (s.q95 - 1.05) * Math.pow(g.rho[i], 2);
    }

    // Greenwald 密度極限比
    const n_G = s.plasmaCurrent / (Math.PI * Math.pow(geo.a, 2));
    s.greenwaldRatio = volIntegralN / n_G;

    // Troyon 歸一化 Beta_N
    const pAvg_Pa = (volIntegralN * 1e20) * ((volIntegralTe + volIntegralTi) * 1e3 * 1.60218e-19);
    const bPressure_Pa = Math.pow(s.magField, 2) / (2 * 4 * Math.PI * 1e-7);
    const beta_t_percent = (pAvg_Pa / bPressure_Pa) * 100.0;
    s.betaN = beta_t_percent * (geo.a * s.magField / s.plasmaCurrent);

    const beta_p = beta_t_percent * Math.pow(s.q95, 2);
    s.shafranovShift = (Math.pow(geo.a, 2) / (2 * geo.R0)) * Math.min(beta_p * 0.1 + 0.5, 2.5);

    // 5. 自洽 ETB 邊緣局域模 (Type-I ELM) 週期性崩塌
    s.pedestalPressure = g.n[N - 3] * (g.Te[N - 3] + g.Ti[N - 3]);
    s.elmBurst = false;
    if (s.isHMode) {
      s.elmTimer += dt;
      // 當邊緣壓力梯度超過臨界 Peeling-Ballooning 閾值時觸發自洽弛豫
      if (s.pedestalPressure > 4.2 && s.elmTimer > 0.35) {
        s.elmBurst = true;
        s.elmTimer = 0;
        // 邊緣輸運壘崩塌：快速釋放邊緣粒子與能量
        for (let i = N - 6; i < N; i++) {
          g.Te[i] *= 0.65;
          g.Ti[i] *= 0.65;
          g.n[i] *= 0.70;
        }
      }
    } else {
      s.elmTimer = 0;
    }

    // 6. Rutherford 磁島寬度演化方程 (MHD 撕裂模)
    // dw/dt = η/μ0 [ Δ' + r_s * β_p / w ]
    const qResonanceMismatch = Math.abs(g.qProfile[Math.floor(N * 0.7)] - 2.0);
    const deltaPrime = (s.q95 < 2.0 || s.betaN > 2.8) ? (2.8 - s.q95) * 4.0 : -2.0;
    const dw_dt = 0.15 * (deltaPrime + (s.betaN * 0.8) / Math.max(s.magneticIslandWidth, 0.05));
    s.magneticIslandWidth = Math.max(0, Math.min(s.magneticIslandWidth + dw_dt * dt, 1.2));
    s.kinkDistortion = s.magneticIslandWidth;

    if (s.magneticIslandWidth > 0.65 && s.failingCoilIndex === -1) {
      s.failingCoilIndex = Math.floor(Math.random() * COILS_COUNT);
    }
  },

  update(dt) {
    if (this.state.gameOver) return;

    // 子循環保證數值擴散穩定性 (CFL 條件)
    const subSteps = 4;
    const subDt = dt / subSteps;
    for (let step = 0; step < subSteps; step++) {
      this.solve1DTransport(subDt);
    }

    const s = this.state;

    // 第一壁累積熱疲勞與破裂判定
    let activeDamage = 0;
    if (s.kinkDistortion > 0.3) activeDamage += s.kinkDistortion * 22.0;
    if (s.elmBurst) activeDamage += 9.5;
    if (s.tempE0 > 24.0 || s.tempI0 > 24.0) activeDamage += (Math.max(s.tempE0, s.tempI0) - 24.0) * 4.0;
    if (s.greenwaldRatio > 1.0) activeDamage += (s.greenwaldRatio - 1.0) * 35.0; // 輻射坍縮劇烈熱衝擊

    if (activeDamage > 0) {
      const deltaDmg = activeDamage * dt;
      s.integrity = Math.max(s.integrity - deltaDmg, 0);
      s.maxIntegrity = Math.max(s.maxIntegrity - deltaDmg * 0.10, 0);
      s.integrity = Math.min(s.integrity, s.maxIntegrity);
      if (s.integrity <= 0) {
        s.gameOver = true;
      }
    } else {
      s.integrity = Math.min(s.integrity + 1.2 * dt, s.maxIntegrity);
    }
  },

  // 燃料顆粒注入 (Pellet Injection)：帶有高斯沉積剖面與自洽蒸發吸熱冷卻效應
  injectPellet() {
    const g = this.grid;
    const N = RADIAL_GRIDS;
    // 燃料沉積中心 rho ~ 0.4 (穿透深度)
    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      const deposition = 0.55 * Math.exp(-Math.pow((r - 0.4) / 0.18, 2));
      g.n[i] = Math.min(g.n[i] + deposition, 3.8);
      // 顆粒電離蒸發自洽消耗熱能 (局部溫度驟降冷卻)
      g.Te[i] = Math.max(g.Te[i] * (1.0 - deposition * 0.28), 0.15);
      g.Ti[i] = Math.max(g.Ti[i] * (1.0 - deposition * 0.25), 0.15);
    }
  },

  // 偏濾器排熱
  purgeDivertor() {
    const g = this.grid;
    for (let i = 0; i < RADIAL_GRIDS; i++) {
      g.Te[i] = Math.max(g.Te[i] * 0.75, 0.1);
      g.Ti[i] = Math.max(g.Ti[i] * 0.75, 0.1);
    }
  },

  // 線圈修復與磁島抑制
  repairCoil(index) {
    if (this.state.failingCoilIndex === index) {
      this.state.failingCoilIndex = -1;
      this.state.magneticIslandWidth *= 0.2; // 修復線圈後迅速壓制磁島
    }
  },

  // 接收自訂 3D 打印 STL 幾何參數
  applyCoreGeometryModifiers(triangleCount, aspectRatio, maxDim) {
    const complexityFactor = Math.min(Math.max(triangleCount / 5000, 0.5), 2.5);
    TOKAMAK_GEO.impurityFrac = 0.025 * Math.sqrt(complexityFactor); // 複雜結構增加壁面雜質脫附
    if (window.AudioSys) AudioSys.playTone(520, 'triangle', 0.25, 0.08);
  }
};

// 模組初始化剖面
FusionPhysics.initProfiles();

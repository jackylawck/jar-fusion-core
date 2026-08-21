// =========================================================================
// J.A.R. 聚變核心 3D - 1.5D 平衡/輸運/MHD 耦合求解器 (physics.js v5.0 Master)
// 特性：
// 1. Crank-Nicolson 半隱式 + Thomas Algorithm (三對角求解) 1D 徑向輸運
// 2. Rutherford 磁島拓撲平坦化與 q(r) 自洽耦合 (q=2 共振面磁島)
// 3. 自洽 ETB 重建時間常數 (Pedestal Sawtooth Dynamics)
// 4. 高拉長比垂直位移不穩定性 (Vertical Displacement Event, VDE)
// =========================================================================

const COILS_COUNT = 10;
const RADIAL_GRIDS = 21; // 徑向網格節點數 rho ∈ [0, 1]

const TOKAMAK_GEO = {
  R0: 1.85,      // 大半徑 (m)
  a: 0.57,       // 小半徑 (m)
  kappa: 1.75,   // 伸長率
  delta: 0.35,   // 三角形形變度
  volume: 20.5,  // 真空室等效體積 (m^3)
  Z_eff: 1.65,   // 雜質有效電荷數
  impurityFrac: 0.025
};

// 1. Bosch-Hale (1992) 反應截面參數化
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

// 2. 三對角矩陣追趕法求解器 (Thomas Algorithm) - O(N) 複雜度
function solveTridiagonal(A, B, C, D, N) {
  const cPrime = new Float32Array(N);
  const dPrime = new Float32Array(N);
  const X = new Float32Array(N);

  cPrime[0] = C[0] / B[0];
  dPrime[0] = D[0] / B[0];

  for (let i = 1; i < N; i++) {
    const denom = B[i] - A[i] * cPrime[i - 1];
    cPrime[i] = C[i] / denom;
    dPrime[i] = (D[i] - A[i] * dPrime[i - 1]) / denom;
  }

  X[N - 1] = dPrime[N - 1];
  for (let i = N - 2; i >= 0; i--) {
    X[i] = dPrime[i] - cPrime[i] * X[i + 1];
  }
  return X;
}

const FusionPhysics = {
  grid: {
    rho: new Float32Array(RADIAL_GRIDS),
    Te: new Float32Array(RADIAL_GRIDS),
    Ti: new Float32Array(RADIAL_GRIDS),
    n: new Float32Array(RADIAL_GRIDS),
    qProfile: new Float32Array(RADIAL_GRIDS)
  },

  state: {
    tempE0: 2.5,
    tempI0: 1.8,
    density0: 1.2,
    magField: 6.0,
    plasmaCurrent: 1.2,

    heatECRH: 10.0,
    heatNBI: 10.0,

    q95: 3.5,
    betaN: 1.2,
    shafranovShift: 0.08,
    greenwaldRatio: 0.35,
    pFusion: 0.0,
    qGain: 0.0,
    isHMode: false,
    elmBurst: false,

    // MHD 撕裂模與磁島拓撲
    magneticIslandWidth: 0.0,
    kinkDistortion: 0.0,
    failingCoilIndex: -1,

    // ETB 與 ELM 週期性重建動力學
    pedestalPressure: 0.0,
    pedestalRecoveryFactor: 1.0,

    // 垂直位移不穩定性 (VDE)
    deltaZ: 0.0,          // 垂直軸向位移 (m)
    vdeGrowthRate: 0.0,   // 垂直增長率 (s^-1)

    maxIntegrity: 100.0,
    integrity: 100.0,
    gameOver: false
  },

  initProfiles() {
    const dr = 1.0 / (RADIAL_GRIDS - 1);
    for (let i = 0; i < RADIAL_GRIDS; i++) {
      const r = i * dr;
      this.grid.rho[i] = r;
      this.grid.Te[i] = Math.max((this.state.tempE0 - 0.1) * Math.pow(1 - r * r, 1.5) + 0.1, 0.1);
      this.grid.Ti[i] = Math.max((this.state.tempI0 - 0.1) * Math.pow(1 - r * r, 1.5) + 0.1, 0.1);
      this.grid.n[i] = Math.max((this.state.density0 - 0.15) * Math.pow(1 - r * r, 1.0) + 0.15, 0.15);
      this.grid.qProfile[i] = 1.05 + (this.state.q95 - 1.05) * Math.pow(r, 2);
    }
  },

  // Crank-Nicolson 半隱式 1D 徑向輸運步進求解
  solve1DTransportCN(dt) {
    const g = this.grid;
    const s = this.state;
    const geo = TOKAMAK_GEO;
    const N = RADIAL_GRIDS;
    const dr = 1.0 / (N - 1);

    // 1. H-Mode 躍遷與邊緣輸運壘 (ETB) 判定
    const pTotalHeat = s.heatECRH + s.heatNBI + s.pFusion * 0.2;
    const pThresholdH = 0.0488 * Math.pow(s.density0, 0.717) * Math.pow(s.magField, 0.8) * Math.pow(geo.R0, 1.0);
    s.isHMode = pTotalHeat > pThresholdH;

    // ETB 崩塌後的指數重建動態 (τ_ped ≈ 25ms)
    if (s.pedestalRecoveryFactor < 1.0) {
      s.pedestalRecoveryFactor = Math.min(1.0, s.pedestalRecoveryFactor + dt / 0.025);
    }

    const chi_core = s.isHMode ? 0.42 : 0.92;
    const chi_edge_nominal = s.isHMode ? 0.06 : 1.55;
    const chi_edge = chi_edge_nominal / Math.max(s.pedestalRecoveryFactor, 0.2);

    let totalFusionPower_W = 0;
    let volIntegralTe = 0, volIntegralTi = 0, volIntegralN = 0;
    const E_fus_J = 17.6 * 1.60218e-13;

    // 構建三對角矩陣 (A: 下對角, B: 主對角, C: 上對角, D: 右側源項向量)
    const A_e = new Float32Array(N), B_e = new Float32Array(N), C_e = new Float32Array(N), D_e = new Float32Array(N);
    const A_i = new Float32Array(N), B_i = new Float32Array(N), C_i = new Float32Array(N), D_i = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      const Te = g.Te[i];
      const Ti = g.Ti[i];
      const n_20 = g.n[i];
      const n_SI = n_20 * 1e20;
      const chi = (r > 0.8) ? chi_edge : chi_core;

      // 聚變源項 (Bosch-Hale)
      const sigV = getBoschHaleSigmaV(Ti);
      const dVol = 4.0 * Math.PI * Math.PI * geo.R0 * Math.pow(geo.a, 2) * geo.kappa * (r === 0 ? 0.25 * dr : r) * dr;
      const pFus_density = 0.25 * Math.pow(n_SI, 2) * sigV * E_fus_J;
      const pAlpha_local = (pFus_density * 0.2) / 1e6;
      totalFusionPower_W += pFus_density * dVol;

      // 輔助加熱沉積
      const pECRH_local = (s.heatECRH / geo.volume) * 2.8 * Math.exp(-Math.pow(r / 0.25, 2));
      const pNBI_local = (s.heatNBI / geo.volume) * 2.1 * Math.exp(-Math.pow(r / 0.55, 2));

      // 輻射項 (軔致輻射 + 雜質輻射 + 同步輻射)
      const pBrem = 5.35e-3 * geo.Z_eff * Math.pow(n_20, 2) * Math.sqrt(Math.max(Te, 0.05));
      const pImpurity = 1.2e-2 * (geo.impurityFrac * geo.Z_eff) * Math.pow(n_20, 2) / (Math.sqrt(Te) + 0.1);
      const pSync = 6.2e-4 * Math.sqrt(n_20) * Math.pow(s.magField, 2.5) * Math.pow(Te, 2);
      const pRad = pBrem + pImpurity + (r < 0.4 ? pSync : 0);

      // 庫侖能量交換
      const tau_ei = Math.max(0.12 * Math.pow(Te, 1.5) / Math.max(n_20, 0.1), 0.005);
      const q_ei = 1.5 * n_SI * 1.60218e-16 * ((Te - Ti) / tau_ei) / 1e6;

      const heatCap = Math.max(1.5 * n_SI * 1.60218e-16 / 1e6, 0.01);
      const alpha = (0.5 * dt * chi) / (dr * dr); // Crank-Nicolson 權重因子

      if (i === 0) {
        // 磁軸對稱邊界條件 ∂T/∂r = 0 (Ghost cell Te[-1] = Te[1])
        B_e[0] = 1.0 + 2.0 * alpha;
        C_e[0] = -2.0 * alpha;
        D_e[0] = Te + (dt / heatCap) * (pECRH_local + 0.5 * pAlpha_local - pRad - q_ei);

        B_i[0] = 1.0 + 2.0 * alpha;
        C_i[0] = -2.0 * alpha;
        D_i[0] = Ti + (dt / heatCap) * (pNBI_local + 0.5 * pAlpha_local + q_ei);
      } else if (i === N - 1) {
        // 邊緣固定低溫邊界 (SOL Dirichlet Boundary)
        B_e[N - 1] = 1.0;
        D_e[N - 1] = 0.08;
        B_i[N - 1] = 1.0;
        D_i[N - 1] = 0.08;
      } else {
        const r_plus = r + 0.5 * dr;
        const r_minus = r - 0.5 * dr;
        const geom_p = (alpha * r_plus) / r;
        const geom_m = (alpha * r_minus) / r;

        A_e[i] = -geom_m;
        B_e[i] = 1.0 + geom_p + geom_m;
        C_e[i] = -geom_p;
        D_e[i] = Te + (dt / heatCap) * (pECRH_local + 0.5 * pAlpha_local - pRad - q_ei);

        A_i[i] = -geom_m;
        B_i[i] = 1.0 + geom_p + geom_m;
        C_i[i] = -geom_p;
        D_i[i] = Ti + (dt / heatCap) * (pNBI_local + 0.5 * pAlpha_local + q_ei);
      }

      const weight = 2.0 * r * dr;
      volIntegralTe += Te * weight;
      volIntegralTi += Ti * weight;
      volIntegralN += n_20 * weight;
    }

    // 2. 半隱式求解溫度剖面
    const nextTe = solveTridiagonal(A_e, B_e, C_e, D_e, N);
    const nextTi = solveTridiagonal(A_i, B_i, C_i, D_i, N);

    for (let i = 0; i < N; i++) {
      g.Te[i] = Math.max(nextTe[i], 0.08);
      g.Ti[i] = Math.max(nextTi[i], 0.08);
      g.n[i] = Math.max(g.n[i] - 0.018 * g.n[i] * dt, 0.12);
    }

    // 3. 狀態標量映射
    s.tempE0 = g.Te[0];
    s.tempI0 = g.Ti[0];
    s.density0 = g.n[0];
    s.pFusion = totalFusionPower_W / 1e6;
    const pTotalIn = s.heatECRH + s.heatNBI;
    s.qGain = pTotalIn > 0 ? (s.pFusion / pTotalIn) : 0;

    // 4. 安全因子 q(r) 演化與磁島自洽平坦化耦合
    const shapeFactor = (1 + Math.pow(geo.kappa, 2)) / 2.0;
    s.q95 = (5.0 * Math.pow(geo.a, 2) * s.magField / (geo.R0 * s.plasmaCurrent)) * shapeFactor;
    
    // 共振面定位 (q = 2.0 所在半徑)
    const r_res = Math.min(Math.max(Math.sqrt(Math.max(2.0 - 1.05, 0) / Math.max(s.q95 - 1.05, 0.1)), 0.1), 0.9);

    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      let baseQ = 1.05 + (s.q95 - 1.05) * Math.pow(r, 2);
      
      // 磁島平坦化效應 (Island-Induced Profile Flattening)
      if (s.magneticIslandWidth > 0.05) {
        const distToRes = Math.abs(r - r_res);
        if (distToRes < s.magneticIslandWidth * 0.5) {
          baseQ = 2.0; // 磁島內部 q 剖面鎖定在 2.0
          g.Te[i] *= (1.0 - 0.25 * (s.magneticIslandWidth - distToRes)); // 磁島熱短路冷卻
        }
      }
      g.qProfile[i] = baseQ;
    }

    // Greenwald 密度極限
    const n_G = s.plasmaCurrent / (Math.PI * Math.pow(geo.a, 2));
    s.greenwaldRatio = volIntegralN / n_G;

    // Troyon 歸一化 Beta_N
    const pAvg_Pa = (volIntegralN * 1e20) * ((volIntegralTe + volIntegralTi) * 1e3 * 1.60218e-19);
    const bPressure_Pa = Math.pow(s.magField, 2) / (2 * 4 * Math.PI * 1e-7);
    const beta_t_percent = (pAvg_Pa / bPressure_Pa) * 100.0;
    s.betaN = beta_t_percent * (geo.a * s.magField / s.plasmaCurrent);

    const beta_p = beta_t_percent * Math.pow(s.q95, 2);
    s.shafranovShift = (Math.pow(geo.a, 2) / (2 * geo.R0)) * Math.min(beta_p * 0.1 + 0.5, 2.5);

    // 5. 自洽 ETB 重建與 Type-I ELM 鋸齒崩塌
    s.pedestalPressure = g.n[N - 3] * (g.Te[N - 3] + g.Ti[N - 3]);
    s.elmBurst = false;
    if (s.isHMode && s.pedestalRecoveryFactor >= 0.95) {
      if (s.pedestalPressure > 4.4) {
        s.elmBurst = true;
        s.pedestalRecoveryFactor = 0.25; // 崩塌邊緣輸送壘
        for (let i = N - 6; i < N; i++) {
          g.Te[i] *= 0.65;
          g.Ti[i] *= 0.65;
          g.n[i] *= 0.70;
        }
      }
    }

    // 6. Rutherford 磁島寬度演化方程
    const deltaPrime = (s.q95 < 2.0 || s.betaN > 2.8) ? (2.8 - s.q95) * 4.5 : -2.2;
    const dw_dt = 0.18 * (deltaPrime + (s.betaN * 0.85) / Math.max(s.magneticIslandWidth, 0.05));
    s.magneticIslandWidth = Math.max(0, Math.min(s.magneticIslandWidth + dw_dt * dt, 1.2));
    s.kinkDistortion = s.magneticIslandWidth;

    if (s.magneticIslandWidth > 0.65 && s.failingCoilIndex === -1) {
      s.failingCoilIndex = Math.floor(Math.random() * COILS_COUNT);
    }

    // 7. 垂直位移不穩定性 (Vertical Displacement Event, VDE)
    // 伸長率越高、beta_p 越大，垂直增長率越強
    const decayIndex = (geo.kappa - 1.0) * 1.8;
    s.vdeGrowthRate = (s.betaN > 2.5 || s.kinkDistortion > 0.4) ? decayIndex * 4.5 : -3.0;
    
    if (s.vdeGrowthRate > 0) {
      s.deltaZ = Math.min(s.deltaZ + 0.02 * Math.exp(s.vdeGrowthRate * dt), 1.2);
    } else {
      s.deltaZ = Math.max(0, s.deltaZ - 1.5 * dt); // 反饋控制迴路回中
    }
  },

  update(dt) {
    if (this.state.gameOver) return;

    // 數值半隱式求解 1D 輸運
    this.solve1DTransportCN(dt);
    const s = this.state;

    // 第一壁累積熱疲勞與破裂判定
    let activeDamage = 0;
    if (s.kinkDistortion > 0.3) activeDamage += s.kinkDistortion * 22.0;
    if (s.elmBurst) activeDamage += 9.5;
    if (s.deltaZ > 0.35) activeDamage += s.deltaZ * 45.0; // VDE 垂直撞擊第一壁頂底
    if (s.tempE0 > 24.0 || s.tempI0 > 24.0) activeDamage += (Math.max(s.tempE0, s.tempI0) - 24.0) * 4.0;
    if (s.greenwaldRatio > 1.0) activeDamage += (s.greenwaldRatio - 1.0) * 35.0;

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

  injectPellet() {
    const g = this.grid;
    const N = RADIAL_GRIDS;
    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      const deposition = 0.55 * Math.exp(-Math.pow((r - 0.4) / 0.18, 2));
      g.n[i] = Math.min(g.n[i] + deposition, 3.8);
      g.Te[i] = Math.max(g.Te[i] * (1.0 - deposition * 0.28), 0.15);
      g.Ti[i] = Math.max(g.Ti[i] * (1.0 - deposition * 0.25), 0.15);
    }
  },

  purgeDivertor() {
    const g = this.grid;
    for (let i = 0; i < RADIAL_GRIDS; i++) {
      g.Te[i] = Math.max(g.Te[i] * 0.75, 0.1);
      g.Ti[i] = Math.max(g.Ti[i] * 0.75, 0.1);
    }
  },

  repairCoil(index) {
    if (this.state.failingCoilIndex === index) {
      this.state.failingCoilIndex = -1;
      this.state.magneticIslandWidth *= 0.2;
    }
  },

  applyCoreGeometryModifiers(triangleCount, aspectRatio, maxDim) {
    const complexityFactor = Math.min(Math.max(triangleCount / 5000, 0.5), 2.5);
    TOKAMAK_GEO.impurityFrac = 0.025 * Math.sqrt(complexityFactor);
    if (window.AudioSys) AudioSys.playTone(520, 'triangle', 0.25, 0.08);
  }
};

FusionPhysics.initProfiles();

// =========================================================================
// J.A.R. 聚變核心 3D - 1.5D 數位孿生與 ITER 級物理整合引擎 (physics.js v8.1 Stable)
// 特性：
// 1. 25 節點擴展網格 (含 1D SOL 刮削層: rho ∈ [0, 1.15])
// 2. 修復體積積分權重與自加熱正反饋熱失控 (防開局直接 Disruption)
// 3. Eich 標度律高場漸近飽和模型與偏濾器靶板熱流通量物理邊界
// 4. 線性化狀態空間解耦自適應 VDE 控制器 (ζ = 0.707)
// 5. 雙向幾何-MHD 閉環 (δZ → r_res → s(r) → Δ')
// =========================================================================

const COILS_COUNT = 10;
const RADIAL_GRIDS = 25; // 0..20: 核心區 (rho ∈ [0, 1.0]), 21..24: 1D SOL (rho ∈ (1.0, 1.15])
const CORE_GRIDS = 21;

const TOKAMAK_GEO = {
  R0: 1.85,          // 大半徑 (m)
  a: 0.57,           // 小半徑 (m)
  kappa: 1.75,       // 伸長率
  delta: 0.35,       // 三角形形變度
  volume: 20.5,      // 真空室等效體積 (m^3)
  Z_eff: 1.65,       // 雜質有效電荷數
  impurityFrac: 0.025,
  sheathGamma: 7.0,  // 偏濾器鞘層熱傳輸係數
  tauWall: 0.015     // 導電壁渦流時間常數 (s)
};

// Bosch-Hale (1992) 反應截面參數化
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

// 三對角矩陣追趕法求解器 (Thomas Algorithm)
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
    qProfile: new Float32Array(RADIAL_GRIDS),
    magneticShear: new Float32Array(RADIAL_GRIDS)
  },

  vdeController: {
    Kp: 28.0,
    Kd: 7.5,
    lastDeltaZ: 0.0,
    maxControlVolt: 55.0,

    tuneLinearizedGains(rawGammaZ, Ip_MA) {
      const lambda_unstable = Math.max(rawGammaZ, 1.5);
      const lambda_wall = 1.0 / TOKAMAK_GEO.tauWall;
      const omega_c = Math.max(lambda_unstable * 2.2, 16.0);
      const zeta = 0.707;

      const inertiaFactor = 1.0 / Math.max(Ip_MA, 0.4);
      this.Kp = Math.min(Math.max((Math.pow(omega_c, 2) + lambda_unstable * lambda_wall) * inertiaFactor * 0.15, 14.0), 80.0);
      this.Kd = Math.min(Math.max((2 * zeta * omega_c + lambda_wall - lambda_unstable) * inertiaFactor * 0.18, 4.0), 22.0);
    }
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

    magneticIslandWidth: 0.0,
    kinkDistortion: 0.0,
    failingCoilIndex: -1,
    resRadius: 0.65,

    pedestalPressure: 0.0,
    pedestalRecoveryFactor: 1.0,

    lambdaQ_mm: 2.5,
    peakDivertorHeatFlux_MW_m2: 0.0,

    deltaZ: 0.0,
    vdeGrowthRate: 0.0,
    vdeFeedbackForce: 0.0,

    stlTurbulenceMod: 1.0,

    maxIntegrity: 100.0,
    integrity: 100.0,
    gameOver: false
  },

  initProfiles() {
    const drCore = 1.0 / (CORE_GRIDS - 1);
    for (let i = 0; i < RADIAL_GRIDS; i++) {
      if (i < CORE_GRIDS) {
        const r = i * drCore;
        this.grid.rho[i] = r;
        this.grid.Te[i] = Math.max((this.state.tempE0 - 0.08) * Math.pow(1 - r * r, 1.5) + 0.08, 0.08);
        this.grid.Ti[i] = Math.max((this.state.tempI0 - 0.08) * Math.pow(1 - r * r, 1.5) + 0.08, 0.08);
        this.grid.n[i] = Math.max((this.state.density0 - 0.12) * Math.pow(1 - r * r, 1.0) + 0.12, 0.12);
        this.grid.qProfile[i] = 1.05 + (this.state.q95 - 1.05) * Math.pow(r, 2);
        this.grid.magneticShear[i] = (2.0 * (this.state.q95 - 1.05) * Math.pow(r, 2)) / this.grid.qProfile[i];
      } else {
        const solOffset = (i - (CORE_GRIDS - 1)) * 0.0375;
        const r = 1.0 + solOffset;
        this.grid.rho[i] = r;
        const decay = Math.exp(-solOffset / 0.03);
        this.grid.Te[i] = Math.max(0.08 * decay, 0.015);
        this.grid.Ti[i] = Math.max(0.08 * decay, 0.015);
        this.grid.n[i] = Math.max(0.12 * decay, 0.02);
        this.grid.qProfile[i] = this.state.q95 + 4.0 * Math.pow(solOffset, 1.5);
        this.grid.magneticShear[i] = 3.5;
      }
    }
  },

  solve1DTransportCN(dt) {
    const g = this.grid;
    const s = this.state;
    const geo = TOKAMAK_GEO;
    const N = RADIAL_GRIDS;
    const dr = 1.0 / (CORE_GRIDS - 1);

    // 1. H-Mode 躍遷判定
    const pTotalHeat = s.heatECRH + s.heatNBI + s.pFusion * 0.2;
    const pThresholdH = 0.0488 * Math.pow(s.density0, 0.717) * Math.pow(s.magField, 0.8) * Math.pow(geo.R0, 1.0);
    s.isHMode = pTotalHeat > pThresholdH;

    if (s.pedestalRecoveryFactor < 1.0) {
      s.pedestalRecoveryFactor = Math.min(1.0, s.pedestalRecoveryFactor + dt / 0.025);
    }

    const turbMod = s.stlTurbulenceMod;
    const chi_core = (s.isHMode ? 0.42 : 0.92) * turbMod;
    const chi_edge_nominal = (s.isHMode ? 0.06 : 1.55) * turbMod;
    const chi_edge = chi_edge_nominal / Math.max(s.pedestalRecoveryFactor, 0.2);
    const chi_sol = 2.4 * turbMod;

    // 2. Eich 標度律與偏濾器靶板熱流通量物理箝位
    const pSol_MW = Math.max(Math.min(pTotalHeat * 0.45, 80.0), 0.5);
    const bEff = Math.min(Math.max(s.magField, 1.2), 6.5);
    s.lambdaQ_mm = 0.63 * Math.pow(bEff, -0.77) * Math.pow(pSol_MW, 0.09) * 1e3;

    const divertorWettedArea = 2.0 * Math.PI * (geo.R0 + geo.a * 0.8) * Math.max(s.lambdaQ_mm * 1e-3, 0.002) * 1.5;
    s.peakDivertorHeatFlux_MW_m2 = (pSol_MW * 0.7) / Math.max(divertorWettedArea, 0.5);

    let totalFusionPower_W = 0;
    let volIntegralTe = 0, volIntegralTi = 0, volIntegralN = 0;
    const E_fus_J = 17.6 * 1.60218e-13;

    const A_e = new Float32Array(N), B_e = new Float32Array(N), C_e = new Float32Array(N), D_e = new Float32Array(N);
    const A_i = new Float32Array(N), B_i = new Float32Array(N), C_i = new Float32Array(N), D_i = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const r = g.rho[i];
      const Te = g.Te[i];
      const Ti = g.Ti[i];
      const n_20 = g.n[i];
      const n_SI = n_20 * 1e20;

      let chi = chi_core;
      if (i >= CORE_GRIDS) chi = chi_sol;
      else if (r > 0.8) chi = chi_edge;

      let pAlpha_local = 0;
      if (i < CORE_GRIDS) {
        const sigV = getBoschHaleSigmaV(Ti);
        // 修正微分幾何殼體積計算
        const dVol = 4.0 * Math.PI * Math.PI * geo.R0 * Math.pow(geo.a, 2) * geo.kappa * (r === 0 ? 0.25 * dr : r) * dr;
        const pFus_density = 0.25 * Math.pow(n_SI, 2) * sigV * E_fus_J; // W/m^3
        
        // 單點 Alpha 能量限制，徹底消除數值正反饋爆炸
        pAlpha_local = Math.min((pFus_density * 0.2) / 1e6, 50.0); // MW/m^3
        totalFusionPower_W += pFus_density * dVol;
      }

      const pECRH_local = (i < CORE_GRIDS) ? (s.heatECRH / geo.volume) * 2.8 * Math.exp(-Math.pow(r / 0.25, 2)) : 0;
      const pNBI_local = (i < CORE_GRIDS) ? (s.heatNBI / geo.volume) * 2.1 * Math.exp(-Math.pow(r / 0.55, 2)) : 0;

      const pBrem = 5.35e-3 * geo.Z_eff * Math.pow(n_20, 2) * Math.sqrt(Math.max(Te, 0.01));
      const pImpurity = 1.2e-2 * (geo.impurityFrac * geo.Z_eff) * Math.pow(n_20, 2) / (Math.sqrt(Math.max(Te, 0.01)) + 0.1);
      const pSync = 6.2e-4 * Math.sqrt(n_20) * Math.pow(s.magField, 2.5) * Math.pow(Te, 2);
      const pRad = pBrem + pImpurity + (r < 0.4 ? pSync : 0);

      let pSolLoss = 0;
      if (i >= CORE_GRIDS) {
        const c_s = 9.79e3 * Math.sqrt(Math.max(Te, 0.01) * 1e3);
        pSolLoss = (geo.sheathGamma * n_SI * 1.60218e-19 * (Te * 1e3) * c_s) / (Math.PI * geo.R0 * 1e6);
      }

      const tau_ei = Math.max(0.12 * Math.pow(Math.max(Te, 0.01), 1.5) / Math.max(n_20, 0.05), 0.005);
      const q_ei = 1.5 * n_SI * 1.60218e-16 * ((Te - Ti) / tau_ei) / 1e6;

      const heatCap = Math.max(1.5 * n_SI * 1.60218e-16 / 1e6, 0.005);
      const alpha = (0.5 * dt * chi) / (dr * dr);

      if (i === 0) {
        B_e[0] = 1.0 + 2.0 * alpha;
        C_e[0] = -2.0 * alpha;
        D_e[0] = Te + (dt / heatCap) * (pECRH_local + 0.5 * pAlpha_local - pRad - q_ei);

        B_i[0] = 1.0 + 2.0 * alpha;
        C_i[0] = -2.0 * alpha;
        D_i[0] = Ti + (dt / heatCap) * (pNBI_local + 0.5 * pAlpha_local + q_ei);
      } else if (i === N - 1) {
        B_e[N - 1] = 1.0 + alpha;
        A_e[N - 1] = -alpha;
        D_e[N - 1] = Math.max(Te - (dt / heatCap) * pSolLoss, 0.015);

        B_i[N - 1] = 1.0 + alpha;
        A_i[N - 1] = -alpha;
        D_i[N - 1] = Math.max(Ti - (dt / heatCap) * pSolLoss, 0.015);
      } else {
        const r_plus = r + 0.5 * dr;
        const r_minus = r - 0.5 * dr;
        const geom_p = (alpha * r_plus) / r;
        const geom_m = (alpha * r_minus) / r;

        A_e[i] = -geom_m;
        B_e[i] = 1.0 + geom_p + geom_m;
        C_e[i] = -geom_p;
        D_e[i] = Te + (dt / heatCap) * (pECRH_local + 0.5 * pAlpha_local - pRad - pSolLoss - q_ei);

        A_i[i] = -geom_m;
        B_i[i] = 1.0 + geom_p + geom_m;
        C_i[i] = -geom_p;
        D_i[i] = Ti + (dt / heatCap) * (pNBI_local + 0.5 * pAlpha_local - pSolLoss + q_ei);
      }

      if (i < CORE_GRIDS) {
        const weight = 2.0 * r * dr;
        volIntegralTe += Te * weight;
        volIntegralTi += Ti * weight;
        volIntegralN += n_20 * weight;
      }
    }

    const nextTe = solveTridiagonal(A_e, B_e, C_e, D_e, N);
    const nextTi = solveTridiagonal(A_i, B_i, C_i, D_i, N);

    for (let i = 0; i < N; i++) {
      g.Te[i] = Math.min(Math.max(nextTe[i], 0.015), 60.0); // 溫度箝位在物理合理區間 (≤ 60 keV)
      g.Ti[i] = Math.min(Math.max(nextTi[i], 0.015), 60.0);
      const solDecay = (i >= CORE_GRIDS) ? 0.08 : 0.018;
      g.n[i] = Math.max(g.n[i] - solDecay * g.n[i] * dt, 0.02);
    }

    s.tempE0 = g.Te[0];
    s.tempI0 = g.Ti[0];
    s.density0 = g.n[0];
    s.pFusion = totalFusionPower_W / 1e6;
    const pTotalIn = s.heatECRH + s.heatNBI;
    s.qGain = pTotalIn > 0 ? (s.pFusion / pTotalIn) : 0;

    // 3. 幾何-MHD 閉環：δZ 偏移共振面
    const shapeFactor = (1 + Math.pow(geo.kappa, 2)) / 2.0;
    s.q95 = (5.0 * Math.pow(geo.a, 2) * s.magField / (geo.R0 * s.plasmaCurrent)) * shapeFactor;

    const nominal_r_res = Math.sqrt(Math.max(2.0 - 1.05, 0) / Math.max(s.q95 - 1.05, 0.1));
    s.resRadius = Math.min(Math.max(nominal_r_res + (s.deltaZ * 0.25), 0.15), 0.92);

    let resIndex = Math.floor(CORE_GRIDS * s.resRadius);
    for (let i = 1; i < CORE_GRIDS - 1; i++) {
      const r = g.rho[i];
      let baseQ = 1.05 + (s.q95 - 1.05) * Math.pow(r, 2);

      if (s.magneticIslandWidth > 0.04) {
        const dist = Math.abs(r - s.resRadius);
        if (dist < s.magneticIslandWidth * 0.5) {
          baseQ = 2.0;
          g.Te[i] *= (1.0 - 0.28 * (s.magneticIslandWidth - dist));
        }
      }
      g.qProfile[i] = baseQ;

      const dq_dr = (g.qProfile[i + 1] - g.qProfile[i - 1]) / (2 * dr);
      g.magneticShear[i] = (r / Math.max(g.qProfile[i], 0.5)) * dq_dr;
      if (Math.abs(r - s.resRadius) < dr) resIndex = i;
    }

    const shear_res = Math.max(g.magneticShear[resIndex], 0.08);
    const gradP_res = (g.n[resIndex + 1] * g.Te[resIndex + 1] - g.n[resIndex - 1] * g.Te[resIndex - 1]) / (2 * dr);
    const vdeDestabilization = Math.pow(s.deltaZ / 0.4, 2) * 3.5;

    const deltaPrime = -4.0 / Math.max(s.resRadius, 0.2) + Math.abs(gradP_res) / (shear_res * 1.4) + vdeDestabilization + (s.q95 < 2.0 ? 6.0 : 0.0);

    const dw_dt = 0.16 * (deltaPrime + (s.betaN * 0.9) / Math.max(s.magneticIslandWidth, 0.04));
    s.magneticIslandWidth = Math.max(0, Math.min(s.magneticIslandWidth + dw_dt * dt, 1.25));
    s.kinkDistortion = s.magneticIslandWidth;

    if (s.magneticIslandWidth > 0.65 && s.failingCoilIndex === -1) {
      s.failingCoilIndex = Math.floor(Math.random() * COILS_COUNT);
    }

    // 4. ETB 邊緣局域模 (Type-I ELM) 鋸齒崩塌
    s.pedestalPressure = g.n[CORE_GRIDS - 3] * (g.Te[CORE_GRIDS - 3] + g.Ti[CORE_GRIDS - 3]);
    s.elmBurst = false;
    if (s.isHMode && s.pedestalRecoveryFactor >= 0.95) {
      if (s.pedestalPressure > 4.4) {
        s.elmBurst = true;
        s.pedestalRecoveryFactor = 0.25;
        for (let i = CORE_GRIDS - 6; i < CORE_GRIDS; i++) {
          g.Te[i] *= 0.65;
          g.Ti[i] *= 0.65;
          g.n[i] *= 0.70;
        }
      }
    }

    // 5. 線性化狀態空間解耦 VDE 主動控制
    const decayIndex = (geo.kappa - 1.0) * 1.8;
    const rawGrowth = (s.betaN > 2.5 || s.kinkDistortion > 0.4) ? decayIndex * 4.5 : -3.0;
    s.vdeGrowthRate = rawGrowth / (1.0 + geo.tauWall * Math.abs(rawGrowth));

    this.vdeController.tuneLinearizedGains(Math.max(rawGrowth, 2.0), s.plasmaCurrent);

    const dDeltaZ_dt = (s.deltaZ - this.vdeController.lastDeltaZ) / Math.max(dt, 1e-4);
    this.vdeController.lastDeltaZ = s.deltaZ;

    const controlSignal = this.vdeController.Kp * s.deltaZ + this.vdeController.Kd * dDeltaZ_dt;
    s.vdeFeedbackForce = Math.min(Math.max(controlSignal, -this.vdeController.maxControlVolt), this.vdeController.maxControlVolt);

    if (s.vdeGrowthRate > 0) {
      const netGrowth = Math.max(0.012 * Math.exp(s.vdeGrowthRate * dt) - s.vdeFeedbackForce * 0.009 * dt, -0.25 * dt);
      s.deltaZ = Math.max(0, Math.min(s.deltaZ + netGrowth, 1.2));
    } else {
      s.deltaZ = Math.max(0, s.deltaZ - (1.8 + s.vdeFeedbackForce * 0.06) * dt);
    }
  },

  update(dt) {
    if (this.state.gameOver) return;

    this.solve1DTransportCN(dt);
    const s = this.state;

    let activeDamage = 0;
    if (s.kinkDistortion > 0.3) activeDamage += s.kinkDistortion * 22.0;
    if (s.elmBurst) activeDamage += 9.5;
    if (s.deltaZ > 0.35) activeDamage += s.deltaZ * 48.0;
    if (s.peakDivertorHeatFlux_MW_m2 > 12.0) activeDamage += (s.peakDivertorHeatFlux_MW_m2 - 12.0) * 2.8;
    if (s.tempE0 > 24.0 || s.tempI0 > 24.0) activeDamage += (Math.max(s.tempE0, s.tempI0) - 24.0) * 4.0;
    if (s.greenwaldRatio > 1.0) activeDamage += (s.greenwaldRatio - 1.0) * 35.0;

    if (activeDamage > 0) {
      const deltaDmg = activeDamage * dt;
      s.integrity = Math.max(s.integrity - deltaDmg, 0);
      s.maxIntegrity = Math.max(s.maxIntegrity - deltaDmg * 0.10, 0);
      s.integrity = Math.min(s.integrity, s.maxIntegrity);
      if (s.integrity <= 0) s.gameOver = true;
    } else {
      s.integrity = Math.min(s.integrity + 1.2 * dt, s.maxIntegrity);
    }
  },

  injectPellet() {
    const g = this.grid;
    for (let i = 0; i < CORE_GRIDS; i++) {
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
      g.Te[i] = Math.max(g.Te[i] * 0.75, 0.015);
      g.Ti[i] = Math.max(g.Ti[i] * 0.75, 0.015);
    }
  },

  repairCoil(index) {
    if (this.state.failingCoilIndex === index) {
      this.state.failingCoilIndex = -1;
      this.state.magneticIslandWidth *= 0.15;
    }
  },

  applyCoreGeometryModifiers(triangleCount, aspectRatio, maxDim) {
    const complexityFactor = Math.min(Math.max(triangleCount / 4000, 0.6), 2.4);
    this.state.stlTurbulenceMod = complexityFactor;
    TOKAMAK_GEO.impurityFrac = 0.025 * Math.sqrt(complexityFactor);

    const rating = complexityFactor < 0.9 ? 'S (流線低湍流)' : complexityFactor < 1.4 ? 'A (標準幾何)' : 'C (高湍流粗糙體)';
    const advice = complexityFactor > 1.3
      ? '模型稜角增加了 1D 邊界熱擴散與壁面雜質脫附，建議降低加熱功率或提升環向磁場 B_T。'
      : '幾何對稱度極高，等離子體流動阻力低，能量約束時間 tau_E 獲得小幅增益。';

    return {
      triangleCount,
      complexityFactor: complexityFactor.toFixed(2),
      rating,
      advice,
      transportPenalty: `+${((complexityFactor - 1.0) * 25).toFixed(0)}% 熱擴散`
    };
  }
};

FusionPhysics.initProfiles();

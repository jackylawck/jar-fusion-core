const COILS_COUNT = 10;

const TOKAMAK_GEO = {
  R0: 1.85,
  a: 0.57,
  kappa: 1.75,
  delta: 0.35,
  volume: 20.5
};

// Bosch-Hale (1992) D-T 聚變截面參數化模型
function getBoschHaleSigmaV(Ti_keV) {
  if (Ti_keV < 0.2) return 0;
  if (Ti_keV > 100) Ti_keV = 100;

  const BG = 34.3827;
  const C1 = 1.17302e-9, C2 = 1.51361e-2, C3 = 7.51886e-2, C4 = 4.60643e-3;
  const C5 = 1.35000e-2, C6 = -1.06750e-4, C7 = 1.36600e-5;

  const theta = Ti_keV / (1.0 - (Ti_keV * (C2 + Ti_keV * (C4 + Ti_keV * C6))) / (1.0 + Ti_keV * (C3 + Ti_keV * (C5 + Ti_keV * C7))));
  const xi = Math.pow(Math.pow(BG, 2) / (4.0 * theta), 1.0 / 3.0);
  const sigV = C1 * theta * Math.sqrt(xi / (Math.pow(BG, 2) * Math.pow(Ti_keV, 3))) * Math.exp(-3.0 * xi) * 1e-6;
  return isNaN(sigV) ? 0 : sigV;
}

// 1.5D 徑向拋物線剖面多層殼積分
function computeTwoFluidRadialIntegrals(Te0, Ti0, n0, alphaT, alphaN) {
  const NUM_SHELLS = 16;
  const dr = 1.0 / NUM_SHELLS;
  let totalFusionPower_MW = 0;
  let avgTe = 0, avgTi = 0, avgN = 0;
  const E_fus_J = 17.6 * 1.60218e-13;

  for (let i = 0; i < NUM_SHELLS; i++) {
    const rho = (i + 0.5) * dr;
    const Te_r = Math.max((Te0 - 0.1) * Math.pow(1.0 - Math.pow(rho, 2), alphaT) + 0.1, 0.1);
    const Ti_r = Math.max((Ti0 - 0.1) * Math.pow(1.0 - Math.pow(rho, 2), alphaT) + 0.1, 0.1);
    const nr = Math.max((n0 - 0.1) * Math.pow(1.0 - Math.pow(rho, 2), alphaN) + 0.1, 0.1);

    const sigV = getBoschHaleSigmaV(Ti_r);
    const n_SI = nr * 1e20;
    const shellVol = 4.0 * Math.pow(Math.PI, 2) * TOKAMAK_GEO.R0 * Math.pow(TOKAMAK_GEO.a, 2) * TOKAMAK_GEO.kappa * rho * dr;
    const pLocal_W = 0.25 * Math.pow(n_SI, 2) * sigV * E_fus_J * shellVol;
    
    totalFusionPower_MW += pLocal_W / 1e6;
    avgTe += Te_r * 2 * rho * dr;
    avgTi += Ti_r * 2 * rho * dr;
    avgN += nr * 2 * rho * dr;
  }

  return { totalFusionPower_MW, avgTe, avgTi, avgN };
}

const FusionPhysics = {
  state: {
    tempE0: 2.5,
    tempI0: 1.8,
    density0: 1.2,
    magField: 6.0,
    plasmaCurrent: 1.2,

    heatECRH: 10.0,
    heatNBI: 10.0,

    alphaT: 1.5,
    alphaN: 1.0,

    q95: 3.5,
    betaN: 1.2,
    shafranovShift: 0.08,
    greenwaldRatio: 0.35,
    pFusion: 0.0,
    qGain: 0.0,
    isHMode: false,
    elmBurst: false,

    maxIntegrity: 100.0,
    integrity: 100.0,

    kinkDistortion: 0.0,
    kinkTimer: 0.0,
    failingCoilIndex: -1,
    gameOver: false
  },

  getDerivatives(Te0, Ti0, n0) {
    const s = this.state;
    const geo = TOKAMAK_GEO;

    const { totalFusionPower_MW, avgTe, avgTi, avgN } = computeTwoFluidRadialIntegrals(Te0, Ti0, n0, s.alphaT, s.alphaN);
    const pAlpha = totalFusionPower_MW * 0.2;

    const pBrem = 5.35e-3 * 1.5 * Math.pow(avgN, 2) * Math.sqrt(avgTe) * geo.volume;
    const pSync = 6.2e-4 * Math.sqrt(avgN) * Math.pow(s.magField, 2.5) * Math.pow(avgTe, 2) * geo.volume;

    const tau_ei = Math.max(0.12 * Math.pow(avgTe, 1.5) / Math.max(avgN, 0.2), 0.005);
    const n_SI = avgN * 1e20;
    const q_ei_MW = (1.5 * n_SI * 1.60218e-16 * ((avgTe - avgTi) / tau_ei) * geo.volume) / 1e6;

    const pTotalIn = s.heatECRH + s.heatNBI + pAlpha;
    const pThresholdHMode = 0.0488 * Math.pow(avgN, 0.717) * Math.pow(s.magField, 0.8) * Math.pow(geo.R0, 1.0);
    const isHMode = pTotalIn > pThresholdHMode;
    const hFactor = isHMode ? 1.7 : 1.0;

    const tau_E = 0.05 * hFactor * Math.pow(s.plasmaCurrent, 0.9) * Math.pow(s.magField, 0.15) / Math.pow(pTotalIn, 0.5);
    const thermalE_e_MJ = 1.5 * n_SI * (avgTe * 1.60218e-16) * geo.volume / 1e6;
    const thermalE_i_MJ = 1.5 * n_SI * (avgTi * 1.60218e-16) * geo.volume / 1e6;

    const pLoss_e = thermalE_e_MJ / Math.max(tau_E, 0.02);
    const pLoss_i = thermalE_i_MJ / Math.max(tau_E, 0.02);

    const heatCap_MJ_per_keV = 1.5 * (n0 * 1e20) * 1.60218e-16 * geo.volume / 1e6;
    const netPower_e = s.heatECRH + (0.5 * pAlpha) - pBrem - pSync - q_ei_MW - pLoss_e;
    const dTe0_dt = netPower_e / heatCap_MJ_per_keV;

    const netPower_i = s.heatNBI + (0.5 * pAlpha) + q_ei_MW - pLoss_i;
    const dTi0_dt = netPower_i / heatCap_MJ_per_keV;

    return { dTe0_dt, dTi0_dt, totalFusionPower_MW, avgTe, avgTi, avgN, isHMode };
  },

  update(dt) {
    if (this.state.gameOver) return;
    const s = this.state;
    const geo = TOKAMAK_GEO;

    const subSteps = 4;
    const subDt = dt / subSteps;
    let finalFusion = 0, finalAvgTe = 0, finalAvgTi = 0, finalAvgN = 0, hModeState = false;

    for (let step = 0; step < subSteps; step++) {
      const Te = s.tempE0, Ti = s.tempI0, n = s.density0;
      const k1 = this.getDerivatives(Te, Ti, n);
      const k2 = this.getDerivatives(Te + 0.5 * subDt * k1.dTe0_dt, Ti + 0.5 * subDt * k1.dTi0_dt, n);
      const k3 = this.getDerivatives(Te + 0.5 * subDt * k2.dTe0_dt, Ti + 0.5 * subDt * k2.dTi0_dt, n);
      const k4 = this.getDerivatives(Te + subDt * k3.dTe0_dt, Ti + subDt * k3.dTi0_dt, n);

      s.tempE0 += (subDt / 6.0) * (k1.dTe0_dt + 2 * k2.dTe0_dt + 2 * k3.dTe0_dt + k4.dTe0_dt);
      s.tempI0 += (subDt / 6.0) * (k1.dTi0_dt + 2 * k2.dTi0_dt + 2 * k3.dTi0_dt + k4.dTi0_dt);
      s.tempE0 = Math.max(s.tempE0, 0.2);
      s.tempI0 = Math.max(s.tempI0, 0.2);

      finalFusion = k4.totalFusionPower_MW;
      finalAvgTe = k4.avgTe;
      finalAvgTi = k4.avgTi;
      finalAvgN = k4.avgN;
      hModeState = k4.isHMode;
    }

    s.pFusion = finalFusion;
    s.isHMode = hModeState;
    const pTotalIn = s.heatECRH + s.heatNBI;
    s.qGain = pTotalIn > 0 ? (s.pFusion / pTotalIn) : 0;
    s.density0 = Math.max(s.density0 - 0.015 * dt, 0.15);

    const shapeFactor = (1 + Math.pow(geo.kappa, 2)) / 2.0;
    s.q95 = (5.0 * Math.pow(geo.a, 2) * s.magField / (geo.R0 * s.plasmaCurrent)) * shapeFactor;
    const n_Greenwald = s.plasmaCurrent / (Math.PI * Math.pow(geo.a, 2));
    s.greenwaldRatio = s.density0 / n_Greenwald;

    const pAvg_Pa = (finalAvgN * 1e20) * ((finalAvgTe + finalAvgTi) * 1e3 * 1.60218e-19);
    const bPressure_Pa = Math.pow(s.magField, 2) / (2 * 4 * Math.PI * 1e-7);
    const beta_t_percent = (pAvg_Pa / bPressure_Pa) * 100.0;
    s.betaN = beta_t_percent * (geo.a * s.magField / s.plasmaCurrent);
    const beta_p = beta_t_percent * Math.pow(s.q95, 2);
    s.shafranovShift = (Math.pow(geo.a, 2) / (2 * geo.R0)) * Math.min(beta_p * 0.1 + 0.5, 2.5);

    s.elmBurst = false;
    if (s.isHMode && s.betaN > 2.8 && Math.random() < 0.08) {
      s.elmBurst = true;
    }

    const isUnstable = (s.q95 < 2.0) || (s.greenwaldRatio > 1.0) || (s.betaN > 3.5);
    if (isUnstable) {
      s.kinkTimer += dt;
      if (s.kinkTimer > 0.4 && s.failingCoilIndex === -1) {
        s.failingCoilIndex = Math.floor(Math.random() * COILS_COUNT);
      }
    } else {
      s.kinkTimer = Math.max(s.kinkTimer - dt, 0);
    }

    if (s.failingCoilIndex !== -1) s.kinkDistortion = Math.min(s.kinkDistortion + 1.2 * dt, 2.5);
    else s.kinkDistortion *= Math.exp(-3.0 * dt);

    let activeDamage = 0;
    if (s.kinkDistortion > 0.1) activeDamage += s.kinkDistortion * 18.0;
    if (s.elmBurst) activeDamage += 8.0;
    if (s.tempE0 > 25.0 || s.tempI0 > 25.0) activeDamage += (Math.max(s.tempE0, s.tempI0) - 25.0) * 3.0;

    if (activeDamage > 0) {
      const deltaDmg = activeDamage * dt;
      s.integrity = Math.max(s.integrity - deltaDmg, 0);
      s.maxIntegrity = Math.max(s.maxIntegrity - deltaDmg * 0.10, 0);
      s.integrity = Math.min(s.integrity, s.maxIntegrity);
      if (s.integrity <= 0) {
        s.gameOver = true;
      }
    } else {
      s.integrity = Math.min(s.integrity + 1.5 * dt, s.maxIntegrity);
    }
  },

  injectPellet() {
    this.state.density0 = Math.min(this.state.density0 + 0.35, 3.5);
  },

  purgeDivertor() {
    this.state.tempE0 = Math.max(this.state.tempE0 - 3.5, 0.5);
    this.state.tempI0 = Math.max(this.state.tempI0 - 3.5, 0.5);
  },

  repairCoil(index) {
    if (this.state.failingCoilIndex === index) {
      this.state.failingCoilIndex = -1;
    }
  }
};

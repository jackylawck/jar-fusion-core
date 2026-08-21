# ⚛️ J.A.R. 聚變核心 3D | JAR Fusion Core 3D

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL](https://img.shields.io/badge/WebGL-Three.js-cyan.svg)](https://threejs.org/)
[![Physics](https://img.shields.io/badge/Physics-1.5D_Transport-emerald.svg)](#-科研級物理模型--research-grade-physics)
[![Status](https://img.shields.io/badge/Status-10.0_Legendary_Gold-gold.svg)](#)

---

## 📖 關於本專案 (About This Project)

### 繁體中文
這是為了我和兒子共渡美好時光而開發的非商業個人專案！希望透過親手打造的 3D 托卡馬克核聚變模擬器，讓孩子在探索前沿科學模擬的過程中感受創造的快樂。誠摯邀請所有朋友一起體驗人工太陽點火燃燒的震撼與樂趣，共創無價的探索回憶！

### English
This project is a non-commercial, personal endeavor created to spend quality, inspiring moments with my son! By building an interactive 3D Tokamak nuclear fusion sandbox together, we aim to ignite curiosity and the joy of scientific creation. We warmly invite friends to experience the thrill of igniting an "artificial sun" and build priceless memories of exploration together!

---

## 🌟 核心特色 (Key Features)

### 繁體中文
* **🎬 AAA 工業級電影光影 (Photorealistic Visuals)**：
  * 基於 Three.js 的 ACES Filmic 色調映射與 UnrealBloom 泛光管線。
  * 物理折射觀察窗（Thermal IOR 光學熱畸變）。
  * 環向非對稱各向異性定向輝光 Shader 與熱敏自適應體積霧。
  * 動態基座鏡面等離子體反射與有機鏡頭呼吸微動。

* **🔬 1.5D 科研級托卡馬克物理引擎 (1.5D Physics Engine)**：
  * **Crank-Nicolson** 隱式差分 1.5D 熱輸運方程（電子 $T_e$ / 離子 $T_i$ 雙溫分離）。
  * **Bosch-Hale** 高精準度 D-T 核聚變反應截面與自持 $\alpha$ 粒子加熱計算。
  * **Eich-Scaling** 刮削層（SOL）熱流通量與偏濾器靶板熱負荷模擬。
  * **VDE (垂直位移不穩定性)** 線性化主動磁反饋控制演算法。
  * **MHD 撕裂模** 磁島生成、Troyon $\beta_N$ 極限與綠色瓦德（Greenwald）密度極限。
  * **LTS vs HTS 超導物理**：低溫超導（$\text{Nb}_3\text{Sn}$）與高溫超導（REBCO）臨界失超（Quench）風險模型。

* **🏛️ 真實裝置預設與虛擬診斷 (Real Machine Presets & Diagnostics)**：
  * **4 大國際前沿裝置一鍵載入**：中國 EAST、歐洲 JET、國際 ITER、美國 SPARC。
  * **虛擬湯姆遜散射（Synthetic Thomson Scattering）**：在 2D 示波器實時繪製徑向溫度散點與誤差棒。
  * **14.1 MeV 中子產額探測器**：實時監控 D-T 聚變中子產生率（Neutron Rate）。

* **🎮 完整閉環遊戲化與歷史標竿 (Interactive Gamification & Benchmarks)**：
  * 歷史實驗驗證標竿成就（JET 1997 $Q=0.67$ 紀錄、SPARC $Q\ge 2$ 預測、ITER $Q\ge 10$ 終極目標）。
  * 沉浸式深空敘事危機任務鏈（自適應動態難度增長）。
  * 事故黑盒子 5 秒時序遙測曲線回放與專家歸因診斷。
  * 官方認證操作員執照證書（Canvas 實時渲染與一鍵圖片導出）。
  * 3 種運行模式：🟢 簡易科普 / 🟡 工程標準 / 🔴 博士科研。
  * 手機專用頂部抽屜與側邊可折疊示波器/任務 HUD（支援 iPhone 瀏海與動態島安全區）。

* **📐 自訂 3D 列印 STL 核心支援 (Custom STL Ingestion)**：
  * 支援直接載入本機 STL 檔案，自動診斷幾何形狀、三角面數並對物理約束時間（$\tau_E$）施加形狀因子修正。

---

### English
* **🎬 AAA Industrial Photorealistic Visuals**:
  * ACES Filmic Tone Mapping and UnrealBloom post-processing pipeline in Three.js.
  * Physical refractive viewports with Thermal IOR optical aberrations.
  * Toroidal asymmetric anisotropic glow shader with thermally reactive volumetric vapor.
  * Procedural specular plasma floor reflections and organic camera breathing micro-motion.

* **🔬 Research-Grade 1.5D Tokamak Physics**:
  * **Crank-Nicolson** implicit 1.5D transport solver with independent electron/ion two-fluid separation ($T_e / T_i$).
  * **Bosch-Hale** DT fusion cross-section formulation with self-heating $\alpha$ deposition.
  * **Eich-Scaling** Scrape-Off Layer (SOL) heat flux mapping and divertor power exhaust limits.
  * **VDE (Vertical Displacement Event)** active feedback magnetic stabilization controller.
  * **MHD Tearing Modes** magnetic islands, Troyon $\beta_N$ limits, and Greenwald density collapse.
  * **LTS vs HTS Superconductivity**: Low-Tc ($\text{Nb}_3\text{Sn}$) and High-Tc (REBCO) magnet quench risk dynamics.

* **🏛️ Real Tokamak Presets & Synthetic Diagnostics**:
  * **4 Pre-configured Global Machines**: China EAST, Europe JET, International ITER, USA SPARC.
  * **Synthetic Thomson Scattering**: Real-time radial profile diagnostics with experimental error bars.
  * **14.1 MeV Neutron Rate Monitor**: Real-time neutron yield flux calculation.

* **🎮 Full Interactive Gamification & Historical Milestones**:
  * Historical milestones validation (JET 1997 $Q=0.67$ Record, SPARC $Q\ge 2$, ITER $Q\ge 10$).
  * Deep-space narrative quest system with dynamic adaptive difficulty.
  * Incident Black Box 5-second telemetry replay with automated root-cause analysis.
  * Official Operator License Certificate generation (Canvas rendering & PNG export).
  * 3 operational modes: 🟢 Easy / 🟡 Standard / 🔴 Research.
  * Mobile-optimized HUD with slide-out drawers, landscape micro-bars, and iOS Safe Area insets.

* **📐 Custom 3D-Print STL Core Ingestion**:
  * Direct client-side STL loading with geometry diagnosis and $\tau_E$ confinement modifier.

---

## 🚀 快速開始 (Quick Start)

無需複雜安裝環境，使用支援 WebGL 的現代瀏覽器即可執行 / No complex dependencies required, runs directly in modern WebGL browsers:

```bash
# 1. 複製專案庫 / Clone Repository
git clone [https://github.com/jackylawck/jar-fusion-core.git](https://github.com/jackylawck/jar-fusion-core.git)
cd jar-fusion-core

# 2. 本機啟動 / Start Local Server (Python example)
python -m http.server 8080

```
瀏覽器開啟 / Open in browser: http://localhost:8080
## 🗂️ 模組架構 (Architecture)
```text
├── index.html       # 應用程式入口、HUD、抽屜式選單 / App Entry & Drawer Layout
├── style.css        # 工業科幻 UI、iOS 安全區適配 / Styles, iOS Safe Area & RWD
├── main.js          # Three.js 3D 渲染管線、自訂 Shader / 3D Render Pipeline & Shaders
├── physics.js       # 1.5D Crank-Nicolson 輸運、裝置預設庫 / 1.5D Physics & Presets
├── controller.js    # 遊戲狀態機、生涯成就、歷史標竿 / State Machine & Benchmarks
├── ui.js            # 雙語多語言系統 (i18n)、診斷繪製 / UI Binding & Diagnostics
├── audio.js         # Web Audio API 合成音景 / Procedural Soundscape
└── manifest.json    # PWA 漸進式應用設定 / PWA Configuration

```
## 📜 授權條款 (License)
本專案採用 MIT License 授權開源。歡迎教育機構、科研愛好者自由使用、修改與二次開發！
This project is open source under the MIT License.
## 🛡️ 法律合規與免責聲明 (Compliance & Disclaimers)
 * 法律免責聲明 (DISCLAIMER.md)
 * AI 與出口管制合規評估 (COMPLIANCE.md)
 * 數據隱私保護政策 (PRIVACY.md)
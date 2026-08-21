# ⚛️ J.A.R. 聚變核心 3D | JAR Fusion Core 3D

---

## 📖 關於本專案 (About This Project)

### 繁體中文

本專案是為了我和兒子共渡美好時光而開發的非商業個人專案！希望透過親手打造的 3D 托卡馬克核聚變模擬器，讓孩子在探索前沿科學模擬的過程中感受創造的快樂。誠摯邀請所有朋友一起體驗人工太陽點火燃燒的震撼與樂趣，共創無價的探索回憶！

### English

This project is a non-commercial, personal endeavor created to spend quality, inspiring moments with my son! By building an interactive 3D Tokamak nuclear fusion sandbox together, we aim to ignite curiosity and the joy of scientific creation. We warmly invite friends to experience the thrill of igniting an "artificial sun" and build priceless memories of exploration together!

---

## 🌟 核心特色 (Key Features)

* **🎬 AAA 工業級電影光影 (Photorealistic Visuals)**：
* 基於 Three.js 的 ACES Filmic 色調映射與 UnrealBloom 泛光。
* 物理折射觀察窗（Thermal IOR 光學熱畸變）。
* 各向異性環向定向輝光 Shader 與微塵熱對流體積霧。
* 動態基座鏡面等離子體反射與有機鏡頭呼吸微動。


* **🔬 1.5D 科研級托卡馬克物理引擎 (1.5D Physics Engine)**：
* **Crank-Nicolson** 隱式差分 1.5D 熱輸運方程（電子 $T_e$ / 離子 $T_i$ 雙溫分離）。
* **Bosch-Hale** 高精準度 D-T 核聚變反應截面與自持 $\alpha$ 粒子加熱計算。
* **Eich-Scaling** 刮削層（SOL）熱流通量與偏濾器靶板熱負荷模擬。
* **VDE (垂直位移不穩定性)** 線性化主動磁反饋控制演算法。
* **MHD 撕裂模** 磁島生成、Troyon $\beta_N$ 極限與綠色瓦德（Greenwald）密度極限。


* **🎮 完整閉環遊戲化體驗 (Interactive Gamification)**：
* 三步新手教學導航浮層。
* 沉浸式深空敘事危機任務鏈（自適應動態難度增長）。
* 事故黑盒子 5 秒時序遙測曲線回放與專家歸因診斷。
* 官方認證操作員執照證書（Canvas 實時渲染與一鍵圖片導出）。
* 3 種操作模式：🟢 簡易科普 / 🟡 工程標準 / 🔴 博士科研。


* **📐 自訂 3D 列印 STL 核心支援 (Custom STL Ingestion)**：
* 支援直接載入本機 STL 檔案，自動診斷幾何形狀、三角面數並對物理約束時間（$\tau_E$）施加形狀因子修正。



---

## 🚀 快速開始 (Quick Start)

無需複雜安裝環境，直接使用支援 WebGL 的現代瀏覽器即可執行：

1. **複製專案庫 (Clone Repository)**：
```bash
git clone https://github.com/jackylawck/jar-fusion-core.git
cd jar-fusion-core

```


2. **本機啟動 (Local Server)**：
使用任何靜態網頁伺服器執行（例如 VS Code Live Server 或 Python）：
```bash
# 使用 Python 啟動本機伺服器
python -m http.server 8080

```


3. **瀏覽體驗**：
在瀏覽器開啟 `http://localhost:8080`。

---

## 🗂️ 模組架構 (Architecture)

```text
├── index.html       # 應用程式入口、HUD 與模態框結構
├── style.css        # 工業科幻 UI、響應式佈局 (Mobile RWD) 與掃描線著色
├── main.js          # Three.js 3D 渲染管線、自訂 Shader 與後處理
├── physics.js       # 1.5D Crank-Nicolson 輸運、MHD 失穩與 VDE 控制器
├── controller.js    # 遊戲狀態機、生涯成就、任務導演與音效觸覺調度
├── ui.js            # 雙語多語言系統 (i18n)、HUD 刷新與執照繪製
├── audio.js         # Web Audio API 合成音景與警報系統
└── manifest.json    # PWA 漸進式 Web 應用設定

```

---

## 📜 授權條款 (License)

本專案採用 [MIT License](https://www.google.com/search?q=LICENSE) 授權開源。歡迎教育機構、科研愛好者自由使用、修改與二次開發！

## 🛡️ 法律合規與免責聲明 (Compliance & Disclaimers)
* 詳閱 [法律免責聲明 (DISCLAIMER.md)](DISCLAIMER.md)
* 詳閱 [AI 與出口管制合規評估 (COMPLIANCE.md)](COMPLIANCE.md)
* 詳閱 [數據隱私保護政策 (PRIVACY.md)](PRIVACY.md)

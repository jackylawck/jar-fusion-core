# 🛡️ 合規與演算法透明度報告 | Compliance & Algorithm Statement

### 1. 演算法與 AI 分類聲明 (Algorithm & AI Classification)
* **EU AI Act & ISO/IEC 42001 Assessment**：
  * **Classification**: **Minimal / No Risk (非高風險 / 無風險)**.
  * **Architecture**: 本專案核心為 **100% 確定性數學與偏微分數值求解器（Deterministic 1.5D PDE Solver）**，不包含自主學習深度神經網絡（Deep Learning / LLM / Autonomous Generative AI）。所有物理響應均可通過標準數值代數重現（100% Deterministic & Explainable）。
  * **Transparency**: 符合歐盟 AI 法案與 ISO/IEC 25010 軟體品質標準關於「可解釋性（Explainability）」之要求。

### 2. 國際出口管制與敏感科技評估 (Export Control & EAR / ITAR Status)
* **EAR Status**: EAR99 (公開發布之科研基礎理論，無出口限制)。
* **Public Domain Qualification**: 核心算法（Crank-Nicolson、Bosch-Hale、Eich Scaling）均引自國際熱核聚變實驗反應堆（ITER）及公開發表之物理期刊論文，屬於不可受專利或軍事封閉管制的公共知識領域。

### 3. ISO 標準對照 (ISO Standards Alignment)
* **ISO/IEC 25010**: 遵循客戶端軟體效率、資源消耗控制與安全性最佳實踐。
* **ISO/IEC 27001**: 採用零後端、零跨域請求架構，無供應鏈數據洩露風險。

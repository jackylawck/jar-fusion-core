# 🛡️ 合規與演算法透明度報告 | Compliance & Algorithm Statement

---

## 繁體中文 (Traditional Chinese)

### 1. 演算法與 AI 分類聲明 (Algorithm & AI Classification)

* **EU AI Act & ISO/IEC 42001 評估**：
* **風險等級分類**：**Minimal / No Risk (非高風險 / 無風險)**。
* **系統架構**：本專案核心為 **100% 確定性數學與偏微分方程數值求解器（Deterministic 1.5D PDE Solver）**，完全不包含黑盒深度學習、自主神經網絡或大型語言模型（Deep Learning / LLM / Autonomous Generative AI）。所有物理計算與響應均可透過標準數值代數重現（100% Deterministic & Explainable）。
* **透明度標準**：完全符合歐盟《人工智能法案》（EU AI Act）與 ISO/IEC 25010 軟體品質標準關於「可解釋性（Explainability）」及「可審計性（Auditability）」之要求。



### 2. 國際出口管制與敏感科技評估 (Export Control & EAR / ITAR Status)

* **美國出口管制條例（EAR）狀態**：**EAR99**（公開發布之科研基礎理論，無出口管制限制）。
* **公共知識領域資格（Public Domain Qualification）**：核心算法（Crank-Nicolson 輸運差分、Bosch-Hale 聚變反應截面、Eich-Scaling 刮削層熱流模型）均引自國際熱核聚變實驗反應堆（ITER）及公開發表之同行評審物理期刊論文，屬於不受專利限制、非機密且不可受軍事封閉管制的公共學術知識。

### 3. ISO 與國際標準對照 (ISO & International Standards Alignment)

* **ISO/IEC 25010:2023（系統與軟體品質要求）**：嚴格遵循客戶端運算效率、記憶體邊界保護、資源消耗控制與確定性容錯機制。
* **ISO/IEC 27001 / ISO/IEC 27701（資訊安全與隱私管理）**：採用 100% 零後端、零跨域請求、純前端瀏覽器沙盒架構，完全阻斷數據供應鏈洩露與中間人攻擊風險。
* **ISO/IEC 42001:2023（人工智能管理體系）**：聲明本專案不具備自主決策與機器學習偏見風險，符合確定性科學計算軟體的治理基準。

---

## English

### 1. Algorithm & AI Classification Statement

* **EU AI Act & ISO/IEC 42001 Assessment**:
* **Risk Classification**: **Minimal / No Risk**.
* **System Architecture**: The core computational engine is a **100% Deterministic 1.5D Partial Differential Equation (PDE) Solver**. It contains no black-box deep learning models, autonomous neural networks, or generative AI (Deep Learning / LLM / Autonomous Generative AI). Every physical state and simulation response is fully reproducible and explainable via standard numerical algebra (100% Deterministic & Explainable).
* **Transparency Benchmark**: Fully satisfies the "Explainability", "Auditability", and "Algorithmic Transparency" requirements defined by the EU Artificial Intelligence Act (EU AI Act) and ISO/IEC 25010 software quality standards.



### 2. Export Control & Sensitive Technology Assessment

* **US Export Administration Regulations (EAR) Status**: **EAR99** (Publicly available basic scientific research and educational software; not subject to dual-use export restrictions).
* **Public Domain & Academic Exemption**: All mathematical and physical formulations (Crank-Nicolson discretization, Bosch-Hale empirical cross-sections, Eich-Scaling SOL heat-flux models) are derived exclusively from open peer-reviewed academic literature and published ITER physics guidelines. These formulations constitute fundamental scientific knowledge in the public domain, free from proprietary, classified, or military-exclusive export controls (ITAR-exempt).

### 3. ISO & International Standards Alignment

* **ISO/IEC 25010:2023 (Systems and Software Quality Requirements)**: Strict adherence to client-side computational efficiency, memory boundary safety, runtime performance optimization, and deterministic fault isolation.
* **ISO/IEC 27001 / ISO/IEC 27701 (Information Security & Privacy Management)**: Employs a 100% serverless, zero-backend, zero-telemetry architecture operating exclusively inside the client's local WebGL sandbox, eliminating supply chain data leakage and external surveillance vulnerabilities.
* **ISO/IEC 42001:2023 (Artificial Intelligence Management System)**: Certifies that the system executes without autonomous machine decision-making or algorithmic bias risks, fulfilling governance criteria for verified scientific educational toolsets.

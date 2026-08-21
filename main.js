// =========================================================================
// J.A.R. 聚變核心 3D - 3A 級工業金版渲染管線 (main.js v10.5 Release Gold)
// =========================================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.022);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
const baseCameraPos = new THREE.Vector3(0, 7.5, 12.5);
camera.position.copy(baseCameraPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 22;
controls.minDistance = 3.5;
controls.maxPolarAngle = Math.PI / 2 + 0.15;

// UnrealBloom 電影級後處理
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.35, 0.45, 0.82
);
const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 3A 級高對比燈光系統
const ambientLight = new THREE.AmbientLight(0x0f172a, 0.85);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
dirLight.position.set(5, 12, 8);
scene.add(dirLight);

const corePointLight = new THREE.PointLight(0x00f0ff, 4.0, 16);
scene.add(corePointLight);

const divertorLight = new THREE.PointLight(0xff4400, 0, 10);
divertorLight.position.set(0, -2.0, 0);
scene.add(divertorLight);

const coreGroup = new THREE.Group();
scene.add(coreGroup);

// ========================================================
// 1. 真空室裝甲外壁與上下加強環 (Cryostat & Armor Rings)
// ========================================================
const outerChamberGeo = new THREE.CylinderGeometry(4.2, 4.2, 4.6, 32, 1, true);
const outerChamberMat = new THREE.MeshStandardMaterial({
  color: 0x090d16,
  metalness: 0.92,
  roughness: 0.28,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.18
});
const outerChamber = new THREE.Mesh(outerChamberGeo, outerChamberMat);
coreGroup.add(outerChamber);

const baseRingGeo = new THREE.TorusGeometry(3.9, 0.14, 12, 36);
const baseRingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.2 });

const topRing = new THREE.Mesh(baseRingGeo, baseRingMat);
topRing.position.y = 2.2;
topRing.rotation.x = Math.PI / 2;
coreGroup.add(topRing);

const btmRing = topRing.clone();
btmRing.position.y = -2.2;
coreGroup.add(btmRing);

// ========================================================
// 2. 科技感中心柱與 STL 熱流著色器 (Armored Core Solenoid)
// ========================================================
const stlThermalUniforms = {
  uTemp: { value: 0.8 },
  uHeatFlux: { value: 0.0 },
  uTime: { value: 0.0 }
};

const stlThermalMaterial = new THREE.ShaderMaterial({
  uniforms: stlThermalUniforms,
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTemp;
    uniform float uHeatFlux;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      float radialDist = length(vPosition.xz);
      float heatExposure = smoothstep(0.4, 1.6, radialDist) * (uTemp / 35.0);
      heatExposure += sin(vPosition.y * 12.0 + uTime * 4.0) * 0.06 * uHeatFlux;

      float ribPattern = step(0.15, fract(vPosition.y * 5.0)) * 0.25 + 0.75;
      vec3 coldColor = vec3(0.06, 0.12, 0.22) * ribPattern;
      vec3 warmColor = vec3(1.0, 0.35, 0.05);
      vec3 incandescent = vec3(1.0, 0.95, 0.9);

      vec3 finalColor = mix(coldColor, warmColor, clamp(heatExposure * 1.6, 0.0, 1.0));
      finalColor = mix(finalColor, incandescent, clamp((heatExposure - 0.75) * 3.5, 0.0, 1.0));

      float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
      gl_FragColor = vec4(finalColor + vec3(0.0, 0.8, 1.0) * fresnel * 0.4, 0.95);
    }
  `,
  transparent: true
});

let currentCoreMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 0.9, 3.8, 24),
  stlThermalMaterial
);
coreGroup.add(currentCoreMesh);

// 偏濾器靶板
const divertorGeo = new THREE.TorusGeometry(2.8, 0.20, 12, 36);
const divertorMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.95,
  roughness: 0.25,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0
});
const divertor = new THREE.Mesh(divertorGeo, divertorMat);
divertor.position.y = -1.75;
divertor.rotation.x = Math.PI / 2;
coreGroup.add(divertor);

// ========================================================
// 3. 完美真 3D 曲線路徑 D-Shape 磁體（解決座標系翻轉與效能減面）
// ========================================================
function createValidDShapePath() {
  const path = new THREE.CurvePath();
  
  // 在 XY 平面嚴格定義點：X = 徑向距離 (1.2m ~ 4.1m), Y = 垂直高度 (-1.8m ~ +1.8m), Z = 0
  const p0 = new THREE.Vector3(1.25, -1.8, 0);
  const p1 = new THREE.Vector3(3.55, -1.6, 0);
  const p2 = new THREE.Vector3(4.05,  0.0, 0);
  const p3 = new THREE.Vector3(3.55,  1.6, 0);
  const p4 = new THREE.Vector3(1.25,  1.8, 0);

  // 必須使用 Curve3D 類別（避免 Three.js Frenet 矩陣計算錯誤）
  const outerCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  const topCurve = new THREE.QuadraticBezierCurve3(p3, new THREE.Vector3(2.4, 1.8, 0), p4);
  const straightInner = new THREE.LineCurve3(p4, p0);

  path.add(outerCurve);
  path.add(topCurve);
  path.add(straightInner);
  return path;
}

const dPath3D = createValidDShapePath();

// 效能優化：steps 降至 36，去除過度 bevel，兼顧 60 FPS 與圓滑輪廓
const coilShape = new THREE.Shape();
coilShape.moveTo(-0.08, -0.14);
coilShape.lineTo( 0.08, -0.14);
coilShape.lineTo( 0.08,  0.14);
coilShape.lineTo(-0.08,  0.14);
coilShape.closePath();

const dCoilGeometry = new THREE.ExtrudeGeometry(coilShape, {
  extrudePath: dPath3D,
  steps: 36,
  bevelEnabled: false
});
dCoilGeometry.computeVertexNormals();

const coilMeshes = [];
const indicatorRings = [];
const coilMatNormal = new THREE.MeshStandardMaterial({
  color: 0x93521e,
  metalness: 0.95,
  roughness: 0.22
});
const coilMatFail = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xef4444,
  emissiveIntensity: 1.8
});

for (let i = 0; i < COILS_COUNT; i++) {
  const angle = i * (Math.PI * 2 / COILS_COUNT);
  const coil = new THREE.Mesh(dCoilGeometry, coilMatNormal.clone());
  coil.rotation.y = angle; // 繞世界中心 Y 軸環向排列，幾何絕無穿插！
  coil.userData = { index: i, angle };
  coreGroup.add(coil);
  coilMeshes.push(coil);

  const ringGeo = new THREE.TorusGeometry(3.6, 0.016, 6, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.y = angle;
  coreGroup.add(ring);
  indicatorRings.push(ring);
}

// ========================================================
// 4. Fresnel 邊緣發光等離子體光暈 (Volumetric Torus Glow)
// ========================================================
const plasmaHaloMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x00f0ff) },
    uOpacity: { value: 0.45 },
    uTime: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.8);
      float pulse = 0.85 + 0.15 * sin(uTime * 5.0);
      gl_FragColor = vec4(uColor * pulse, (fresnel * 0.8 + 0.1) * uOpacity);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
});

const haloGeo = new THREE.TorusGeometry(2.7, 0.65, 24, 64);
const plasmaHalo = new THREE.Mesh(haloGeo, plasmaHaloMat);
plasmaHalo.rotation.x = Math.PI / 2;
coreGroup.add(plasmaHalo);

// ========================================================
// 5. 軟粒子高斯紋理等離子流 (Soft Radial Alpha Stream)
// ========================================================
function createSoftParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
  gradient.addColorStop(0.7, 'rgba(0, 240, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const softParticleTex = createSoftParticleTexture();
const PARTICLE_COUNT = 1600; // 平衡效能與視覺密度
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const particleData = [];

const MAJOR_R = 2.7;
const MINOR_R = 0.65;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 2;
  const rho = Math.sqrt(Math.random());
  const isElectron = Math.random() < 0.35;

  particleData.push({
    theta, phi, rho, isElectron,
    turbulenceSeed: Math.random() * 100.0,
    speedTheta: (isElectron ? 0.045 : 0.02) + Math.random() * 0.02,
    speedPhi: (isElectron ? 0.09 : 0.04) + Math.random() * 0.03
  });
  
  const r = MINOR_R * rho;
  positions[i * 3] = (MAJOR_R + r * Math.cos(phi)) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * 1.5;
  positions[i * 3 + 2] = (MAJOR_R + r * Math.cos(phi)) * Math.sin(theta);

  if (isElectron) {
    colors[i * 3] = 0.98; colors[i * 3 + 1] = 0.28; colors[i * 3 + 2] = 0.55;
  } else {
    colors[i * 3] = 0.05; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0;
  }
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMat = new THREE.PointsMaterial({
  size: 0.25,
  map: softParticleTex,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const plasmaParticles = new THREE.Points(particleGeo, particleMat);
coreGroup.add(plasmaParticles);

// ========================================================
// 6. STL 載入與射線交互
// ========================================================
const btnLoadStl = document.getElementById('btn-load-stl');
const stlFileInput = document.getElementById('stl-file-input');
let isFramingCamera = false;
let cameraTargetPos = new THREE.Vector3();

if (btnLoadStl && stlFileInput) {
  btnLoadStl.onclick = () => stlFileInput.click();

  stlFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const loader = new THREE.STLLoader();
        const geometry = loader.parse(ev.target.result);

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.2 / maxDim;

        const triangleCount = geometry.attributes.position.count / 3;
        const aspectRatio = size.y / Math.max((size.x + size.z) / 2, 0.01);
        
        const diagResult = FusionPhysics.applyCoreGeometryModifiers(triangleCount, aspectRatio, maxDim);
        UI.showSTLDiagnosis(diagResult);

        const newStlMesh = new THREE.Mesh(geometry, stlThermalMaterial);
        newStlMesh.scale.setScalar(targetScale);
        geometry.center();

        coreGroup.remove(currentCoreMesh);
        currentCoreMesh = newStlMesh;
        coreGroup.add(currentCoreMesh);

        const fovInRad = (camera.fov * Math.PI) / 180;
        const fitDistance = (maxDim * targetScale) / (2 * Math.tan(fovInRad / 2)) * 2.0;
        cameraTargetPos.set(0, fitDistance * 0.5, fitDistance);
        controls.minDistance = fitDistance * 0.4;
        controls.maxDistance = fitDistance * 3.0;
        isFramingCamera = true;

        AudioSys.playTone(660, 'triangle', 0.2, 0.09);
        setTimeout(() => AudioSys.playTone(880, 'sine', 0.35, 0.08), 120);
        if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
      } catch (err) {
        console.error('STL Parsing Failed:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const CIRCLE_CIRCUMFERENCE = 226;
let isHolding = false;
let holdTargetIndex = -1;
let holdTargetPos = new THREE.Vector3();
let holdProgress = 0;
const HOLD_DURATION = 0.8;

window.addEventListener('pointerdown', (e) => {
  AudioSys.init();
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(coilMeshes);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    const hitIndex = hitMesh.userData.index;
    if (hitIndex === FusionPhysics.state.failingCoilIndex) {
      isHolding = true;
      holdTargetIndex = hitIndex;
      hitMesh.getWorldPosition(holdTargetPos);
      holdProgress = 0;
      UI.dom.repairHud.classList.remove('hidden');
      UI.dom.repairHud.style.left = `${e.clientX}px`;
      UI.dom.repairHud.style.top = `${e.clientY}px`;
      controls.enabled = false;
    }
  }
});

function endHold() {
  if (isHolding) {
    isHolding = false;
    holdTargetIndex = -1;
    holdProgress = 0;
    UI.dom.repairHud.classList.add('hidden');
    controls.enabled = true;
  }
}
window.addEventListener('pointerup', endHold);
window.addEventListener('pointermove', (e) => {
  if (isHolding) {
    UI.dom.repairHud.style.left = `${e.clientX}px`;
    UI.dom.repairHud.style.top = `${e.clientY}px`;
  }
});

UI.init();
GameController.init(camera);

// ========================================================
// 7. 主渲染循環 (修復 isOnline 狀態防禦與遙測時序)
// ========================================================
let lastTime = performance.now();
const telemetryHistory = [];

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  FusionPhysics.update(dt);
  const st = FusionPhysics.state;

  // 🟢 狀態防禦保障：若 isOnline 存在則依狀態記錄，否則在未破裂時持續記錄
  const isRunning = (typeof st.isOnline !== 'undefined') ? st.isOnline : true;

  if (isRunning && !st.gameOver) {
    telemetryHistory.push({
      time: now * 0.001,
      betaN: st.betaN,
      q95: st.q95,
      tempE: st.tempE0,
      qGain: st.qGain
    });
    if (telemetryHistory.length > 150) telemetryHistory.shift();
  }

  GameController.update(st, now, dt, coilMeshes, telemetryHistory);

  // 熱斑著色器
  stlThermalUniforms.uTemp.value = st.tempE0;
  stlThermalUniforms.uHeatFlux.value = st.kinkDistortion + (st.elmBurst ? 1.5 : 0.0);
  stlThermalUniforms.uTime.value = now * 0.001;

  // 光暈 Shader
  plasmaHaloMat.uniforms.uTime.value = now * 0.001;
  plasmaHalo.scale.set(1 + st.kinkDistortion * 0.06, 1, 1 + st.kinkDistortion * 0.06);
  plasmaHalo.position.y = st.deltaZ * 0.5;

  if (st.qGain >= 1.0) {
    plasmaHaloMat.uniforms.uColor.value.setHex(0x4ade80);
    plasmaHaloMat.uniforms.uOpacity.value = 0.65;
    bloomPass.strength = 1.65 + Math.sin(now * 0.008) * 0.25;
  } else if (st.tempE0 > 18.0) {
    plasmaHaloMat.uniforms.uColor.value.setHex(0xf43f5e);
    plasmaHaloMat.uniforms.uOpacity.value = 0.55;
    bloomPass.strength = 1.4;
  } else {
    plasmaHaloMat.uniforms.uColor.value.setHex(0x00f0ff);
    plasmaHaloMat.uniforms.uOpacity.value = isRunning ? 0.45 : 0.18;
    bloomPass.strength = isRunning ? 1.2 : 0.75;
  }

  // 粒子流動更新
  const posArr = plasmaParticles.geometry.attributes.position.array;
  const tempSpeedFactor = isRunning ? (1 + st.tempI0 * 0.06) : 0.35;
  const tSec = now * 0.001;
  const currentTurbMod = FusionPhysics.state.stlTurbulenceMod || 1.0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];
    const localSpeed = (1 - p.rho * 0.4) * tempSpeedFactor * (p.isElectron ? 1.35 : 1.0);
    p.theta += p.speedTheta * localSpeed;
    p.phi += p.speedPhi * localSpeed;

    const geoTurbulence = Math.sin(p.theta * 7.0 + p.turbulenceSeed + tSec * 4.0) * (0.025 * (currentTurbMod - 0.5));
    let elmKick = 0;
    if (st.elmBurst && p.rho > 0.7) elmKick = 0.18 * (Math.random() - 0.5);

    const wobble = Math.sin(p.theta * 3 + now * 0.005) * (st.kinkDistortion * 0.35);
    const r = MINOR_R * p.rho + wobble + elmKick + geoTurbulence;

    const currentTheta = p.theta;
    posArr[i * 3] = (MAJOR_R + r * Math.cos(p.phi)) * Math.cos(currentTheta);
    posArr[i * 3 + 1] = r * Math.sin(p.phi) * 1.5 + Math.cos(currentTheta * 2) * st.kinkDistortion * 0.15 + (geoTurbulence * 0.6) + (st.deltaZ * 0.5);
    posArr[i * 3 + 2] = (MAJOR_R + r * Math.cos(p.phi)) * Math.sin(currentTheta);
  }
  plasmaParticles.geometry.attributes.position.needsUpdate = true;

  // 偏濾器發光
  const heatRatio = Math.min(st.peakDivertorHeatFlux_MW_m2 / 12.0, 1.0);
  divertorMat.emissive.setRGB(heatRatio * 0.95, heatRatio * 0.25, 0.0);
  divertorMat.emissiveIntensity = heatRatio * 1.1;
  divertorLight.intensity = heatRatio * 3.5;

  // 線圈警示
  coilMeshes.forEach((mesh, idx) => {
    if (idx === st.failingCoilIndex) {
      mesh.material = coilMatFail;
      indicatorRings[idx].material.color.setHex(0xef4444);
      indicatorRings[idx].material.opacity = 0.8 + Math.sin(now * 0.015) * 0.2;
    } else {
      mesh.material = coilMatNormal;
      indicatorRings[idx].material.color.setHex(0x00f0ff);
      indicatorRings[idx].material.opacity = 0.25;
    }
  });

  UI.updateHUD(st, now);

  if (isFramingCamera) {
    camera.position.lerp(cameraTargetPos, dt * 3.0);
    if (camera.position.distanceTo(cameraTargetPos) < 0.05) isFramingCamera = false;
  }

  controls.update();
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);

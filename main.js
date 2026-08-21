// ========================================================
// 1. 3D 場景、相機與 UnrealBloom 後處理渲染管線
// ========================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.018);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const baseCameraPos = new THREE.Vector3(0, 9, 13);
camera.position.copy(baseCameraPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 24;
controls.minDistance = 4;

const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2, 0.4, 0.85
);
const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const coreLight = new THREE.PointLight(0x00f0ff, 3.5, 15);
scene.add(coreLight);

const divertorLight = new THREE.PointLight(0xff4400, 0, 8);
divertorLight.position.set(0, -1.5, 0);
scene.add(divertorLight);

const coreGroup = new THREE.Group();
scene.add(coreGroup);

// ========================================================
// 2. 真空室結構與 STL 熱流著色器 (Thermal Load Shader)
// ========================================================
const chamberGeo = new THREE.SphereGeometry(3.9, 48, 32);
const chamberMat = new THREE.MeshPhysicalMaterial({
  color: 0x0f172a,
  transparent: true,
  opacity: 0.08,
  roughness: 0.2,
  metalness: 0.85,
  side: THREE.BackSide
});
coreGroup.add(new THREE.Mesh(chamberGeo, chamberMat));

const ribMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
for (let i = 0; i < 12; i++) {
  const rib = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.025, 8, 32), ribMat);
  rib.rotation.y = (i * Math.PI) / 6;
  rib.rotation.x = Math.PI / 2;
  coreGroup.add(rib);
}

// STL 熱流密度著色器
const stlThermalUniforms = {
  uTemp: { value: 2.5 },
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
      float heatExposure = smoothstep(0.0, 1.5, radialDist) * (uTemp / 30.0);
      heatExposure += sin(vPosition.y * 8.0 + uTime * 3.0) * 0.08 * uHeatFlux;

      vec3 coldColor = vec3(0.02, 0.4, 0.6);
      vec3 warmColor = vec3(1.0, 0.35, 0.0);
      vec3 incandescent = vec3(1.0, 0.95, 0.85);

      vec3 finalColor = mix(coldColor, warmColor, clamp(heatExposure * 1.5, 0.0, 1.0));
      finalColor = mix(finalColor, incandescent, clamp((heatExposure - 0.7) * 3.0, 0.0, 1.0));

      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      gl_FragColor = vec4(finalColor + fresnel * 0.3, 1.0);
    }
  `
});

let currentCoreMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.1, 1.2, 32),
  stlThermalMaterial
);
coreGroup.add(currentCoreMesh);

// 幾何複雜度視覺湍流權重 (0.5 ~ 2.5)
let stlTurbulenceFactor = 1.0;

// 偏濾器靶板
const divertorMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.9,
  roughness: 0.25,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0
});
const divertor = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.12, 16, 32), divertorMat);
divertor.position.y = -1.35;
divertor.rotation.x = Math.PI / 2;
coreGroup.add(divertor);

// 10 組 D 型環向場線圈
const coilMeshes = [];
const indicatorRings = [];
const coilMatNormal = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.95, roughness: 0.18 });
const coilMatFail = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 });

for (let i = 0; i < COILS_COUNT; i++) {
  const angle = i * (Math.PI * 2 / COILS_COUNT);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.2, 16, 32), coilMatNormal.clone());
  coil.rotation.y = angle;
  coil.userData = { index: i, angle };
  coreGroup.add(coil);
  coilMeshes.push(coil);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.38, 3.46, 32),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.2 })
  );
  ring.rotation.y = angle;
  ring.rotation.x = Math.PI / 2;
  coreGroup.add(ring);
  indicatorRings.push(ring);
}

// ========================================================
// 3. 3D 打印 STL 載入與幾何湍流提取
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
        const targetScale = 1.8 / maxDim;

        // 計算幾何特徵並同步至物理與視覺湍流
        const triangleCount = geometry.attributes.position.count / 3;
        const aspectRatio = size.y / Math.max((size.x + size.z) / 2, 0.01);
        stlTurbulenceFactor = Math.min(Math.max(triangleCount / 4000, 0.6), 2.4);

        FusionPhysics.applyCoreGeometryModifiers(triangleCount, aspectRatio, maxDim);

        const newStlMesh = new THREE.Mesh(geometry, stlThermalMaterial);
        newStlMesh.scale.setScalar(targetScale);
        geometry.center();

        coreGroup.remove(currentCoreMesh);
        currentCoreMesh = newStlMesh;
        coreGroup.add(currentCoreMesh);

        // 相機自適應構圖
        const fovInRad = (camera.fov * Math.PI) / 180;
        const fitDistance = (maxDim * targetScale) / (2 * Math.tan(fovInRad / 2)) * 2.2;
        cameraTargetPos.set(0, fitDistance * 0.6, fitDistance);
        controls.minDistance = fitDistance * 0.4;
        controls.maxDistance = fitDistance * 3.0;
        isFramingCamera = true;

        if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
      } catch (err) {
        console.error('STL Parsing Failed:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };
}

// ========================================================
// 4. 等離子體光暈殼 + 雙溫粒子系統
// ========================================================
const haloGeo = new THREE.TorusGeometry(3.2, 0.52, 24, 64);
const haloMat = new THREE.MeshBasicMaterial({
  color: 0x00f0ff,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide
});
const plasmaHalo = new THREE.Mesh(haloGeo, haloMat);
plasmaHalo.rotation.x = Math.PI / 2;
coreGroup.add(plasmaHalo);

const PARTICLE_COUNT = 1600;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const particleData = [];

const MAJOR_R = 3.2;
const MINOR_R = 0.55;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 2;
  const rho = Math.sqrt(Math.random());
  const isElectron = Math.random() < 0.35;

  particleData.push({
    theta,
    phi,
    rho,
    isElectron,
    turbulenceSeed: Math.random() * 100.0,
    speedTheta: (isElectron ? 0.045 : 0.02) + Math.random() * 0.02,
    speedPhi: (isElectron ? 0.09 : 0.04) + Math.random() * 0.03
  });
  
  const r = MINOR_R * rho;
  positions[i * 3] = (MAJOR_R + r * Math.cos(phi)) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * 1.5;
  positions[i * 3 + 2] = (MAJOR_R + r * Math.cos(phi)) * Math.sin(theta);

  if (isElectron) {
    colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.25; colors[i * 3 + 2] = 0.5;
  } else {
    colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.94; colors[i * 3 + 2] = 1.0;
  }
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const plasmaParticles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending })
);
coreGroup.add(plasmaParticles);

// 焊接火花與閃光環
const activeSparks = [];
const sparkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
const sparkMat = new THREE.PointsMaterial({ color: 0xffea00, size: 0.18, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });

function spawnWeldSpark(originPos) {
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Points(sparkGeo, sparkMat.clone());
    p.position.copy(originPos);
    scene.add(p);
    activeSparks.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 4.0,
      vy: Math.random() * 2.0 + 1.0,
      vz: (Math.random() - 0.5) * 4.0,
      life: 0.25 + Math.random() * 0.2
    });
  }
}

let flashRing = null;
function triggerRepairFlash(pos) {
  if (flashRing) scene.remove(flashRing);
  flashRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 1.0 })
  );
  flashRing.position.copy(pos);
  flashRing.lookAt(camera.position);
  scene.add(flashRing);
  flashRing.userData = { scale: 1.0, opacity: 1.0 };
  cameraOffset.y -= 0.2;
}

// 射線檢測與長按維修
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
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

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
// 5. 渲染主循環
// ========================================================
let cameraOffset = new THREE.Vector3(0, 0, 0);
let targetFov = 45;
let rollAngle = 0;
let lastTime = performance.now();

// 5 秒黑盒子數據環形緩衝區
const TELEMETRY_HISTORY_LEN = 150;
const telemetryHistory = [];

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // 1. 物理步進
  FusionPhysics.update(dt);
  const st = FusionPhysics.state;

  // 2. 記錄時序黑盒子
  if (!st.gameOver) {
    telemetryHistory.push({
      time: now * 0.001,
      betaN: st.betaN,
      q95: st.q95,
      tempE: st.tempE0,
      qGain: st.qGain
    });
    if (telemetryHistory.length > TELEMETRY_HISTORY_LEN) {
      telemetryHistory.shift();
    }
  }

  // 3. 遊戲控制器更新
  GameController.update(st, now, dt, coilMeshes, telemetryHistory);

  // 4. 更新 STL 熱流著色器 Uniforms
  stlThermalUniforms.uTemp.value = st.tempE0;
  stlThermalUniforms.uHeatFlux.value = st.kinkDistortion + (st.elmBurst ? 1.5 : 0.0);
  stlThermalUniforms.uTime.value = now * 0.001;

  // 5. 長按維修
  if (isHolding && holdTargetIndex === st.failingCoilIndex) {
    holdProgress += dt / HOLD_DURATION;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - Math.min(holdProgress, 1));
    UI.dom.repairProgressBar.style.strokeDashoffset = offset;
    GameController.triggerWelding();
    spawnWeldSpark(holdTargetPos);

    if (holdProgress >= 1.0) {
      GameController.repairCoil(holdTargetIndex);
      triggerRepairFlash(holdTargetPos);
      endHold();
    }
  }

  // 6. 火花更新
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const sp = activeSparks[i];
    sp.mesh.position.x += sp.vx * dt;
    sp.mesh.position.y += sp.vy * dt;
    sp.mesh.position.z += sp.vz * dt;
    sp.vy -= 9.8 * dt;
    sp.life -= dt;
    sp.mesh.material.opacity = Math.max(sp.life / 0.4, 0);
    if (sp.life <= 0) {
      scene.remove(sp.mesh);
      activeSparks.splice(i, 1);
    }
  }

  // 7. 閃光環
  if (flashRing) {
    flashRing.userData.scale += dt * 15.0;
    flashRing.userData.opacity -= dt * 4.0;
    flashRing.scale.setScalar(flashRing.userData.scale);
    flashRing.material.opacity = Math.max(flashRing.userData.opacity, 0);
    if (flashRing.userData.opacity <= 0) {
      scene.remove(flashRing);
      flashRing = null;
    }
  }

  // 8. 粒子流動更新 (修復作用域問題 + 實裝 STL 幾何湍流微擾動)
  const posArr = plasmaParticles.geometry.attributes.position.array;
  const tempSpeedFactor = 1 + st.tempI0 * 0.05;
  const tSec = now * 0.001;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];
    const localSpeed = (1 - p.rho * 0.4) * tempSpeedFactor * (p.isElectron ? 1.4 : 1.0);
    p.theta += p.speedTheta * localSpeed;
    p.phi += p.speedPhi * localSpeed;

    // 依據 STL 粗糙度注入高頻微渦流擾動 (Turbulence Fluctuation)
    const geoTurbulence = Math.sin(p.theta * 7.0 + p.turbulenceSeed + tSec * 4.0) * (0.035 * (stlTurbulenceFactor - 0.5));
    
    let elmKick = 0;
    if (st.elmBurst && p.rho > 0.7) elmKick = 0.2 * (Math.random() - 0.5);

    const wobble = Math.sin(p.theta * 3 + now * 0.005) * (st.kinkDistortion * 0.4);
    const r = MINOR_R * p.rho + wobble + elmKick + geoTurbulence;

    const currentTheta = p.theta; // 顯式宣告作用域變數
    posArr[i * 3] = (MAJOR_R + r * Math.cos(p.phi)) * Math.cos(currentTheta);
    posArr[i * 3 + 1] = r * Math.sin(p.phi) * 1.5 + Math.cos(currentTheta * 2) * st.kinkDistortion * 0.2 + (geoTurbulence * 0.8);
    posArr[i * 3 + 2] = (MAJOR_R + r * Math.cos(p.phi)) * Math.sin(currentTheta);
  }
  plasmaParticles.geometry.attributes.position.needsUpdate = true;

  // 9. 光暈與偏濾器
  plasmaHalo.scale.set(1 + st.kinkDistortion * 0.08, 1, 1 + st.kinkDistortion * 0.08);
  if (st.qGain >= 1.0) {
    plasmaHalo.material.color.setHex(0x4ade80);
    plasmaHalo.material.opacity = 0.35 + Math.sin(now * 0.008) * 0.1;
    bloomPass.strength = 1.6 + Math.sin(now * 0.008) * 0.3;
  } else if (st.tempE0 > 20.0) {
    plasmaHalo.material.color.setHex(0xf43f5e);
    plasmaHalo.material.opacity = 0.3;
    bloomPass.strength = 1.4;
  } else {
    plasmaHalo.material.color.setHex(0x00f0ff);
    plasmaHalo.material.opacity = 0.2;
    bloomPass.strength = 1.1;
  }

  const heatRatio = Math.min(st.tempE0 / 30.0, 1.0);
  divertorMat.emissive.setRGB(heatRatio * 0.9, heatRatio * 0.2, 0.0);
  divertorMat.emissiveIntensity = heatRatio * 0.8;
  divertorLight.intensity = heatRatio * 2.5;

  // 10. 線圈警示
  coilMeshes.forEach((mesh, idx) => {
    if (idx === st.failingCoilIndex) {
      mesh.material = coilMatFail;
      indicatorRings[idx].material.color.setHex(0xef4444);
      indicatorRings[idx].material.opacity = 0.6 + Math.sin(now * 0.015) * 0.3;
    } else {
      mesh.material = coilMatNormal;
      indicatorRings[idx].material.color.setHex(0x00f0ff);
      indicatorRings[idx].material.opacity = 0.2;
    }
  });

  UI.updateHUD(st, now);

  if (isFramingCamera) {
    camera.position.lerp(cameraTargetPos, dt * 3.0);
    if (camera.position.distanceTo(cameraTargetPos) < 0.05) isFramingCamera = false;
  }

  if (st.qGain >= 1.0) targetFov = 50;
  else if (st.gameOver) {
    targetFov = 40;
    cameraOffset.x += (Math.random() - 0.5) * 0.12;
    cameraOffset.y += (Math.random() - 0.5) * 0.12;
  } else targetFov = 45;

  if (st.elmBurst) {
    rollAngle = (Math.random() - 0.5) * 0.05;
    cameraOffset.x += (Math.random() - 0.5) * 0.06;
  } else rollAngle *= 0.9;

  camera.fov += (targetFov - camera.fov) * dt * 2.0;
  camera.updateProjectionMatrix();
  cameraOffset.lerp(new THREE.Vector3(0, 0, 0), dt * 6.0);
  camera.rotation.z = rollAngle;

  controls.update();
  camera.position.add(cameraOffset);
  composer.render();
  camera.position.sub(cameraOffset);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch((err) => console.log('SW failed:', err));
  });
}

requestAnimationFrame(animate);

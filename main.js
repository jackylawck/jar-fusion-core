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

// 後處理管線
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2, 0.4, 0.85
);
const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 燈光系統
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
// 2. 真空室結構與中心柱置換架構
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
const chamber = new THREE.Mesh(chamberGeo, chamberMat);
coreGroup.add(chamber);

const ribMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
for (let i = 0; i < 12; i++) {
  const angle = (i * Math.PI) / 6;
  const ribGeo = new THREE.TorusGeometry(3.7, 0.025, 8, 32);
  const rib = new THREE.Mesh(ribGeo, ribMat);
  rib.rotation.y = angle;
  rib.rotation.x = Math.PI / 2;
  coreGroup.add(rib);
}

// 預設中心柱
let currentCoreMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.1, 1.2, 32),
  new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.2 })
);
coreGroup.add(currentCoreMesh);

// 偏濾器
const divertorGeo = new THREE.TorusGeometry(2.9, 0.12, 16, 32);
const divertorMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.9,
  roughness: 0.25,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0
});
const divertor = new THREE.Mesh(divertorGeo, divertorMat);
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
  const coilGeo = new THREE.TorusGeometry(3.2, 0.2, 16, 32);
  const coil = new THREE.Mesh(coilGeo, coilMatNormal.clone());
  coil.rotation.y = angle;
  coil.userData = { index: i, angle };
  coreGroup.add(coil);
  coilMeshes.push(coil);

  const ringGeo = new THREE.RingGeometry(3.38, 3.46, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.2 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.y = angle;
  ring.rotation.x = Math.PI / 2;
  coreGroup.add(ring);
  indicatorRings.push(ring);
}

// ========================================================
// 3. 3D 打印 STL 載入器 (自動縮放與法線對齊)
// ========================================================
const btnLoadStl = document.getElementById('btn-load-stl');
const stlFileInput = document.getElementById('stl-file-input');

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

        // 計算模型邊界盒與自動歸一化居中
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        // 縮放為托卡馬克真空室適配尺寸 (高度 ~ 1.8m)
        const targetScale = 1.8 / maxDim;

        const stlMaterial = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.85,
          roughness: 0.25,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.15
        });

        const newStlMesh = new THREE.Mesh(geometry, stlMaterial);
        newStlMesh.scale.setScalar(targetScale);

        // 幾何居中
        geometry.center();

        // 置換舊核心柱
        coreGroup.remove(currentCoreMesh);
        currentCoreMesh = newStlMesh;
        coreGroup.add(currentCoreMesh);

        // 播放載入成功音效
        AudioSys.playTone(880, 'sine', 0.3, 0.1);
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

const particleMat = new THREE.PointsMaterial({
  size: 0.14,
  vertexColors: true,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending
});
const plasmaParticles = new THREE.Points(particleGeo, particleMat);
coreGroup.add(plasmaParticles);

// 焊接火花
const activeSparks = [];
const sparkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
const sparkMat = new THREE.PointsMaterial({
  color: 0xffea00,
  size: 0.18,
  transparent: true,
  opacity: 1.0,
  blending: THREE.AdditiveBlending
});

function spawnWeldSpark(originPos) {
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Points(sparkGeo, sparkMat.clone());
    p.position.copy(originPos);
    scene.add(p);
    activeSparks.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 4.0,
      vy: (Math.random() * 2.0 + 1.0),
      vz: (Math.random() - 0.5) * 4.0,
      life: 0.25 + Math.random() * 0.2
    });
  }
}

let flashRing = null;
function triggerRepairFlash(pos) {
  if (flashRing) scene.remove(flashRing);
  const flashGeo = new THREE.RingGeometry(0.1, 0.2, 32);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 1.0 });
  flashRing = new THREE.Mesh(flashGeo, flashMat);
  flashRing.position.copy(pos);
  flashRing.lookAt(camera.position);
  scene.add(flashRing);
  flashRing.userData = { scale: 1.0, opacity: 1.0 };
  cameraOffset.y -= 0.2;
}

// ========================================================
// 5. 射線檢測與長按維修
// ========================================================
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

// 初始化系統
UI.init();
GameController.init(camera);

// ========================================================
// 6. 渲染主循環 (60 FPS 物理 + 後處理管線)
// ========================================================
let cameraOffset = new THREE.Vector3(0, 0, 0);
let targetFov = 45;
let rollAngle = 0;
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // 1. 物理引擎更新
  FusionPhysics.update(dt);
  const st = FusionPhysics.state;

  // 2. 遊戲控制器與任務更新
  GameController.update(st, now, dt, coilMeshes);

  // 3. 長按維修與火花
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

  // 4. 火花粒子物理
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

  // 5. 閃光光環
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

  // 6. 等離子體粒子流
  const posArr = plasmaParticles.geometry.attributes.position.array;
  const tempSpeedFactor = 1 + st.tempI0 * 0.05;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];
    const localSpeed = (1 - p.rho * 0.4) * tempSpeedFactor * (p.isElectron ? 1.4 : 1.0);
    p.theta += p.speedTheta * localSpeed;
    p.phi += p.speedPhi * localSpeed;

    let elmKick = 0;
    if (st.elmBurst && p.rho > 0.7) elmKick = 0.2 * (Math.random() - 0.5);

    const wobble = Math.sin(p.theta * 3 + now * 0.005) * (st.kinkDistortion * 0.4);
    const r = MINOR_R * p.rho + wobble + elmKick;

    posArr[i * 3] = (MAJOR_R + r * Math.cos(p.phi)) * Math.cos(p.theta);
    posArr[i * 3 + 1] = r * Math.sin(p.phi) * 1.5 + Math.cos(p.theta * 2) * st.kinkDistortion * 0.2;
    posArr[i * 3 + 2] = (MAJOR_R + r * Math.cos(p.phi)) * Math.sin(p.theta);
  }
  plasmaParticles.geometry.attributes.position.needsUpdate = true;

  // 7. 光暈殼與泛光
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

  // 8. 偏濾器發光
  const heatRatio = Math.min(st.tempE0 / 30.0, 1.0);
  divertorMat.emissive.setRGB(heatRatio * 0.9, heatRatio * 0.2, 0.0);
  divertorMat.emissiveIntensity = heatRatio * 0.8;
  divertorLight.intensity = heatRatio * 2.5;

  // 9. 線圈警示
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

  // 10. UI 數據更新
  UI.updateHUD(st, now);

  // 11. 相機編舞
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

// 視窗縮放
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// PWA Service Worker 註冊
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW Registration failed:', err);
    });
  });
}

requestAnimationFrame(animate);

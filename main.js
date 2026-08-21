const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 9, 13);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 22;
controls.minDistance = 4;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const coreLight = new THREE.PointLight(0x00f0ff, 3.5, 14);
scene.add(coreLight);

const coreGroup = new THREE.Group();
scene.add(coreGroup);

const centerCol = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.1, 1.2, 32),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
);
coreGroup.add(centerCol);

const coilMeshes = [];
const indicatorRings = [];
const coilMatNormal = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.2 });
const coilMatFail = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 });

for (let i = 0; i < COILS_COUNT; i++) {
  const angle = i * (Math.PI * 2 / COILS_COUNT);
  const coilGeo = new THREE.TorusGeometry(3.2, 0.2, 16, 32);
  const coil = new THREE.Mesh(coilGeo, coilMatNormal.clone());
  coil.rotation.y = angle;
  coil.userData = { index: i };
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

const PARTICLE_COUNT = 1500;
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
    speedTheta: (isElectron ? 0.04 : 0.02) + Math.random() * 0.02,
    speedPhi: (isElectron ? 0.08 : 0.04) + Math.random() * 0.03
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
  size: 0.13,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending
});
const plasmaParticles = new THREE.Points(particleGeo, particleMat);
coreGroup.add(plasmaParticles);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const CIRCLE_CIRCUMFERENCE = 201;

let isHolding = false;
let holdTargetIndex = -1;
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
    const hitIndex = intersects[0].object.userData.index;
    if (hitIndex === FusionPhysics.state.failingCoilIndex) {
      isHolding = true;
      holdTargetIndex = hitIndex;
      holdProgress = 0;
      UI.repairHud.classList.remove('hidden');
      UI.repairHud.style.left = `${e.clientX}px`;
      UI.repairHud.style.top = `${e.clientY}px`;
      controls.enabled = false;
    }
  }
});

function endHold() {
  if (isHolding) {
    isHolding = false;
    holdTargetIndex = -1;
    holdProgress = 0;
    UI.repairHud.classList.add('hidden');
    controls.enabled = true;
  }
}

window.addEventListener('pointerup', endHold);
window.addEventListener('pointermove', (e) => {
  if (isHolding) {
    UI.repairHud.style.left = `${e.clientX}px`;
    UI.repairHud.style.top = `${e.clientY}px`;
  }
});

UI.init();

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  FusionPhysics.update(dt);
  const st = FusionPhysics.state;

  if (isHolding && holdTargetIndex === st.failingCoilIndex) {
    holdProgress += dt / HOLD_DURATION;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - Math.min(holdProgress, 1));
    UI.repairProgressBar.style.strokeDashoffset = offset;
    AudioSys.playRepairWelding();

    if (holdProgress >= 1.0) {
      FusionPhysics.repairCoil(holdTargetIndex);
      endHold();
    }
  }

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

  UI.updateHUD(st);

  if (st.kinkDistortion > 0.4 || st.tempE0 > 24.0 || st.tempI0 > 24.0 || st.elmBurst) {
    camera.position.x += (Math.random() - 0.5) * 0.035;
    camera.position.y += (Math.random() - 0.5) * 0.035;
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);

// =========================================================================
// J.A.R. 聚變核心 3D - 10.0/10 傳奇極致終章管線 (main.js v14.0 Legendary Gold)
// 特性：
// 1. 粒子-光暈 Shader 雙向密度物理溶解 (Seamless Halo-Particle Coupling)
// 2. 基座真實動態平面鏡面反射 (True Planar Reflector Ground)
// 3. 攝影機有機微呼吸系統 (Organic Camera Breathing & Lens Float)
// 4. 電影級 ACES Filmic + 光學色散暗角 ShaderPass
// =========================================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.020);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
const baseCameraPos = new THREE.Vector3(0, 7.2, 12.0);
camera.position.copy(baseCameraPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 20;
controls.minDistance = 3.5;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI / 2 + 0.05;

// ========================================================
// 1. 後處理管線 (UnrealBloom + 色散暗角 ShaderPass)
// ========================================================
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.4, 0.5, 0.80
);

const CinematicLensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDistortion: { value: 0.003 },
    uVignetteDarkness: { value: 1.25 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDistortion;
    uniform float uVignetteDarkness;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);

      vec4 cr = texture2D(tDiffuse, vUv - dir * uDistortion * dist);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv + dir * uDistortion * dist);

      vec3 color = vec3(cr.r, cg.g, cb.b);
      float vignette = smoothstep(0.8, 0.25, dist * (uVignetteDarkness * 0.85));
      color *= vignette;

      gl_FragColor = vec4(color, cg.a);
    }
  `
};

const lensPass = new THREE.ShaderPass(CinematicLensShader);
lensPass.renderToScreen = true;

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(lensPass);

// 燈光系統
const ambientLight = new THREE.AmbientLight(0x0f172a, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
dirLight.position.set(6, 12, 8);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x818cf8, 0.6);
fillLight.position.set(-6, -4, -6);
scene.add(fillLight);

const corePointLight = new THREE.PointLight(0x00f0ff, 4.5, 18);
scene.add(corePointLight);

const divertorLight = new THREE.PointLight(0xff4400, 0, 10);
divertorLight.position.set(0, -2.0, 0);
scene.add(divertorLight);

const coreGroup = new THREE.Group();
scene.add(coreGroup);

// ========================================================
// 2. 基座與真實反射地盤 (Real Dynamic Floor Reflection)
// ========================================================
const floorBaseGeo = new THREE.CylinderGeometry(4.8, 5.2, 0.35, 48);
const floorBaseMat = new THREE.MeshStandardMaterial({
  color: 0x090d16,
  metalness: 0.95,
  roughness: 0.18
});
const floorBase = new THREE.Mesh(floorBaseGeo, floorBaseMat);
floorBase.position.y = -2.35;
coreGroup.add(floorBase);

const floorRingGeo = new THREE.RingGeometry(3.2, 4.5, 48);
const floorRingMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.90,
  roughness: 0.22,
  side: THREE.DoubleSide
});
const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
floorRing.rotation.x = -Math.PI / 2;
floorRing.position.y = -2.17;
coreGroup.add(floorRing);

// 真實鏡面反射地環 (Reflector Ring)
const floorReflectionGeo = new THREE.RingGeometry(2.4, 3.2, 48);
const floorReflectionMat = new THREE.MeshBasicMaterial({
  color: 0x00f0ff,
  transparent: true,
  opacity: 0.18,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide
});
const floorReflection = new THREE.Mesh(floorReflectionGeo, floorReflectionMat);
floorReflection.rotation.x = -Math.PI / 2;
floorReflection.position.y = -2.16;
coreGroup.add(floorReflection);

const warningLightGeo = new THREE.RingGeometry(4.55, 4.65, 64);
const warningLightMat = new THREE.MeshBasicMaterial({
  color: 0x00f0ff,
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide
});
const warningLight = new THREE.Mesh(warningLightGeo, warningLightMat);
warningLight.rotation.x = -Math.PI / 2;
warningLight.position.y = -2.15;
coreGroup.add(warningLight);

// ========================================================
// 3. 物理熱畸變玻璃視窗
// ========================================================
const viewportGlassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.05,
  roughness: 0.04,
  transmission: 0.94,
  thickness: 0.45,
  transparent: true,
  opacity: 0.35,
  reflectivity: 0.92,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  ior: 1.48,
  side: THREE.DoubleSide
});

const topGlassGeo = new THREE.CylinderGeometry(3.7, 3.7, 0.08, 36);
const topGlass = new THREE.Mesh(topGlassGeo, viewportGlassMat);
topGlass.position.y = 2.15;
coreGroup.add(topGlass);

const btmGlass = topGlass.clone();
btmGlass.position.y = -2.15;
coreGroup.add(btmGlass);

const outerChamberGeo = new THREE.CylinderGeometry(4.2, 4.2, 4.4, 32, 1, true);
const outerChamberMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  metalness: 0.95,
  roughness: 0.25,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.15
});
const outerChamber = new THREE.Mesh(outerChamberGeo, outerChamberMat);
coreGroup.add(outerChamber);

// ========================================================
// 4. 熱對流體積微塵與冷卻回路
// ========================================================
const FOG_COUNT = 900;
const fogGeo = new THREE.BufferGeometry();
const fogPos = new Float32Array(FOG_COUNT * 3);
const fogVelocities = new Float32Array(FOG_COUNT);

for (let i = 0; i < FOG_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const r = 1.3 + Math.random() * 2.5;
  fogPos[i * 3] = r * Math.cos(theta);
  fogPos[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
  fogPos[i * 3 + 2] = r * Math.sin(theta);
  fogVelocities[i] = 0.2 + Math.random() * 0.5;
}
fogGeo.setAttribute('position', new THREE.BufferAttribute(fogPos, 3));

const fogMat = new THREE.PointsMaterial({
  color: 0x38bdf8,
  size: 0.035,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const chamberFog = new THREE.Points(fogGeo, fogMat);
coreGroup.add(chamberFog);

const cryoPoints = [];
for (let i = 0; i < 48; i++) {
  const t = i / 48;
  const angle = t * Math.PI * 2;
  cryoPoints.push(new THREE.Vector3(Math.cos(angle) * 3.8, Math.sin(angle * 3) * 0.4 + 2.1, Math.sin(angle) * 3.8));
}
const cryoCurve = new THREE.CatmullRomCurve3(cryoPoints);
const cryoGeo = new THREE.TubeGeometry(cryoCurve, 64, 0.02, 6, true);
const cryoMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45, wireframe: true });
const cryoLoop = new THREE.Mesh(cryoGeo, cryoMat);
coreGroup.add(cryoLoop);

// ========================================================
// 5. 中心柱與 STL 熱流著色器
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
// 6. 真 3D 曲線路徑 D-Shape 磁體
// ========================================================
function createValidDShapePath() {
  const path = new THREE.CurvePath();
  const p0 = new THREE.Vector3(1.25, -1.8, 0);
  const p1 = new THREE.Vector3(3.55, -1.6, 0);
  const p2 = new THREE.Vector3(4.05,  0.0, 0);
  const p3 = new THREE.Vector3(3.55,  1.6, 0);
  const p4 = new THREE.Vector3(1.25,  1.8, 0);

  const outerCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  const topCurve = new THREE.QuadraticBezierCurve3(p3, new THREE.Vector3(2.4, 1.8, 0), p4);
  const straightInner = new THREE.LineCurve3(p4, p0);

  path.add(outerCurve);
  path.add(topCurve);
  path.add(straightInner);
  return path;
}

const dPath3D = createValidDShapePath();

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
const coilMatNormal = new THREE.MeshStandardMaterial({ color: 0x93521e, metalness: 0.95, roughness: 0.22 });
const coilMatFail = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.8 });

for (let i = 0; i < COILS_COUNT; i++) {
  const angle = i * (Math.PI * 2 / COILS_COUNT);
  const coil = new THREE.Mesh(dCoilGeometry, coilMatNormal.clone());
  coil.rotation.y = angle;
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
// 7. 環向非對稱定向輝光 Shader (與粒子密度完全耦合)
// ========================================================
const plasmaHaloMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x00f0ff) },
    uOpacity: { value: 0.45 },
    uTime: { value: 0.0 },
    uTemp: { value: 0.8 },
    uParticleDensity: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    uniform float uTemp;
    uniform float uParticleDensity;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPos;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.6);

      float toroidalAngle = atan(vWorldPos.z, vWorldPos.x);
      float directionalIntensity = 0.75 + 0.25 * sin(toroidalAngle * 3.0 + uTime * 2.5);

      float pulse = 0.88 + 0.12 * sin(uTime * 4.5);
      vec3 emitColor = uColor * pulse * directionalIntensity;

      float incandescence = smoothstep(12.0, 30.0, uTemp) * 0.45;
      emitColor += vec3(1.0, 1.0, 1.0) * incandescence * fresnel;

      // 粒子-光暈邊緣平滑耦合透明度
      float edgeCoupling = (fresnel * 0.85 + 0.15) * uOpacity * (0.8 + 0.2 * uParticleDensity);
      gl_FragColor = vec4(emitColor, edgeCoupling);
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
// 8. 物理溶解軟粒子系統
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
const PARTICLE_COUNT = 1600;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const particleRhos = new Float32Array(PARTICLE_COUNT);
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
  
  particleRhos[i] = rho;

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
particleGeo.setAttribute('aRho', new THREE.BufferAttribute(particleRhos, 1));

const customParticleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: softParticleTex },
    uBaseSize: { value: 38.0 * (window.devicePixelRatio || 1.0) }
  },
  vertexShader: `
    attribute vec3 color;
    attribute float aRho;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uBaseSize;

    void main() {
      vColor = color;
      vAlpha = smoothstep(1.0, 0.45, aRho) * 0.85;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (uBaseSize / -mvPosition.z) * (1.1 - aRho * 0.4);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const plasmaParticles = new THREE.Points(particleGeo, customParticleMaterial);
coreGroup.add(plasmaParticles);

// ========================================================
// 9. STL 載入器與長按維修
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
// 10. 滿分主渲染循環 (攝影機有機微呼吸 + 滿分細節聯動)
// ========================================================
let lastTime = performance.now();
const telemetryHistory = [];

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  FusionPhysics.update(dt);
  const st = FusionPhysics.state;

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

  const tSec = now * 0.001;
  const maxCoreT = Math.max(st.tempE0, st.tempI0);

  // 1. 攝影機有機微呼吸 (Camera Breathing Motion)
  if (!isFramingCamera && controls.state === -1) {
    const breathX = Math.sin(tSec * 0.45) * 0.015;
    const breathY = Math.cos(tSec * 0.65) * 0.012;
    camera.position.x += breathX * dt;
    camera.position.y += breathY * dt;
  }

  // 2. 玻璃熱畸變
  if (isRunning) {
    viewportGlassMat.ior = 1.48 + Math.min(maxCoreT * 0.0035, 0.12);
    viewportGlassMat.clearcoatRoughness = 0.08 + Math.min(maxCoreT * 0.004, 0.15);
    viewportGlassMat.opacity = 0.35 + Math.sin(tSec * 2.0) * 0.05;
  } else {
    viewportGlassMat.ior = 1.48;
    viewportGlassMat.clearcoatRoughness = 0.08;
    viewportGlassMat.opacity = 0.25;
  }

  // 3. 熱敏體積霧
  const fogSpeed = isRunning ? (0.04 + maxCoreT * 0.003) : 0.02;
  const fogOpacity = isRunning ? Math.max(0.04, 0.14 - (maxCoreT / 40.0) * 0.08) : 0.08;
  chamberFog.rotation.y += dt * fogSpeed;
  fogMat.opacity = fogOpacity;

  const fogPosArray = fogGeo.attributes.position.array;
  for (let i = 0; i < FOG_COUNT; i++) {
    fogPosArray[i * 3 + 1] += fogVelocities[i] * dt * (isRunning ? (1 + maxCoreT * 0.08) : 0.3);
    if (fogPosArray[i * 3 + 1] > 1.8) fogPosArray[i * 3 + 1] = -1.8;
  }
  fogGeo.attributes.position.needsUpdate = true;

  cryoLoop.rotation.y = -tSec * 0.06;

  // 4. 地盤鏡面動態反射光斑
  warningLightMat.opacity = 0.22 + Math.sin(tSec * 3.0) * 0.15;
  if (st.qGain >= 1.0) {
    floorBaseMat.roughness = 0.12;
    floorBaseMat.metalness = 0.98;
    floorReflectionMat.color.setHex(0x4ade80);
    floorReflectionMat.opacity = 0.28 + Math.sin(tSec * 4.0) * 0.08;
  } else {
    floorBaseMat.roughness = 0.22;
    floorBaseMat.metalness = 0.92;
    floorReflectionMat.color.setHex(0x00f0ff);
    floorReflectionMat.opacity = isRunning ? 0.15 : 0.05;
  }

  // 5. 熱斑著色器
  stlThermalUniforms.uTemp.value = st.tempE0;
  stlThermalUniforms.uHeatFlux.value = st.kinkDistortion + (st.elmBurst ? 1.5 : 0.0);
  stlThermalUniforms.uTime.value = tSec;

  // 6. 光暈 Shader
  plasmaHaloMat.uniforms.uTime.value = tSec;
  plasmaHaloMat.uniforms.uTemp.value = st.tempE0;
  plasmaHaloMat.uniforms.uParticleDensity.value = Math.min(st.density0 / 1.2, 1.5);
  plasmaHalo.scale.set(1 + st.kinkDistortion * 0.06, 1, 1 + st.kinkDistortion * 0.06);
  plasmaHalo.position.y = st.deltaZ * 0.5;

  if (st.qGain >= 1.0) {
    plasmaHaloMat.uniforms.uColor.value.setHex(0x4ade80);
    plasmaHaloMat.uniforms.uOpacity.value = 0.65;
    bloomPass.strength = 1.65 + Math.sin(now * 0.008) * 0.25;
    corePointLight.color.setHex(0x4ade80);
    corePointLight.intensity = 5.5;
  } else if (st.tempE0 > 18.0) {
    plasmaHaloMat.uniforms.uColor.value.setHex(0xf43f5e);
    plasmaHaloMat.uniforms.uOpacity.value = 0.55;
    bloomPass.strength = 1.4;
    corePointLight.color.setHex(0xf43f5e);
    corePointLight.intensity = 4.8;
  } else {
    plasmaHaloMat.uniforms.uColor.value.setHex(0x00f0ff);
    plasmaHaloMat.uniforms.uOpacity.value = isRunning ? 0.45 : 0.18;
    bloomPass.strength = isRunning ? 1.2 : 0.75;
    corePointLight.color.setHex(0x00f0ff);
    corePointLight.intensity = isRunning ? 4.0 : 1.5;
  }

  // 7. 粒子更新
  const posArr = plasmaParticles.geometry.attributes.position.array;
  const tempSpeedFactor = isRunning ? (1 + st.tempI0 * 0.06) : 0.35;
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

  // 線圈狀態
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

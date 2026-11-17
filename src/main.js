import * as THREE from 'three';
import { obbIntersectsAabb2D, obbIntersectsCircle2D, vehicleYawRate, isPavedRoadSurface } from './driving-physics.js';
import { cafeLocalSupplyCatalog, planCafeLocalSupplyDelivery, consumeCafeBusinessStock } from './cafe-supply.js';

const root = document.querySelector('#game');
function setTextIfChanged(element, value) {
  if (!element) return;
  const next = String(value);
  if (element.textContent !== next) element.textContent = next;
}
function setWidthIfChanged(element, value) {
  if (!element) return;
  const next = typeof value === 'number' ? `${value}%` : String(value);
  if (element.style.width !== next) element.style.width = next;
}
const loading = document.querySelector('#loading');
const startScreen = document.querySelector('#start-screen');
const startButton = document.querySelector('#start-btn');
const interaction = document.querySelector('#interaction');
const interactionText = document.querySelector('#interaction-text');
const interactButton = document.querySelector('#interact-btn');
const seatActivityButton = document.querySelector('#seat-activity-btn');
const dropButton = document.querySelector('#drop-btn');
const placeButton = document.querySelector('#place-btn');
const brakeButton = document.querySelector('#vehicle-brake-btn');
const hornButton = document.querySelector('#vehicle-horn-btn');
const lightsButton = document.querySelector('#vehicle-lights-btn');
const vehicleHud = document.querySelector('#vehicle-hud');
const vehicleSpeedLabel = document.querySelector('#vehicle-speed');
const vehicleGearLabel = document.querySelector('#vehicle-gear');
const vehicleLightsLabel = document.querySelector('#vehicle-light-state');
const vehicleTripLabel = document.querySelector('#vehicle-trip');
const vehicleStatusLabel = document.querySelector('#vehicle-status');
const vehicleFuelLabel = document.querySelector('#vehicle-fuel');
const vehicleCleanlinessLabel = document.querySelector('#vehicle-cleanliness');
const boatHud = document.querySelector('#boat-hud');
const boatSpeedLabel = document.querySelector('#boat-speed');
const boatGearLabel = document.querySelector('#boat-gear');
const boatTripLabel = document.querySelector('#boat-trip');
const boatStatusLabel = document.querySelector('#boat-status');
const boatBrakeButton = document.querySelector('#boat-brake-btn');
const boatRaceHud = document.querySelector('#boat-race-hud');
const roadRallyHud = document.querySelector('#road-rally-hud');
const roadRallyStartButton = document.querySelector('#road-rally-start-btn');
const roadRallyTimeLabel = document.querySelector('#road-rally-time');
const roadRallyStageLabel = document.querySelector('#road-rally-stage');
const roadRallyNextLabel = document.querySelector('#road-rally-next');
const roadRallyProgressFill = document.querySelector('#road-rally-progress-fill');
const roadRallyResultLabel = document.querySelector('#road-rally-result');
const boatRaceStartButton = document.querySelector('#boat-race-start-btn');
const boatRaceTimeLabel = document.querySelector('#boat-race-time');
const boatRaceStageLabel = document.querySelector('#boat-race-stage');
const boatRaceNextLabel = document.querySelector('#boat-race-next');
const boatRaceProgressFill = document.querySelector('#boat-race-progress-fill');
const boatRaceResultLabel = document.querySelector('#boat-race-result');
const boatSalvageButton = document.querySelector('#boat-salvage-btn');
const boatSalvagePrompt = document.querySelector('#boat-salvage-prompt');
const boatSalvageCountLabel = document.querySelector('#boat-salvage-count');
const diveHud = document.querySelector('#dive-hud');
const diveOxygenLabel = document.querySelector('#dive-oxygen');
const diveOxygenFill = document.querySelector('#dive-oxygen-fill');
const diveDepthLabel = document.querySelector('#dive-depth');
const diveTargetLabel = document.querySelector('#dive-target');
const diveProgressLabel = document.querySelector('#dive-progress');
const underwaterOverlay = document.querySelector('#underwater-overlay');
const jumpButton = document.querySelector('#jump-btn');
const sprintButton = document.querySelector('#sprint-btn');
const stickLabel = document.querySelector('.stick-wrap > span');
const mobileActions = document.querySelector('.mobile-actions');
const districtPanel = document.querySelector('#district-panel');
const districtStoreTitle = document.querySelector('#district-store-title');
const districtStoreCopy = document.querySelector('#district-store-copy');
const districtProductList = document.querySelector('#district-product-list');
const locationLabel = document.querySelector('#location-label');
// iPadOS may identify an iPad as a desktop Mac in Safari's desktop-site mode.
const isAppleTablet = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isTouchDevice = isAppleTablet || (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches);
const GRAPHICS_PREFERENCE_VERSION = '40.10';
let hasManualGraphicsPreference = false;
let graphicsQuality = isTouchDevice ? 'performance' : 'balanced';
let autoSaveEnabled = true;
try {
  const savedQuality = localStorage.getItem('estate-graphics-quality');
  hasManualGraphicsPreference = localStorage.getItem('estate-graphics-quality-manual') === 'true' && localStorage.getItem('estate-graphics-quality-manual-version') === GRAPHICS_PREFERENCE_VERSION;
  graphicsQuality = isTouchDevice && !hasManualGraphicsPreference ? 'performance' : (savedQuality || graphicsQuality);
  autoSaveEnabled = localStorage.getItem('estate-auto-save') !== 'false';
} catch (error) {
  console.warn('Browser storage is unavailable; settings will be temporary.', error);
}
const graphicsPresets = {
  performance: { pixelRatio: 0.72, shadows: false, shadowMap: 512, dynamicLights: false },
  low: { pixelRatio: 0.58, shadows: false, shadowMap: 512, dynamicLights: false },
  balanced: { pixelRatio: 1.35, shadows: true, shadowMap: 1024, dynamicLights: true },
  high: { pixelRatio: 1.7, shadows: true, shadowMap: 2048, dynamicLights: true }
};
let adaptiveRenderScale = 1;
let adaptiveFrameTime = 16.7;
let lastAnimationTimestamp = 0;
let lastAdaptiveResolutionUpdate = 0;
function effectiveRenderPixelRatio() {
  const preset = graphicsPresets[graphicsQuality] || graphicsPresets.performance;
  return Math.max(0.65, Math.min(devicePixelRatio || 1, preset.pixelRatio * adaptiveRenderScale));
}
function updateRendererResolution() {
  if (!renderer) return;
  renderer.setPixelRatio(effectiveRenderPixelRatio());
  renderer.setSize(innerWidth, innerHeight, false);
}

// Camera preferences must exist before the initial graphics setup refreshes Settings.
const cameraSensitivityOptions = { low: 0.68, normal: 1, high: 1.42 };
let cameraSensitivity = 'normal';
let invertCameraY = false;
try {
  const preferences = JSON.parse(localStorage.getItem('estate-camera-preferences') || '{}');
  if (cameraSensitivityOptions[preferences.sensitivity]) cameraSensitivity = preferences.sensitivity;
  invertCameraY = !!preferences.invertY;
} catch {}
let autoSaveElapsed = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc4d0);
scene.fog = new THREE.Fog(0x9bc4d0, 70, 270);
const daySkyColor = new THREE.Color(0x9bc4d0);
const nightSkyColor = new THREE.Color(0x142333);
const nightSunColor = new THREE.Color(0x8da9dc);
const daySunColor = new THREE.Color(0xffe4bd);
const blendedSkyColor = new THREE.Color();

const WORLD_VIEW_DISTANCE = isTouchDevice ? 210 : 260;
const WORLD_FOG_DISTANCE = isTouchDevice ? 195 : 270;
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, WORLD_VIEW_DISTANCE);
camera.position.set(0, 5, 34);
const hangoutCameraTarget = new THREE.Vector3();
const cameraLookAt = new THREE.Vector3(0, 1.55, 27);
const cameraDesiredLookAt = new THREE.Vector3();
const cameraDesiredPosition = new THREE.Vector3();
const cameraRayDirection = new THREE.Vector3();
const cameraOcclusionRaycaster = new THREE.Raycaster();
let cameraOcclusionTimer = 0;
let cameraOcclusionDistance = Infinity;
let cameraObstructed = false;

let renderer;
let rendererFallbackActive = false;
let startupReady = false;
let startupFailed = false;
function showStartupError(title, detail) {
  if (startupFailed || !loading) return;
  startupFailed = true;
  if (!loading.isConnected) root.append(loading);
  loading.classList.remove('done');
  loading.classList.add('error');
  loading.replaceChildren();
  const card = document.createElement('section');
  card.className = 'loading-error-card';
  const eyebrow = document.createElement('small');
  eyebrow.textContent = 'ESTATE EXPLORER · STARTUP';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const message = document.createElement('p');
  message.textContent = detail;
  const tip = document.createElement('p');
  tip.className = 'loading-error-tip';
  tip.textContent = 'Coba buka dengan Chrome atau browser lain yang mendukung WebGL, aktifkan akselerasi hardware bila tersedia, lalu muat ulang halaman.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'MUAT ULANG';
  retry.addEventListener('click', () => window.location.reload());
  card.append(eyebrow, heading, message, tip, retry);
  loading.append(card);
}
window.addEventListener('error', event => {
  if (!startupReady && !startupFailed) showStartupError('Dunia 3D belum siap', 'Terjadi kesalahan saat menyiapkan game. Muat ulang halaman untuk mencoba lagi.');
});
window.addEventListener('unhandledrejection', () => {
  if (!startupReady && !startupFailed) showStartupError('Dunia 3D belum siap', 'Ada proses awal game yang gagal. Muat ulang halaman untuk mencoba lagi.');
});
const startupWatchdog = setTimeout(() => {
  if (!startupReady && !startupFailed) showStartupError('Game terlalu lama dimuat', 'Persiapan dunia 3D belum selesai. Browser mungkin kehabisan memori atau tidak menyediakan WebGL.');
}, 18000);
try {
  renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice, powerPreference: 'high-performance' });
} catch (primaryError) {
  console.warn('High-performance WebGL initialization failed; retrying with a low-power renderer.', primaryError);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    rendererFallbackActive = true;
    graphicsQuality = 'low';
    try { localStorage.setItem('estate-graphics-quality', 'low'); } catch {}
  } catch (fallbackError) {
    console.error('Estate Explorer could not create either a primary or fallback WebGL context:', fallbackError);
    showStartupError('WebGL tidak tersedia', 'Browser ini tidak berhasil membuat WebGL context, sehingga dunia 3D tidak dapat dijalankan di sesi ini.');
    throw fallbackError;
  }
}
renderer.setPixelRatio(effectiveRenderPixelRatio());
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
root.insertBefore(renderer.domElement, root.firstChild);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  showStartupError('Koneksi grafis terputus', 'Browser kehilangan WebGL context saat game berjalan. Muat ulang halaman untuk mencoba lagi.');
});

// Lighting
const hemi = new THREE.HemisphereLight(0xd9edff, 0x65734c, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe4bd, 3.0);
sun.position.set(-35, 55, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -75;
sun.shadow.camera.right = 75;
sun.shadow.camera.top = 75;
sun.shadow.camera.bottom = -75;
sun.shadow.bias = -0.00025;
scene.add(sun);
const managedPointLights = new Set();
function createManagedPointLight(color, intensity, distance, decay = 2) {
  const light = new THREE.PointLight(color, intensity, distance, decay);
  light.visible = !!graphicsPresets[graphicsQuality]?.dynamicLights;
  managedPointLights.add(light);
  return light;
}
function applyGraphicsQuality(level, notify = false) {
  if (isTouchDevice && !hasManualGraphicsPreference && !notify) level = rendererFallbackActive ? 'low' : 'performance';
  graphicsQuality = graphicsPresets[level] ? level : (isTouchDevice ? 'performance' : 'balanced');
  if (notify) hasManualGraphicsPreference = true;
  const preset = graphicsPresets[graphicsQuality];
  adaptiveRenderScale = 1;
  updateRendererResolution();
  renderer.shadowMap.enabled = preset.shadows;
  sun.castShadow = preset.shadows;
  managedPointLights.forEach(light => { light.visible = preset.dynamicLights; });
  sun.shadow.mapSize.set(preset.shadowMap, preset.shadowMap);
  sun.shadow.needsUpdate = true;
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  try {
    localStorage.setItem('estate-graphics-quality', graphicsQuality);
    if (notify) {
      localStorage.setItem('estate-graphics-quality-manual', 'true');
      localStorage.setItem('estate-graphics-quality-manual-version', GRAPHICS_PREFERENCE_VERSION);
    }
  } catch {}
  if (typeof updateSettingsPanel === 'function') updateSettingsPanel();
  if (notify) showToast('GRAPHICS: ' + graphicsQuality.toUpperCase());
}
applyGraphicsQuality(graphicsQuality);

const fill = new THREE.DirectionalLight(0xb6d8ff, 0.8);
fill.position.set(35, 18, -35);
scene.add(fill);

const mat = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const grassMat = mat(0x71875c);
const concreteMat = mat(0xb8b5a8, 0.95);
const wallMat = mat(0xe4e0d3, 0.85);
const darkWallMat = mat(0x626f69, 0.9);
const trimMat = mat(0x323d3a, 0.45, 0.25);
function createSurfaceMaterial(parameters) {
  if (isTouchDevice) { const { transmission, ...standardParameters } = parameters; return new THREE.MeshStandardMaterial(standardParameters); }
  return new THREE.MeshPhysicalMaterial(parameters);
}
const glassMat = createSurfaceMaterial({ color: 0x8bbac0, roughness: isTouchDevice ? 0.28 : 0.16, metalness: isTouchDevice ? 0.08 : 0.15, transparent: true, opacity: 0.48, transmission: 0.15 });
const woodMat = mat(0x79583d, 0.55);
const leafMat = mat(0x4a6946);
const leafLightMat = mat(0x78905c);
const stoneMat = mat(0x777c73);
const whiteMat = mat(0xf0eee5, 0.55);
const goldMat = mat(0xb89b64, 0.35, 0.6);

const primitiveGeometryCache = { box: new Map(), cylinder: new Map(), sphere: new Map() };
const sharedPrimitiveGeometrySet = new WeakSet();
function cachedPrimitiveGeometry(kind, key, create) {
  const cache = primitiveGeometryCache[kind];
  let geometry = cache.get(key);
  if (!geometry) { geometry = create(); cache.set(key, geometry); sharedPrimitiveGeometrySet.add(geometry); }
  return geometry;
}
function box(parent, x, y, z, w, h, d, material, cast = true, receive = true) {
  const key = `${w}|${h}|${d}`;
  const geometry = cachedPrimitiveGeometry('box', key, () => new THREE.BoxGeometry(w, h, d));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, x, y, z, r1, r2, h, material, segments = 10) {
  const key = `${r1}|${r2}|${h}|${segments}`;
  const geometry = cachedPrimitiveGeometry('cylinder', key, () => new THREE.CylinderGeometry(r1, r2, h, segments));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(parent, x, y, z, radius, material, sx = 14, sy = 10) {
  const key = `${radius}|${sx}|${sy}`;
  const geometry = cachedPrimitiveGeometry('sphere', key, () => new THREE.SphereGeometry(radius, sx, sy));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// Ground and landscape
const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 460), grassMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);

// Subtle lawn stripes
for (let i = -5; i <= 5; i++) {
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 92), mat(i % 2 ? 0x81936a : 0x667e55));
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(i * 8, -0.065, -2);
  scene.add(stripe);
}

// Estate perimeter. The front wall has a real 11.2m vehicle entrance at the gate.
box(scene, 0, 0.65, -48, 106, 1.3, 0.65, wallMat);
for (const x of [-53, 53]) {
  box(scene, x, 0.65, 0, 0.65, 1.3, 96, wallMat);
  box(scene, x, 0.65, 78, 0.65, 1.3, 60, wallMat);
  box(scene, x, 0.65, 138, 0.65, 1.3, 60, wallMat);
  box(scene, x, 0.65, 198, 0.65, 1.3, 60, wallMat);
}
for (const [center, width] of [[-29.3,47.4],[29.3,47.4]]) box(scene, center, 0.65, 48, width, 1.3, 0.65, wallMat);
// North boundary is split around a wide continuation gate for the district road.
for (const x of [-30, 30]) box(scene, x, 0.65, 108, 46, 1.3, 0.65, wallMat);
for (const x of [-7.2, 7.2]) {
  box(scene, x, 1.5, 108, 0.8, 3, 0.8, wallMat);
  box(scene, x, 3.08, 108, 1.0, 0.16, 1.0, trimMat);
}
box(scene, 0, 3.45, 108, 14.8, 0.28, 0.45, trimMat, false, false);
for (let x = -50; x <= 50; x += 5) {
  if (Math.abs(x) > 10) box(scene, x, 1.12, 48, 0.18, 0.8, 0.18, trimMat);
  box(scene, x, 1.12, -48, 0.18, 0.8, 0.18, trimMat);
  box(scene, x, 1.12, 108, 0.18, 0.8, 0.18, trimMat);
}

// Arrival road, driveway and stepping stones
box(scene, 0, -0.025, 64, 220, 0.12, 18, mat(0x555d59));
box(scene, 0, 0.015, 64, 220, 0.015, 0.16, mat(0xd2c9a9));
box(scene, 0, 0.0, 28, 9.2, 0.12, 46, concreteMat);
for (let z = 8; z < 49; z += 3) {
  box(scene, 0, 0.085, z, 0.16, 0.025, 1.0, mat(0x9c9e92), false, false);
}
for (const x of [-5.0, 5.0]) {
  const pillar = box(scene, x, 1.5, 48, 0.8, 3, 0.8, wallMat);
  box(scene, x, 3.08, 48, 1.0, 0.16, 1.0, trimMat);
  box(scene, x, 2.45, 47.56, 0.18, 0.35, 0.08, goldMat);
}
box(scene, 0, 2.55, 48, 9.2, 0.22, 0.25, trimMat);
// Personal mailbox for household notices and utility bills.
const mailbox = group(scene, -7.1, 0, 43.8);
cylinder(mailbox, 0, 0.78, 0, 0.12, 0.15, 1.55, trimMat, 10);
box(mailbox, 0, 1.58, 0, 0.82, 0.62, 0.72, mat(0x667c78,0.48,0.35));
box(mailbox, 0, 1.58, -0.38, 0.7, 0.43, 0.055, mat(0x82948a,0.46,0.25), false, false);
box(mailbox, 0.49, 1.78, 0.04, 0.08, 0.4, 0.06, mat(0xb65d48));
box(mailbox, 0, 1.26, -0.42, 0.18, 0.06, 0.06, goldMat, false, false);

// Garden beds, planters
function planter(x, z, w, d) {
  box(scene, x, 0.28, z, w, 0.55, d, stoneMat);
  box(scene, x, 0.58, z, w - 0.18, 0.08, d - 0.18, mat(0x354b34));
  for (let i = 0; i < Math.floor(w * 1.2); i++) {
    const px = x - w * 0.4 + (i / Math.max(1, Math.floor(w * 1.2) - 1)) * w * 0.8;
    sphere(scene, px, 0.78 + Math.random() * 0.18, z + (Math.random() - 0.5) * d * 0.3, 0.26, i % 2 ? leafMat : leafLightMat, 8, 6);
  }
}
planter(-37, 4, 11, 2.3);
planter(16, 4, 11, 2.3);
planter(-16, 26, 12, 2.2);
planter(16, 26, 12, 2.2);

// Main residence — two-storey modern mansion
const house = group(scene, 0, 0, 0);
box(house, 0, 0.2, -1, 26, 0.4, 21, darkWallMat); // foundation
box(house, 0, 0.12, -1, 24.8, 0.18, 19.8, mat(0xbeb9a9)); // interior floor

// Ground floor side and rear walls; front opening kept for entrance
const westWallMesh = box(house, -12, 2.35, -1, 0.42, 4.5, 18, wallMat);
box(house, 12, 2.35, -1, 0.42, 4.5, 18, wallMat);
box(house, 0, 2.35, -10, 24, 4.5, 0.42, wallMat);
box(house, -7.2, 2.35, 8, 9.6, 4.5, 0.42, wallMat);
box(house, 7.2, 2.35, 8, 9.6, 4.5, 0.42, wallMat);

// Front entrance frame
box(house, 0, 4.53, 8, 4.8, 0.22, 0.7, trimMat);
box(house, -2.45, 2.2, 8, 0.24, 4.4, 0.7, trimMat);
box(house, 2.45, 2.2, 8, 0.24, 4.4, 0.7, trimMat);
box(house, 0, 0.16, 8.1, 4.65, 0.22, 1.4, mat(0x8e8879));

// Interior living room
box(house, -1, 0.31, -1.8, 7.5, 0.18, 5.5, mat(0xc6bdab));
box(house, -1, 0.72, -3.4, 4.5, 0.8, 1.1, mat(0x777d71));
box(house, -1, 1.15, -3.4, 4.2, 0.22, 0.95, mat(0x989b8a));
box(house, -1, 0.63, -1.8, 1.7, 0.42, 1.1, woodMat);
box(house, -1, 0.9, -1.8, 1.8, 0.12, 1.2, mat(0x302f2b));
for (const x of [-7.5, 7.5]) {
  cylinder(house, x, 1.25, -1, 0.38, 0.52, 1.7, mat(0x575e51), 8);
  sphere(house, x, 2.2, -1, 0.72, leafMat, 9, 7);
}

// Ground-floor windows
for (const x of [-8.4, -5.6, 5.6, 8.4]) {
  box(house, x, 2.45, 8.245, 2.05, 2.25, 0.08, glassMat, false);
  box(house, x, 2.45, 8.3, 0.075, 2.35, 0.08, trimMat, false, false);
  box(house, x, 2.45, 8.3, 2.15, 0.075, 0.08, trimMat, false, false);
}

// Second floor
// Upper-floor slab is split around an open stairwell so the staircase is walkable.
box(house, -3.15, 4.7, -1, 18.5, 0.3, 20.2, trimMat);
box(house, 11.15, 4.7, -1, 2.5, 0.3, 20.2, trimMat);
box(house, 8.0, 4.7, 6.1, 3.7, 0.3, 5.2, trimMat);
box(house, 8.0, 4.7, -8.65, 3.7, 0.3, 2.7, trimMat);
box(house, 8.0, 4.73, -7.55, 3.25, 0.12, 1.1, mat(0xbeb9a9));

// Open staircase with individually modelled treads and a sloped handrail.
for (let i = 0; i < 15; i++) {
  const step = box(house, 8.0, 0.22 + i * 0.30, 3.25 - i * 0.70, 2.55, 0.25, 0.72, mat(0xb9b4a6));
  box(house, 8.0, 0.355 + i * 0.30, 3.25 - i * 0.70, 2.48, 0.035, 0.68, mat(0xddd8c9), false, false);
}
const stairRail = box(house, 6.63, 2.50, -1.8, 0.13, 0.13, 11.0, woodMat);
stairRail.rotation.x = 0.405;
const stairRail2 = box(house, 9.37, 2.50, -1.8, 0.13, 0.13, 11.0, woodMat);
stairRail2.rotation.x = 0.405;
for (let i = 0; i < 8; i++) {
  const z = 2.9 - i * 1.45, y = 0.55 + i * 0.59;
  box(house, 6.63, y, z, 0.09, 0.9, 0.09, trimMat);
  box(house, 9.37, y, z, 0.09, 0.9, 0.09, trimMat);
}

// Upper landing and bedroom furniture.
box(house, -5.2, 4.91, -2.0, 7.4, 0.055, 6.6, mat(0x8d8475), false, false);
box(house, -5.2, 5.18, -1.1, 4.0, 0.48, 5.0, woodMat);
box(house, -5.2, 5.48, -1.0, 3.85, 0.25, 4.75, mat(0xe0ddd2));
box(house, -5.2, 5.65, -1.1, 3.7, 0.18, 4.25, whiteMat);
box(house, -5.2, 5.55, -3.55, 4.2, 1.45, 0.22, woodMat);
for (const x of [-7.75, -2.65]) {
  box(house, x, 5.18, -3.3, 0.85, 0.62, 0.85, woodMat);
  cylinder(house, x, 5.75, -3.3, 0.16, 0.16, 0.16, goldMat, 10);
  const lamp = createManagedPointLight(0xffd29b, 0.35, 5);
  lamp.position.set(x, 6.2, -3.3); house.add(lamp);
}
box(house, -10.2, 6.15, 1.0, 2.6, 2.4, 1.0, mat(0x77786e));
for (let i = 0; i < 3; i++) box(house, -10.2, 5.5 + i * 0.65, 1.54, 2.5, 0.045, 0.08, goldMat);

// Upstairs study nook.
box(house, 2.7, 5.2, -4.2, 3.8, 0.18, 1.5, woodMat);
for (const x of [1.2, 4.2]) box(house, x, 5.0, -4.2, 0.12, 0.45, 0.12, trimMat);
box(house, 2.7, 6.35, -4.8, 3.0, 2.0, 0.16, trimMat);
box(house, 2.7, 6.35, -4.68, 2.75, 1.75, 0.05, mat(0x253c3d));
box(house, 2.7, 6.1, -3.25, 1.1, 0.85, 0.95, mat(0x6d7468));

// Balcony-side lounge seating.
box(house, 1.7, 5.15, 6.4, 3.2, 0.35, 1.0, mat(0x68766b));
box(house, 1.7, 5.75, 6.85, 3.2, 1.0, 0.25, mat(0x68766b));
box(house, 1.7, 5.37, 6.4, 2.85, 0.12, 0.9, mat(0xb7b4a7));

// Ground-floor living area dressing.
const rug = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 7.0), mat(0x827d70));
rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.225, -2.2); rug.receiveShadow = true; house.add(rug);
box(house, -4.15, 0.67, -2.2, 1.45, 0.76, 1.3, mat(0x6e786d));
box(house, -4.15, 1.08, -2.2, 1.5, 0.16, 1.35, mat(0x929b8b));
box(house, 2.25, 0.67, -2.2, 1.45, 0.76, 1.3, mat(0x6e786d));
box(house, 2.25, 1.08, -2.2, 1.5, 0.16, 1.35, mat(0x929b8b));

// Media wall and television.
box(house, -1.0, 2.15, -9.55, 5.6, 2.65, 0.22, woodMat);
const tvScreenMat = new THREE.MeshStandardMaterial({ color: 0x101b20, emissive: 0x0d1d24, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.15 });
box(house, -1.0, 2.22, -9.40, 4.75, 2.24, 0.055, tvScreenMat, false, false);
box(house, -1.0, 0.55, -9.05, 5.9, 0.55, 0.72, woodMat);
box(house, -1.0, 0.86, -8.68, 5.7, 0.08, 0.65, goldMat, false, false);
const tvGlow = createManagedPointLight(0x79b9d0, 0, 7);
tvGlow.position.set(-1.0, 2.0, -7.9); house.add(tvGlow);

// Open-plan dining room.
box(house, 5.5, 0.85, -2.9, 4.2, 0.18, 2.5, woodMat);
for (const x of [3.8, 7.2]) for (const z of [-3.8, -2.0]) box(house, x, 0.45, z, 0.14, 0.82, 0.14, trimMat);
function diningChair(x, z, angle = 0) {
  const chair = group(house, x, 0, z); chair.rotation.y = angle;
  box(chair, 0, 0.55, 0, 0.92, 0.18, 0.9, mat(0x6b5340));
  box(chair, 0, 1.05, -0.36, 0.92, 0.95, 0.16, woodMat);
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.31, 0.31]) box(chair, dx, 0.27, dz, 0.09, 0.56, 0.09, trimMat);
}
diningChair(5.5, -4.45, 0); diningChair(5.5, -1.35, Math.PI);
diningChair(3.0, -2.9, Math.PI / 2); diningChair(8.0, -2.9, -Math.PI / 2);
cylinder(house, 5.5, 3.05, -2.9, 0.055, 0.055, 1.6, goldMat, 8);
const diningLamp = createManagedPointLight(0xffd7a0, 1.0, 10);
diningLamp.position.set(5.5, 2.5, -2.9); house.add(diningLamp);

// Contemporary kitchen along the left wall.
box(house, -10.3, 0.65, -5.2, 2.45, 1.2, 7.2, mat(0x777d74));
box(house, -10.3, 1.31, -5.2, 2.65, 0.12, 7.4, mat(0xc7c5ba));
for (const z of [-7.7, -5.8, -3.9]) {
  box(house, -8.94, 0.72, z, 0.035, 0.72, 1.55, trimMat, false, false);
  cylinder(house, -8.88, 1.1, z, 0.035, 0.035, 0.12, goldMat, 8);
}
box(house, -10.3, 2.8, -6.3, 2.4, 1.45, 0.42, mat(0x777d74));
for (const z of [-7.1, -5.5]) box(house, -8.99, 2.8, z, 0.035, 1.2, 0.035, goldMat, false, false);
box(house, -10.3, 1.4, -1.6, 1.7, 2.5, 1.5, mat(0x9da7a3));
box(house, -10.3, 1.45, -0.82, 1.55, 2.35, 0.08, mat(0xd9ded8));
box(house, -10.3, 2.45, -0.76, 0.08, 0.08, 0.08, goldMat);

// Kitchen island and induction cooktop.
box(house, -6.5, 0.62, -7.1, 3.2, 1.1, 1.65, mat(0x666e68));
box(house, -6.5, 1.22, -7.1, 3.35, 0.12, 1.78, mat(0xd0cdc2));
for (const x of [-7.1, -6.0]) cylinder(house, x, 1.295, -7.1, 0.31, 0.31, 0.025, trimMat, 24);
box(house, -6.5, 1.4, -6.45, 1.15, 0.22, 0.15, goldMat, false, false);

// Fridge door group for a simple open/close animation.
const fridgeDoor = group(house, -10.95, 0.2, -0.82);
box(fridgeDoor, 0.34, 1.24, 0.13, 0.68, 2.36, 0.13, mat(0xdde2dc));
box(fridgeDoor, 0.57, 1.3, 0.055, 0.055, 0.55, 0.06, trimMat);
box(house, -10.57, 2.65, -1.0, 0.72, 0.12, 0.75, whiteMat, false, false);

// Compact bathroom nook with shower, toilet, vanity and a walk-in opening.
const bathWallMat = mat(0xd5d9d0, 0.82);
const bathTileMat = mat(0x8d9d8c, 0.92);
box(house, 7.2, 1.55, -7.15, 0.18, 3.1, 5.1, bathWallMat);
box(house, 7.65, 1.55, -4.62, 0.9, 3.1, 0.18, bathWallMat);
box(house, 10.2, 1.55, -4.62, 1.4, 3.1, 0.18, bathWallMat);
box(house, 7.65, 1.55, -9.55, 0.9, 3.1, 0.18, bathWallMat);
box(house, 10.8, 1.55, -9.55, 1.6, 3.1, 0.18, bathWallMat);
box(house, 9.45, 0.235, -7.1, 4.3, 0.055, 4.75, bathTileMat, false, true);
// Shower tray, glass screen and chrome hardware.
box(house, 10.45, 0.36, -8.25, 2.05, 0.16, 2.05, whiteMat);
box(house, 9.38, 1.28, -8.25, 0.055, 1.8, 2.05, glassMat, false, false);
box(house, 10.42, 1.28, -9.25, 2.0, 1.8, 0.055, glassMat, false, false);
cylinder(house, 10.9, 2.45, -8.95, 0.055, 0.055, 0.65, trimMat, 10);
cylinder(house, 10.9, 2.12, -8.95, 0.24, 0.24, 0.06, trimMat, 16);
// Toilet and cistern.
box(house, 8.12, 0.72, -8.15, 0.86, 0.82, 1.05, whiteMat);
box(house, 8.12, 1.2, -8.72, 0.8, 0.92, 0.24, whiteMat);
cylinder(house, 8.12, 1.16, -8.08, 0.36, 0.36, 0.12, bathTileMat, 18);
// Floating vanity and basin.
box(house, 9.55, 0.88, -5.45, 1.25, 0.28, 0.62, woodMat);
box(house, 9.55, 1.1, -5.45, 1.32, 0.12, 0.68, whiteMat);
box(house, 9.55, 1.28, -5.45, 0.48, 0.13, 0.32, bathTileMat);
cylinder(house, 9.55, 1.48, -5.63, 0.035, 0.035, 0.35, trimMat, 8);
box(house, 9.55, 2.1, -5.94, 0.88, 1.0, 0.07, glassMat, false, false);

// Decorative wall art and warm floor lamp.
box(house, 4.6, 2.75, -9.70, 2.0, 1.7, 0.08, goldMat, false, false);
box(house, 4.6, 2.75, -9.63, 1.78, 1.48, 0.06, mat(0x66796f), false, false);
cylinder(house, -5.3, 1.25, 1.5, 0.07, 0.07, 2.1, goldMat, 8);
sphere(house, -5.3, 2.42, 1.5, 0.38, whiteMat, 10, 8);
const floorLamp = createManagedPointLight(0xffc984, 0.55, 8);
floorLamp.position.set(-5.3, 2.2, 1.5); house.add(floorLamp);
// A visible wall switch beside the entrance controls the main interior lights.
box(house, -11.73, 1.45, 3.8, 0.08, 0.58, 0.38, whiteMat, false, false);
box(house, -11.66, 1.45, 3.8, 0.045, 0.22, 0.12, goldMat, false, false);

// Ceiling pendants and switch-controlled warm lights.
for (const [x,z] of [[-1,-2.5],[5.5,-2.9],[-7,-6]]) {
  cylinder(house, x, 4.05, z, 0.035, 0.035, 0.95, trimMat, 8);
  sphere(house, x, 3.52, z, 0.23, goldMat, 10, 8);
}
const interiorLights = [];
for (const [x,y,z,power,range] of [[-1,3.6,-2.5,1.25,11],[5.5,3.4,-2.9,1.1,10],[-7,3.5,-6,0.9,9]]) {
  const light = createManagedPointLight(0xffd4a1, power, range);
  light.position.set(x,y,z); house.add(light); interiorLights.push(light);
}
const interiorAccent = createManagedPointLight(0xffc77d, 0, 15);
interiorAccent.position.set(0,3.2,3.5); house.add(interiorAccent);

box(house, -12, 6.7, -1, 0.42, 4.0, 18, wallMat);
box(house, 12, 6.7, -1, 0.42, 4.0, 18, wallMat);
box(house, 0, 6.7, -10, 24, 4.0, 0.42, wallMat);
box(house, 0, 6.7, 8, 24, 4.0, 0.42, wallMat);
box(house, 0, 8.78, -1, 26.4, 0.28, 21.2, trimMat);
box(house, 0, 8.98, -1, 25.8, 0.12, 20.6, wallMat);

// Modern upper glass façade and balcony
box(house, -6.2, 6.75, 8.235, 9.6, 2.65, 0.08, glassMat, false);
box(house, 6.2, 6.75, 8.235, 9.6, 2.65, 0.08, glassMat, false);
for (const x of [-10.95, -8, -4.4, 4.4, 8, 10.95]) box(house, x, 6.75, 8.3, 0.1, 2.85, 0.12, trimMat, false, false);
box(house, 0, 5.0, 9.3, 16.5, 0.24, 3.4, mat(0xbab8ad));
box(house, 0, 5.9, 10.85, 16.2, 1.7, 0.12, glassMat, false);
box(house, 0, 5.0, 10.85, 16.4, 0.12, 0.15, trimMat, false, false);
for (let x = -8; x <= 8; x += 2) box(house, x, 5.9, 10.85, 0.08, 1.7, 0.16, trimMat, false, false);

// Accent volume and roof pergola
box(house, -8.7, 6.6, -2, 6.2, 4.1, 8.8, darkWallMat);
box(house, -8.7, 8.72, -2, 6.55, 0.18, 9.1, whiteMat);
for (const x of [5.4, 8.4, 11.4]) box(house, x, 10.1, -2.5, 0.16, 2.2, 7, woodMat);
box(house, 8.4, 11.2, -2.5, 6.3, 0.18, 7.2, woodMat);

// Double front doors
const leftDoor = group(house, -2.18, 0.22, 8.4);
box(leftDoor, 0.98, 1.77, 0, 1.96, 3.54, 0.18, woodMat);
box(leftDoor, 0.98, 1.77, -0.105, 1.55, 2.8, 0.025, mat(0x876748), false, false);
sphere(leftDoor, 1.68, 1.8, -0.16, 0.075, goldMat, 8, 6);
const rightDoor = group(house, 2.18, 0.22, 8.4);
box(rightDoor, -0.98, 1.77, 0, 1.96, 3.54, 0.18, woodMat);
box(rightDoor, -0.98, 1.77, -0.105, 1.55, 2.8, 0.025, mat(0x876748), false, false);
sphere(rightDoor, -1.68, 1.8, -0.16, 0.075, goldMat, 8, 6);

// Wall lights
for (const x of [-10.3, 10.3]) {
  box(house, x, 2.45, 8.32, 0.28, 0.6, 0.16, goldMat);
  const lamp = createManagedPointLight(0xffd9a2, 0.35, 8);
  lamp.position.set(x, 2.5, 8.8);
  scene.add(lamp);
}

// Pool terrace and water
box(scene, 20, 0.05, -1, 12, 0.22, 19, mat(0xa9a99b));
box(scene, 20, 0.18, -1, 10.5, 0.08, 17.5, mat(0x344c4e));
const water = new THREE.Mesh(new THREE.PlaneGeometry(10.1, 17.1), createSurfaceMaterial({ color: 0x4d9dac, roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.84 }));
water.rotation.x = -Math.PI / 2;
water.position.set(20, 0.27, -1);
scene.add(water);
for (const x of [14.2, 25.8]) box(scene, x, 0.45, -1, 0.18, 0.7, 19, whiteMat);
for (const z of [-10.4, 8.4]) box(scene, 20, 0.45, z, 11.8, 0.7, 0.18, whiteMat);

// Loungers
function lounger(x, z, rotation = 0) {
  const g = group(scene, x, 0, z); g.rotation.y = rotation;
  box(g, 0, 0.35, 0, 1.0, 0.16, 2.0, whiteMat);
  box(g, 0, 0.65, -0.65, 1.0, 0.7, 0.15, whiteMat).rotation.x = -0.18;
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.75, 0.75]) cylinder(g, dx, 0.18, dz, 0.045, 0.045, 0.42, trimMat, 6);
}
lounger(28.5, -5, -0.3); lounger(28.5, 0.5, -0.3);

// Trees and shrubs
function tree(x, z, scale = 1) {
  const g = group(scene, x, 0, z); g.scale.setScalar(scale);
  cylinder(g, 0, 1.8, 0, 0.34, 0.52, 3.6, mat(0x68513b), 8);
  sphere(g, 0, 4.0, 0, 1.9, leafMat, 10, 8);
  sphere(g, -0.9, 3.5, 0.2, 1.25, leafLightMat, 9, 7);
  sphere(g, 0.9, 3.45, -0.25, 1.3, leafMat, 9, 7);
}
for (const p of [[-24,15,1.15],[-29,-8,1.45],[30,17,1.25],[34,-16,1.35],[-34,-31,1.5],[35,34,1.4],[-40,36,1.25],[43,-35,1.5],[-20,-37,1.1],[23,-38,1.2]]) tree(...p);
for (let x = -20; x <= 20; x += 4) {
  sphere(scene, x, 0.58, 17, 0.72, x % 2 ? leafMat : leafLightMat, 8, 6);
}
for (let x = -20; x <= 20; x += 4) {
  sphere(scene, x, 0.58, -16, 0.72, leafMat, 8, 6);
}

// Garden spotlights
const gardenLights = [];
for (const [x,z] of [[-13,15],[13,15],[-19,27],[19,27],[-13,-18],[13,-18]]) {
  cylinder(scene, x, 0.55, z, 0.11, 0.11, 1.1, trimMat, 8);
  sphere(scene, x, 1.15, z, 0.18, goldMat, 8, 6);
  const light = createManagedPointLight(0xffc77d, 0, 8);
  light.position.set(x,1.2,z); scene.add(light); gardenLights.push(light);
}

// Small destination props make each NPC hangout spot feel intentional.
function outdoorBench(x, z, rotation = 0) {
  const g = group(scene, x, 0, z); g.rotation.y = rotation;
  box(g, 0, 0.62, 0, 2.15, 0.18, 0.62, woodMat);
  box(g, 0, 1.22, -0.25, 2.15, 1.05, 0.16, woodMat);
  for (const px of [-0.88, 0.88]) {
    box(g, px, 0.3, 0, 0.13, 0.6, 0.13, trimMat);
    box(g, px, 0.92, -0.25, 0.13, 0.75, 0.13, trimMat);
  }
  return g;
}
outdoorBench(-18.6, 18.2, Math.PI / 2);
// Poolside sun lounger, placed just off the NPC's arrival point.
const poolLounger = group(scene, 34.4, 0, 18.4); poolLounger.rotation.y = -0.22;
box(poolLounger, 0, 0.34, 0, 1.05, 0.16, 2.15, mat(0xd8d0bd));
const loungerBack = box(poolLounger, 0, 0.72, -0.72, 1.05, 0.16, 0.82, mat(0xd8d0bd)); loungerBack.rotation.x = -0.42;
for (const px of [-0.42, 0.42]) for (const pz of [-0.72, 0.72]) box(poolLounger, px, 0.18, pz, 0.08, 0.36, 0.08, trimMat);
// Coffee nook: a compact round table and two stools beside the stroll route.
cylinder(scene, 4.5, 0.82, 14.2, 0.78, 0.78, 0.12, woodMat, 16);
cylinder(scene, 4.5, 0.4, 14.2, 0.12, 0.16, 0.78, trimMat, 12);
for (const px of [2.9, 6.1]) {
  cylinder(scene, px, 0.48, 14.2, 0.38, 0.38, 0.12, mat(0x6d796e), 12);
  cylinder(scene, px, 0.23, 14.2, 0.09, 0.12, 0.46, trimMat, 10);
}

// Collision solids for the residence perimeter
const colliders = [
  { minX:-12.3,maxX:-11.7,minZ:-10,maxZ:8.4 },
  { minX:11.7,maxX:12.3,minZ:-10,maxZ:8.4 },
  { minX:-12,maxX:12,minZ:-10.3,maxZ:-9.7 },
  { minX:-12,maxX:-2.5,minZ:7.7,maxZ:8.35 },
  { minX:2.5,maxX:12,minZ:7.7,maxZ:8.35 },
  { minX:-13,maxX:13,minZ:-10.6,maxZ:-10.0 },
  { minX:7.08,maxX:7.32,minZ:-9.75,maxZ:-4.55 },
  { minX:7.15,maxX:8.2,minZ:-4.75,maxZ:-4.5 },
  { minX:9.5,maxX:11.75,minZ:-4.75,maxZ:-4.5 },
  { minX:7.1,maxX:8.15,minZ:-9.72,maxZ:-9.48 },
  { minX:10.0,maxX:11.75,minZ:-9.72,maxZ:-9.48 },
];
const westWallCollider = colliders[0];
// Physical north gate: two wall spans leave a 13.6m vehicle opening.
colliders.push(
  { minX:-53, maxX:-6.8, minZ:107.65, maxZ:108.35 },
  { minX:6.8, maxX:53, minZ:107.65, maxZ:108.35 }
);

// Drivable estate car: low-poly luxury SUV with lights, glass and animated wheels.
box(scene, 6.5, 0.035, 34, 8.2, 0.12, 12.0, mat(0xa9a99f), false, true);
for (const x of [2.7, 10.3]) box(scene, x, 0.105, 34, 0.11, 0.018, 11.5, whiteMat, false, false);
const vehicle = group(scene, 6.5, 0, 34);
const vehicleDustGeometry = new THREE.SphereGeometry(0.14, 7, 5);
const vehicleDustParticles = Array.from({ length: 12 }, () => {
  const material = new THREE.MeshBasicMaterial({ color: 0xb3aa99, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(vehicleDustGeometry, material);
  mesh.visible = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  return { mesh, material, life: 0, maxLife: 0, velocity: new THREE.Vector3() };
});
let vehicleDustCursor = 0;
let vehicleDustEmitTimer = 0;
const vehicleCarModel=group(vehicle);
const vehicleBody = group(vehicleCarModel);
const vehiclePaint = new THREE.MeshStandardMaterial({ color: 0x263b3b, roughness: 0.28, metalness: 0.58 });
const vehicleGarageState={built:false,engine:0,handling:0,efficiency:0,paint:'midnight'};
const vehiclePaintOptions={
  midnight:{name:'Midnight Teal',hex:0x263b3b,price:0},
  ivory:{name:'Pearl Ivory',hex:0xd7d1bd,price:220},
  ocean:{name:'Ocean Blue',hex:0x426f86,price:220},
  burgundy:{name:'Deep Burgundy',hex:0x693b43,price:220},
  sage:{name:'Sage Green',hex:0x71816b,price:220}
};
function applyVehiclePaint(){vehiclePaint.color.setHex(vehiclePaintOptions[vehicleGarageState.paint]?.hex??vehiclePaintOptions.midnight.hex);}
const vehicleGlass = createSurfaceMaterial({ color: 0x9dbdc0, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.52 });
const tireMat = mat(0x202426, 0.92);
const hubMat = mat(0xb6b6aa, 0.32, 0.78);
const vehicleBrakeMat = new THREE.MeshStandardMaterial({ color: 0x8d3930, emissive: 0x6d100b, emissiveIntensity: 0.35, roughness: 0.38 });
box(vehicleBody, 0, 0.82, 0, 2.18, 0.66, 4.65, vehiclePaint);
box(vehicleBody, 0, 1.35, -0.2, 1.92, 0.92, 2.45, vehiclePaint);
box(vehicleBody, 0, 1.42, -0.2, 1.78, 0.78, 2.28, vehicleGlass, false, false);
box(vehicleBody, 0, 0.96, -1.85, 2.05, 0.28, 0.78, vehiclePaint);
box(vehicleBody, 0, 0.98, 1.78, 2.05, 0.3, 0.7, vehiclePaint);
for (const x of [-0.99, 0.99]) {
  box(vehicleBody, x, 1.05, -0.2, 0.065, 0.92, 2.4, trimMat, false, false);
  box(vehicleBody, x, 1.0, -1.42, 0.045, 0.52, 0.09, goldMat, false, false);
  box(vehicleBody, x, 0.99, 1.48, 0.09, 0.3, 0.09, vehicleBrakeMat, false, false);
}
const vehicleWheels = [], vehicleFrontWheelPivots = [];
for (const x of [-1.13, 1.13]) for (const z of [-1.48, 1.48]) {
  const pivot = group(vehicleCarModel, x, 0.48, z);
  const wheel = cylinder(pivot, 0, 0, 0, 0.43, 0.43, 0.25, tireMat, 16);
  wheel.rotation.z = Math.PI / 2;
  vehicleWheels.push(wheel);
  const hub = cylinder(pivot, x > 0 ? 0.035 : -0.035, 0, 0, 0.22, 0.22, 0.035, hubMat, 12);
  hub.rotation.z = Math.PI / 2;
  if (z < 0) vehicleFrontWheelPivots.push(pivot);
}
const vehicleHeadlights = [];
for (const x of [-0.72, 0.72]) {
  const headlamp = createManagedPointLight(0xffe7bb, 0, 16);
  headlamp.position.set(x, 0.95, -2.3); vehicleBody.add(headlamp); vehicleHeadlights.push(headlamp);
}
const vehicleBrakeLights = [];
for (const x of [-0.82, 0.82]) {
  const light = createManagedPointLight(0xff3322, 0, 4.5, 2);
  light.position.set(x, 0.9, 2.28); vehicleBody.add(light); vehicleBrakeLights.push(light);
}
const vehicleShadow = new THREE.Mesh(new THREE.CircleGeometry(1.65, 24), new THREE.MeshBasicMaterial({color:0x17211e,transparent:true,opacity:0.16,depthWrite:false}));
vehicleShadow.rotation.x = -Math.PI / 2; vehicleShadow.position.y = 0.025; vehicleShadow.scale.set(1,1.65,1); vehicleCarModel.add(vehicleShadow);
vehicleCarModel.visible=true;

// A complete low-poly sport motorcycle shares the vehicle controller but has its own silhouette and response.
const vehicleMotorcycleModel=group(vehicle);vehicleMotorcycleModel.visible=false;
const motorcycleFrameMat=mat(0x343e3c,0.48,0.52),motorcycleMetalMat=mat(0xabb9b2,0.3,0.76),motorcycleRubberMat=mat(0x171b1b,0.94),motorcycleSeatMat=mat(0x242b2a,0.74),motorcycleEngineMat=mat(0x6e7772,0.55,0.62);
const motorcycleChassis=group(vehicleMotorcycleModel);
const bikeRearWheelPivot=group(vehicleMotorcycleModel,0,0.49,1.18);
const bikeRearWheel=cylinder(bikeRearWheelPivot,0,0,0,0.43,0.43,0.19,motorcycleRubberMat,18);bikeRearWheel.rotation.z=Math.PI/2;
const bikeRearHub=cylinder(bikeRearWheelPivot,0,0,0,0.19,0.19,0.205,motorcycleMetalMat,12);bikeRearHub.rotation.z=Math.PI/2;
const motorcycleSteering=group(vehicleMotorcycleModel,0,0.77,-0.88);
const bikeFrontWheelPivot=group(motorcycleSteering,0,-0.25,-0.31);
const bikeFrontWheel=cylinder(bikeFrontWheelPivot,0,0,0,0.43,0.43,0.19,motorcycleRubberMat,18);bikeFrontWheel.rotation.z=Math.PI/2;
const bikeFrontHub=cylinder(bikeFrontWheelPivot,0,0,0,0.19,0.19,0.205,motorcycleMetalMat,12);bikeFrontHub.rotation.z=Math.PI/2;
// Twin front forks, rear swingarm, compact engine and exhaust.
for(const x of [-0.13,0.13]){const fork=box(motorcycleSteering,x,-0.02,-0.2,0.075,0.78,0.09,motorcycleMetalMat);fork.rotation.x=-0.15;}
const swingarm=box(motorcycleChassis,0,0.55,0.83,0.13,0.13,1.0,motorcycleMetalMat);swingarm.rotation.x=-0.34;
const bikeMainFrame=box(motorcycleChassis,0,0.92,0.05,0.16,0.16,1.75,motorcycleFrameMat);bikeMainFrame.rotation.x=-0.12;
const bikeLowerFrame=box(motorcycleChassis,0,0.72,0.15,0.13,0.13,1.2,motorcycleMetalMat);bikeLowerFrame.rotation.x=0.18;
const bikeFuelTank=sphere(motorcycleChassis,0,1.2,-0.2,0.42,vehiclePaint,16,12);bikeFuelTank.scale.set(0.88,0.72,1.23);
const bikeSeat=box(motorcycleChassis,0,1.43,0.57,0.62,0.19,0.88,motorcycleSeatMat);bikeSeat.rotation.x=-0.08;
const bikeTail=box(motorcycleChassis,0,1.35,1.1,0.48,0.16,0.54,vehiclePaint);bikeTail.rotation.x=0.12;
const bikeEngine=cylinder(motorcycleChassis,0,0.78,0.18,0.34,0.34,0.44,motorcycleEngineMat,14);bikeEngine.rotation.z=Math.PI/2;
const bikeEngineCap=cylinder(motorcycleChassis,0.235,0.78,0.18,0.22,0.22,0.035,motorcycleMetalMat,14);bikeEngineCap.rotation.z=Math.PI/2;
const bikeExhaust=cylinder(motorcycleChassis,0.28,0.62,0.58,0.105,0.14,1.15,motorcycleMetalMat,12);bikeExhaust.rotation.x=Math.PI/2;bikeExhaust.rotation.z=-0.12;
const bikeHandlebar=box(motorcycleSteering,0,0.28,-0.03,1.0,0.075,0.09,motorcycleMetalMat);
for(const x of [-0.52,0.52]){const grip=cylinder(motorcycleSteering,x,0.28,-0.03,0.075,0.075,0.22,motorcycleSeatMat,10);grip.rotation.z=Math.PI/2;}
const bikeHeadlamp=sphere(motorcycleSteering,0,0.03,-0.23,0.2,mat(0xe8dfbb,0.22,0.15),12,8);bikeHeadlamp.scale.set(1.05,0.85,0.65);
const motorcycleHeadlight=createManagedPointLight(0xffe8bc,0,17,2);motorcycleHeadlight.position.set(0,0.03,-0.37);motorcycleSteering.add(motorcycleHeadlight);
const bikeMirrorLeft=group(motorcycleSteering,-0.38,0.35,-0.02),bikeMirrorRight=group(motorcycleSteering,0.38,0.35,-0.02);
for(const mirror of [bikeMirrorLeft,bikeMirrorRight]){const stem=box(mirror,0,0.09,-0.12,0.035,0.24,0.035,motorcycleMetalMat);stem.rotation.x=-0.35;sphere(mirror,0,0.22,-0.18,0.095,motorcycleMetalMat,10,7);}
const bikeBrakeLens=sphere(motorcycleChassis,0,1.42,1.39,0.13,vehicleBrakeMat,10,7);bikeBrakeLens.scale.set(1.3,0.65,0.55);
const motorcycleBrakeLight=createManagedPointLight(0xff3022,0,3.8,2);motorcycleBrakeLight.position.set(0,1.36,1.43);motorcycleChassis.add(motorcycleBrakeLight);
const motorcycleShadow=new THREE.Mesh(new THREE.CircleGeometry(0.95,20),new THREE.MeshBasicMaterial({color:0x17211e,transparent:true,opacity:0.18,depthWrite:false}));motorcycleShadow.rotation.x=-Math.PI/2;motorcycleShadow.position.y=0.027;motorcycleShadow.scale.set(0.82,1.75,1);vehicleMotorcycleModel.add(motorcycleShadow);
const motorcycleRider=group(motorcycleChassis);motorcycleRider.visible=false;
const riderSuitMat=mat(0x33453f,0.72,0.08),riderTrimMat=mat(0xc4b38a,0.58,0.18),riderBootMat=mat(0x222829,0.82),riderHelmetMat=mat(0xd9d1bc,0.26,0.32),riderVisorMat=createSurfaceMaterial({color:0x243b42,roughness:0.16,metalness:0.35,transparent:true,opacity:0.88});
// Seated riding posture: tucked torso, hands on the bar and bent legs resting on the pegs.
const riderPelvis=box(motorcycleRider,0,1.58,0.38,0.56,0.32,0.46,riderSuitMat);riderPelvis.rotation.x=-0.12;
const riderTorso=box(motorcycleRider,0,2.0,0.12,0.66,0.78,0.43,riderSuitMat);riderTorso.rotation.x=-0.28;
const riderChestStripe=box(motorcycleRider,0,2.02,-0.106,0.38,0.1,0.025,riderTrimMat,false,false);riderChestStripe.rotation.x=-0.28;
const riderNeck=cylinder(motorcycleRider,0,2.35,-0.01,0.11,0.12,0.18,riderSuitMat,10);
sphere(motorcycleRider,0,2.59,-0.06,0.255,riderHelmetMat,14,10);
const riderVisor=box(motorcycleRider,0,2.6,-0.275,0.36,0.15,0.045,riderVisorMat,false,false);riderVisor.rotation.x=-0.08;
for(const side of [-1,1]){
  const upperArm=box(motorcycleRider,side*0.34,1.87,-0.18,0.19,0.46,0.2,riderSuitMat);upperArm.rotation.x=-0.68;upperArm.rotation.z=side*0.12;
  const foreArm=box(motorcycleRider,side*0.45,1.43,-0.49,0.17,0.48,0.18,riderSuitMat);foreArm.rotation.x=-0.58;foreArm.rotation.z=-side*0.08;
  sphere(motorcycleRider,side*0.49,1.14,-0.82,0.12,riderBootMat,10,7);
  const thigh=box(motorcycleRider,side*0.22,1.36,0.52,0.23,0.48,0.28,riderSuitMat);thigh.rotation.x=0.42;thigh.rotation.z=-side*0.08;
  const shin=box(motorcycleRider,side*0.25,0.94,0.83,0.19,0.43,0.22,riderSuitMat);shin.rotation.x=-0.45;
  const boot=box(motorcycleRider,side*0.27,0.68,1.04,0.25,0.17,0.4,riderBootMat);boot.rotation.x=-0.16;
}



// Prototype 37 — a walkable neighbourhood beyond the estate gate.
const districtRoadMat = mat(0x4c5552, 0.96);
const districtSidewalkMat = mat(0xbab8ac, 0.94);
const districtMarkingMat = mat(0xe2ddc7, 0.72);
const districtWallMat = mat(0xe2dfd4, 0.84);
const districtTrimMat = mat(0x35423e, 0.44, 0.2);
const districtGlassMat = createSurfaceMaterial({ color:0x91b9bb, roughness:0.18, metalness:0.16, transparent:true, opacity:0.48 });
const districtWoodMat = mat(0x765a43, 0.66);
const districtStreetLights = [];

// Northbound boulevard and the cross street connect the gate to both local businesses.
box(scene, 0, -0.025, 77.5, 13.5, 0.12, 60, districtRoadMat);
box(scene, 0, 0.012, 77.5, 0.12, 0.015, 59, districtMarkingMat, false, false);
box(scene, 0, -0.018, 76, 88, 0.12, 9.5, districtRoadMat);
for (const x of [-40,-35,-30,-25,-20,-15,-10,-5,5,10,15,20,25,30,35,40]) {
  box(scene, x, 0.055, 76, 0.12, 0.018, 5.8, districtMarkingMat, false, false);
}
for (const x of [-8.4,8.4]) box(scene, x, 0.025, 77.5, 0.72, 0.07, 59, districtSidewalkMat);
for (const z of [70.8,81.5]) box(scene, 0, 0.035, z, 88, 0.08, 0.85, districtSidewalkMat);
// A short side lane and parking bays serve both shop entrances.
for (const x of [-25,25]) {
  box(scene, x, 0.0, 78.9, 13.2, 0.10, 3.6, districtRoadMat);
  for (const dx of [-5.3,-1.8,1.8,5.3]) box(scene, x+dx, 0.075, 78.9, 0.075, 0.018, 3.0, districtMarkingMat, false, false);
}

function districtSign(x, y, z, title, subtitle, background = '#263b38') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0,0,512,128);
  ctx.strokeStyle = '#c8b78d'; ctx.lineWidth = 5; ctx.strokeRect(7,7,498,114);
  ctx.fillStyle = '#f1eee3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 48px Georgia'; ctx.fillText(title,256,52);
  ctx.fillStyle = '#c8d4b5'; ctx.font = '19px monospace'; ctx.fillText(subtitle,256,94);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture, transparent:false, depthWrite:true}));
  sprite.userData.repaint = (nextTitle, nextSubtitle, nextBackground = background) => {
    ctx.clearRect(0,0,512,128);ctx.fillStyle=nextBackground;ctx.fillRect(0,0,512,128);ctx.strokeStyle='#c8b78d';ctx.lineWidth=5;ctx.strokeRect(7,7,498,114);
    ctx.fillStyle='#f1eee3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 48px Georgia';ctx.fillText(nextTitle,256,52);
    ctx.fillStyle='#c8d4b5';ctx.font='19px monospace';ctx.fillText(nextSubtitle,256,94);texture.needsUpdate=true;
  };
  sprite.position.set(x,y,z); sprite.scale.set(6.2,1.55,1); scene.add(sprite); return sprite;
}

function buildDistrictShop({centerX, centerZ, name, subtitle, signColor, accentColor, kind}) {
  const width = 18, depth = 13, frontZ = centerZ - depth/2, backZ = centerZ + depth/2;
  const leftX = centerX-width/2, rightX=centerX+width/2;
  const shell = group(scene, centerX, 0, centerZ);
  const floor = box(shell,0,0.13,0,width-0.5,0.22,depth-0.5,mat(0xbdb9aa),false,true);
  // Rear and side walls; the front facade leaves a wide, traversable doorway.
  box(shell,0,2.35,depth/2,width,4.5,0.48,districtWallMat);
  box(shell,-width/2,2.35,0,0.48,4.5,depth,districtWallMat);
  box(shell,width/2,2.35,0,0.48,4.5,depth,districtWallMat);
  box(shell,-6.6,2.35,-depth/2,4.8,4.5,0.48,districtWallMat);
  box(shell,6.6,2.35,-depth/2,4.8,4.5,0.48,districtWallMat);
  box(shell,0,4.7,0,width+0.6,0.5,depth+0.6,districtTrimMat);
  box(shell,0,4.98,0,width+0.8,0.12,depth+0.8,whiteMat,false,false);
  // Display windows flank the entrance.
  for (const side of [-1,1]) {
    box(shell,side*6.65,2.35,-depth/2-0.255,3.6,2.4,0.035,districtGlassMat,false,false);
    box(shell,side*6.65,1.1,-depth/2-0.28,3.85,0.12,0.12,districtTrimMat,false,false);
    box(shell,side*6.65,3.58,-depth/2-0.28,3.85,0.12,0.12,districtTrimMat,false,false);
  }
  box(shell,0,0.42,-depth/2-0.33,5.0,0.16,0.4,mat(accentColor),false,false);
  // A counter and merchandise make the interiors readable from the entrance.
  if (kind === 'cafe') {
    box(shell,0,0.72,2.55,7.2,1.05,1.0,districtWoodMat);
    box(shell,0,1.28,2.55,7.4,0.12,1.08,goldMat,false,false);
    for (const x of [-5.6,5.6]) {
      const table=group(shell,x,0,1.0); cylinder(table,0,0.68,0,0.68,0.68,0.12,woodMat,16); cylinder(table,0,0.34,0,0.12,0.16,0.68,trimMat,10);
      for (const side of [-1,1]) { box(table,side*1.1,0.42,0,0.58,0.12,0.58,mat(0x69766d)); box(table,side*1.1,0.22,0,0.1,0.42,0.1,trimMat); }
    }
    box(shell,0,2.15,-3.2,4.8,0.14,1.7,mat(0x9b7958));
    for (const x of [-1.5,0,1.5]) cylinder(shell,x,2.42,-3.2,0.13,0.13,0.44,goldMat,10);
  } else {
    for (const x of [-5.7,-2,2,5.7]) {
      box(shell,x,1.12,1.7,1.45,1.8,4.6,mat(0x77887d));
      box(shell,x,2.05,1.7,1.5,0.12,4.7,goldMat,false,false);
      for (let row=0;row<3;row++) for (const z of [0.2,1.7,3.2]) box(shell,x,0.74+row*0.47,z,0.82,0.22,0.72,row%2?mat(0xb9a174):mat(0x809c84),false,false);
    }
    box(shell,0,0.84,4.15,5.8,1.35,0.86,districtWoodMat);
    box(shell,0,1.57,4.15,5.95,0.1,0.92,goldMat,false,false);
  }
  // Real wall collision segments preserve the six-metre entrance opening.
  colliders.push(
    {minX:leftX-0.28,maxX:leftX+0.28,minZ:frontZ,maxZ:backZ},
    {minX:rightX-0.28,maxX:rightX+0.28,minZ:frontZ,maxZ:backZ},
    {minX:leftX,maxX:rightX,minZ:backZ-0.28,maxZ:backZ+0.28},
    {minX:leftX,maxX:centerX-3,minZ:frontZ-0.28,maxZ:frontZ+0.28},
    {minX:centerX+3,maxX:rightX,minZ:frontZ-0.28,maxZ:frontZ+0.28}
  );
  const sign = districtSign(centerX,5.1,frontZ-0.8,name,subtitle,signColor);
  // Small planters soften the storefront corners without blocking the doors.
  for (const side of [-1,1]) {
    box(scene,centerX+side*9.6,0.32,frontZ+0.7,1.05,0.58,1.0,stoneMat);
    sphere(scene,centerX+side*9.6,0.9,frontZ+0.7,0.53,leafLightMat,9,7);
  }
  return {shell,centerX,centerZ,frontZ,kind,floor,sign};
}

const neighborhoodCafe = buildDistrictShop({centerX:-25,centerZ:88,name:'CORNER CAFE',subtitle:'COFFEE · BAKERY',signColor:'#3b4f48',accentColor:0xb88f62,kind:'cafe'});
const neighborhoodMarket = buildDistrictShop({centerX:25,centerZ:88,name:'TOWN MARKET',subtitle:'FRESH FOOD · DAILY GOODS',signColor:'#405745',accentColor:0x78966c,kind:'market'});

// Physical cafe equipment responds to the player's permanent business upgrades.
const cafeUpgradeVisuals = {
  espressoMachine: group(neighborhoodCafe.shell,-2.05,0,2.5),
  patioTables: [
    group(neighborhoodCafe.shell,-4.25,0,-4.35),
    group(neighborhoodCafe.shell,4.25,0,-4.35),
    group(neighborhoodCafe.shell,0,0,-0.95)
  ]
};
{
  const machine=cafeUpgradeVisuals.espressoMachine;
  box(machine,0,1.37,0,1.25,0.16,0.72,districtTrimMat);
  box(machine,0,1.77,-0.045,1.08,0.66,0.58,mat(0x59645f,0.34,0.62));
  box(machine,0,1.55,0.27,0.76,0.12,0.025,goldMat,false,false);
  box(machine,0,2.115,-0.02,0.68,0.07,0.42,mat(0x303a36,0.28,0.45));
  for(const side of [-1,1]){
    cylinder(machine,side*0.28,2.23,-0.03,0.105,0.105,0.16,whiteMat,12);
    cylinder(machine,side*0.28,2.32,-0.03,0.075,0.075,0.04,goldMat,12);
  }
  machine.visible=false;
}
for(const patio of cafeUpgradeVisuals.patioTables){
  cylinder(patio,0,0.91,0,0.78,0.78,0.14,districtWoodMat,16);
  cylinder(patio,0,0.48,0,0.13,0.16,0.78,districtTrimMat,12);
  cylinder(patio,0,0.12,0,0.43,0.43,0.14,goldMat,12);
  for(const side of [-1,1]){
    box(patio,side*1.08,0.57,0,0.62,0.14,0.62,mat(0x78857b),true,true);
    for(const dx of [-0.22,0.22]) for(const dz of [-0.2,0.2]) box(patio,side*1.08+dx,0.29,dz,0.075,0.46,0.075,districtTrimMat);
    box(patio,side*1.08,0.98,-0.25,0.62,0.72,0.1,mat(0x78857b),true,true);
  }
  patio.visible=false;
}
// Local deliveries appear as stocked produce crates in the back corner of the cafe.
const cafeLocalSupplyCrates = Array.from({length:3},(_,index)=>{
  const crate=group(neighborhoodCafe.shell,-7.15+(index===1?1.15:0),0,3.65+(index===2?1.0:0));
  box(crate,0,0.23,0,0.92,0.46,0.78,mat(0x76563a,0.88));
  for(const x of [-0.34,0,0.34])box(crate,x,0.24,0.405,0.075,0.42,0.035,mat(0xb28a59,0.78));
  for(const x of [-0.34,0,0.34])box(crate,x,0.24,-0.405,0.075,0.42,0.035,mat(0xb28a59,0.78));
  for(const x of [-0.34,0.34])for(const z of [-0.28,0.28])sphere(crate,x,0.49,z,0.17,mat(index===1?0xe18a45:index===2?0xc95567:0xc95545,0.72),8,6);
  crate.visible=false;
  return crate;
});


// Prototype 40.4 — Motor District showroom and a walk-up vehicle dealership.
const vehicleDealerGroup=group(scene,26,0,66);
const dealerFloor=mat(0xbab7a9,0.88),dealerWall=mat(0xe3dfd2,0.82),dealerTrim=mat(0x354440,0.42,0.22);
box(vehicleDealerGroup,0,0.09,0,14.0,0.18,9.0,dealerFloor,false,true);
box(vehicleDealerGroup,-6.8,1.85,0,0.4,3.7,9.0,dealerWall);
box(vehicleDealerGroup,6.8,1.85,0,0.4,3.7,9.0,dealerWall);
box(vehicleDealerGroup,0,1.85,4.3,14.0,3.7,0.4,dealerWall);
box(vehicleDealerGroup,-5.5,1.85,-4.3,3.0,3.7,0.4,dealerWall);
box(vehicleDealerGroup,5.5,1.85,-4.3,3.0,3.7,0.4,dealerWall);
box(vehicleDealerGroup,0,3.82,0,14.5,0.42,9.5,dealerTrim);
box(vehicleDealerGroup,0,4.08,0,14.1,0.12,9.2,whiteMat,false,false);
for(const x of [-6.45,6.45]){box(vehicleDealerGroup,x,2.05,-4.38,0.28,4.05,0.28,dealerTrim);box(vehicleDealerGroup,x,4.15,-4.38,0.42,0.14,0.42,goldMat,false,false);}
// Front display plinth and a live clone of the rideable sport bike.
box(vehicleDealerGroup,0,0.35,0.65,5.6,0.42,4.1,mat(0x596b65,0.5,0.18));
box(vehicleDealerGroup,0,0.58,0.65,5.45,0.08,3.95,goldMat,false,false);
const motorcycleShowroomPreview=vehicleMotorcycleModel.clone(true);motorcycleShowroomPreview.visible=true;motorcycleShowroomPreview.position.set(0,0.66,0.65);motorcycleShowroomPreview.scale.setScalar(0.92);vehicleDealerGroup.add(motorcycleShowroomPreview);
const dealerSignCanvas=document.createElement('canvas');dealerSignCanvas.width=512;dealerSignCanvas.height=128;const dealerSignCtx=dealerSignCanvas.getContext('2d');dealerSignCtx.fillStyle='#293d39';dealerSignCtx.fillRect(0,0,512,128);dealerSignCtx.strokeStyle='#c6b58d';dealerSignCtx.lineWidth=5;dealerSignCtx.strokeRect(7,7,498,114);dealerSignCtx.fillStyle='#f3eee1';dealerSignCtx.textAlign='center';dealerSignCtx.font='700 48px Georgia';dealerSignCtx.fillText('ESTATE MOTOR SHOWROOM',256,57);dealerSignCtx.fillStyle='#cbd9c0';dealerSignCtx.font='20px monospace';dealerSignCtx.fillText('SUV · SPORT MOTORCYCLE',256,94);const dealerSignTexture=new THREE.CanvasTexture(dealerSignCanvas);dealerSignTexture.colorSpace=THREE.SRGBColorSpace;const dealerSignSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:dealerSignTexture,transparent:false,depthWrite:true}));dealerSignSprite.position.set(26,5.2,61.25);dealerSignSprite.scale.set(8.6,2.0,1);scene.add(dealerSignSprite);
// Concrete delivery bay sits outside the showroom's open front.
box(scene,14.2,0.025,57.5,7.4,0.09,5.6,dealerFloor,false,true);
for(const x of [10.9,17.5])box(scene,x,0.08,57.5,0.07,0.018,4.8,districtMarkingMat,false,false);
const dealerKiosk=group(scene,12.25,0,60.2);box(dealerKiosk,0,0.62,0,1.55,1.25,0.42,districtWoodMat);box(dealerKiosk,0,1.3,-0.02,1.72,0.12,0.52,goldMat,false,false);for(const x of [-0.62,0.62])box(dealerKiosk,x,0.3,0,0.12,0.6,0.12,districtTrimMat);
const dealerKioskCanvas=document.createElement('canvas');dealerKioskCanvas.width=320;dealerKioskCanvas.height=112;const dealerKioskCtx=dealerKioskCanvas.getContext('2d');dealerKioskCtx.fillStyle='#30463f';dealerKioskCtx.fillRect(0,0,320,112);dealerKioskCtx.fillStyle='#f1eddf';dealerKioskCtx.textAlign='center';dealerKioskCtx.font='700 31px Georgia';dealerKioskCtx.fillText('MOTOR SHOWROOM',160,48);dealerKioskCtx.fillStyle='#d2dabc';dealerKioskCtx.font='17px monospace';dealerKioskCtx.fillText('SALES · DELIVERY',160,80);const dealerKioskTexture=new THREE.CanvasTexture(dealerKioskCanvas);dealerKioskTexture.colorSpace=THREE.SRGBColorSpace;const dealerKioskSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:dealerKioskTexture,transparent:false,depthWrite:true}));dealerKioskSprite.position.set(0,2.05,-0.28);dealerKioskSprite.scale.set(2.55,0.9,1);dealerKiosk.add(dealerKioskSprite);
const vehicleDealerColliders=[{minX:18.72,maxX:19.28,minZ:61.5,maxZ:70.5},{minX:32.72,maxX:33.28,minZ:61.5,maxZ:70.5},{minX:19,maxX:33,minZ:70.22,maxZ:70.78},{minX:19,maxX:22.8,minZ:61.22,maxZ:61.78},{minX:29.2,maxX:33,minZ:61.22,maxZ:61.78}];
colliders.push(...vehicleDealerColliders);

// Prototype 40.3 — Estate Motor Garage. The open front allows the SUV to drive inside.
const vehicleGarageGroup=group(scene,22,0,35.5);vehicleGarageGroup.visible=false;
const garageFloorMat=mat(0x9c9b8d,0.92),garageConcreteMat=mat(0xbab7a9,0.86),garageToolMat=mat(0x455d5c,0.62,0.18);
box(scene,22,0.025,29.55,13.2,0.1,3.3,garageConcreteMat,false,true);
box(vehicleGarageGroup,0,0.04,0,10.6,0.08,9.8,garageFloorMat,false,true);
box(vehicleGarageGroup,-5.35,1.65,0,0.48,3.3,10.0,districtWallMat);
box(vehicleGarageGroup,5.35,1.65,0,0.48,3.3,10.0,districtWallMat);
box(vehicleGarageGroup,0,1.65,4.82,10.8,3.3,0.48,districtWallMat);
box(vehicleGarageGroup,-4.55,1.65,-4.82,1.55,3.3,0.48,districtWallMat);
box(vehicleGarageGroup,4.55,1.65,-4.82,1.55,3.3,0.48,districtWallMat);
box(vehicleGarageGroup,0,3.42,0,11.65,0.42,10.75,districtTrimMat);
box(vehicleGarageGroup,0,3.66,-4.9,11.55,0.22,0.52,garageConcreteMat);
for(const x of [-4.0,4.0]){
  box(vehicleGarageGroup,x,1.78,-4.92,0.22,3.48,0.32,districtTrimMat);
  box(vehicleGarageGroup,x,3.52,-4.92,0.34,0.16,0.38,goldMat,false,false);
  box(vehicleGarageGroup,x,0.68,0.9,0.18,1.12,0.18,garageToolMat);
  box(vehicleGarageGroup,x,1.28,0.9,0.52,0.14,0.52,garageToolMat);
}
// Workshop lift, tool bench and overhead service lights make the garage readable from the entrance.
for(const x of [-3.55,3.55]){
  box(vehicleGarageGroup,x,1.15,0.55,0.22,2.3,0.22,mat(0x526b68,0.48,0.36));
  box(vehicleGarageGroup,x,2.12,0.55,0.44,0.12,0.44,goldMat,false,false);
}
box(vehicleGarageGroup,0,0.62,3.35,4.5,1.0,0.72,districtWoodMat);
box(vehicleGarageGroup,0,1.18,3.35,4.62,0.12,0.82,goldMat,false,false);
for(const x of [-1.5,0,1.5])box(vehicleGarageGroup,x,1.38,3.35,0.18,0.26,0.18,garageToolMat);
for(const x of [-2.8,0,2.8]){
  const light=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.04,0.32),new THREE.MeshBasicMaterial({color:0xffe9b8}));
  light.position.set(x,3.12,-0.3);vehicleGarageGroup.add(light);
}
const garageSignCanvas=document.createElement('canvas');garageSignCanvas.width=512;garageSignCanvas.height=128;
const garageSignCtx=garageSignCanvas.getContext('2d');garageSignCtx.fillStyle='#293e39';garageSignCtx.fillRect(0,0,512,128);garageSignCtx.strokeStyle='#c7b58b';garageSignCtx.lineWidth=5;garageSignCtx.strokeRect(7,7,498,114);garageSignCtx.fillStyle='#f3eee0';garageSignCtx.textAlign='center';garageSignCtx.font='700 48px Georgia';garageSignCtx.fillText('ESTATE MOTOR GARAGE',256,58);garageSignCtx.fillStyle='#c9d6bb';garageSignCtx.font='20px monospace';garageSignCtx.fillText('TUNING · SERVICE · DETAILING',256,94);
const garageSignTexture=new THREE.CanvasTexture(garageSignCanvas);garageSignTexture.colorSpace=THREE.SRGBColorSpace;
const garageSignSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:garageSignTexture,transparent:false,depthWrite:true}));garageSignSprite.position.set(0,4.35,-5.18);garageSignSprite.scale.set(7.6,1.9,1);vehicleGarageGroup.add(garageSignSprite);
const garageKiosk=group(scene,13.25,0,31.4);
box(garageKiosk,0,0.62,0,1.55,1.25,0.42,districtWoodMat);
box(garageKiosk,0,1.3,-0.02,1.72,0.12,0.52,goldMat,false,false);
for(const x of [-0.62,0.62])box(garageKiosk,x,0.3,0,0.12,0.6,0.12,districtTrimMat);
const garageKioskCanvas=document.createElement('canvas');garageKioskCanvas.width=320;garageKioskCanvas.height=112;
const garageKioskCtx=garageKioskCanvas.getContext('2d');garageKioskCtx.fillStyle='#30463f';garageKioskCtx.fillRect(0,0,320,112);garageKioskCtx.fillStyle='#f1eddf';garageKioskCtx.textAlign='center';garageKioskCtx.font='700 32px Georgia';garageKioskCtx.fillText('MOTOR GARAGE',160,48);garageKioskCtx.fillStyle='#d2dabc';garageKioskCtx.font='17px monospace';garageKioskCtx.fillText('MANAGEMENT',160,80);
const garageKioskTexture=new THREE.CanvasTexture(garageKioskCanvas);garageKioskTexture.colorSpace=THREE.SRGBColorSpace;
const garageKioskSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:garageKioskTexture,transparent:false,depthWrite:true}));garageKioskSprite.position.set(0,2.05,-0.28);garageKioskSprite.scale.set(2.55,0.9,1);garageKiosk.add(garageKioskSprite);
const vehicleGarageColliders=[
  {minX:16.35,maxX:16.85,minZ:30.25,maxZ:40.75},
  {minX:27.15,maxX:27.65,minZ:30.25,maxZ:40.75},
  {minX:16.5,maxX:27.5,minZ:40.25,maxZ:40.75},
  {minX:16.5,maxX:18.0,minZ:30.25,maxZ:30.75},
  {minX:26.0,maxX:27.5,minZ:30.25,maxZ:30.75}
];
const vehicleGarageBuildCost=1250;
const vehicleGarageUpgradeDefinitions={
  engine:{name:'Performance ECU',eyebrow:'ENGINE · TOP SPEED',description:'Optimasi ECU meningkatkan batas kecepatan dan respons akselerasi.',effect:level=>`TOP SPEED +${level*11}%`,prices:[650,1100,1800],max:3},
  handling:{name:'Sport Steering Rack',eyebrow:'HANDLING · CORNERING',description:'Rasio kemudi sport membuat SUV lebih responsif saat menikung.',effect:level=>`STEERING +${level*13}%`,prices:[520,920,1480],max:3},
  efficiency:{name:'Eco Fuel Mapping',eyebrow:'EFFICIENCY · FUEL SAVING',description:'Kalibrasi pembakaran mengurangi konsumsi bahan bakar saat berkendara.',effect:level=>`FUEL USE −${level*13}%`,prices:[480,840,1320],max:3}
};

// Prototype 37 follow-up — extend the north road into a useful travel loop.
box(scene, 0, -0.025, 131, 13.5, 0.12, 48, districtRoadMat);
box(scene, 0, 0.012, 131, 0.12, 0.015, 47, districtMarkingMat, false, false);
box(scene, 0, -0.018, 127, 88, 0.12, 9.5, districtRoadMat);
for (const x of [-40,-32,-24,-16,-8,8,16,24,32,40]) box(scene, x, 0.055, 127, 0.12, 0.018, 5.8, districtMarkingMat, false, false);
for (const x of [-8.4,8.4]) box(scene, x, 0.025, 131, 0.72, 0.07, 47, districtSidewalkMat);
for (const z of [122.2,131.8]) box(scene, 0, 0.035, z, 88, 0.08, 0.85, districtSidewalkMat);
districtSign(0,4.8,112.2,'NORTH SHORE','RIVER WALK · LOCAL SERVICE','#344a43');

// A roadside service stop turns the SUV into a vehicle with a practical destination.
const neighborhoodFuelStop = buildDistrictShop({centerX:28,centerZ:140.5,name:'NORTHSIDE FUEL',subtitle:'PETROL · SERVICE',signColor:'#3e4c42',accentColor:0xc19b62,kind:'market'});
box(scene, 28, -0.005, 130, 20, 0.1, 7.5, districtRoadMat);
for (const x of [20,28,36]) {
  box(scene,x,0.18,132.2,1.55,0.34,1.22,stoneMat);
  box(scene,x,1.25,132.2,0.72,1.95,0.52,mat(0xd7d4c8,0.48,0.12));
  box(scene,x,1.47,131.92,0.48,0.36,0.045,mat(0x253635,0.24,0.42),false,false);
  box(scene,x,2.18,132.2,0.85,0.12,0.62,mat(0xc4b68d,0.5));
  cylinder(scene,x+0.46,0.82,132.4,0.055,0.055,0.66,trimMat,8);
  colliders.push({minX:x-0.82,maxX:x+0.82,minZ:131.55,maxZ:132.85});
}

// Northside Auto Spa: an open-sided express wash bay on the west side of North Shore.
box(scene,-30,-0.018,138.5,11.5,0.12,17.5,districtRoadMat);
box(scene,-30,5.12,138.5,10.2,0.34,15.2,districtTrimMat);
box(scene,-30,5.34,138.5,9.7,0.12,14.8,whiteMat,false,false);
const vehicleWashBrushes = [];
for (const x of [-34.0,-26.0]) for (const z of [132.5,144.5]) {
  box(scene,x,2.55,z,0.28,5.1,0.28,districtTrimMat);
  box(scene,x,5.12,z,0.48,0.12,0.48,goldMat,false,false);
}
for (const z of [135.0,138.5,142.0]) {
  box(scene,-30,4.72,z,8.2,0.12,0.16,districtTrimMat);
  for (const x of [-33,-30,-27]) {
    cylinder(scene,x,4.48,z,0.055,0.055,0.28,mat(0x6d9eaa,0.32,0.12),8);
    sphere(scene,x,4.28,z,0.07,mat(0x8bc5d0,0.22,0.08),8,6);
  }
}
for (const x of [-32.45,-27.55]) {
  const brush = group(scene,x,0,138.5);
  cylinder(brush,0,1.55,0,0.18,0.18,3.0,mat(0x4f7881,0.62,0.08),12);
  for (let i=0;i<8;i++) {
    const angle = i*Math.PI/4;
    const paddle = box(brush,Math.cos(angle)*0.28,1.55,Math.sin(angle)*0.28,0.18,2.5,0.12,mat(i%2?0x5c9098:0x82b6b7,0.74),false,false);
    paddle.rotation.y = -angle;
  }
  vehicleWashBrushes.push(brush);
}
for (const x of [-32,-28]) box(scene,x,0.06,138.5,0.08,0.025,13.8,districtMarkingMat,false,false);
districtSign(-30,6.45,130.8,'NORTHSIDE AUTO SPA','TOUCHLESS WASH · EXPRESS','#344a43');
const vehicleWashLights = [-33,-30,-27].map(x => {
  const light = createManagedPointLight(0x8acbd7,0,7);
  light.position.set(x,4.15,138.5);scene.add(light);return light;
});

// Harborfront Marina adds a second connected destination north of North Shore.
box(scene,0,-0.025,177,13.5,0.12,44,districtRoadMat);
box(scene,0,0.012,177,0.12,0.015,43,districtMarkingMat,false,false);
box(scene,0,-0.018,176,88,0.12,9.5,districtRoadMat);
for (const x of [-40,-32,-24,-16,-8,8,16,24,32,40]) box(scene,x,0.055,176,0.12,0.018,5.8,districtMarkingMat,false,false);
for (const x of [-8.4,8.4]) box(scene,x,0.025,177,0.72,0.07,44,districtSidewalkMat);
for (const z of [171.2,181.2]) box(scene,0,0.035,z,88,0.08,0.85,districtSidewalkMat);

// Prototype 40.6 — a connected four-sided road loop for the Motor District Rally.
// The side streets join the existing North Shore (z=127) and Harborfront (z=176) roads.
for (const x of [-43,43]) {
  box(scene,x,-0.025,151.5,8.4,0.12,49,districtRoadMat);
  box(scene,x,0.012,151.5,0.12,0.015,48,districtMarkingMat,false,false);
  for (let z=134;z<=170;z+=8) box(scene,x,0.056,z,0.12,0.018,3.2,districtMarkingMat,false,false);
  for (const side of [-1,1]) box(scene,x+side*4.78,0.035,151.5,0.62,0.08,48.5,districtSidewalkMat);
  for (const z of [139,163]) {
    const lamp=group(scene,x+(x>0?5.55:-5.55),0,z);
    cylinder(lamp,0,2.2,0,0.075,0.09,4.4,districtTrimMat,8);
    box(lamp,x>0?-0.52:0.52,4.35,0,1.08,0.09,0.09,districtTrimMat,false,false);
    const bulb=sphere(lamp,x>0?-1.0:1.0,4.27,0,0.13,mat(0xe9dcb2,0.22,0.05),8,6);
    const light=createManagedPointLight(0xe5d5a7,0.32,9);light.position.copy(bulb.position);lamp.add(light);
  }
}
const roadRallyCourse={
  start:{x:0,z:127.0,yaw:Math.PI/2},
  checkpoints:[
    {x:-43,z:127.0,label:'WESTERN TURN',yaw:Math.PI/2},
    {x:-43,z:176.0,label:'NORTH-WEST BEND',yaw:0},
    {x:43,z:176.0,label:'EASTERN STRAIGHT',yaw:-Math.PI/2},
    {x:43,z:127.0,label:'SOUTH-EAST TURN',yaw:Math.PI}
  ]
};
function buildRoadRallyGate(point,title,subtitle,color=0xd9c18d){
  const gate=group(scene,point.x,0.04,point.z);gate.rotation.y=point.yaw||0;
  const frameMat=new THREE.MeshStandardMaterial({color,roughness:0.35,metalness:0.32,emissive:color,emissiveIntensity:0.34});
  for(const side of [-1,1]){
    box(gate,side*3.72,1.52,0,0.2,3.04,0.2,frameMat,false,false);
    box(gate,side*3.72,3.1,0,0.42,0.12,0.42,goldMat,false,false);
    const lamp=sphere(gate,side*3.72,3.34,0,0.19,frameMat,10,7);
    const glow=createManagedPointLight(color,0.48,7);glow.position.copy(lamp.position);gate.add(glow);
  }
  box(gate,0,3.05,0,7.55,0.2,0.22,frameMat,false,false);
  box(gate,0,2.78,0,0.18,0.42,0.24,frameMat,false,false);
  districtSign(point.x,4.45,point.z,title,subtitle,'#263d38');
  return gate;
}
buildRoadRallyGate(roadRallyCourse.start,'START / FINISH','MOTOR DISTRICT RALLY',0xd8bd86);
roadRallyCourse.checkpoints.forEach((point,index)=>buildRoadRallyGate(point,String(index+1).padStart(2,'0'),point.label,0x8dc9b5));

// Dedicated public parking and a pedestrian promenade keep the marina reachable by car and on foot.
box(scene,10.5,-0.012,188.5,8.2,0.1,19,districtRoadMat);
box(scene,10.5,0.05,188.5,0.08,0.018,18,districtMarkingMat,false,false);
box(scene,25,-0.005,188.5,21,0.1,14,districtRoadMat);
for (const x of [16.2,20.6,25,29.4,33.8]) box(scene,x,0.062,188.5,0.075,0.018,12,districtMarkingMat,false,false);
box(scene,25,-0.012,196,8.4,0.1,5.2,districtSidewalkMat);
box(scene,25,0.095,203.2,6.4,0.2,15.4,districtWoodMat);
for (const x of [21.9,28.1]) {
  box(scene,x,0.62,203.2,0.14,1.05,15.2,districtTrimMat);
  for (const z of [197,200,203,206,209]) box(scene,x,1.1,z,0.14,0.12,0.14,goldMat,false,false);
}
box(scene,25,0.62,210.7,6.4,1.05,0.14,districtTrimMat);
colliders.push(
  {minX:21.55,maxX:22.25,minZ:195.5,maxZ:211.2},
  {minX:27.75,maxX:28.45,minZ:195.5,maxZ:211.2},
  {minX:21.55,maxX:28.45,minZ:210.55,maxZ:211.35}
);
box(scene,25,0.2,195.8,5.2,0.12,0.45,whiteMat,false,false);
// Calm marina water and a compact motorboat create a clear visual landmark beyond the pier.
const marinaWater = new THREE.Mesh(new THREE.PlaneGeometry(88,42),createSurfaceMaterial({color:0x4a8792,roughness:0.16,metalness:0.1,transparent:true,opacity:0.9}));
marinaWater.rotation.x=-Math.PI/2;marinaWater.position.set(39,0.018,220);scene.add(marinaWater);
// North Shoal: a compact offshore island with a beach landing, beacon and a one-time salvage reward.
const northShoal = group(scene,44,0,218);
const shoalRockMat = mat(0x686e66,0.92);
const shoalSandMat = mat(0xc7b58e,0.98);
const shoalPalmMat = mat(0x526a46,0.9);
const shoalRockBase = cylinder(northShoal,0,0.12,0,7.15,7.35,0.42,shoalRockMat,28);
const shoalBeach = cylinder(northShoal,0,0.30,0,6.55,6.75,0.10,shoalSandMat,32);
// Irregular low rocks break up the otherwise clean circular shoreline.
for(const [x,z,r] of [[-4.7,-3.8,1.05],[-5.4,2.9,0.82],[4.8,3.8,0.95],[5.4,-2.2,0.72],[-1.2,5.8,0.62]]) sphere(northShoal,x,0.40,z,r,shoalRockMat,8,6);
// Timber landing pier and mooring posts face the marina.
box(northShoal,-6.55,0.28,0,4.4,0.18,2.35,districtWoodMat);
for(const z of [-0.94,0.94]){box(northShoal,-8.15,0.72,z,0.18,1.0,0.18,districtTrimMat);sphere(northShoal,-8.15,1.26,z,0.13,goldMat,8,6);}
for(let x=-7.8;x<=-5.1;x+=0.9)box(northShoal,x,0.39,0,0.075,0.035,2.2,districtTrimMat,false,false);
// A small palm grove gives the shore a distinct silhouette.
for(const [px,pz,scale] of [[-2.7,1.0,1],[1.1,3.1,0.82]]){
  const palm=group(northShoal,px,0.36,pz);palm.scale.setScalar(scale);
  cylinder(palm,0,1.15,0,0.16,0.25,2.3,mat(0x76583c),8).rotation.z=-0.10;
  for(let i=0;i<7;i++){const frond=box(palm,0,2.23,0.86,0.17,0.075,1.75,i%2?shoalPalmMat:leafLightMat,false,false);frond.rotation.y=i*Math.PI*2/7;frond.rotation.x=-0.12;}
  sphere(palm,0,2.25,0,0.42,leafMat,8,6);
}
// Open-air beach shelter with a shaded bench and crate details.
const shoalShelter=group(northShoal,1.0,0.36,-2.2);
for(const x of [-1.35,1.35])for(const z of [-0.95,0.95])box(shoalShelter,x,1.13,z,0.13,2.2,0.13,districtWoodMat);
box(shoalShelter,0,2.24,0,3.0,0.18,2.35,districtTrimMat);
box(shoalShelter,0,2.38,0,3.12,0.10,2.48,districtWoodMat);
box(shoalShelter,0,0.66,0.28,1.75,0.15,0.48,districtWoodMat);
for(const x of [-0.67,0.67])box(shoalShelter,x,0.34,0.28,0.09,0.55,0.09,districtTrimMat);
// Beacon tower: striped masonry, glass lantern room and a warm cap.
cylinder(northShoal,3.55,1.42,-1.75,0.43,0.62,2.55,whiteMat,10);
cylinder(northShoal,3.55,1.18,-1.75,0.47,0.58,0.18,mat(0x9d6656),10);
cylinder(northShoal,3.55,2.23,-1.75,0.39,0.46,0.16,mat(0x9d6656),10);
cylinder(northShoal,3.55,2.85,-1.75,0.42,0.42,0.56,districtGlassMat,10);
cylinder(northShoal,3.55,3.18,-1.75,0.55,0.55,0.14,trimMat,10);
const shoalBeaconCap=new THREE.Mesh(new THREE.ConeGeometry(0.58,0.52,10),mat(0x9d6656));shoalBeaconCap.position.set(3.55,3.52,-1.75);northShoal.add(shoalBeaconCap);
sphere(northShoal,3.55,2.88,-1.75,0.16,mat(0xffd58b,0.3,0.1),10,8);
const shoalBeaconLight=createManagedPointLight(0xffd18b,0.42,12);shoalBeaconLight.position.set(3.55,3.0,-1.75);scene.add(shoalBeaconLight);
// Salvage chest is deliberately away from the landing so the player explores the island.
const shoalChest=group(northShoal,2.05,0.36,2.55);
box(shoalChest,0,0.28,0,1.0,0.48,0.74,districtWoodMat);
box(shoalChest,0,0.56,-0.03,1.06,0.16,0.80,goldMat);
box(shoalChest,0,0.31,0.39,0.18,0.36,0.07,trimMat);
for(const x of [-0.34,0.34])box(shoalChest,x,0.31,0,0.07,0.43,0.78,goldMat);
districtSign(44,4.65,211.8,'NORTH SHOAL','ISLAND CAMP · TREASURE COVE','#314c50');
// Underwater reef shelf on the south-east side of North Shoal, beneath the normal sea plane.
const underwaterFloorMat=mat(0x244c4d,0.96);
const underwaterFloor=new THREE.Mesh(new THREE.CircleGeometry(12.8,48),underwaterFloorMat);underwaterFloor.rotation.x=-Math.PI/2;underwaterFloor.position.set(47,-5.92,228);underwaterFloor.scale.set(1.28,0.86,1);scene.add(underwaterFloor);
const reefBase=group(scene,47,-5.72,228);
const reefStoneMats=[mat(0x576a61,0.98),mat(0x6c7767,0.98),mat(0x465f59,0.98)];
const coralMats=[mat(0xe68e79,0.66),mat(0xd5a76c,0.68),mat(0x79b6a1,0.72),mat(0x9e8fc7,0.72)];
for(let i=0;i<24;i++){
  const angle=i*2.399,ring=2.1+(i%5)*1.32;
  const x=Math.cos(angle)*ring,z=Math.sin(angle)*ring*0.68,r=0.42+(i%4)*0.19;
  const rock=sphere(reefBase,x,0.15,z,r,reefStoneMats[i%reefStoneMats.length],9,7);rock.scale.set(1.25,0.72,0.92);
  if(i%3===0){const stalk=cylinder(reefBase,x+0.25,0.88,z,r*0.22,r*0.31,1.35,coralMats[i%coralMats.length],7);stalk.rotation.z=Math.sin(angle)*0.24;for(let branch=0;branch<3;branch++)sphere(reefBase,x+0.25+Math.sin(angle+branch)*0.28,1.28+branch*0.11,z+Math.cos(angle+branch)*0.22,0.22,coralMats[(i+branch)%coralMats.length],7,5);}
}
for(let i=0;i<9;i++){
  const angle=i*0.72,x=Math.cos(angle)*6.3,z=Math.sin(angle)*4.4;
  const kelp=group(reefBase,x,0.15,z);
  const stem=cylinder(kelp,0,1.2,0,0.055,0.09,2.35,mat(0x456f61),7);stem.rotation.z=Math.sin(angle)*0.12;
  for(let j=0;j<4;j++){const leaf=box(kelp,(j%2?1:-1)*0.19,0.64+j*0.39,0,0.46,0.055,0.12,mat(j%2?0x69957c:0x82a983),false,false);leaf.rotation.z=(j%2?1:-1)*0.46;}
}
// Floating reef fish are animated scene objects rather than static ornaments.
const reefFish=[];
for(let i=0;i<7;i++){
  const fish=group(scene,42+(i%4)*2.1,-3.1+(i%3)*0.55,224+(i%5)*1.45);
  const fishMat=mat([0xf0ba67,0x77c2c3,0xe58c79,0xc7d0a0][i%4],0.42,0.08);
  sphere(fish,0,0,0,0.22,fishMat,10,7).scale.set(1.55,0.72,0.64);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.32,5),fishMat);tail.rotation.z=-Math.PI/2;tail.position.x=0.39;fish.add(tail);
  sphere(fish,0.17,0.045,-0.12,0.035,mat(0x172b2c),7,5);
  fish.userData={phase:i*1.7,baseX:fish.position.x,baseZ:fish.position.z,radius:0.65+(i%3)*0.4,tail};reefFish.push(fish);
}
const diveTargets=[
  {id:'sunkenCache',name:'SUNKEN SUPPLY CACHE',x:37.2,y:-4.65,z:229.2,reward:85,xp:18,icon:'CACHE'},
  {id:'giantClam',name:'GIANT PEARL CLAM',x:51.5,y:-4.7,z:232.1,reward:125,xp:26,icon:'PEARL'},
  {id:'rareSeahorse',name:'GOLDEN SEAHORSE',x:55.2,y:-3.35,z:222.7,reward:180,xp:34,icon:'RARE'}
].map((item,index)=>{
  const object=group(scene,item.x,item.y,item.z),accent=coralMats[index%coralMats.length];
  if(index===0){box(object,0,0.26,0,0.9,0.5,0.7,woodMat);box(object,0,0.54,0,1.0,0.15,0.8,goldMat,false,false);box(object,0,0.28,0.39,0.18,0.34,0.08,accent,false,false);}
  else if(index===1){sphere(object,-0.28,0,0,0.42,whiteMat,12,8).scale.set(1.15,0.48,0.8);sphere(object,0.28,0,0,0.42,whiteMat,12,8).scale.set(1.15,0.48,0.8);sphere(object,0,0.27,0,0.19,goldMat,10,8);for(let i=0;i<5;i++)cylinder(object,-0.36+i*0.18,0.17,0,0.018,0.018,0.28,accent,6);}
  else{const body=cylinder(object,0,0.10,0,0.11,0.15,0.9,accent,8);body.rotation.z=-0.12;const head=sphere(object,0.08,0.62,-0.02,0.22,goldMat,10,8);sphere(object,0.25,0.66,-0.17,0.035,mat(0x13282d),6,5);const tail=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.065,6,12,Math.PI*1.45),accent);tail.position.set(0.03,-0.36,0);object.add(tail);for(let i=0;i<3;i++)sphere(object,-0.17-i*0.12,0.24+i*0.15,0.08,0.12,accent,7,5);}
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.78,0.045,6,24),goldMat);halo.rotation.x=Math.PI/2;halo.position.y=-0.15;object.add(halo);
  const light=createManagedPointLight(index===2?0xe8c46e:0x8bd0c2,0.7,7);light.position.y=0.65;object.add(light);
  return {...item,group:object,halo,light,baseY:item.y};
});
const diveBubbles=Array.from({length:22},(_,index)=>{
  const bubble=new THREE.Mesh(new THREE.SphereGeometry(0.035+(index%4)*0.012,7,6),new THREE.MeshBasicMaterial({color:0xc2f5ef,transparent:true,opacity:0.32,depthWrite:false}));
  bubble.position.set(36+(index*7%21),-4.8+(index%7)*0.42,219+(index*11%16));scene.add(bubble);
  return {mesh:bubble,phase:index*1.37,baseX:bubble.position.x,baseZ:bubble.position.z};
});
const diveStation=group(scene,40.65,0.35,222.2);
cylinder(diveStation,0,0.92,0,0.23,0.28,1.35,trimMat,10);
const diveStationTop=box(diveStation,0,1.63,0,1.18,0.44,0.42,mat(0x37685e),false,false);
const diveStationLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#e6f0d8';g.font='700 46px sans-serif';g.textAlign='center';g.fillText('REEF DIVE',256,80);return new THREE.CanvasTexture(c);})(),transparent:true}));diveStationLabel.position.set(0,1.66,-0.24);diveStationLabel.scale.set(1.2,0.3,1);diveStation.add(diveStationLabel);

// Five checkpoint gates form a clockwise circuit around North Shoal; the Start/Finish gate sits west of the island.
const boatRaceCourse = {
  start:{x:31,z:214.5,gateAxis:-Math.PI/4},
  checkpoints:[
    {x:39,z:206.6,label:'NORTH CHANNEL',gateAxis:-Math.PI/4},
    {x:62,z:207.5,label:'EAST CHANNEL',gateAxis:Math.PI/2},
    {x:64,z:231,label:'SOUTH-EAST TURN',gateAxis:0},
    {x:44,z:234,label:'SOUTH SHOAL',gateAxis:Math.PI/2},
    {x:22,z:231,label:'WEST RETURN',gateAxis:Math.PI/2}
  ]
};
function buildBoatRaceGate(x,z,axis,title,subtitle,color=0x8ed8d1){
  const gate=group(scene,x,0,z);gate.rotation.y=axis;
  const accent=new THREE.MeshStandardMaterial({color,roughness:0.38,metalness:0.28,emissive:color,emissiveIntensity:0.48});
  const floatMat=mat(0xf0eee2,0.42,0.16);
  for(const side of [-1,1]){
    const buoy=group(gate,side*2.22,0,0);
    cylinder(buoy,0,0.48,0,0.58,0.68,0.62,accent,12);
    cylinder(buoy,0,0.96,0,0.29,0.37,0.38,floatMat,10);
    cylinder(buoy,0,1.25,0,0.23,0.28,0.22,accent,10);
    sphere(buoy,0,1.48,0,0.17,goldMat,8,6);
    const lamp=createManagedPointLight(color,0.34,5);lamp.position.set(0,1.5,0);buoy.add(lamp);
  }
  box(gate,0,2.55,0,4.8,0.16,0.22,accent,false,false);
  box(gate,0,2.28,0,0.16,0.5,0.2,accent,false,false);
  districtSign(x,4.4,z,title,subtitle,'#29464a');
  return gate;
}
buildBoatRaceGate(boatRaceCourse.start.x,boatRaceCourse.start.z,boatRaceCourse.start.gateAxis,'START / FINISH','COASTAL CIRCUIT',0xc8a96f);
boatRaceCourse.checkpoints.forEach((point,index)=>buildBoatRaceGate(point.x,point.z,point.gateAxis,String(index+1).padStart(2,'0'),point.label,0x75c9c5));
// Daily coastal salvage floats in three separate water lanes away from the island rocks and race gates.
const boatSalvagePods = [
  {x:17.5,z:221.5,reward:65,xp:16,color:0x8ac7ae,name:'WESTERN SUPPLY POD',phase:0.2},
  {x:56.0,z:215.7,reward:95,xp:22,color:0xd4ad70,name:'EASTERN CARGO FLOAT',phase:2.1},
  {x:57.5,z:230.0,reward:140,xp:28,color:0x82b8d4,name:'SOUTH CHANNEL CACHE',phase:4.2}
].map((item,index)=>{
  const pod=group(scene,item.x,0,item.z);
  const accent=mat(item.color,0.42,0.3);
  const crateMat=mat(index===1?0x79583d:0x6c6048,0.72,0.08);
  const darkMetal=mat(0x344b4b,0.34,0.72);
  cylinder(pod,0,0.27,0,1.34,1.48,0.38,accent,14);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.62,0.075,7,28),accent);ring.rotation.x=Math.PI/2;ring.position.y=0.52;pod.add(ring);
  box(pod,0,0.94,0,1.48,0.82,1.18,crateMat);
  box(pod,0,1.39,0,1.55,0.12,1.24,darkMetal,false,false);
  for(const x of [-0.49,0.49])box(pod,x,0.96,0.02,0.12,0.92,1.22,darkMetal,false,false);
  box(pod,0,0.96,0.63,0.38,0.34,0.09,accent,false,false);
  const pole=cylinder(pod,0,2.05,-0.58,0.045,0.055,1.35,darkMetal,8);
  const pennant=new THREE.Mesh(new THREE.ConeGeometry(0.26,0.58,4),accent);pennant.position.set(0.18,2.58,-0.58);pennant.rotation.z=-Math.PI/2;pod.add(pennant);
  sphere(pod,0,2.96,-0.58,0.17,goldMat,8,6);
  const glow=createManagedPointLight(item.color,0.9,10);glow.position.set(0,2.75,0);pod.add(glow);
  const tag=new THREE.Mesh(new THREE.TorusGeometry(1.88,0.035,5,28),goldMat);tag.rotation.x=Math.PI/2;tag.position.y=0.34;pod.add(tag);
  return {...item,group:pod,ring,glow,pennant};
});

const shoalShoreLight=createManagedPointLight(0xffd39a,0,9);shoalShoreLight.position.set(40.6,2.2,218);scene.add(shoalShoreLight);

const marinaBoat = group(scene,32,0.18,216);
box(marinaBoat,0,0.38,0,2.55,0.56,6.4,whiteMat);
box(marinaBoat,0,0.7,-0.4,1.85,0.46,2.65,mat(0x334d50,0.42,0.28));
box(marinaBoat,0,1.05,-0.55,1.58,0.34,1.82,districtGlassMat,false,false);
box(marinaBoat,0,1.28,-0.55,1.72,0.12,2.02,whiteMat,false,false);
box(marinaBoat,0,0.7,2.55,2.3,0.12,0.25,goldMat,false,false);
const boatHelm=group(marinaBoat,0,0.94,-1.36);
cylinder(boatHelm,0,0,0,0.24,0.24,0.055,trimMat,12).rotation.x=Math.PI/2;
const boatHelmRim=new THREE.Mesh(new THREE.TorusGeometry(0.25,0.028,6,18),goldMat);boatHelmRim.rotation.x=Math.PI/2;boatHelm.add(boatHelmRim);
for(let i=0;i<4;i++){const a=i*Math.PI/2;box(boatHelm,Math.cos(a)*0.16,Math.sin(a)*0.16,0,0.2,0.045,0.035,trimMat,false,false);}
box(marinaBoat,0,0.72,1.45,1.5,0.24,0.75,districtWoodMat,false,false);
for (const x of [-0.82,0.82]) box(marinaBoat,x,0.58,-0.55,0.08,0.36,1.72,districtTrimMat,false,false);
const marinaWaterLights = [-4,0,4].map(offset=>{
  const light=createManagedPointLight(0x8dcbd0,0,9);light.position.set(25+offset,2.5,209);scene.add(light);return light;
});
const marinaFishingFloat = group(scene,25.65,0.18,214.1);
sphere(marinaFishingFloat,0,0,0,0.13,mat(0xe6e2d0,0.34),10,8);
sphere(marinaFishingFloat,0,0.11,0,0.105,mat(0xc85f4d,0.38),10,8);
cylinder(marinaFishingFloat,0,0.21,0,0.018,0.018,0.16,mat(0xe9e4d5,0.48),6);
const marinaFishingRipple = new THREE.Mesh(new THREE.TorusGeometry(0.28,0.018,5,20),new THREE.MeshBasicMaterial({color:0xb8d8d2,transparent:true,opacity:0.42}));
marinaFishingRipple.rotation.x=Math.PI/2;marinaFishingRipple.position.set(25.65,0.035,214.1);scene.add(marinaFishingRipple);
marinaFishingFloat.visible=false;marinaFishingRipple.visible=false;
// Navigation markers, benches and planters make the public promenade feel like a finished destination.
districtSign(25,5.2,194.3,'HARBORFRONT MARINA','NORTH SHORE · PUBLIC PIER','#344b4b');
for (const [x,z] of [[15,191],[35,191],[15,196],[35,196]]) {
  box(scene,x,0.28,z,1.2,0.5,1.0,stoneMat);
  sphere(scene,x,0.83,z,0.48,leafLightMat,9,7);
}
const marinaBench=group(scene,25,0,191.4);
box(marinaBench,0,0.62,0,2.2,0.16,0.58,districtWoodMat);
box(marinaBench,0,1.1,0.22,2.2,0.72,0.14,districtWoodMat);
for (const x of [-0.82,0.82]) box(marinaBench,x,0.31,0,0.12,0.6,0.12,trimMat);
for (const x of [12,38]) {
  cylinder(scene,x,1.9,188,0.09,0.12,3.8,trimMat,8);
  sphere(scene,x,3.82,188,0.23,goldMat,8,6);
  const light=createManagedPointLight(0xffd29a,0,10);light.position.set(x,3.65,188);scene.add(light);districtStreetLights.push(light);
}

// Riverside Lookout: a small scenic parking spur, boardwalk, water and seating.
box(scene,-14,-0.018,143.2,28,0.12,7.6,districtRoadMat);
box(scene,-18,0.015,148.1,16,0.16,10.5,districtWoodMat);
box(scene,-18,0.11,153.7,18,0.08,0.34,districtTrimMat);
box(scene,-27,0.11,148.1,0.34,0.08,10.5,districtTrimMat);
box(scene,-9,0.11,148.1,0.34,0.08,10.5,districtTrimMat);
const riversideWater = new THREE.Mesh(new THREE.PlaneGeometry(23,12),createSurfaceMaterial({color:0x4b8790,roughness:0.16,metalness:0.12,transparent:true,opacity:0.88}));
riversideWater.rotation.x=-Math.PI/2;riversideWater.position.set(-18,0.015,161);scene.add(riversideWater);
for (const [x,z] of [[-29,151],[-7,151],[-29,159],[-7,159]]) tree(x,z,0.72);
const lookoutBench = group(scene,-18,0,148.7);
box(lookoutBench,0,0.62,0,2.4,0.18,0.62,districtWoodMat);
box(lookoutBench,0,1.14,0.25,2.4,0.78,0.16,districtWoodMat);
for (const x of [-0.9,0.9]) box(lookoutBench,x,0.32,0,0.12,0.62,0.12,trimMat);
districtSign(-18,3.7,142.6,'RIVERSIDE LOOKOUT','NORTH SHORE · SCENIC STOP','#344b4b');
box(scene,0,0.65,228,106,1.3,0.65,wallMat);
for (let x=-50;x<=50;x+=5) box(scene,x,1.12,228,0.18,0.8,0.18,trimMat);

// Public park pocket on the east side of the boulevard.
box(scene,13.5,0.02,94,11,0.08,22,mat(0x71875c),false,true);
box(scene,13.5,0.075,94,8.8,0.055,19.5,mat(0x91a27b),false,true);
cylinder(scene,13.5,0.21,90.7,2.05,2.05,0.18,stoneMat,24);
cylinder(scene,13.5,0.44,90.7,1.35,1.35,0.32,mat(0x91bfc0,0.22,0.16),24);
cylinder(scene,13.5,0.78,90.7,0.38,0.55,0.48,stoneMat,12);
sphere(scene,13.5,1.12,90.7,0.42,mat(0x9cc9c7,0.18,0.08),12,8);
for (const [x,z] of [[9,85],[18,85],[9,99],[18,99]]) {
  tree(x,z,0.65);
}
// Park bench uses the same seating controller as the residence's benches.
const townBench = group(scene,13.5,0,98.2);
box(townBench,0,0.62,0,2.25,0.18,0.62,districtWoodMat);
box(townBench,0,1.12,0.26,2.25,0.78,0.16,districtWoodMat);
for (const x of [-0.82,0.82]) box(townBench,x,0.32,0,0.12,0.62,0.12,trimMat);

// A small picnic setup makes the Best Friend park hangout feel like a real destination.
const picnicBlanket = group(scene,13.5,0,95.2);
box(picnicBlanket,0,0.105,0,3.05,0.08,2.15,mat(0x657d70,0.98),false,true);
for (const x of [-1.18,-0.58,0,0.58,1.18]) box(picnicBlanket,x,0.151,0,0.035,0.012,1.98,mat(0xd5c8a8,0.9),false,false);
const picnicBasket = group(picnicBlanket,0.94,0.17,-0.62);
box(picnicBasket,0,0.19,0,0.58,0.38,0.48,districtWoodMat);
box(picnicBasket,0,0.39,0,0.62,0.07,0.52,mat(0x987650,0.78));
const picnicHandle = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.035,6,14,Math.PI),districtWoodMat);
picnicHandle.position.set(0,0.43,0); picnicHandle.rotation.z=Math.PI; picnicBasket.add(picnicHandle);
const picnicSandwich = group(picnicBlanket,-0.78,0.17,-0.58);
box(picnicSandwich,0,0.08,0,0.48,0.16,0.36,mat(0xe4c78e,0.88));
box(picnicSandwich,0,0.18,0,0.43,0.045,0.31,mat(0x75945d,0.9),false,false);

for (const [x,z] of [[-8.1,70],[8.1,70],[-8.1,94],[8.1,94],[-39,75],[39,75]]) {
  cylinder(scene,x,1.9,z,0.09,0.12,3.8,trimMat,8);
  sphere(scene,x,3.82,z,0.23,goldMat,8,6);
  const light=createManagedPointLight(0xffd29a,0,10);light.position.set(x,3.65,z);scene.add(light);districtStreetLights.push(light);
}

// NPCs use small procedural rigs and waypoint routes around the garden.
function makeNpc(name, x, z, shirtColor, route) {
  const npc = group(scene, x, 0, z);
  const spawnPosition = new THREE.Vector3(x, 0, z);
  const shirt = mat(shirtColor, 0.86), trousers = mat(0x343c3d, 0.9), npcShoe = mat(0x202526, 0.9);
  const skin = mat(0xc79270, 0.9), hair = mat(0x2b2926, 0.95);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.44, 3, 8), shirt);
  torso.position.y = 1.32; npc.add(torso);
  const head = group(npc, 0, 1.9, 0);
  sphere(head, 0, 0.15, 0, 0.27, skin, 12, 9);
  sphere(head, 0, 0.32, 0, 0.28, hair, 12, 7);
  const arms = [-1,1].map(side => {
    const a = group(npc, side * 0.34, 1.58, 0);
    cylinder(a, 0, -0.32, 0, 0.105, 0.13, 0.65, shirt, 8);
    sphere(a, 0, -0.68, 0, 0.10, skin, 8, 6);
    return a;
  });
  const legs = [-1,1].map(side => {
    const l = group(npc, side * 0.14, 0.88, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.46, 3, 7), trousers);
    limb.position.y = -0.34; l.add(limb);
    box(l, 0, -0.68, -0.07, 0.22, 0.13, 0.38, npcShoe);
    return l;
  });
  const cup = new THREE.Group();
  cylinder(cup, 0, -0.76, 0, 0.075, 0.095, 0.16, mat(0xf1e7d4, 0.35), 12);
  const coffeeSurface = new THREE.Mesh(new THREE.CircleGeometry(0.066, 12), mat(0x563a29, 0.3));
  coffeeSurface.rotation.x = -Math.PI / 2; coffeeSurface.position.y = -0.675; cup.add(coffeeSurface);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 10, Math.PI), mat(0xf1e7d4, 0.35));
  handle.position.set(0.09, -0.75, 0); handle.rotation.z = Math.PI / 2; cup.add(handle);
  cup.visible = false; arms[1].add(cup);
  const food = new THREE.Group();
  sphere(food, 0, -0.76, 0, 0.105, mat(0xc9975e, 0.88), 9, 7);
  sphere(food, 0, -0.73, -0.012, 0.075, mat(0x78966b, 0.9), 8, 6);
  food.visible = false; arms[1].add(food);
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 320; labelCanvas.height = 72;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(12,25,23,.72)'; ctx.fillRect(4, 8, 312, 56);
  ctx.fillStyle = '#e8e8dc'; ctx.font = '500 22px monospace'; ctx.textAlign = 'center'; ctx.fillText(name, 160, 43);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true,depthWrite:false}));
  label.position.set(0, 2.85, 0); label.scale.set(2.5, 0.56, 1); npc.add(label);
  const reactionCanvas = document.createElement('canvas'); reactionCanvas.width = 128; reactionCanvas.height = 96;
  const reactionCtx = reactionCanvas.getContext('2d');
  reactionCtx.fillStyle = 'rgba(15,28,25,.88)'; reactionCtx.beginPath(); reactionCtx.roundRect(10, 5, 108, 76, 22); reactionCtx.fill();
  reactionCtx.strokeStyle = 'rgba(236,226,197,.9)'; reactionCtx.lineWidth = 4; reactionCtx.stroke();
  reactionCtx.fillStyle = '#fff4d8'; reactionCtx.textAlign = 'center'; reactionCtx.textBaseline = 'middle'; reactionCtx.font = '54px sans-serif'; reactionCtx.fillText('♡', 64, 43);
  const reactionTexture = new THREE.CanvasTexture(reactionCanvas);
  const reaction = new THREE.Sprite(new THREE.SpriteMaterial({map:reactionTexture, transparent:true, depthWrite:false}));
  reaction.position.set(0, 3.55, 0); reaction.scale.set(0.9, 0.68, 1); reaction.visible = false; npc.add(reaction);
  const moodCanvas = document.createElement('canvas'); moodCanvas.width = 96; moodCanvas.height = 96;
  const moodCtx = moodCanvas.getContext('2d');
  moodCtx.fillStyle = 'rgba(15,28,25,.9)'; moodCtx.beginPath(); moodCtx.arc(48,48,43,0,Math.PI*2); moodCtx.fill();
  moodCtx.strokeStyle = 'rgba(236,226,197,.92)'; moodCtx.lineWidth = 4; moodCtx.stroke();
  moodCtx.font = '52px sans-serif'; moodCtx.textAlign = 'center'; moodCtx.textBaseline = 'middle'; moodCtx.fillStyle = '#fff4d8'; moodCtx.fillText('☺',48,50);
  const moodTexture = new THREE.CanvasTexture(moodCanvas);
  const moodSprite = new THREE.Sprite(new THREE.SpriteMaterial({map:moodTexture, transparent:true, depthWrite:false}));
  moodSprite.position.set(1.5, 3.18, 0); moodSprite.scale.set(0.42, 0.42, 1); npc.add(moodSprite);
  return { npc, spawnPosition, head, torso, arms, legs, cup, food, reaction, reactionCanvas, reactionCtx, reactionTexture, moodCanvas, moodCtx, moodTexture, moodSprite, route: route.map(p => new THREE.Vector3(p[0],0,p[1])), targetIndex: 0, phase: Math.random() * 6, name };
}
const npcs = [
  {
    ...makeNpc('ALEX · CARETAKER', -23, 16, 0x566c58, [[-23,16],[-23,27],[-18,27],[-18,16]]),
    id: 'alex', displayName: 'Alex',
    personality: { title: 'The Steady Caretaker', description: 'Alex suka rutinitas yang rapi, taman yang terawat, dan obrolan hangat tanpa terburu-buru.', traits: ['reliable','thoughtful','early bird'], preferredHangouts: ['garden','coffee'], preferredActivities: ['garden','coffee','eat'], preferredGifts: ['bouquet'], earlyBird: true, nightOwl: false, bodyLanguage: { tempo: 0.78, sway: 0.032, tilt: -0.015 } },
    mood: 'content', moodScore: 58, moodTimer: 1.2, playerNearby: false, greetingTimer: 0, greetingCooldown: 0, lastSocialLine: '',
    schedule: [
      { from: 6, to: 9, label: 'Morning rounds', activity: 'garden', route: [[-14,20],[-10,22],[-10,16],[-15,14]] },
      { from: 9, to: 11, label: 'Estate patrol', activity: 'garden', route: [[-23,16],[-23,27],[-18,27],[-18,16]] },
      { from: 11, to: 14, label: 'Coffee break with Mia', activity: 'coffee', route: [[-15,16],[-8,18],[1,16],[2.9,14.2]], seat: { id: 'coffee-stool-left', x: 2.9, z: 14.2, floorY: 0, seatY: 0.54, yaw: -Math.PI / 2, style: 'stool' } },
      { from: 14, to: 17, label: 'Afternoon estate patrol', activity: 'garden', route: [[-23,16],[-23,27],[-18,27],[-18,16]] },
      { from: 17, to: 20, label: 'Dinner at home', activity: 'eat', route: [[-12,12],[-5,4],[5.5,-4.45]], seat: { id: 'dining-chair-alex', x: 5.5, z: -4.45, floorY: 0.2, seatY: 0.76, yaw: Math.PI, style: 'dining' } },
      { from: 20, to: 22, label: 'Evening by the garden', activity: 'rest', route: [[-9,14],[-14,16],[-18.6,18.2]], seat: { id: 'garden-bench', x: -18.6, z: 18.2, floorY: 0, seatY: 0.71, yaw: Math.PI / 2, style: 'bench' } },
      { from: 22, to: 6, label: 'Resting at the garden bench', activity: 'rest', route: [[-18.6,18.2]], seat: { id: 'garden-bench', x: -18.6, z: 18.2, floorY: 0, seatY: 0.71, yaw: Math.PI / 2, style: 'bench' } }
    ], activeRoutine: '', activeSeat: null, restingOnSeat: false, activity: 'garden'
  },
  {
    ...makeNpc('MIA · RESIDENT', 28, 13, 0x80645a, [[28,13],[32,13],[32,20],[28,20]]),
    id: 'mia', displayName: 'Mia',
    personality: { title: 'The Curious Resident', description: 'Mia suka suasana cerah, hal-hal baru, dan waktu santai yang bisa dibagi bersama teman.', traits: ['curious','sunny','night owl'], preferredHangouts: ['pool','coffee','picnic'], preferredActivities: ['sunbathe','watch-tv','coffee','picnic'], preferredGifts: ['coffee'], earlyBird: false, nightOwl: true, bodyLanguage: { tempo: 1.18, sway: 0.072, tilt: 0.045 } },
    mood: 'curious', moodScore: 62, moodTimer: 1.8, playerNearby: false, greetingTimer: 0, greetingCooldown: 0, lastSocialLine: '',
    schedule: [
      { from: 6, to: 10, label: 'Morning at the pool', activity: 'sunbathe', route: [[28,13],[32,13],[34.4,18.4]], seat: { id: 'pool-lounger', x: 34.4, z: 18.4, floorY: 0, seatY: 0.42, yaw: -0.22, style: 'lounger' } },
      { from: 10, to: 11, label: 'Morning garden walk', activity: 'garden', route: [[17,12],[21,15],[20,21],[16,18]] },
      { from: 11, to: 14, label: 'Coffee break with Alex', activity: 'coffee', route: [[16,18],[12,16],[7,15],[6.1,14.2]], seat: { id: 'coffee-stool-right', x: 6.1, z: 14.2, floorY: 0, seatY: 0.54, yaw: Math.PI / 2, style: 'stool' } },
      { from: 14, to: 17, label: 'Afternoon garden walk', activity: 'garden', route: [[17,12],[21,15],[20,21],[16,18]] },
      { from: 17, to: 18, label: 'Evening garden stroll', activity: 'garden', route: [[4,15],[9,16],[10,21],[5,22]] },
      { from: 18, to: 20, label: 'Dinner at home', activity: 'eat', route: [[16,18],[12,10],[7,3],[5.5,-1.35]], seat: { id: 'dining-chair-mia', x: 5.5, z: -1.35, floorY: 0.2, seatY: 0.76, yaw: 0, style: 'dining' } },
      { from: 20, to: 22, label: 'Movie night', activity: 'watch-tv', route: [[3,2],[2.25,-2.2]], seat: { id: 'lounge-right', x: 2.25, z: -2.2, floorY: 0.2, seatY: 1.16, yaw: 0, style: 'sofa' } },
      { from: 22, to: 6, label: 'Resting at home', activity: 'rest', route: [[3,2],[0,-1],[-1,-3.4]], seat: { id: 'living-sofa', x: -1.0, z: -3.4, floorY: 0.2, seatY: 1.26, yaw: 0, style: 'sofa' } }
    ], activeRoutine: '', activeSeat: null, restingOnSeat: false, activity: 'garden'
  }
];

// Estate Living furniture kiosk beside the driveway.
const furnitureKiosk = group(scene, -9.0, 0, 34.2);
box(furnitureKiosk, 0, 0.78, 0, 2.2, 1.35, 1.25, woodMat);
box(furnitureKiosk, 0, 1.48, -0.02, 2.5, 0.12, 1.5, goldMat);
box(furnitureKiosk, 0, 2.32, -0.55, 2.2, 1.45, 0.13, trimMat);
box(furnitureKiosk, 0, 2.32, -0.46, 2.05, 1.25, 0.035, mat(0x53655a));
const kioskLabel = new THREE.Sprite(new THREE.SpriteMaterial({map:(() => { const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#dfe4d0';g.font='600 46px sans-serif';g.textAlign='center';g.fillText('ESTATE LIVING',256,78);return new THREE.CanvasTexture(c);})()}));
kioskLabel.position.set(0,2.35,-0.42); kioskLabel.scale.set(1.7,0.42,1); furnitureKiosk.add(kioskLabel);

// Courier parcels are activated only after the player accepts a shift from Alex.
const parcelSpots = [[-14.5,20.5],[1.4,43.0],[17.5,21.0]];
const parcelObjects = parcelSpots.map(([x,z],index) => {
  const parcel = group(scene,x,0,z);
  box(parcel,0,0.36,0,0.9,0.72,0.85,mat(0xb58b58));
  box(parcel,0,0.37,0,0.12,0.74,0.88,mat(0xe2d2ad),false,false);
  box(parcel,0,0.74,0,0.92,0.06,0.87,mat(0x8b663e),false,false);
  const marker = createManagedPointLight(0xe8d49b,0,3.5);marker.position.set(0,1.0,0);parcel.add(marker);
  parcel.visible=false;
  return {group:parcel,light:marker,index,x,z};
});

// A reusable illuminated loading bay marks the active City Express destination.
const courierNetworkMarker = (() => {
  const root = group(scene,0,0,0);
  cylinder(root,0,0.12,0,2.0,2.0,0.22,mat(0x304b48,0.5,0.4),20);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55,0.085,8,32),mat(0xd8c18a,0.35,0.42));
  ring.rotation.x=-Math.PI/2;ring.position.y=0.28;root.add(ring);
  const postMat=mat(0x365b57,0.38,0.55),beamMat=mat(0xd9c48f,0.32,0.36);
  for(const x of [-1.05,1.05])box(root,x,1.05,0,0.14,1.65,0.14,postMat,false,false);
  box(root,0,1.82,0,2.3,0.16,0.18,beamMat,false,false);
  const crate=group(root,0,0.62,0);
  box(crate,0,0,0,0.9,0.72,0.82,mat(0xb58b58,0.82,0.08));
  box(crate,0,0,0.42,0.12,0.74,0.035,mat(0xe2d2ad),false,false);
  const light=createManagedPointLight(0xd8c18a,1.6,10);light.position.set(0,2.15,0);root.add(light);
  root.visible=false;
  return {group:root,ring,light,crate};
})();

// Garden-care task markers become active when Alex assigns the chore.
const gardenTaskSpots = [[-15,8],[15,8],[15,29]];
const gardenTaskMarkers = gardenTaskSpots.map(([x,z],index) => {
  const marker = group(scene,x,0,z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72,0.075,8,24),mat(0x9bd6d0,0.35,0.25));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.12; marker.add(ring);
  cylinder(marker,0,0.38,0,0.12,0.12,0.42,mat(0x73b9b1),10);
  sphere(marker,0,0.72,0,0.2,mat(0xb5e6dc),10,8);
  const glow = createManagedPointLight(0x7bcfc2,0,4); glow.position.y=0.8; marker.add(glow);
  marker.visible=false;
  return {group:marker,glow,index,x,z};
});

const farmCropDefinitions = {
  tomato:{key:'tomato',name:'Tomato',icon:'🍅',seedItem:'seedTomato',seedName:'Tomato Seeds',harvestItem:'harvestTomato',harvestName:'Fresh Tomato',seedPrice:30,seedPack:3,growthMinutes:240,baseYield:3,salePrice:18,xp:20,color:0xd65342},
  carrot:{key:'carrot',name:'Carrot',icon:'🥕',seedItem:'seedCarrot',seedName:'Carrot Seeds',harvestItem:'harvestCarrot',harvestName:'Fresh Carrot',seedPrice:24,seedPack:3,growthMinutes:180,baseYield:3,salePrice:14,xp:18,color:0xe58c3e},
  strawberry:{key:'strawberry',name:'Strawberry',icon:'🍓',seedItem:'seedStrawberry',seedName:'Strawberry Seeds',harvestItem:'harvestStrawberry',harvestName:'Fresh Strawberry',seedPrice:42,seedPack:3,growthMinutes:300,baseYield:2,salePrice:26,xp:26,color:0xc94f62}
};
const farmState={selectedSeed:'tomato',plots:Array.from({length:6},()=>({crop:null,wateredAt:0,stage:0}))};
const farmRecipeDefinitions={
  tomatoPreserve:{key:'tomatoPreserve',name:'Tomato Preserve',icon:'🫙',inputItem:'harvestTomato',inputName:'Fresh Tomato',inputCount:4,outputItem:'tomatoPreserve',outputName:'Tomato Preserve',outputCount:1,salePrice:105,duration:90,cookingXp:24,description:'Slow-cooked tomato jars · +$33 over raw produce'},
  carrotJuice:{key:'carrotJuice',name:'Carrot Juice',icon:'🥤',inputItem:'harvestCarrot',inputName:'Fresh Carrot',inputCount:4,outputItem:'carrotJuice',outputName:'Carrot Juice',outputCount:1,salePrice:85,duration:75,cookingXp:20,description:'Fresh pressed juice · +$29 over raw produce'},
  strawberryJam:{key:'strawberryJam',name:'Strawberry Jam',icon:'🍓',inputItem:'harvestStrawberry',inputName:'Fresh Strawberry',inputCount:3,outputItem:'strawberryJam',outputName:'Strawberry Jam',outputCount:1,salePrice:125,duration:120,cookingXp:30,description:'Small-batch berry jam · +$47 over raw produce'}
};
const farmWorkshopState={built:false,activeBatch:null,processedLifetime:0};
const farmWorkshopBuildCost=780;

// Personal allotment: six raised beds tucked into the west garden, clear of the central driveway and existing paths.
const farmPlotPositions=[[-41,20],[-35,20],[-29,20],[-41,27],[-35,27],[-29,27]];
const farmSoilMat=mat(0x493b2d,0.98),farmWoodMat=mat(0x76583e,0.78),farmTrimMat=mat(0xb08b60,0.66),farmLeafMat=mat(0x658d52,0.84),farmLeafLight=mat(0x91a95e,0.82);
const farmPlots=farmPlotPositions.map(([x,z],index)=>{
  const groupPlot=group(scene,x,0,z);
  box(groupPlot,0,0.17,0,2.8,0.34,2.85,farmWoodMat);
  box(groupPlot,0,0.36,0,2.56,0.12,2.6,farmSoilMat);
  for(const side of [-1,1]){
    box(groupPlot,side*1.33,0.43,0,0.12,0.16,2.72,farmTrimMat,false,false);
    box(groupPlot,0,0.43,side*1.35,2.72,0.16,0.12,farmTrimMat,false,false);
  }
  for(let row=-1;row<=1;row++)box(groupPlot,0,0.435,row*0.66,2.26,0.025,0.045,mat(0x2d281f),false,false);
  const variants={};
  for(const [cropKey,crop] of Object.entries(farmCropDefinitions)){
    const plantGroup=group(groupPlot,0,0.46,0);plantGroup.visible=false;
    const leaves=group(plantGroup);const fruit=group(plantGroup);
    const baseStem=cylinder(leaves,0,0.48,0,0.07,0.09,0.92,farmLeafMat,7);baseStem.rotation.z=0.08;
    for(let i=0;i<7;i++){
      const angle=i*2.399,r=0.24+(i%3)*0.12,y=0.44+(i%4)*0.15;
      const leaf=sphere(leaves,Math.cos(angle)*r,y,Math.sin(angle)*r,0.19,i%2?farmLeafMat:farmLeafLight,7,5);leaf.scale.set(1.35,0.28,0.72);leaf.rotation.z=Math.sin(angle)*0.34;
    }
    if(cropKey==='tomato'){
      for(const [fx,fy,fz] of [[-0.2,0.62,0.08],[0.2,0.82,-0.07],[0.06,0.42,-0.18]])sphere(fruit,fx,fy,fz,0.13,mat(crop.color,0.48),8,6);
    }else if(cropKey==='carrot'){
      for(const [fx,fz] of [[-0.2,0.05],[0.14,-0.1],[0.2,0.16]]){const root=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.56,7),mat(crop.color,0.8));root.rotation.z=Math.PI;root.position.set(fx,0.1,fz);fruit.add(root);}
    }else{
      for(const [fx,fy,fz] of [[-0.2,0.34,0.05],[0.19,0.42,-0.08],[0.04,0.28,0.2]]){sphere(fruit,fx,fy,fz,0.12,mat(crop.color,0.42),8,6);sphere(fruit,fx,fy+0.09,fz,0.065,farmLeafMat,7,5);}
    }
    variants[cropKey]={group:plantGroup,leaves,fruit};
  }
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#e9e0c6';ctx.font='700 50px sans-serif';ctx.textAlign='center';ctx.fillText(String(index+1).padStart(2,'0'),128,66);return new THREE.CanvasTexture(canvas);})(),transparent:true,depthWrite:false}));
  label.position.set(0,0.82,-1.2);label.scale.set(0.58,0.22,1);groupPlot.add(label);
  const moisture=new THREE.Mesh(new THREE.TorusGeometry(1.16,0.025,5,28),mat(0x70b8ba,0.55,0.12));moisture.rotation.x=Math.PI/2;moisture.position.y=0.49;moisture.visible=false;groupPlot.add(moisture);
  return {index,x,z,group:groupPlot,variants,moisture,lastStage:-1,lastCrop:null};
});
const farmBoard=group(scene,-36.0,0,14.5);
box(farmBoard,0,0.72,0,1.45,1.25,0.24,woodMat);
box(farmBoard,0,1.47,-0.02,1.53,0.14,0.34,farmTrimMat);
box(farmBoard,0,0.82,-0.14,1.16,0.73,0.035,mat(0x40594c),false,false);
const farmBoardLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f0e8d4';ctx.font='700 46px sans-serif';ctx.textAlign='center';ctx.fillText('ESTATE GARDEN',256,80);return new THREE.CanvasTexture(canvas);})(),transparent:true}));
farmBoardLabel.position.set(0,0.85,-0.17);farmBoardLabel.scale.set(1.03,0.25,1);farmBoard.add(farmBoardLabel);
for(const x of [-0.53,0.53])box(farmBoard,x,0.28,0,0.1,0.55,0.13,trimMat);
const farmWorkshopGroup=group(scene,-46.2,0,17.1);farmWorkshopGroup.visible=false;
const workshopWood=mat(0x71513a,0.72),workshopMetal=mat(0x9baba0,0.38,0.54),workshopGlass=mat(0xa6c8bb,0.25,0.18);
box(farmWorkshopGroup,0,0.9,0,3.0,0.24,1.65,workshopWood);
for(const x of [-1.28,1.28])for(const z of [-0.62,0.62])box(farmWorkshopGroup,x,0.46,z,0.13,0.92,0.13,workshopMetal);
box(farmWorkshopGroup,0,1.12,-0.36,0.78,0.7,0.64,workshopMetal);
cylinder(farmWorkshopGroup,0,1.63,-0.36,0.25,0.25,0.26,workshopMetal,12);
cylinder(farmWorkshopGroup,0,1.82,-0.36,0.10,0.10,0.22,workshopMetal,10);
for(const x of [-0.92,0,0.92]){const jar=cylinder(farmWorkshopGroup,x,1.27,0.5,0.21,0.21,0.48,workshopGlass,12);jar.material=workshopGlass; cylinder(farmWorkshopGroup,x,1.53,0.5,0.22,0.22,0.08,goldMat,12);}
for(const x of [-1.55,1.55])box(farmWorkshopGroup,x,1.6,-0.3,0.13,1.75,0.13,workshopWood);
box(farmWorkshopGroup,0,2.5,-0.3,3.3,0.14,1.0,workshopWood);
box(farmWorkshopGroup,0,2.58,-0.3,3.12,0.05,0.82,mat(0x526759),false,false);
const workshopSign=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f1e7d0';ctx.font='700 42px sans-serif';ctx.textAlign='center';ctx.fillText('ARTISAN WORKSHOP',256,80);return new THREE.CanvasTexture(canvas);})(),transparent:true}));
workshopSign.position.set(0,2.58,-0.73);workshopSign.scale.set(1.55,0.38,1);farmWorkshopGroup.add(workshopSign);


// Player character: a lightweight, articulated procedural rig (no external skeleton assets).
const player = group(scene, 0, 0, 27);
const avatar = group(player);
const skinMat = mat(0xc78e69, 0.9);
const shirtMat = mat(0x394d48, 0.85);
const pantsMat = mat(0x30383a, 0.9);
const shoeMat = mat(0x1d2525, 0.8);
const hairMat = mat(0x292724, 0.95);
const bodyPivot = group(avatar, 0, 0.96, 0);
const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.48, 4, 10), shirtMat);
torsoMesh.position.set(0, 0.39, 0); bodyPivot.add(torsoMesh);
cylinder(bodyPivot, 0, 0, 0, 0.30, 0.30, 0.13, trimMat, 10);
cylinder(avatar, 0, 1.82, 0, 0.12, 0.13, 0.22, skinMat, 10);
const headPivot = group(avatar, 0, 1.82, 0);
const head = sphere(headPivot, 0, 0.26, 0, 0.31, skinMat, 16, 12);
sphere(headPivot, 0, 0.46, -0.015, 0.32, hairMat, 14, 8);
box(headPivot, 0, 0.21, -0.29, 0.28, 0.08, 0.045, hairMat, false, false);
const eyeMat = mat(0x242522, 0.92);
const eyeL = sphere(headPivot, -0.105, 0.27, -0.285, 0.035, eyeMat, 8, 6);
const eyeR = sphere(headPivot, 0.105, 0.27, -0.285, 0.035, eyeMat, 8, 6);
const browL = box(headPivot, -0.105, 0.345, -0.286, 0.095, 0.022, 0.025, hairMat, false, false);
const browR = box(headPivot, 0.105, 0.345, -0.286, 0.095, 0.022, 0.025, hairMat, false, false);
browL.rotation.z = -0.08; browR.rotation.z = 0.08;
sphere(headPivot, 0, 0.20, -0.318, 0.045, skinMat, 8, 6);
const mouthMat = mat(0x75473f, 0.95);
const mouthMesh = box(headPivot, 0, 0.115, -0.302, 0.082, 0.016, 0.014, mouthMat, false, false);
const playerFace = { blinkTimer: 2.1 + Math.random() * 1.7, blinkRemaining: 0, expression: 'neutral', expressionTimer: 0 };

// Shoulder, elbow and wrist pivots make arm swing and gestures less mechanical.
const armL = group(bodyPivot, -0.48, 0.72, 0);
const armR = group(bodyPivot, 0.48, 0.72, 0);
const elbowL = group(armL, 0, -0.43, 0);
const elbowR = group(armR, 0, -0.43, 0);
const wristL = group(elbowL, 0, -0.39, 0);
const wristR = group(elbowR, 0, -0.39, 0);
for (const [arm, elbow, wrist] of [[armL,elbowL,wristL],[armR,elbowR,wristR]]) {
  cylinder(arm, 0, -0.22, 0, 0.12, 0.145, 0.48, shirtMat, 9);
  sphere(arm, 0, -0.43, 0, 0.115, shirtMat, 9, 7);
  cylinder(elbow, 0, -0.18, 0, 0.095, 0.105, 0.40, skinMat, 9);
  sphere(wrist, 0, 0, 0, 0.105, skinMat, 9, 7);
}

// A small book prop appears only while the player performs a reading gesture.
const gestureBook = group(avatar, 0, 1.23, -0.43);
const gestureBookCover = mat(0x6b5944, 0.92);
const gestureBookPages = mat(0xe6dfc9, 0.9);
box(gestureBook, 0, 0, 0, 0.32, 0.235, 0.045, gestureBookCover, false, false);
box(gestureBook, 0, 0, -0.025, 0.285, 0.205, 0.018, gestureBookPages, false, false);
box(gestureBook, -0.105, 0, -0.036, 0.012, 0.19, 0.006, mat(0xb9a889, 0.95), false, false);
gestureBook.visible = false;

// Small, low-poly props sit in the character's hand space and follow the gesture rig.
const heldParcel = group(avatar, 0, 1.23, -0.52);
const parcelCardboard = mat(0xb68a58, 0.92);
const parcelTape = mat(0xe6d5ad, 0.9);
for (let i = 0; i < 3; i++) {
  const boxProp = group(heldParcel, (i - 1) * 0.18, i * 0.27, 0);
  box(boxProp, 0, 0, 0, 0.43, 0.32, 0.34, parcelCardboard, false, false);
  box(boxProp, 0, 0.006, -0.002, 0.065, 0.326, 0.352, parcelTape, false, false);
  box(boxProp, 0, 0.166, 0, 0.44, 0.025, 0.35, parcelTape, false, false);
}
heldParcel.visible = false;

const heldCoffee = group(avatar, 0.39, 1.18, -0.50);
cylinder(heldCoffee, 0, 0, 0, 0.10, 0.085, 0.24, mat(0xf0e8d7, 0.35), 12);
cylinder(heldCoffee, 0, 0.125, 0, 0.078, 0.078, 0.018, mat(0x4b3022, 0.4), 12);
const coffeeHandle = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.014, 6, 12), mat(0xf0e8d7, 0.35));
coffeeHandle.position.x = 0.10; coffeeHandle.rotation.y = Math.PI / 2; heldCoffee.add(coffeeHandle);
heldCoffee.visible = false;

const heldBouquet = group(avatar, 0.39, 1.15, -0.52);
const flowerStem = mat(0x536f4b, 0.94), flowerGold = mat(0xe4bd76, 0.72), flowerPink = mat(0xc97e82, 0.78), flowerCream = mat(0xe9dfc6, 0.82);
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 0.095;
  cylinder(heldBouquet, x, -0.08, 0, 0.012, 0.015, 0.36, flowerStem, 6);
  sphere(heldBouquet, x, 0.12 + (i === 1 ? 0.04 : 0), 0, 0.075, [flowerPink,flowerGold,flowerCream][i], 8, 6);
  sphere(heldBouquet, x - 0.04, 0.035, 0.012, 0.045, flowerStem, 7, 5);
}
cylinder(heldBouquet, 0, -0.12, 0, 0.045, 0.055, 0.12, mat(0x9b6a55, 0.86), 8);
heldBouquet.visible = false;

const heldWateringCan = group(avatar, 0.39, 1.12, -0.50);
const canBody = mat(0x7f9c91, 0.62, 0.12), canTrim = mat(0xd5c59c, 0.55, 0.18);
box(heldWateringCan, 0, 0, 0, 0.28, 0.22, 0.19, canBody, false, false);
cylinder(heldWateringCan, 0.16, 0.035, -0.04, 0.035, 0.035, 0.29, canTrim, 8).rotation.z = -Math.PI / 2.5;
const canHandle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 12, Math.PI), canTrim);
canHandle.position.set(0, 0.135, 0); canHandle.rotation.z = Math.PI; heldWateringCan.add(canHandle);
heldWateringCan.visible = false;

const heldPan = group(avatar, 0.36, 1.12, -0.50);
cylinder(heldPan, 0, 0, 0, 0.17, 0.17, 0.055, mat(0x454d4c, 0.42, 0.58), 14);
cylinder(heldPan, 0, 0.03, 0, 0.14, 0.14, 0.012, mat(0x8b9b8e, 0.72), 12);
const panHandle = box(heldPan, 0, 0, 0.19, 0.075, 0.055, 0.34, mat(0x292f30, 0.52, 0.42), false, false);
panHandle.rotation.x = 0.08;
heldPan.visible = false;

const heldProps = { book: gestureBook, parcel: heldParcel, coffee: heldCoffee, bouquet: heldBouquet, wateringCan: heldWateringCan, pan: heldPan };
const heldFishingRod = group(wristR, 0.02, 0.02, -0.02);
const fishingRodShaft = cylinder(heldFishingRod, 0, 0.42, 0, 0.025, 0.018, 1.45, mat(0x554b3e, 0.72, 0.08), 8);
fishingRodShaft.rotation.x = 0.95;
const fishingRodReel = cylinder(heldFishingRod, 0, 0.12, -0.02, 0.065, 0.065, 0.12, mat(0x9b9b84, 0.48, 0.34), 8);
fishingRodReel.rotation.x = Math.PI / 2;
const fishingRodLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1.1,-0.88),new THREE.Vector3(0.08,-0.6,-2.82)]),new THREE.LineBasicMaterial({color:0xd9d7c5,transparent:true,opacity:0.72}));
heldFishingRod.add(fishingRodLine); heldFishingRod.visible = false;
const handheldState = { item: null, count: 0, persistent: false };
const worldDrops = [];
let worldDropInstanceId = 0;
const worldDropRestHeight = { book: 0.13, parcel: 0.18, coffee: 0.13, bouquet: 0.27, wateringCan: 0.13, pan: 0.05 };
const worldDropNames = { book: 'buku', parcel: 'paket', coffee: 'cangkir kopi', bouquet: 'buket bunga', wateringCan: 'watering can', pan: 'wajan' };
function setHandheldObject(item, count = 1, persistent = false) {
  for (const prop of Object.values(heldProps)) prop.visible = false;
  handheldState.item = heldProps[item] ? item : null;
  handheldState.count = handheldState.item ? Math.max(1, Math.min(3, Math.floor(count) || 1)) : 0;
  handheldState.persistent = !!(handheldState.item && persistent);
  if (handheldState.item) {
    heldProps[handheldState.item].visible = true;
    if (handheldState.item === 'parcel') heldParcel.children.forEach((child, index) => { child.visible = index < handheldState.count; });
  }
}
function clearHandheldObject() { setHandheldObject(null); }
function syncCourierHandheld() {
  const count = Math.max(0, Math.min(3, Math.floor(Number(inventory.parcel) || 0)));
  if (count > 0) setHandheldObject('parcel', count, true);
  else if (handheldState.item === 'parcel') clearHandheldObject();
}
const playerGesture = { type: 'none', elapsed: 0, duration: 0, target: null, weight: 0 };
const gestureDurations = { wave: 1.65, reach: 1.05, inspect: 1.35, read: 2.45, talk: 1.5, offer: 1.25, work: 1.4, pickup: 0.95, water: 1.5, cook: 1.65, drink: 1.55, handoff: 1.25 };

// Hip, knee and ankle pivots support a two-part stride with visible foot lift.
const hipPivot = group(avatar, 0, 0.91, 0);
const legL = group(hipPivot, -0.2, 0, 0);
const legR = group(hipPivot, 0.2, 0, 0);
const kneeL = group(legL, 0, -0.41, 0);
const kneeR = group(legR, 0, -0.41, 0);
const footL = group(kneeL, 0, -0.36, 0);
const footR = group(kneeR, 0, -0.36, 0);
for (const leg of [legL,legR]) {
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.24, 4, 8), pantsMat);
  thigh.position.y = -0.205; leg.add(thigh);
}
for (const [knee,foot] of [[kneeL,footL],[kneeR,footR]]) {
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.20, 4, 8), pantsMat);
  shin.position.y = -0.16; knee.add(shin);
  box(foot, 0, -0.05, -0.09, 0.29, 0.12, 0.42, shoeMat);
  box(foot, 0, -0.015, -0.27, 0.23, 0.045, 0.07, shoeMat);
}
const playerMotion = { state: 'idle', speed: 0, blend: 0, gaitPhase: 0, turnRate: 0, landingKick: 0 };
let diveGear;
diveGear=group(avatar);
const diveTankMat=mat(0xe2a84f,0.42,0.3),diveStrapMat=mat(0x283f42,0.72),diveMaskMat=createSurfaceMaterial({color:0x79c5ce,roughness:0.18,metalness:0.2,transparent:true,opacity:0.76});
cylinder(diveGear,0,1.1,0.32,0.17,0.19,0.78,diveTankMat,10);
box(diveGear,0,1.17,0.12,0.44,0.08,0.08,diveStrapMat,false,false);
box(diveGear,0,0.86,0.12,0.43,0.08,0.08,diveStrapMat,false,false);
const diveMask=group(diveGear,0,2.07,-0.26);box(diveMask,0,0.0,0,0.5,0.18,0.075,diveMaskMat,false,false);box(diveMask,0,0.0,-0.055,0.12,0.22,0.05,diveStrapMat,false,false);
for(const side of [-1,1]){const fin=box(diveGear,side*0.18,0.14,-0.42,0.22,0.075,0.64,mat(0x3d9187,0.55,0.12),false,false);fin.rotation.x=-0.08;}
diveGear.visible=false;
const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), new THREE.MeshBasicMaterial({ color: 0x23352a, transparent: true, opacity: 0.22, depthWrite: false }));
shadowDisc.rotation.x = -Math.PI / 2;
shadowDisc.position.y = 0.015;
player.add(shadowDisc);

// Movement state
const keys = new Set();
const velocity = new THREE.Vector3();
const moveInput = new THREE.Vector2();
let cameraYaw = 0;
let cameraYawTarget = 0;
let cameraPitch = 0.24;
let cameraPitchTarget = 0.24;
let cameraDistance = 8.8;
let cameraDistanceTarget = 8.8;
let isStarted = false;
let isRunning = false;
let isGrounded = true;
let verticalSpeed = 0;
let doorOpen = false;
let inVehicle = false;
let selectedVehicleType='suv';
let motorcycleOwned=false;
const vehicleFleetTelemetry={suv:{fuel:100,dirt:0,tripDistance:0},motorcycle:{fuel:100,dirt:0,tripDistance:0}};
const motorcyclePurchasePrice=2850;
const dealerVehicleBay={x:14.2,z:57.5,yaw:0};
let inBoat = false;
let boatSpeed = 0;
let boatHeading = 0;
let boatTripDistance = 0;
let boatRentalCount = 0;
let boatBrakeHeld = false;
let boatDockedAtIsland = false;
const boatRaceState = { phase:'idle', elapsed:0, checkpoint:0, bestTime:0, lastTime:0, rewardDay:0, completed:0, resultTimer:0 };
const roadRallyState = { phase:'idle', elapsed:0, checkpoint:0, bestTime:0, lastTime:0, rewardDay:0, completed:0, lastTier:'--', resultTimer:0, hudSecond:-1 };
const boatSalvageState = { day:1, collected:[false,false,false], bonusClaimed:false, total:0 };
const divingState = { active:false, oxygen:90, maxOxygen:90, day:1, collected:[false,false,false], bonusClaimed:false, total:0, timeAccumulator:0 };
let vehicleSpeed = 0;
let vehicleFuel = 100;
let vehicleDirt = 0;
let vehicleWashTimer = 0;
let vehicleFuelEmptyNotified = false;
let vehicleLowFuelNotified = false;
let vehicleBrakeHeld = false;
let vehicleLightsMode = 'auto';
let vehicleTripDistance = 0;
let vehicleAcceleration = 0;
let vehicleImpact = 0;
let vehicleNightMix = 0;
let vehicleHornCooldown = 0;
let vehicleHornAudio = null;
let gameMinutes = 9 * 60;
let lastClockMinute = -1;
let tvOn = false;
let fridgeOpen = false;
let lightsOn = false;
let walkClock = 0;
let currentTarget = null;
let wallet = 650;
const propertyUpgrades = { solar: 0, kitchen: 0, bedroom: 0, terrace: 0, studio: 0, guestSuite: 0 };
const guestSuiteRental = { listing:false, tenantActive:false, tenantName:'', moveInDay:0, leaseEndDay:0, daysPaid:0, grossEarned:0, feesPaid:0, lifetimePaidDays:0, lifetimeGrossEarned:0, lifetimeFeesPaid:0, lastPaidDay:0 };
const guestSuiteRentPerDay = 180;
const cafeBusinessState = { owned:false, open:false, stock:0, localStock:0, localDeliveries:0, lifetimeLocalServings:0, lastLocalServings:0, reputation:0, espresso:0, patio:0, operatingDays:0, lifetimeSales:0, lifetimeOperatingCosts:0, lastOperatedDay:0, lastProfit:0, lastCustomers:0 };
const cafeBusinessConfig = { licenseCost:3600, restockCost:180, restockUnits:12, stockCapacity:48, localStockCapacity:24, dailyStockUse:3, localSalesBonusPerServing:5, upgradeCosts:{espresso:[750,1150,1650],patio:[950,1450,2050]}, upgradeBonuses:{espresso:[28,42,58],patio:[22,36,52]} };
const guestSuiteManagementFee = 25;
let lifetimeIncome = 0;
let lifetimeSpending = 0;
const transactionHistory = [];
let workLimitDay = 1;
let courierShiftsToday = 0;
let gardenShiftsToday = 0;
const courierNetworkRoutes = [
  {id:'cafe',name:'Corner Cafe',x:-36,z:78,reward:260,deadline:145,description:'Drop the sealed coffee supply at the west-side loading bay.'},
  {id:'market',name:'Town Market',x:36,z:78,reward:275,deadline:145,description:'Deliver fresh stock to the market receiving point.'},
  {id:'fuel',name:'Northside Fuel',x:36,z:126,reward:325,deadline:175,description:'Bring a service crate to the fuel stop.'},
  {id:'riverside',name:'Riverside Lookout',x:-18,z:137,reward:355,deadline:190,description:'Take a parcel to the scenic boardwalk access.'},
  {id:'marina',name:'Harborfront Marina',x:25,z:187,reward:420,deadline:225,description:'Deliver marine equipment to the harbor service lane.'}
];
const courierNetworkState = {day:1,phase:'idle',routeIndex:-1,elapsed:0,acceptedToday:0,completedTotal:0,lastReward:0,bestTime:0,lastDuration:0,hudSecond:-1};
const inventory = { houseKey: 1, phone: 1, parcel: 0, plant: 0, floorLamp: 0, bookshelf: 0, sideTable: 0, areaRug: 0, bouquet: 0, coffee: 0, sandwich: 0, apple: 0, water: 0, pastry: 0, fishSardine: 0, fishBass: 0, fishGolden: 0, seedTomato:0, seedCarrot:0, seedStrawberry:0, harvestTomato:0, harvestCarrot:0, harvestStrawberry:0, tomatoPreserve:0, carrotJuice:0, strawberryJam:0 };
const decorPlaced = { plant: false, floorLamp: false, bookshelf: false, sideTable: false, areaRug: false };
const decorPositions = [];
let placementMode = null;
let decorInstanceId = 0;
let jobPhase = 'idle';
let jobCollected = [false, false, false];
let jobsCompleted = 0;
let outfitKey = 'forest';
const needs = { hunger: 100, energy: 100, social: 50, hygiene: 100, bladder: 100 };
const relationships = { alex: 12, mia: 12 };
const skills = { cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 };
let gardenJobPhase = 'idle';
let gardenWatered = [false,false,false];
let districtStoreType = 'market';
const townVisited = { cafe:false, market:false, park:false, fuelStop:false, riverside:false, marina:false, northShoal:false, northShoalTreasure:false };
const fishingState = { phase: 'idle', timer: 0, totalWait: 0, biteDuration: 1.12, catches: 0, lastCatch: '' };
const fishCatalog = {
  fishSardine: { name: 'Silver Sardine', icon: '🐟', price: 28, description: 'Common catch · sale value $28' },
  fishBass: { name: 'Harbor Bass', icon: '🐠', price: 62, description: 'Uncommon catch · sale value $62' },
  fishGolden: { name: 'Golden Tuna', icon: '✦', price: 150, description: 'Rare catch · sale value $150' }
};
let gardenJobsCompleted = 0;
let gameDay = 1;
let lastBilledDay = 1;
let unpaidBills = 0;
let billsPaid = 0;
let careerWorkDay = 1;
let careerShiftsToday = 0;
let giftLimitDay = 1;
const giftsGivenToday = { alex: 0, mia: 0 };
let hangoutLimitDay = 1;
const hangoutsToday = { alex: 0, mia: 0 };
let hangoutSession = null;
let hangoutFollowEnabled = true;
let npcSocialSession = null;
let npcSocialCooldown = 0;
let socialTalkLimitDay = 1;
const socialTalksToday = { alex: 0, mia: 0 };
let playerSeated = false;
let activeSeat = null;
let seatedActivity = null;
let seatedActivityTimer = 0;
let needsHudTimer = 0;
const outfitColors = { forest: 0x394d48, sand: 0xa58a60, wine: 0x703d4b, ocean: 0x3b5d7a };
const objectiveState = { enter: false, lights: false, tv: false, upstairs: false };
const objectiveLabels = [
  ['enter', 'Masuk ke dalam rumah'],
  ['lights', 'Nyalakan lampu ruang utama'],
  ['tv', 'Hidupkan televisi'],
  ['upstairs', 'Jelajahi lantai dua'],
];
const dailyTaskCycles = [
  ['homeCare', 'skillPractice', 'destination'],
  ['mealPrep', 'decorate', 'paidWork'],
  ['homeCare', 'skillPractice', 'vehicleCare'],
  ['mealPrep', 'skillPractice', 'paidWork'],
  ['homeCare', 'mealPrep', 'destination'],
  ['skillPractice', 'decorate', 'harvestCrop']
];
const dailyTaskDefinitions = {
  homeCare: { title: 'Look After Yourself', icon: '✦', description: 'Selesaikan 2 rutinitas rumah: mandi, toilet, memasak, atau tidur.', event: 'homeCare', goal: 2, reward: 120 },
  skillPractice: { title: 'Keep Improving', icon: '↗', description: 'Kumpulkan 30 XP dari aktivitas dan latihan skill apa pun.', event: 'skillPractice', goal: 30, reward: 140 },
  paidWork: { title: 'Earn Your Keep', icon: '$', description: 'Selesaikan satu pekerjaan berbayar: kurir, taman, atau freelance.', event: 'paidWork', goal: 1, reward: 220 },
  mealPrep: { title: 'Home-Cooked Meal', icon: '⌂', description: 'Masak satu hidangan di dapur rumah.', event: 'mealPrep', goal: 1, reward: 100 },
  decorate: { title: 'Make It Yours', icon: '◇', description: 'Tempatkan satu dekorasi baru di dalam rumah.', event: 'decorate', goal: 1, reward: 130 },
  destination: { title: 'Take the Scenic Route', icon: '↗', description: 'Kunjungi satu tujuan di North Shore, Riverside, atau Harborfront Marina.', event: 'destination', goal: 1, reward: 180 },
  vehicleCare: { title: 'Fresh Off the Road', icon: '✧', description: 'Bersihkan SUV di Northside Auto Spa setelah menjelajah.', event: 'vehicleCare', goal: 1, reward: 110 },
  harvestCrop: { title: 'Fresh from the Garden', icon: '🌱', description: 'Panen satu tanaman dari Estate Garden.', event: 'harvestCrop', goal: 1, reward: 130 }
};
let dailyTaskDay = 1;
const dailyTaskProgress = {};
const dailyTaskClaimed = {};
let toastTimer = 0;
let dragging = false;
let lastPointer = { x: 0, y: 0 };
const cameraPointers = new Map();
let previousPinchDistance = 0;
let joystickPointer = null;
let joystickVector = new THREE.Vector2();
const clock = new THREE.Timer();
const clockLabel = document.querySelector('#clock');
clock.connect(document);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function collides(x, z) {
  const r = 0.48;
  if (x < -52 || x > 52 || z < -47 || z > 227.5) return true;
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  if(vehicleGarageState.built)for(const c of vehicleGarageColliders){if(x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ)return true;}
  // The closed front doors block the entrance until the player interacts.
  if (!doorOpen && x > -2.28 && x < 2.28 && z + r > 7.95 && z - r < 8.85) return true;
  return false;
}
function vehicleCollides(x, z) {
  const bike=selectedVehicleType==='motorcycle';
  const body = { x, z, yaw: vehicle.rotation.y, halfWidth: bike?0.58:1.25, halfLength: bike?1.55:2.36 };
  const cos = Math.abs(Math.cos(body.yaw)), sin = Math.abs(Math.sin(body.yaw));
  const extentX = body.halfWidth * cos + body.halfLength * sin;
  const extentZ = body.halfWidth * sin + body.halfLength * cos;
  if (x - extentX < -52.2 || x + extentX > 52.2 || z - extentZ < -47.2 || z + extentZ > 227.2) return true;
  // The pier is pedestrian-only for both land vehicles; the motorcycle has a smaller collision footprint.
  if (z + extentZ > 195.5 && z - extentZ < 211.4 && x + extentX > 22.15 && x - extentX < 27.85) return true;
  for (const collider of colliders) if (obbIntersectsAabb2D(body, collider)) return true;
  if(vehicleGarageState.built)for(const collider of vehicleGarageColliders)if(obbIntersectsAabb2D(body,collider))return true;
  if (!doorOpen && obbIntersectsAabb2D(body, { minX:-2.28, maxX:2.28, minZ:7.95, maxZ:8.85 })) return true;
  if (obbIntersectsAabb2D(body, { minX:14.5, maxX:25.5, minZ:-10.0, maxZ:8.0 })) return true;
  for (const resident of npcs) if (obbIntersectsCircle2D(body, resident.npc.position.x, resident.npc.position.z, 0.72)) return true;
  return false;
}
function moveVehicleSafely(deltaX, deltaZ) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaZ)) / 0.28));
  const stepX = deltaX / steps, stepZ = deltaZ / steps;
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    const nextX = vehicle.position.x + stepX, nextZ = vehicle.position.z + stepZ;
    if (!vehicleCollides(nextX, nextZ)) { vehicle.position.x = nextX; vehicle.position.z = nextZ; continue; }
    let slid = false;
    if (Math.abs(stepX) > 1e-5 && !vehicleCollides(nextX, vehicle.position.z)) { vehicle.position.x = nextX; slid = true; }
    else if (Math.abs(stepX) > 1e-5) blocked = true;
    if (Math.abs(stepZ) > 1e-5 && !vehicleCollides(vehicle.position.x, nextZ)) { vehicle.position.z = nextZ; slid = true; }
    else if (Math.abs(stepZ) > 1e-5) blocked = true;
    if (!slid) break;
  }
  return blocked;
}

function jump() {
  if (playerSeated) { standFromSeat(); return; }
  if (isStarted && !isUiOpen() && !inVehicle && !inBoat && isGrounded) {
    const carry = Math.min(0.55, Math.hypot(velocity.x, velocity.z) * 0.055);
    verticalSpeed = 7.1 + carry;
    isGrounded = false;
    playerMotion.landingKick = 0;
    playerMotion.state = 'jumping';
  }
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2300);
}
const panelIds = ['dialogue-panel','shop-panel','inventory-panel','style-panel','household-panel','settings-panel','skill-panel','career-panel','daily-tasks-panel','work-finance-panel','property-panel','district-panel','fishing-panel','farm-panel','garage-panel','vehicle-dealer-panel'];
const panelElements = panelIds.map(id => document.getElementById(id)).filter(Boolean);
let hasOpenPanel = panelElements.some(panel => !panel.classList.contains('hidden'));
const panelVisibilityObserver = new MutationObserver(() => {
  hasOpenPanel = panelElements.some(panel => !panel.classList.contains('hidden'));
});
panelElements.forEach(panel => panelVisibilityObserver.observe(panel, { attributes: true, attributeFilter: ['class'] }));
function isUiOpen() { return !!placementMode || hasOpenPanel; }
function closePanels() {
  const fishingPanel = document.getElementById('fishing-panel');
  if (fishingPanel && !fishingPanel.classList.contains('hidden')) cancelFishingSession();
  panelIds.forEach(id => document.getElementById(id).classList.add('hidden'));
}
function setWallet(amount) {
  wallet = Math.max(0, Math.floor(amount));
  document.querySelector('#wallet-value').textContent = '$' + wallet.toLocaleString('en-US');
}
function recordTransaction(label, amount, dayOverride = null, timeOverride = null) {
  const value = Math.trunc(Number(amount) || 0);
  if (!value) return;
  if (value > 0) lifetimeIncome += value;
  else lifetimeSpending += Math.abs(value);
  transactionHistory.unshift({ label: String(label).slice(0, 64), amount: value, day: Number.isFinite(dayOverride) ? Math.max(1,Math.floor(dayOverride)) : gameDay, time: /^\d{2}:\d{2}$/.test(timeOverride || '') ? timeOverride : formatGameTime() });
  if (transactionHistory.length > 12) transactionHistory.length = 12;
  if (!document.querySelector('#work-finance-panel').classList.contains('hidden')) renderWorkFinancePanel();
}
function resetDailyWorkLimits() {
  if (workLimitDay === gameDay) return;
  workLimitDay = gameDay;
  // An unfinished contract still occupies today's slot even if its start time crossed midnight.
  courierShiftsToday = jobPhase === 'collect' || jobPhase === 'deliver' ? 1 : 0;
  gardenShiftsToday = gardenJobPhase === 'active' ? 1 : 0;
  renderWorkFinancePanel();
}
function resetCourierNetworkDay() {
  if (courierNetworkState.day === gameDay) return;
  courierNetworkState.day = gameDay;
  courierNetworkState.acceptedToday = 0;
}
function currentCourierNetworkRoute() {
  return courierNetworkRoutes[courierNetworkState.routeIndex] || null;
}
function renderCourierNetworkHud(force = false) {
  const hud = document.querySelector('#delivery-network-hud');
  if (!hud) return;
  const active = courierNetworkState.phase === 'enroute';
  hud.classList.toggle('hidden',!active);
  if (!active) return;
  const route = currentCourierNetworkRoute();
  if (!route) { hud.classList.add('hidden'); return; }
  const seconds = Math.max(0,Math.ceil(route.deadline-courierNetworkState.elapsed));
  const second = Math.ceil(courierNetworkState.elapsed);
  const distance = Math.hypot(vehicle.position.x-route.x,vehicle.position.z-route.z);
  const canUnload = inVehicle && distance < 6.3 && Math.abs(vehicleSpeed) < 2.2;
  const status = document.querySelector('#delivery-network-status');
  const title = document.querySelector('#delivery-network-title');
  const copy = document.querySelector('#delivery-network-copy');
  const timer = document.querySelector('#delivery-network-timer');
  const track = document.querySelector('#delivery-network-progress');
  if (force || courierNetworkState.hudSecond !== second) {
    if (title) title.textContent = route.name;
    if (timer) timer.textContent = courierNetworkState.elapsed <= route.deadline ? Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toString().padStart(2,'0')+' LEFT' : 'OVERTIME';
    courierNetworkState.hudSecond = second;
  }
  if (status) status.textContent = canUnload ? 'STOP · UNLOAD' : inVehicle ? (courierNetworkState.elapsed > route.deadline ? 'OVERTIME' : 'EN ROUTE') : 'ENTER VEHICLE';
  if (copy) copy.textContent = canUnload ? 'Vehicle is in the drop zone. Hold still to unload the parcel.' : inVehicle ? 'Drive to the glowing loading bay and slow down to unload.' : 'Mount your SUV or Sport Motorcycle, then drive to the marked destination.';
  if (track) track.style.width = Math.min(100,courierNetworkState.elapsed/route.deadline*100)+'%';
}
function completeCourierNetworkDelivery() {
  const route = currentCourierNetworkRoute();
  if (!route || courierNetworkState.phase !== 'enroute') return;
  const onTime = courierNetworkState.elapsed <= route.deadline;
  const motorcycleBonus = selectedVehicleType === 'motorcycle' ? 45 : 0;
  const reward = Math.round(route.reward+(skillProgress('delivery').level-1)*18+(onTime?65:0)+motorcycleBonus);
  courierNetworkState.phase='idle';
  courierNetworkState.routeIndex=-1;
  courierNetworkState.lastReward=reward;
  courierNetworkState.lastDuration=courierNetworkState.elapsed;
  courierNetworkState.bestTime=courierNetworkState.bestTime>0?Math.min(courierNetworkState.bestTime,courierNetworkState.elapsed):courierNetworkState.elapsed;
  courierNetworkState.completedTotal++;
  courierNetworkState.elapsed=0;courierNetworkState.hudSecond=-1;
  courierNetworkMarker.group.visible=false;
  wallet+=reward;
  recordTransaction('City Express · '+route.name,reward);
  addSkillXp('delivery',26);
  recordDailyTaskProgress('paidWork');
  setWallet(wallet);
  renderCourierNetworkHud(true);renderWorkFinancePanel();saveGame(false);
  showToast('CITY EXPRESS SELESAI · +$'+reward+(onTime?' · ON TIME':' · LATE DELIVERY'));
}
function isAtRoadRallyStart(){return Math.hypot(vehicle.position.x-roadRallyCourse.start.x,vehicle.position.z-roadRallyCourse.start.z)<5.8;}
function formatRoadRallyTime(seconds){const value=Math.max(0,Number(seconds)||0),minutes=Math.floor(value/60),secs=value-minutes*60;return String(minutes).padStart(2,'0')+':'+secs.toFixed(2).padStart(5,'0');}
function renderRoadRallyHud(){
  if(!roadRallyHud)return;
  const visible=inVehicle&&(roadRallyState.phase==='running'||roadRallyState.phase==='finished'&&roadRallyState.resultTimer>0);
  roadRallyHud.classList.toggle('hidden',!visible);roadRallyHud.setAttribute('aria-hidden',String(!visible));
  const total=roadRallyCourse.checkpoints.length,complete=roadRallyState.checkpoint;
  setTextIfChanged(roadRallyTimeLabel, formatRoadRallyTime(roadRallyState.phase==='finished'?roadRallyState.lastTime:roadRallyState.elapsed));
  setTextIfChanged(roadRallyStageLabel, roadRallyState.phase==='finished'?'FINISH':`${String(Math.min(complete+1,total+1)).padStart(2,'0')} / ${String(total+1).padStart(2,'0')}`);
  setTextIfChanged(roadRallyNextLabel, roadRallyState.phase==='finished'?'MOTOR DISTRICT COMPLETE':roadRallyCourse.checkpoints[complete]?.label||'RETURN TO START / FINISH');
  setWidthIfChanged(roadRallyProgressFill, `${Math.round((roadRallyState.phase==='finished'?1:complete/(total+1))*100)}%`);
  setTextIfChanged(roadRallyResultLabel, roadRallyState.phase==='finished'?`${roadRallyState.lastTier} · BEST ${roadRallyState.bestTime?formatRoadRallyTime(roadRallyState.bestTime):'--:--.--'}`:`BEST ${roadRallyState.bestTime?formatRoadRallyTime(roadRallyState.bestTime):'--:--.--'} · GATES ${complete}/${total}`);
}
function startRoadRally(){
  if(!inVehicle){showToast('MASUK KE SUV / MOTORCYCLE UNTUK IKUT RALLY');return;}
  if(roadRallyState.phase==='running'){showToast('MOTOR DISTRICT RALLY SEDANG BERLANGSUNG');return;}
  if(!isAtRoadRallyStart()){showToast('DEKATI GERBANG START MOTOR DISTRICT');return;}
  vehicle.position.set(roadRallyCourse.start.x,0,roadRallyCourse.start.z);vehicle.rotation.y=roadRallyCourse.start.yaw;vehicleSpeed=0;vehicleBrakeHeld=false;
  roadRallyState.phase='running';roadRallyState.elapsed=0;roadRallyState.checkpoint=0;roadRallyState.resultTimer=0;roadRallyState.hudSecond=-1;
  renderRoadRallyHud();updateVehicleHud();saveGame(false);showToast('MOTOR DISTRICT RALLY DIMULAI · LEWATI 4 CHECKPOINT!');
}
function finishRoadRally(){
  roadRallyState.phase='finished';roadRallyState.lastTime=roadRallyState.elapsed;roadRallyState.completed++;
  if(!roadRallyState.bestTime||roadRallyState.lastTime<roadRallyState.bestTime)roadRallyState.bestTime=roadRallyState.lastTime;
  const tier=roadRallyState.lastTime<=26?'GOLD':roadRallyState.lastTime<=35?'SILVER':roadRallyState.lastTime<=48?'BRONZE':'FINISH';
  roadRallyState.lastTier=tier;
  const reward=tier==='GOLD'?210:tier==='SILVER'?155:tier==='BRONZE'?105:65;
  if(roadRallyState.rewardDay!==gameDay){
    roadRallyState.rewardDay=gameDay;wallet+=reward;recordTransaction(`Motor District Rally · ${tier}`,reward);setWallet(wallet);
    showToast(`ROAD RALLY ${tier} · +$${reward} · ${formatRoadRallyTime(roadRallyState.lastTime)}`);
  }else showToast(`ROAD RALLY ${tier} · ${formatRoadRallyTime(roadRallyState.lastTime)} · HADIAH HARI INI SUDAH DIAMBIL`);
  recordDailyTaskProgress('destination');roadRallyState.resultTimer=10;renderRoadRallyHud();updateVehicleHud();saveGame(false);
}
function updateRoadRally(dt){
  const canStart=!!(isStarted&&inVehicle&&!isUiOpen()&&roadRallyState.phase==='idle'&&isAtRoadRallyStart());
  roadRallyStartButton?.classList.toggle('hidden',!canStart);
  if(roadRallyState.phase==='finished'){
    roadRallyState.resultTimer=Math.max(0,roadRallyState.resultTimer-dt);
    if(roadRallyState.resultTimer<=0){roadRallyState.phase='idle';renderRoadRallyHud();}
    return;
  }
  if(roadRallyState.phase!=='running')return;
  if(!inVehicle){roadRallyState.phase='idle';roadRallyState.elapsed=0;roadRallyState.checkpoint=0;renderRoadRallyHud();showToast('ROAD RALLY DIBATALKAN · KAMU KELUAR DARI KENDARAAN');return;}
  if(!isStarted||isUiOpen())return;
  roadRallyState.elapsed+=Math.max(0,Math.min(dt,0.035));
  const next=roadRallyCourse.checkpoints[roadRallyState.checkpoint];
  if(next){
    const distance=Math.hypot(vehicle.position.x-next.x,vehicle.position.z-next.z);
    if(distance<4.9&&Math.abs(vehicleSpeed)>1.2){
      roadRallyState.checkpoint++;roadRallyHud.classList.remove('checkpoint-hit');void roadRallyHud.offsetWidth;roadRallyHud.classList.add('checkpoint-hit');
      if(roadRallyState.checkpoint===roadRallyCourse.checkpoints.length)showToast('CHECKPOINT 4/4 · KEMBALI KE START / FINISH!');
      else showToast(`ROAD RALLY · GATE ${roadRallyState.checkpoint}/4 · ${roadRallyCourse.checkpoints[roadRallyState.checkpoint]?.label||''}`);
    }
  }else if(Math.hypot(vehicle.position.x-roadRallyCourse.start.x,vehicle.position.z-roadRallyCourse.start.z)<4.9&&Math.abs(vehicleSpeed)>1.2)finishRoadRally();
  renderRoadRallyHud();
}

function updateCourierNetwork(dt) {
  if (!isStarted || courierNetworkState.phase !== 'enroute') return;
  const step = Math.max(0,Math.min(dt,0.035));
  const route = currentCourierNetworkRoute();
  if (!route) { courierNetworkState.phase='idle';courierNetworkMarker.group.visible=false;renderCourierNetworkHud(true);return; }
  courierNetworkState.elapsed += step;
  courierNetworkMarker.group.rotation.y += step*0.34;
  const pulse=1+Math.sin(performance.now()*0.0032)*0.065;
  courierNetworkMarker.ring.scale.setScalar(pulse);
  courierNetworkMarker.light.intensity=1.25+Math.sin(performance.now()*0.004)*0.35;
  renderCourierNetworkHud();
  if (inVehicle && Math.hypot(vehicle.position.x-route.x,vehicle.position.z-route.z)<6.3 && Math.abs(vehicleSpeed)<2.2) completeCourierNetworkDelivery();
}
function startCourierNetworkJob() {
  resetCourierNetworkDay();
  if (courierNetworkState.phase === 'enroute') { showToast('CITY EXPRESS SEDANG BERJALAN'); return; }
  if (jobPhase === 'collect' || jobPhase === 'deliver' || gardenJobPhase === 'active') { showToast('SELESAIKAN PEKERJAAN AKTIF TERLEBIH DAHULU'); return; }
  if (inVehicle || inBoat || divingState.active) { showToast('PARKIR KENDARAAN SEBELUM MENERIMA DISPATCH'); return; }
  if (courierNetworkState.acceptedToday >= 2) { showToast('BATAS 2 CITY EXPRESS DISPATCH HARI INI TERCAPAI'); return; }
  const routeIndex=courierNetworkState.completedTotal%courierNetworkRoutes.length;
  const route=courierNetworkRoutes[routeIndex];
  courierNetworkState.phase='enroute';courierNetworkState.routeIndex=routeIndex;courierNetworkState.elapsed=0;courierNetworkState.acceptedToday++;courierNetworkState.hudSecond=-1;
  courierNetworkMarker.group.position.set(route.x,0,route.z);courierNetworkMarker.group.visible=true;
  renderCourierNetworkHud(true);renderWorkFinancePanel();saveGame(false);closePanels();
  showToast('CITY EXPRESS ACCEPTED · DRIVE TO '+route.name.toUpperCase());
}
function cancelCourierNetworkJob() {
  if (courierNetworkState.phase !== 'enroute') return;
  courierNetworkState.phase='idle';courierNetworkState.routeIndex=-1;courierNetworkState.elapsed=0;courierNetworkState.hudSecond=-1;
  courierNetworkMarker.group.visible=false;renderCourierNetworkHud(true);renderWorkFinancePanel();saveGame(false);
  showToast('CITY EXPRESS DISPATCH DIBATALKAN');
}
function renderWorkFinancePanel() {
  resetDailyWorkLimits();
  resetCourierNetworkDay();
  const list = document.querySelector('#work-contract-list');
  if (!list) return;
  const careerLevel = skillProgress('career').level;
  const courierReward = 450 + (skillProgress('delivery').level - 1) * 30;
  const gardenReward = 220 + (skillProgress('gardening').level - 1) * 15;
  const freelanceReward = 180 + (Math.max(2, careerLevel) - 2) * 35;
  const courierActive = jobPhase === 'collect' || jobPhase === 'deliver';
  const gardenActive = gardenJobPhase === 'active';
  const expressActive = courierNetworkState.phase === 'enroute';
  const expressRoute = currentCourierNetworkRoute();
  const expressReward = expressRoute ? Math.round(expressRoute.reward+(skillProgress('delivery').level-1)*18+(selectedVehicleType==='motorcycle'?45:0)+65) : 0;
  const fieldContractActive = courierActive || gardenActive || expressActive;
  const contracts = [
    { id: 'courier', title: 'Courier Route', category: 'DELIVERY', description: 'Ambil 3 paket di sekitar properti, lalu serahkan di pool terrace.', reward: courierReward, cost: '−14 Energy · 45 min start', status: courierActive ? `ACTIVE · ${jobCollected.filter(Boolean).length}/3 packages` : gardenActive ? 'FINISH GARDEN CARE FIRST' : expressActive ? 'FINISH CITY EXPRESS FIRST' : courierShiftsToday >= 1 ? 'SHIFT COMPLETED TODAY' : needs.energy < 14 ? 'NOT ENOUGH ENERGY' : 'AVAILABLE', disabled: courierActive || gardenActive || expressActive || courierShiftsToday >= 1 || needs.energy < 14 },
    { id: 'garden', title: 'Garden Care', category: 'PROPERTY CARE', description: 'Rawat tiga area tanaman dan dapatkan bonus dari Gardening skill.', reward: gardenReward, cost: '−10 Energy · 30 min start', status: gardenActive ? `ACTIVE · ${gardenWatered.filter(Boolean).length}/3 plants` : courierActive ? 'FINISH COURIER ROUTE FIRST' : expressActive ? 'FINISH CITY EXPRESS FIRST' : gardenShiftsToday >= 1 ? 'SHIFT COMPLETED TODAY' : needs.energy < 10 ? 'NOT ENOUGH ENERGY' : 'AVAILABLE', disabled: gardenActive || courierActive || expressActive || gardenShiftsToday >= 1 || needs.energy < 10 },
    { id: 'freelance', title: 'Freelance Project', category: 'REMOTE WORK', description: 'Selesaikan proyek dari home office. Bayaran meningkat seiring Career level.', reward: freelanceReward, cost: '−22 Energy · 90 min · Career Lv. 2', status: careerLevel < 2 ? 'LOCKED · CAREER LEVEL 2' : fieldContractActive ? 'FINISH ACTIVE CONTRACT FIRST' : careerShiftsToday >= 2 ? 'DAILY LIMIT REACHED' : needs.energy < 22 ? 'NOT ENOUGH ENERGY' : 'AVAILABLE', disabled: careerLevel < 2 || fieldContractActive || careerShiftsToday >= 2 || needs.energy < 22 },
    { id:'express', title:'City Express Dispatch', category:'MOTOR DELIVERY NETWORK', description:expressActive&&expressRoute?'Drive to '+expressRoute.name+' and stop in the glowing loading bay.': 'Deliver a sealed cargo crate to the next town destination. Motorcycle deliveries earn a rider bonus.', reward:expressActive?expressReward:(courierNetworkRoutes[courierNetworkState.completedTotal%courierNetworkRoutes.length].reward+65), cost:'Vehicle required · 2 dispatches/day', status:expressActive?'ACTIVE · '+(expressRoute?.name||'ROUTE') : courierNetworkState.acceptedToday>=2?'DAILY LIMIT REACHED':courierActive||gardenActive?'FINISH ACTIVE CONTRACT FIRST':'AVAILABLE', disabled:!expressActive&&(courierNetworkState.acceptedToday>=2||courierActive||gardenActive) }
  ];
  list.replaceChildren();
  for (const contract of contracts) {
    const card = document.createElement('article'); card.className = 'work-contract-card';
    const head = document.createElement('div'); head.className = 'work-contract-head';
    const identity = document.createElement('div');
    const category = document.createElement('small'); category.textContent = contract.category;
    const title = document.createElement('b'); title.textContent = contract.title;
    identity.append(category, title);
    const reward = document.createElement('strong'); reward.textContent = `+$${contract.reward}`;
    head.append(identity, reward);
    const description = document.createElement('p'); description.textContent = contract.description;
    const footer = document.createElement('div'); footer.className = 'work-contract-footer';
    const cost = document.createElement('small'); cost.textContent = contract.cost;
    const status = document.createElement('b'); status.textContent = contract.status;
    footer.append(cost, status);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'work-contract-start';
    button.textContent = contract.status === 'AVAILABLE' ? 'ACCEPT CONTRACT' : contract.status.startsWith('ACTIVE') ? 'VIEW CURRENT TASK' : contract.status.startsWith('LOCKED') ? 'LOCKED' : 'UNAVAILABLE';
    button.disabled = contract.disabled;
    button.addEventListener('click', () => {
      if (contract.id === 'express') {
        if (expressActive) cancelCourierNetworkJob();
        else startCourierNetworkJob();
        closePanels();
        return;
      }
      if (contract.id === 'courier') startCourierJob();
      else if (contract.id === 'garden') startGardenJob();
      else workFreelanceProject();
      renderWorkFinancePanel();
      document.querySelector('#work-finance-panel').classList.remove('hidden');
    });
    card.append(head, description, footer, button); list.append(card);
  }
  const cash = document.querySelector('#finance-cash');
  const earned = document.querySelector('#finance-earned');
  const spent = document.querySelector('#finance-spent');
  if (cash) cash.textContent = '$' + wallet.toLocaleString('en-US');
  if (earned) earned.textContent = '+$' + lifetimeIncome.toLocaleString('en-US');
  if (spent) spent.textContent = '−$' + lifetimeSpending.toLocaleString('en-US');
  const ledger = document.querySelector('#finance-ledger');
  if (ledger) {
    ledger.replaceChildren();
    if (!transactionHistory.length) {
      const empty = document.createElement('p'); empty.className = 'finance-empty'; empty.textContent = 'Belum ada transaksi. Penghasilan dan pengeluaran akan tercatat di sini.'; ledger.append(empty);
    } else for (const entry of transactionHistory) {
      const row = document.createElement('div'); row.className = 'finance-entry';
      const info = document.createElement('div');
      const label = document.createElement('b'); label.textContent = entry.label;
      const meta = document.createElement('small'); meta.textContent = `DAY ${entry.day} · ${entry.time}`;
      info.append(label, meta);
      const amount = document.createElement('strong'); amount.className = entry.amount > 0 ? 'income' : 'expense';
      amount.textContent = `${entry.amount > 0 ? '+' : '−'}$${Math.abs(entry.amount).toLocaleString('en-US')}`;
      row.append(info, amount); ledger.append(row);
    }
  }
  renderCafeBusinessPanel();
  const cap = document.querySelector('#work-shift-summary');
  if (cap) cap.textContent = `DAY ${gameDay} · COURIER ${courierShiftsToday}/1 · EXPRESS ${courierNetworkState.acceptedToday}/2 · GARDEN ${gardenShiftsToday}/1 · FREELANCE ${careerShiftsToday}/2`;
}
function openWorkFinancePanel() {
  closePanels();
  renderWorkFinancePanel();
  document.querySelector('#work-finance-panel').classList.remove('hidden');
}
function activeDailyTaskIds() {
  return dailyTaskCycles[(Math.max(1, gameDay) - 1) % dailyTaskCycles.length];
}
function resetDailyTasks() {
  if (dailyTaskDay === gameDay && activeDailyTaskIds().every(id => Number.isFinite(dailyTaskProgress[id]))) return;
  dailyTaskDay = gameDay;
  for (const id of Object.keys(dailyTaskProgress)) delete dailyTaskProgress[id];
  for (const id of Object.keys(dailyTaskClaimed)) delete dailyTaskClaimed[id];
  for (const id of activeDailyTaskIds()) { dailyTaskProgress[id] = 0; dailyTaskClaimed[id] = false; }
  updateDailyTaskButton();
  if (!document.querySelector('#daily-tasks-panel').classList.contains('hidden')) renderDailyTasks();
}
function updateDailyTaskButton() {
  const badge = document.querySelector('#tasks-count');
  if (!badge) return;
  const ids = activeDailyTaskIds();
  const completed = ids.filter(id => (dailyTaskProgress[id] || 0) >= dailyTaskDefinitions[id].goal).length;
  badge.textContent = `${completed}/3`;
  badge.classList.toggle('ready', ids.some(id => (dailyTaskProgress[id] || 0) >= dailyTaskDefinitions[id].goal && !dailyTaskClaimed[id]));
}
function recordDailyTaskProgress(event, amount = 1) {
  resetDailyTasks();
  let changed = false;
  for (const id of activeDailyTaskIds()) {
    const task = dailyTaskDefinitions[id];
    if (task.event !== event || dailyTaskClaimed[id]) continue;
    const before = dailyTaskProgress[id] || 0;
    dailyTaskProgress[id] = Math.min(task.goal, before + Math.max(0, amount));
    changed ||= dailyTaskProgress[id] !== before;
  }
  if (changed) {
    updateDailyTaskButton();
    if (!document.querySelector('#daily-tasks-panel').classList.contains('hidden')) renderDailyTasks();
  }
}
function renderDailyTasks() {
  resetDailyTasks();
  const list = document.querySelector('#daily-tasks-list');
  if (!list) return;
  list.replaceChildren();
  const ids = activeDailyTaskIds();
  let completed = 0, claimed = 0, totalReward = 0;
  for (const id of ids) {
    const task = dailyTaskDefinitions[id];
    const progress = Math.min(task.goal, dailyTaskProgress[id] || 0);
    const isComplete = progress >= task.goal;
    const isClaimed = !!dailyTaskClaimed[id];
    if (isComplete) completed++;
    if (isClaimed) claimed++;
    if (!isClaimed) totalReward += task.reward;
    const card = document.createElement('article');
    card.className = 'daily-task-card' + (isComplete ? ' complete' : '');
    const top = document.createElement('div'); top.className = 'daily-task-top';
    const icon = document.createElement('span'); icon.className = 'daily-task-icon'; icon.textContent = task.icon;
    const titleWrap = document.createElement('div'); titleWrap.className = 'daily-task-title';
    const title = document.createElement('b'); title.textContent = task.title;
    const status = document.createElement('small'); status.textContent = isClaimed ? 'REWARD COLLECTED' : isComplete ? 'READY TO CLAIM' : 'IN PROGRESS';
    titleWrap.append(title, status); top.append(icon, titleWrap);
    const description = document.createElement('p'); description.textContent = task.description;
    const progressMeta = document.createElement('div'); progressMeta.className = 'daily-task-meta';
    const progressText = document.createElement('span'); progressText.textContent = `${Math.floor(progress)} / ${task.goal}`;
    const rewardText = document.createElement('b'); rewardText.textContent = isClaimed ? 'CLAIMED' : `+$${task.reward}`;
    progressMeta.append(progressText, rewardText);
    const track = document.createElement('div'); track.className = 'daily-task-track';
    const fill = document.createElement('i'); fill.style.width = `${progress / task.goal * 100}%`; track.append(fill);
    const claim = document.createElement('button'); claim.type = 'button'; claim.className = 'daily-task-claim';
    claim.textContent = isClaimed ? 'DONE ✓' : isComplete ? `CLAIM $${task.reward}` : 'KEEP GOING';
    claim.disabled = !isComplete || isClaimed;
    claim.addEventListener('click', () => claimDailyTask(id));
    card.append(top, description, progressMeta, track, claim);
    list.append(card);
  }
  const summary = document.querySelector('#daily-task-summary');
  if (summary) summary.textContent = `${completed}/3 completed · ${claimed}/3 rewards collected · up to $${totalReward.toLocaleString('en-US')} remaining`;
  updateDailyTaskButton();
}
function claimDailyTask(id) {
  const task = dailyTaskDefinitions[id];
  if (!task || !activeDailyTaskIds().includes(id)) return;
  resetDailyTasks();
  if ((dailyTaskProgress[id] || 0) < task.goal || dailyTaskClaimed[id]) return;
  dailyTaskClaimed[id] = true;
  wallet += task.reward;
  recordTransaction(`Daily task: ${task.title}`, task.reward);
  setWallet(wallet);
  renderDailyTasks();
  saveGame(false);
  showToast(`DAILY TASK COMPLETE · +$${task.reward}`);
}
function openDailyTasks() {
  closePanels();
  renderDailyTasks();
  document.querySelector('#daily-tasks-panel').classList.remove('hidden');
}
function updateJobHud() {
  const status = document.querySelector('#job-status');
  const objective = document.querySelector('#job-objective');
  if (gardenJobPhase === 'active') { status.textContent = 'GARDEN CARE'; objective.textContent = `Siram tanaman: ${gardenWatered.filter(Boolean).length}/3`; return; }
  if (jobPhase === 'idle') { status.textContent = 'AVAILABLE'; objective.textContent = 'Temui Alex untuk mencari pekerjaan.'; }
  else if (jobPhase === 'collect') { status.textContent = 'IN PROGRESS'; objective.textContent = `Kumpulkan paket: ${jobCollected.filter(Boolean).length}/3`; }
  else if (jobPhase === 'deliver') { status.textContent = 'DELIVERY'; objective.textContent = 'Semua paket terkumpul. Antar ke Mia di pool terrace.'; }
  else { status.textContent = 'COMPLETED'; objective.textContent = `Shift selesai · ${jobsCompleted} pekerjaan dituntaskan. Temui Alex lagi.`; }
}
function updateNeedsHud(force = false) {
  if (!force && needsHudTimer < 0.18) return;
  needsHudTimer = 0;
  for (const key of ['hunger','energy','social','hygiene','bladder']) {
    const value = Math.round(needs[key]);
    const bar = document.querySelector('#' + key + '-bar');
    const label = document.querySelector('#' + key + '-value');
    if (!bar || !label) continue;
    setWidthIfChanged(bar, value + '%'); bar.classList.toggle('low', value < 25);
    setTextIfChanged(label, value + '%');
  }
  document.querySelector('#needs-hud').classList.toggle('warning', needs.hunger < 20 || needs.energy < 15 || needs.social < 15 || needs.hygiene < 18 || needs.bladder < 12);
  updateRelationshipHud();
}
const skillDefinitions = {
  cooking: { label: 'Cooking', icon: '🍳', perk: 'Masakan memulihkan lebih banyak hunger.' },
  gardening: { label: 'Gardening', icon: '🌿', perk: 'Hasil panen meningkat setiap 3 level.' },
  social: { label: 'Social', icon: '♡', perk: 'Interaksi lebih efektif dan social turun lebih lambat.' },
  delivery: { label: 'Courier', icon: '📦', perk: 'Upah pengiriman meningkat setiap level.' },
  career: { label: 'Career', icon: '💻', perk: 'Level 2 membuka pekerjaan freelance dari home office.' },
  fishing: { label: 'Fishing', icon: '🎣', perk: 'Peluang mendapatkan ikan langka meningkat setiap level.' },
  sailing: { label: 'Sailing', icon: '⛵', perk: 'Hadiah coastal salvage meningkat 4% setiap level.' },
  diving: { label: 'Diving', icon: '🤿', perk: 'Hadiah penemuan bawah laut meningkat 3% setiap level.' }
};
function skillProgress(key) {
  let remaining = Math.max(0, Number(skills[key]) || 0);
  let level = 1;
  while (level < 10 && remaining >= level * 60) {
    remaining -= level * 60;
    level++;
  }
  const next = level * 60;
  return { level, current: remaining, next, percent: level >= 10 ? 100 : remaining / next * 100 };
}
function renderSkills() {
  const list = document.querySelector('#skill-list');
  if (!list) return;
  list.replaceChildren();
  for (const [key, info] of Object.entries(skillDefinitions)) {
    const data = skillProgress(key);
    const card = document.createElement('article');
    card.className = 'skill-card';
    const top = document.createElement('div'); top.className = 'skill-card-top';
    const title = document.createElement('div'); title.className = 'skill-name';
    const icon = document.createElement('span'); icon.textContent = info.icon;
    const name = document.createElement('strong'); name.textContent = info.label;
    title.append(icon, name);
    const level = document.createElement('b'); level.textContent = 'LVL ' + data.level;
    top.append(title, level);
    const track = document.createElement('div'); track.className = 'skill-track';
    const fill = document.createElement('i'); fill.style.width = data.percent + '%'; track.append(fill);
    const meta = document.createElement('div'); meta.className = 'skill-meta';
    const xp = document.createElement('span'); xp.textContent = data.level >= 10 ? 'MAX LEVEL' : `${Math.floor(data.current)} / ${data.next} XP`;
    meta.append(xp);
    const perk = document.createElement('small'); perk.textContent = info.perk;
    card.append(top, track, meta, perk);
    list.append(card);
  }
}
function addSkillXp(key, amount) {
  if (!(key in skills) || amount <= 0) return;
  const before = skillProgress(key).level;
  skills[key] = Math.min(2700, Math.max(0, Number(skills[key]) || 0) + amount);
  const after = skillProgress(key).level;
  if (!document.querySelector('#skill-panel').classList.contains('hidden')) renderSkills();
  recordDailyTaskProgress('skillPractice', amount);
  if (after > before) showToast(`SKILL UP · ${skillDefinitions[key].label.toUpperCase()} LEVEL ${after}`);
}
function openSkills() {
  closePanels();
  renderSkills();
  document.querySelector('#skill-panel').classList.remove('hidden');
}
function renderCareerPanel() {
  const data = skillProgress('career');
  const level = document.querySelector('#career-skill-level');
  const xp = document.querySelector('#career-xp');
  const fill = document.querySelector('#career-xp-fill');
  const shifts = document.querySelector('#career-shifts');
  const study = document.querySelector('#career-study-btn');
  const work = document.querySelector('#career-work-btn');
  if (!level || !study || !work) return;
  level.textContent = 'LVL ' + data.level;
  xp.textContent = data.level >= 10 ? 'MAX LEVEL' : `${Math.floor(data.current)} / ${data.next} XP`;
  fill.style.width = data.percent + '%';
  shifts.textContent = `${careerShiftsToday} / 2`;
  study.disabled = needs.energy < 8 || data.level >= 10;
  work.disabled = data.level < 2 || careerShiftsToday >= 2 || needs.energy < 22;
  work.querySelector('span').textContent = data.level < 2
    ? 'Unlock at Career level 2'
    : careerShiftsToday >= 2 ? 'Daily limit reached · Come back tomorrow'
    : `+$${180 + (data.level - 2) * 35} · −22 Energy · 90 min`;
  study.querySelector('span').textContent = data.level >= 10 ? 'Maximum level reached' : '+30 XP · −8 Energy · 45 min';
}
function openCareerPanel() {
  closePanels();
  renderCareerPanel();
  document.querySelector('#career-panel').classList.remove('hidden');
}
function studyCareerSkill() {
  const data = skillProgress('career');
  if (data.level >= 10) { showToast('CAREER SUDAH MAX LEVEL'); return; }
  if (needs.energy < 8) { showToast('ENERGI TIDAK CUKUP UNTUK BELAJAR'); return; }
  needs.energy = Math.max(0, needs.energy - 8);
  addSkillXp('career', 30);
  advanceGameTime(45);
  updateNeedsHud(true); renderCareerPanel();
  showToast('SESI BELAJAR SELESAI · CAREER +30 XP');
}
function workFreelanceProject() {
  const level = skillProgress('career').level;
  if (jobPhase === 'collect' || jobPhase === 'deliver' || gardenJobPhase === 'active') { showToast('SELESAIKAN KONTRAK YANG SEDANG BERJALAN TERLEBIH DAHULU'); return; }
  if (level < 2) { showToast('CAPAI CAREER LEVEL 2 UNTUK FREELANCE'); return; }
  if (careerWorkDay !== gameDay) { careerWorkDay = gameDay; careerShiftsToday = 0; }
  if (careerShiftsToday >= 2) { showToast('JATAH FREELANCE HARI INI HABIS'); return; }
  if (needs.energy < 22) { showToast('ENERGI TIDAK CUKUP UNTUK BEKERJA'); return; }
  const reward = 180 + (level - 2) * 35;
  careerShiftsToday++;
  needs.energy = Math.max(0, needs.energy - 22);
  wallet += reward;
  recordTransaction('Freelance project completed', reward);
  addSkillXp('career', 35);
  recordDailyTaskProgress('paidWork');
  advanceGameTime(90);
  setWallet(wallet); updateNeedsHud(true); renderCareerPanel(); saveGame(false);
  showToast(`FREELANCE SELESAI · +$${reward} · CAREER +35 XP`);
}
const relationshipThresholds = { friend: 25, closeFriend: 50, bestFriend: 80 };
const hangoutUnlocks = {
  garden: relationshipThresholds.friend,
  pool: relationshipThresholds.closeFriend,
  coffee: relationshipThresholds.closeFriend,
  picnic: relationshipThresholds.bestFriend
};
function relationshipRank(value) {
  if (value >= relationshipThresholds.bestFriend) return 'BEST FRIEND';
  if (value >= relationshipThresholds.closeFriend) return 'CLOSE FRIEND';
  if (value >= relationshipThresholds.friend) return 'FRIEND';
  return 'ACQUAINTANCE';
}
function relationshipDialogue(npcId) {
  const rank = relationshipRank(relationships[npcId] || 0);
  const lines = {
    'ACQUAINTANCE': npcId === 'alex' ? 'Alex masih bersikap ramah, tapi kalian baru mulai saling mengenal.' : 'Mia tersenyum menyambutmu. Kalian masih dalam tahap saling mengenal.',
    'FRIEND': npcId === 'alex' ? 'Alex terlihat senang melihatmu. Obrolan kalian sekarang terasa lebih akrab.' : 'Mia menyapamu dengan hangat. Kalian mulai punya banyak bahan obrolan.',
    'CLOSE FRIEND': npcId === 'alex' ? 'Alex sudah mempercayaimu dan nyaman menghabiskan waktu bersamamu.' : 'Mia menganggapmu teman dekat dan selalu menikmati waktu bersamamu.',
    'BEST FRIEND': npcId === 'alex' ? 'Alex menganggapmu sahabat. Kamu sudah jadi bagian penting dari hari-harinya.' : 'Mia menganggapmu sahabat terbaik. Kalian benar-benar dekat.'
  };
  return lines[rank];
}
const npcMoodPresentation = {
  cheerful: { emoji: '☺', label: 'Happy', line: 'Lagi senang dan terbuka untuk menghabiskan waktu bersama.' },
  relaxed: { emoji: '☀', label: 'Relaxed', line: 'Sedang menikmati waktu santai dan tidak ingin terburu-buru.' },
  focused: { emoji: '✦', label: 'Focused', line: 'Sedang fokus dengan rutinitas dan hal-hal yang perlu dibereskan.' },
  curious: { emoji: '✧', label: 'Curious', line: 'Lagi penasaran dan tertarik mencoba sesuatu yang berbeda.' },
  quiet: { emoji: '…', label: 'Quiet', line: 'Sedang agak pendiam; obrolan ringan lebih cocok sekarang.' },
  sleepy: { emoji: '☾', label: 'Sleepy', line: 'Mulai mengantuk dan lebih suka suasana tenang.' },
  content: { emoji: '☺', label: 'Content', line: 'Merasa nyaman dengan suasana hari ini.' }
};
npcs.forEach(paintNpcMood);
function paintNpcMood(npcData) {
  const mood = npcMoodPresentation[npcData.mood] || npcMoodPresentation.content;
  const ctx = npcData.moodCtx;
  ctx.clearRect(0, 0, 96, 96);
  ctx.fillStyle = 'rgba(15,28,25,.9)'; ctx.beginPath(); ctx.arc(48,48,43,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(236,226,197,.92)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff4d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '52px sans-serif'; ctx.fillText(mood.emoji,48,50);
  npcData.moodTexture.needsUpdate = true;
}
function setNpcMood(npcData, mood) {
  if (!npcMoodPresentation[mood] || npcData.mood === mood) return;
  npcData.mood = mood;
  paintNpcMood(npcData);
}
function updateNpcMood(npcData, dt) {
  npcData.moodTimer -= dt;
  if (npcData.moodTimer > 0) return;
  npcData.moodTimer = 4.2;
  const hour = gameMinutes / 60;
  const activity = hangoutSession?.npcId === npcData.id ? hangoutSession.activity : npcData.activity;
  let score = 54;
  if (npcData.personality.preferredActivities.includes(activity)) score += 15;
  if (['coffee','eat'].includes(activity)) score += 6;
  if (npcData.personality.earlyBird && hour >= 6 && hour < 10) score += 10;
  if (npcData.personality.nightOwl && (hour >= 19 || hour < 2)) score += 10;
  if ((hour >= 22 || hour < 6) && !npcData.personality.nightOwl) score -= 22;
  if (hour >= 13 && hour < 16 && npcData.personality.earlyBird) score -= 4;
  if (hangoutSession?.npcId === npcData.id) score += 17;
  if (npcSocialSession && ['alex','mia'].includes(npcData.id)) score += 13;
  if (npcData.personality.traits.includes('sunny') && hour >= 8 && hour < 17) score += 4;
  npcData.moodScore = clamp(score, 0, 100);
  const nextMood = score >= 79 ? 'cheerful' : score >= 68 ? 'relaxed' : score >= 55 ? (npcData.id === 'mia' ? 'curious' : 'focused') : score >= 39 ? 'quiet' : 'sleepy';
  setNpcMood(npcData, nextMood);
}
function npcPersonalityDialogue(npcData) {
  const mood = npcMoodPresentation[npcData.mood] || npcMoodPresentation.content;
  return `${npcData.personality.title}. ${npcData.personality.description} ${mood.line}`;
}
function npcConversationLine(npcData) {
  const rank = relationshipRank(relationships[npcData.id] || 0);
  const lines = {
    alex: {
      'ACQUAINTANCE': ['Hai. Kita belum banyak ngobrol, tapi senang kamu mampir.', 'Halo! Kalau ada yang bisa kubantu, bilang saja.'],
      'FRIEND': ['Hei, senang kamu datang lagi. Ada cerita baru?', 'Bagus kamu mampir. Istirahat sebentar, yuk.'],
      'CLOSE FRIEND': ['Aku selalu senang kalau kita sempat ngobrol.', 'Kamu datang di waktu yang pas. Aku mau cerita sedikit.'],
      'BEST FRIEND': ['Sahabatku datang! Rumah ini terasa lebih ramai kalau kamu ada.', 'Seperti biasa, aku senang bisa mengandalkanmu.']
    },
    mia: {
      'ACQUAINTANCE': ['Hai! Aku Mia. Senang akhirnya bisa ngobrol lebih dekat.', 'Halo! Ada hal menarik yang ingin kamu ceritakan?'],
      'FRIEND': ['Hei, kamu datang juga! Aku punya cerita baru.', 'Asyik, ada teman ngobrol. Gimana harimu?'],
      'CLOSE FRIEND': ['Aku suka saat kita punya waktu buat ngobrol begini.', 'Aku baru mau cerita sesuatu ke kamu.'],
      'BEST FRIEND': ['Sahabat terbaikku! Aku selalu punya cerita buat kamu.', 'Rasanya selalu menyenangkan kalau kamu ada di sini.']
    }
  };
  const variants = lines[npcData.id][rank];
  const seed = gameDay * 3 + Math.floor(gameMinutes / 120) + (socialTalksToday[npcData.id] || 0);
  let line = variants[seed % variants.length];
  if (npcData.mood === 'sleepy') line += ' Maaf kalau aku agak lambat merespons, aku mulai mengantuk.';
  else if (npcData.mood === 'focused') line += ' Aku sedang fokus menyelesaikan rutinitas, tapi masih bisa ngobrol sebentar.';
  else if (npcData.mood === 'cheerful') line += ' Kebetulan suasana hatiku lagi bagus hari ini.';
  if (npcData.activity === 'coffee') line += ' Pas sekali, aku sedang menikmati coffee break.';
  else if (npcData.activity === 'eat') line += ' Aku baru saja duduk untuk makan.';
  else if (npcData.activity === 'sunbathe') line += ' Cuacanya cocok untuk bersantai di tepi kolam.';
  else if (npcData.activity === 'garden') line += ' Taman sedang terasa nyaman hari ini.';
  else if (npcData.activity === 'picnic') line += ' Piknik di taman kota tadi menyenangkan sekali.';
  return line;
}
function updateNpcBodyLanguage(npcData, dt) {
  const mood = npcData.mood;
  const style = npcData.personality.bodyLanguage;
  const time = npcData.phase * style.tempo;
  let tilt = style.tilt;
  let pitch = 0;
  let energy = 0.55;
  if (mood === 'cheerful') { tilt += Math.sin(time * 1.7) * 0.075; pitch = -0.025; energy = 1; }
  else if (mood === 'relaxed') { tilt += Math.sin(time * 0.8) * 0.035; pitch = -0.012; energy = 0.72; }
  else if (mood === 'focused') { tilt -= 0.035; pitch = 0.045; energy = 0.42; }
  else if (mood === 'curious') { tilt += 0.13 + Math.sin(time * 1.35) * 0.025; pitch = -0.085; energy = 0.88; }
  else if (mood === 'quiet') { tilt -= 0.045; pitch = 0.025; energy = 0.28; }
  else if (mood === 'sleepy') { tilt -= 0.11 + Math.sin(time * 0.6) * 0.025; pitch = 0.13; energy = 0.18; }
  else { tilt += Math.sin(time) * 0.018; }
  const restingFactor = npcData.restingOnSeat || hangoutSession?.npcId === npcData.id ? 1 : 0.48;
  npcData.head.rotation.z = THREE.MathUtils.damp(npcData.head.rotation.z, tilt, 2.8, dt);
  npcData.head.rotation.x = THREE.MathUtils.damp(npcData.head.rotation.x, pitch, 2.5, dt);
  const sway = Math.sin(time * 1.25) * style.sway * energy * restingFactor;
  npcData.torso.rotation.z = THREE.MathUtils.damp(npcData.torso.rotation.z, sway, 2.2, dt);
  const pulse = 0.94 + (Math.sin(time * 1.8) + 1) * 0.045;
  npcData.moodSprite.scale.set(0.42 * pulse, 0.42 * pulse, 1);
  npcData.moodSprite.material.opacity = 0.82 + pulse * 0.18;
}
function resetDailyHangouts() {
  if (hangoutLimitDay !== gameDay) {
    hangoutLimitDay = gameDay;
    hangoutsToday.alex = 0;
    hangoutsToday.mia = 0;
  }
}
function resetDailySocialTalks() {
  if (socialTalkLimitDay !== gameDay) {
    socialTalkLimitDay = gameDay;
    socialTalksToday.alex = 0;
    socialTalksToday.mia = 0;
  }
}
function updateRelationshipHud() {
  for (const id of ['alex','mia']) {
    const value = Math.round(relationships[id]);
    const bar = document.querySelector('#relationship-' + id + '-bar');
    const label = document.querySelector('#relationship-' + id + '-value');
    if (bar) bar.style.width = value + '%';
    if (label) {
      label.textContent = relationshipRank(value);
      const next = value >= relationshipThresholds.bestFriend ? null
        : value >= relationshipThresholds.closeFriend ? relationshipThresholds.bestFriend
        : value >= relationshipThresholds.friend ? relationshipThresholds.closeFriend
        : relationshipThresholds.friend;
      label.title = next ? `${value}/100 · ${next - value} lagi ke tier berikutnya` : `${value}/100 · Tier tertinggi`;
      label.setAttribute('aria-label', `${relationshipRank(value)}, ${value} dari 100`);
    }
  }
}
function changeRelationship(id, amount) {
  relationships[id] = clamp((relationships[id] || 0) + amount, 0, 100);
  updateRelationshipHud();
}
const propertyUpgradeDefinitions = {
  solar: { title: 'Solar Roof', category: 'ENERGY EFFICIENCY', description: 'Panel surya di atap menekan biaya listrik harian rumah.', levels: [
    { cost: 1100, benefit: 'Tagihan harian berkurang $15.' },
    { cost: 1750, benefit: 'Penghematan total menjadi $30 per hari.' }
  ] },
  kitchen: { title: 'Kitchen Renovation', category: 'KITCHEN', description: 'Upgrade countertop, backsplash dan kabinet dapur untuk memasak lebih efektif.', levels: [
    { cost: 700, benefit: 'Setiap masakan memulihkan +8 Hunger tambahan.' },
    { cost: 1200, benefit: 'Bonus masakan meningkat menjadi +16 Hunger.' }
  ] },
  bedroom: { title: 'Bedroom Suite', category: 'BEDROOM', description: 'Perbarui kamar dengan headboard, pencahayaan hangat dan tempat tidur premium.', levels: [
    { cost: 850, benefit: 'Tidur memulihkan +10 Energy tambahan.' },
    { cost: 1400, benefit: 'Bonus pemulihan tidur meningkat menjadi +20 Energy.' }
  ] },
  terrace: { title: 'Garden Terrace', category: 'OUTDOOR LIVING', description: 'Bangun dek kayu dan pergola di halaman belakang. Fasilitasnya bisa digunakan untuk bersantai.', levels: [
    { cost: 550, benefit: 'Membuka dua tempat duduk dan aktivitas terrace.' },
    { cost: 950, benefit: 'Pergola premium: aktivitas terrace memulihkan lebih banyak kebutuhan.' }
  ] },
  studio: { title: 'Creative Studio', category: 'NEW ROOM · WEST WING', description: 'Bangun ruang kreatif yang terhubung langsung ke rumah. Gunakan workstation untuk meningkatkan Career skill.', levels: [
    { cost: 2800, benefit: 'Membangun studio lengkap dengan desk, workstation dan workbench. Practice memberi +35 Career XP.' },
    { cost: 1250, benefit: 'Premium fit-out: monitor ganda, rak arsip dan pencahayaan studio. Practice memberi +45 Career XP.' }
  ] },
  guestSuite: { title: 'Guest Suite', category: 'NEW ROOM · WEST WING', description: 'Tambahkan kamar tamu dengan tempat tidur, bedside table dan lemari. Kamar bisa digunakan untuk tidur.', levels: [
    { cost: 3600, benefit: 'Membangun guest suite dan membuka tempat tidur baru yang bisa digunakan.' },
    { cost: 1500, benefit: 'Premium fit-out: dresser, dekorasi dinding dan linen berkualitas. Tidur di suite memulihkan +10 Energy.' }
  ] }
};
function propertyDailyBill() { return Math.max(35, 85 - propertyUpgrades.solar * 15); }
function renderGuestSuiteRentalPanel(){
  const status=document.querySelector('#guest-rental-status');
  const tenant=document.querySelector('#guest-rental-tenant');
  const term=document.querySelector('#guest-rental-term');
  const income=document.querySelector('#guest-rental-income');
  const earnings=document.querySelector('#guest-rental-earned');
  const primary=document.querySelector('#guest-rental-primary');
  const secondary=document.querySelector('#guest-rental-secondary');
  const note=document.querySelector('#guest-rental-note');
  if(!status||!primary||!secondary)return;
  const unlocked=propertyUpgrades.guestSuite>=2;
  const occupied=guestSuiteRental.tenantActive;
  const pending=guestSuiteRental.listing&&!occupied;
  const net=guestSuiteRentPerDay-guestSuiteManagementFee;
  status.textContent=!unlocked?'LOCKED · GUEST SUITE LV. 2':occupied?'OCCUPIED · RENT ACTIVE':pending?'TENANT SCREENING':'VACANT · READY TO LIST';
  status.className='guest-rental-status'+(occupied?' occupied':pending?' pending':'');
  tenant.textContent=occupied||pending?(guestSuiteRental.tenantName||'Maya Santoso'):'No tenant';
  term.textContent=occupied?`${Math.max(0,guestSuiteRental.leaseEndDay-gameDay+1)} DAYS LEFT · ENDS DAY ${guestSuiteRental.leaseEndDay}`:pending?`MOVE-IN · DAY ${guestSuiteRental.moveInDay}`:'7-DAY FIXED LEASE';
  income.textContent=`$${guestSuiteRentPerDay}/day · −$${guestSuiteManagementFee} fee · +$${net} net`;
  earnings.textContent=`LIFETIME · $${guestSuiteRental.lifetimeGrossEarned.toLocaleString('en-US')} rent · $${guestSuiteRental.lifetimeFeesPaid.toLocaleString('en-US')} fees · ${guestSuiteRental.lifetimePaidDays} paid days`;
  primary.disabled=!unlocked;
  secondary.disabled=!unlocked||!guestSuiteRental.listing;
  primary.textContent=!unlocked?'UNLOCK · GUEST SUITE LV. 2':occupied?'RENEW LEASE · +7 DAYS':pending?'CANCEL TENANT SEARCH':'LIST UNIT · FIND TENANT';
  secondary.textContent=occupied?'END TENANCY':'CANCEL LISTING';
  secondary.classList.toggle('hidden',!unlocked||!guestSuiteRental.listing);
  note.textContent=!unlocked?'Build the Guest Suite to level 2 to unlock rental management.':occupied?'The guest bedroom is reserved for the tenant until the lease ends. Rent is collected automatically every day at 07:00.':pending?'Your listing is live. A tenant moves in tomorrow and the first rent payment is collected at 07:00.':'List the premium Guest Suite to welcome a tenant tomorrow. A 7-day lease pays $180/day before the $25 management fee.';
}
function listGuestSuiteForRent(){
  if(propertyUpgrades.guestSuite<2){showToast('GUEST SUITE LEVEL 2 DIPERLUKAN UNTUK DISEWAKAN');return;}
  if(guestSuiteRental.listing){showToast('UNIT SUDAH DALAM PROSES PENYEWAAN');return;}
  Object.assign(guestSuiteRental,{listing:true,tenantActive:false,tenantName:'Maya Santoso',moveInDay:gameDay+1,leaseEndDay:gameDay+7,daysPaid:0,grossEarned:0,feesPaid:0,lastPaidDay:0});
  renderGuestSuiteRentalPanel();saveGame(false);showToast('GUEST SUITE TERDAFTAR · MAYA PINDAH BESOK');
}
function handleGuestSuiteRentalPrimary(){
  if(propertyUpgrades.guestSuite<2){showToast('UPGRADE GUEST SUITE KE LEVEL 2 TERLEBIH DAHULU');return;}
  if(!guestSuiteRental.listing){listGuestSuiteForRent();return;}
  if(!guestSuiteRental.tenantActive){Object.assign(guestSuiteRental,{listing:false,tenantActive:false,tenantName:'',moveInDay:0,leaseEndDay:0});renderGuestSuiteRentalPanel();saveGame(false);showToast('PENCARIAN PENYEWA DIBATALKAN');return;}
  guestSuiteRental.leaseEndDay+=7;renderGuestSuiteRentalPanel();saveGame(false);showToast(`KONTRAK DIPERPANJANG · DAY ${guestSuiteRental.leaseEndDay}`);
}
function endGuestSuiteTenancy(){
  if(!guestSuiteRental.listing)return;
  Object.assign(guestSuiteRental,{listing:false,tenantActive:false,tenantName:'',moveInDay:0,leaseEndDay:0});
  renderGuestSuiteRentalPanel();saveGame(false);showToast('KONTRAK SEWA DIAKHIRI · UNIT KEMBALI KOSONG');
}
function processGuestSuiteRentalDay(day){
  if(!guestSuiteRental.listing||day<guestSuiteRental.moveInDay)return false;
  let changed=false;
  if(!guestSuiteRental.tenantActive){guestSuiteRental.tenantActive=true;changed=true;showToast(`PENYEWA MASUK · ${guestSuiteRental.tenantName.toUpperCase()}`);}
  if(day<=guestSuiteRental.leaseEndDay&&guestSuiteRental.lastPaidDay!==day){
    wallet+=guestSuiteRentPerDay;recordTransaction('Guest Suite rent · gross',guestSuiteRentPerDay,day,'07:00');
    wallet-=guestSuiteManagementFee;recordTransaction('Guest Suite management fee',-guestSuiteManagementFee,day,'07:00');
    guestSuiteRental.daysPaid++;guestSuiteRental.grossEarned+=guestSuiteRentPerDay;guestSuiteRental.feesPaid+=guestSuiteManagementFee;guestSuiteRental.lifetimePaidDays++;guestSuiteRental.lifetimeGrossEarned+=guestSuiteRentPerDay;guestSuiteRental.lifetimeFeesPaid+=guestSuiteManagementFee;guestSuiteRental.lastPaidDay=day;
    setWallet(wallet);changed=true;
    showToast(`RENT MASUK +$${guestSuiteRentPerDay-guestSuiteManagementFee} · ${guestSuiteRental.daysPaid} HARI TERBAYAR`);
  }
  if(day>=guestSuiteRental.leaseEndDay){
    guestSuiteRental.listing=false;guestSuiteRental.tenantActive=false;guestSuiteRental.tenantName='';guestSuiteRental.moveInDay=0;guestSuiteRental.leaseEndDay=0;
    changed=true;showToast('KONTRAK SEWA SELESAI · GUEST SUITE KEMBALI TERSEDIA');
  }
  return changed;
}
function cafeBusinessUpgradeCost(type){
  const level=type==='espresso'?cafeBusinessState.espresso:type==='patio'?cafeBusinessState.patio:0;
  return cafeBusinessConfig.upgradeCosts[type]?.[level]??null;
}
function syncCafeBusinessVisuals(){
  cafeUpgradeVisuals.espressoMachine.visible=cafeBusinessState.espresso>0;
  cafeUpgradeVisuals.patioTables.forEach((object,index)=>{object.visible=cafeBusinessState.patio>index;});
  cafeLocalSupplyCrates.forEach((crate,index)=>{crate.visible=cafeBusinessState.owned&&cafeBusinessState.localStock>index*8;});
}
function syncCafeBusinessSign(){
  syncCafeBusinessVisuals();
  const sign=neighborhoodCafe?.sign;
  if(!sign?.userData?.repaint)return;
  if(!cafeBusinessState.owned)sign.userData.repaint('CORNER CAFE','COFFEE · BAKERY','#3b4f48');
  else sign.userData.repaint('CORNER CAFE',cafeBusinessState.open?'OWNER OPERATED · OPEN':'PLAYER OWNED · CLOSED','#465a48');
}
function renderCafeBusinessPanel(){
  const badge=document.querySelector('#cafe-business-status');
  const copy=document.querySelector('#cafe-business-copy');
  const stats=document.querySelector('#cafe-business-stats');
  const license=document.querySelector('#cafe-business-license');
  const restock=document.querySelector('#cafe-business-restock');
  const toggle=document.querySelector('#cafe-business-toggle');
  const upgrades=document.querySelector('#cafe-business-upgrades');
  const localSupplyList=document.querySelector('#cafe-local-supply-list');
  const localStockLabel=document.querySelector('#cafe-local-supply-stock');
  if(!badge||!copy||!stats||!license||!restock||!toggle||!upgrades||!localSupplyList||!localStockLabel)return;
  const owned=cafeBusinessState.owned;
  const totalStock=cafeBusinessState.stock+cafeBusinessState.localStock;
  const ready=totalStock>=cafeBusinessConfig.dailyStockUse;
  badge.textContent=!owned?'NOT OWNED':cafeBusinessState.open?(ready?'OPEN · SERVING':'OPEN · LOW STOCK'):'OWNED · CLOSED';
  copy.textContent=!owned
    ?'Purchase Corner Cafe for $3,600. Then connect your Estate Garden and Artisan Workshop to supply the cafe locally.'
    :cafeBusinessState.open?(ready?'The cafe is operating. Local produce is used before wholesale stock at 07:00 each game day.':'The cafe is short on supplies. Restock wholesale or deliver goods from your estate.')
    :'The cafe is closed. Restock wholesale supplies or deliver farm goods, then open to start earning daily sales.';
  stats.replaceChildren();
  const values=owned?[
    ['WHOLESALE STOCK',`${cafeBusinessState.stock}/${cafeBusinessConfig.stockCapacity} SERVINGS`],
    ['LOCAL FARM STOCK',`${cafeBusinessState.localStock}/${cafeBusinessConfig.localStockCapacity} SERVINGS`],
    ['TOTAL AVAILABLE',`${totalStock} SERVINGS`],
    ['LOCAL DELIVERIES',String(cafeBusinessState.localDeliveries)],
    ['LOCAL SERVINGS USED',String(cafeBusinessState.lifetimeLocalServings)],
    ['LOCAL REPUTATION',`${cafeBusinessState.reputation}/10 ★`],
    ['DAYS OPERATED',String(cafeBusinessState.operatingDays)],
    ['LAST LOCAL SERVINGS',String(cafeBusinessState.lastLocalServings)],
    ['LAST OPERATING MARGIN',cafeBusinessState.lastOperatedDay?`${cafeBusinessState.lastProfit>=0?'+':'−'}$${Math.abs(cafeBusinessState.lastProfit).toLocaleString('en-US')}`:'--'],
    ['LIFETIME SALES',`$${cafeBusinessState.lifetimeSales.toLocaleString('en-US')}`],
    ['LIFETIME OPERATING COSTS',`$${cafeBusinessState.lifetimeOperatingCosts.toLocaleString('en-US')}`],
    ['LAST CUSTOMERS',cafeBusinessState.lastOperatedDay?String(cafeBusinessState.lastCustomers):'--']
  ]:[['BUSINESS LICENSE','$3,600'],['WHOLESALE RESTOCK','12 SERVINGS · $180'],['LOCAL SOURCING','6 FARM & WORKSHOP GOODS'],['DAILY SERVICE','07:00 GAME TIME']];
  for(const [label,value] of values){const card=document.createElement('div');const small=document.createElement('small');small.textContent=label;const strong=document.createElement('b');strong.textContent=value;card.append(small,strong);stats.append(card);}
  license.classList.toggle('hidden',owned);license.textContent=`BUY BUSINESS LICENSE · $${cafeBusinessConfig.licenseCost.toLocaleString('en-US')}`;license.disabled=owned||wallet<cafeBusinessConfig.licenseCost;
  restock.classList.toggle('hidden',!owned);restock.textContent=`RESTOCK WHOLESALE ×${cafeBusinessConfig.restockUnits} · $${cafeBusinessConfig.restockCost}`;restock.disabled=!owned||cafeBusinessState.stock+cafeBusinessConfig.restockUnits>cafeBusinessConfig.stockCapacity||wallet<cafeBusinessConfig.restockCost;
  toggle.classList.toggle('hidden',!owned);toggle.textContent=cafeBusinessState.open?'CLOSE BUSINESS':'OPEN BUSINESS';toggle.disabled=!owned||(!cafeBusinessState.open&&!ready);
  localStockLabel.textContent=`${cafeBusinessState.localStock}/${cafeBusinessConfig.localStockCapacity}`;
  localSupplyList.replaceChildren();
  if(!owned){const note=document.createElement('p');note.className='cafe-local-supply-locked';note.textContent='LOCKED · Purchase the Corner Cafe license to start delivering Estate Garden harvests and Artisan Workshop goods.';localSupplyList.append(note);}
  else for(const supply of cafeLocalSupplyCatalog){
    const count=Math.max(0,Math.floor(Number(inventory[supply.item])||0));
    const skillLevel=skillProgress(supply.skill).level;
    const opportunityCost=supply.quantity*Math.round(supply.marketUnitValue*(1+(skillLevel-1)*supply.skillBonus));
    const wholesaleValue=Math.round(supply.servings*cafeBusinessConfig.restockCost/cafeBusinessConfig.restockUnits);
    const menuPremium=supply.servings*cafeBusinessConfig.localSalesBonusPerServing;
    const estimatedAdvantage=wholesaleValue+menuPremium-opportunityCost;
    const card=document.createElement('article');card.className='cafe-local-supply-card';
    const icon=document.createElement('span');icon.className='cafe-local-supply-icon';icon.textContent=supply.icon;
    const info=document.createElement('div');info.className='cafe-local-supply-info';
    const heading=document.createElement('b');heading.textContent=supply.inputName;
    const detail=document.createElement('small');detail.textContent=`${supply.source} · NEED ${supply.quantity} · OWNED ${count} · +${supply.servings} LOCAL SERVINGS`;
    const value=document.createElement('small');value.className='cafe-local-supply-value';value.textContent=`MARKET VALUE $${opportunityCost} · CAFE VALUE $${wholesaleValue+menuPremium} · ${estimatedAdvantage>=0?'+':''}$${estimatedAdvantage} EST. ADVANTAGE`;
    info.append(heading,detail,value);
    const button=document.createElement('button');button.type='button';button.dataset.cafeSupply=supply.key;
    const hasCapacity=cafeBusinessState.localStock+supply.servings<=cafeBusinessConfig.localStockCapacity;
    button.textContent=!hasCapacity?'STORAGE FULL':count<supply.quantity?`NEED ${supply.quantity-count} MORE`:`DELIVER ×${supply.quantity}`;
    button.disabled=!hasCapacity||count<supply.quantity;
    card.append(icon,info,button);localSupplyList.append(card);
  }
  upgrades.classList.toggle('hidden',!owned);upgrades.replaceChildren();
  if(owned){
    const definitions=[
      {key:'espresso',title:'Commercial Espresso Machine',category:'SERVICE QUALITY',description:'Serve more premium drinks and raise the average daily sales value.'},
      {key:'patio',title:'Expanded Patio Seating',category:'CUSTOMER CAPACITY',description:'Add more seating and attract extra neighborhood customers each day.'}
    ];
    for(const item of definitions){
      const level=cafeBusinessState[item.key],cost=cafeBusinessUpgradeCost(item.key),bonus=cafeBusinessConfig.upgradeBonuses[item.key];
      const card=document.createElement('article');card.className='cafe-upgrade-card';
      const head=document.createElement('div');head.className='cafe-upgrade-head';
      const identity=document.createElement('div');const tag=document.createElement('small');tag.textContent=item.category;const title=document.createElement('b');title.textContent=item.title;identity.append(tag,title);
      const levelLabel=document.createElement('strong');levelLabel.textContent=`LV ${level}/3`;head.append(identity,levelLabel);
      const desc=document.createElement('p');desc.textContent=item.description;
      const effect=document.createElement('small');effect.className='cafe-upgrade-effect';effect.textContent=level<3?`NEXT LEVEL · +$${bonus[level]} DAILY SALES`:`MAX LEVEL · +$${bonus.reduce((sum,value)=>sum+value,0)} DAILY SALES`;
      const button=document.createElement('button');button.type='button';button.dataset.cafeUpgrade=item.key;button.textContent=cost===null?'MAX LEVEL':`UPGRADE · $${cost.toLocaleString('en-US')}`;button.disabled=cost===null||wallet<cost;
      card.append(head,desc,effect,button);upgrades.append(card);
    }
  }
  syncCafeBusinessSign();
}
function buyCafeBusiness(){
  if(cafeBusinessState.owned){showToast('CORNER CAFE SUDAH MENJADI BISNISMU');return;}
  if(wallet<cafeBusinessConfig.licenseCost){showToast(`DANA BELUM CUKUP · BUTUH $${cafeBusinessConfig.licenseCost.toLocaleString('en-US')}`);return;}
  wallet-=cafeBusinessConfig.licenseCost;cafeBusinessState.owned=true;cafeBusinessState.open=false;
  recordTransaction('Corner Cafe · business license',-cafeBusinessConfig.licenseCost);setWallet(wallet);
  renderCafeBusinessPanel();renderWorkFinancePanel();saveGame(false);showToast('CORNER CAFE RESMI MENJADI BISNISMU · PASANG PERSEDIAAN UNTUK MULAI');
}
function restockCafeBusiness(){
  if(!cafeBusinessState.owned)return;
  if(cafeBusinessState.stock+cafeBusinessConfig.restockUnits>cafeBusinessConfig.stockCapacity){showToast('STOK HAMPIR PENUH · HABISKAN PERSEDIAAN TERLEBIH DAHULU');return;}
  if(wallet<cafeBusinessConfig.restockCost){showToast('DANA BELUM CUKUP UNTUK MEMBELI STOK GROSIR');return;}
  wallet-=cafeBusinessConfig.restockCost;cafeBusinessState.stock+=cafeBusinessConfig.restockUnits;
  recordTransaction('Corner Cafe · wholesale supplies ×12',-cafeBusinessConfig.restockCost);setWallet(wallet);
  renderCafeBusinessPanel();renderWorkFinancePanel();saveGame(false);showToast(`PERSEDIAAN CAFE BERTAMBAH · ${cafeBusinessState.stock} SERVINGS`);
}
function deliverCafeLocalSupply(supplyKey){
  if(!cafeBusinessState.owned){showToast('BELI LISENSI CORNER CAFE TERLEBIH DAHULU');return;}
  const delivery=planCafeLocalSupplyDelivery({supplyKey,inventory,localStock:cafeBusinessState.localStock,capacity:cafeBusinessConfig.localStockCapacity});
  if(!delivery.ok){
    if(delivery.reason==='insufficient-inventory')showToast(`STOK ${delivery.supply?.inputName?.toUpperCase()||'BAHAN'} BELUM CUKUP · BUTUH ${delivery.required}`);
    else if(delivery.reason==='capacity-exceeded')showToast(`GUDANG CAFE HAMPIR PENUH · SISA ${delivery.freeSpace} SLOT`);
    else showToast('JENIS PASOKAN TIDAK DIKENAL');
    return;
  }
  inventory[delivery.supply.item]=delivery.remainingInventory;
  cafeBusinessState.localStock=delivery.nextLocalStock;
  cafeBusinessState.localDeliveries++;
  renderInventory();renderCafeBusinessPanel();renderWorkFinancePanel();
  if(!districtPanel.classList.contains('hidden'))renderDistrictStore();
  saveGame(false);
  showToast(`${delivery.supply.inputName.toUpperCase()} DIKIRIM KE CORNER CAFE · +${delivery.deliveredServings} LOCAL SERVINGS`);
}
function toggleCafeBusiness(){
  if(!cafeBusinessState.owned)return;
  if(cafeBusinessState.open){cafeBusinessState.open=false;showToast('CORNER CAFE DITUTUP · OPERASIONAL DIHENTIKAN');}
  else if(cafeBusinessState.stock+cafeBusinessState.localStock<cafeBusinessConfig.dailyStockUse){showToast('RESTOCK WHOLESALE ATAU KIRIM MINIMAL 3 LOCAL SERVINGS');return;}
  else{cafeBusinessState.open=true;showToast('CORNER CAFE DIBUKA · PENJUALAN DIMULAI PADA 07:00 GAME TIME');}
  renderCafeBusinessPanel();renderWorkFinancePanel();saveGame(false);
}
function upgradeCafeBusiness(type){
  if(!cafeBusinessState.owned||!['espresso','patio'].includes(type))return;
  const cost=cafeBusinessUpgradeCost(type);
  if(cost===null){showToast('UPGRADE SUDAH MENCAPAI LEVEL MAKSIMUM');return;}
  if(wallet<cost){showToast('DANA BELUM CUKUP UNTUK UPGRADE');return;}
  const nextLevel=cafeBusinessState[type]+1;wallet-=cost;cafeBusinessState[type]=nextLevel;
  const label=type==='espresso'?'Commercial Espresso Machine':'Expanded Patio Seating';
  recordTransaction(`Corner Cafe · ${label} Lv.${nextLevel}`,-cost);setWallet(wallet);
  renderCafeBusinessPanel();renderWorkFinancePanel();saveGame(false);showToast(`${label.toUpperCase()} · LEVEL ${nextLevel} TERPASANG`);
}
function processCafeBusinessDay(day){
  if(!cafeBusinessState.owned||!cafeBusinessState.open||cafeBusinessState.lastOperatedDay===day)return false;
  cafeBusinessState.lastOperatedDay=day;
  const stockUse=consumeCafeBusinessStock({wholesaleStock:cafeBusinessState.stock,localStock:cafeBusinessState.localStock,dailyStockUse:cafeBusinessConfig.dailyStockUse});
  if(!stockUse.ok){
    cafeBusinessState.open=false;cafeBusinessState.lastProfit=0;cafeBusinessState.lastCustomers=0;cafeBusinessState.lastLocalServings=0;
    showToast('CORNER CAFE KEHABISAN STOK · OPERASIONAL DITUTUP OTOMATIS');renderCafeBusinessPanel();return true;
  }
  cafeBusinessState.stock=stockUse.nextWholesaleStock;
  cafeBusinessState.localStock=stockUse.nextLocalStock;
  const localMenuBonus=stockUse.localUsed*cafeBusinessConfig.localSalesBonusPerServing;
  const customers=20+cafeBusinessState.reputation*2+cafeBusinessState.espresso*4+cafeBusinessState.patio*5+(stockUse.localUsed>0?4:0);
  const gross=185+cafeBusinessState.reputation*12+cafeBusinessConfig.upgradeBonuses.espresso.slice(0,cafeBusinessState.espresso).reduce((a,b)=>a+b,0)+cafeBusinessConfig.upgradeBonuses.patio.slice(0,cafeBusinessState.patio).reduce((a,b)=>a+b,0)+localMenuBonus;
  const operatingCost=42+cafeBusinessState.espresso*4+cafeBusinessState.patio*6;
  const profit=gross-operatingCost;
  wallet+=gross;recordTransaction('Corner Cafe · daily sales',gross,day,'07:00');
  wallet-=operatingCost;recordTransaction('Corner Cafe · staff & utilities',-operatingCost,day,'07:00');
  cafeBusinessState.operatingDays++;cafeBusinessState.lifetimeSales+=gross;cafeBusinessState.lifetimeOperatingCosts+=operatingCost;cafeBusinessState.lastProfit=profit;cafeBusinessState.lastCustomers=customers;cafeBusinessState.lastLocalServings=stockUse.localUsed;cafeBusinessState.lifetimeLocalServings+=stockUse.localUsed;
  cafeBusinessState.reputation=clamp(cafeBusinessState.reputation+1,0,10);
  setWallet(wallet);renderCafeBusinessPanel();
  showToast(`CORNER CAFE DAY ${day} · ${customers} CUSTOMERS · ${stockUse.localUsed} LOCAL SERVINGS · OPERATING MARGIN +$${profit.toLocaleString('en-US')}`);
  return true;
}

function renderPropertyPanel(){
  const list = document.querySelector('#property-upgrade-list');
  if (!list) return;
  list.replaceChildren();
  const totalLevels = Object.values(propertyUpgrades).reduce((sum, level) => sum + level, 0);
  const totalAvailable = Object.values(propertyUpgradeDefinitions).reduce((sum, item) => sum + item.levels.length, 0);
  const progress = document.querySelector('#property-progress');
  const balance = document.querySelector('#property-wallet');
  const utility = document.querySelector('#property-utility-cost');
  if (progress) progress.textContent = `${totalLevels} / ${totalAvailable} RENOVATION LEVELS`; 
  if (balance) balance.textContent = '$' + wallet.toLocaleString('en-US');
  if (utility) utility.textContent = '$' + propertyDailyBill() + ' / DAY';
  renderGuestSuiteRentalPanel();
  for (const [key, definition] of Object.entries(propertyUpgradeDefinitions)) {
    const level = propertyUpgrades[key] || 0;
    const next = definition.levels[level];
    const card = document.createElement('article'); card.className = 'property-upgrade-card' + (level ? ' upgraded' : '');
    const head = document.createElement('div'); head.className = 'property-upgrade-head';
    const identity = document.createElement('div');
    const category = document.createElement('small'); category.textContent = definition.category;
    const title = document.createElement('b'); title.textContent = definition.title;
    identity.append(category,title);
    const badge = document.createElement('strong'); badge.textContent = `LVL ${level} / 2`;
    head.append(identity,badge);
    const description = document.createElement('p'); description.textContent = definition.description;
    const effect = document.createElement('div'); effect.className = 'property-upgrade-effect';
    const current = document.createElement('small'); current.textContent = level ? `CURRENT · ${definition.levels[level-1].benefit}` : 'CURRENT · Original property condition';
    const upcoming = document.createElement('small'); upcoming.textContent = next ? `NEXT · ${next.benefit}` : 'NEXT · All renovation levels completed';
    effect.append(current,upcoming);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'property-upgrade-buy';
    button.textContent = next ? `UPGRADE · $${next.cost.toLocaleString('en-US')}` : 'FULLY UPGRADED';
    button.disabled = !next || wallet < next.cost;
    if (next && wallet < next.cost) button.title = `Butuh $${(next.cost-wallet).toLocaleString('en-US')} lagi`;
    button.addEventListener('click', () => purchasePropertyUpgrade(key));
    card.append(head,description,effect,button); list.append(card);
  }
}
function openPropertyPanel() {
  closePanels();
  renderPropertyPanel();
  document.querySelector('#property-panel').classList.remove('hidden');
}
function purchasePropertyUpgrade(key) {
  const definition = propertyUpgradeDefinitions[key];
  if (!definition) return;
  const level = propertyUpgrades[key] || 0;
  const next = definition.levels[level];
  if (!next) { showToast('RENOVASI SUDAH MENCAPAI LEVEL MAKSIMAL'); return; }
  if (wallet < next.cost) { showToast(`UANG BELUM CUKUP · BUTUH $${(next.cost-wallet).toLocaleString('en-US')} LAGI`); return; }
  wallet -= next.cost;
  propertyUpgrades[key] = level + 1;
  recordTransaction(`Property upgrade: ${definition.title} Lv. ${level+1}`, -next.cost);
  setWallet(wallet);
  applyPropertyUpgradeVisuals();
  updateHouseholdPanel();
  renderPropertyPanel();
  saveGame(false);
  showToast(`${definition.title.toUpperCase()} · LEVEL ${level+1} BERHASIL DIBANGUN`);
}
function updateHouseholdPanel() {
  const total = Math.max(0, Math.floor(unpaidBills));
  const amount = document.querySelector('#bill-amount'), status = document.querySelector('#bill-status');
  const day = document.querySelector('#house-day'), history = document.querySelector('#bill-history');
  const pay = document.querySelector('#pay-bills-btn');
  const dailyRate = document.querySelector('#bill-daily-rate');
  if (amount) amount.textContent = '$' + total.toLocaleString('en-US');
  if (status) status.textContent = total ? 'PAYMENT DUE' : 'ALL CLEAR';
  if (day) day.textContent = 'DAY ' + gameDay;
  if (history) history.textContent = '$' + billsPaid.toLocaleString('en-US') + ' paid so far';
  if (dailyRate) dailyRate.textContent = 'DAILY · $' + propertyDailyBill();
  if (pay) { pay.disabled = total <= 0 || wallet < total; pay.textContent = total <= 0 ? 'NO BILLS DUE' : wallet < total ? 'NOT ENOUGH CASH' : 'PAY $' + total.toLocaleString('en-US'); }
}
function openHouseholdPanel() { closePanels(); updateHouseholdPanel(); document.querySelector('#household-panel').classList.remove('hidden'); }
function updateSettingsPanel() {
  document.querySelectorAll('[data-quality]').forEach(button => {
    const active = button.dataset.quality === graphicsQuality;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-camera-sensitivity]').forEach(button => {
    const active = button.dataset.cameraSensitivity === cameraSensitivity;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const invert = document.querySelector('#camera-invert-toggle');
  if (invert) { invert.textContent = invertCameraY ? 'ON' : 'OFF'; invert.classList.toggle('selected', invertCameraY); }
  const auto = document.querySelector('#autosave-toggle');
  if (auto) { auto.textContent = autoSaveEnabled ? 'ON' : 'OFF'; auto.classList.toggle('selected', autoSaveEnabled); }
  const fullscreen = document.querySelector('#settings-fullscreen-btn');
  if (fullscreen) fullscreen.textContent = document.fullscreenElement ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN';
  const status = document.querySelector('#autosave-status');
  if (status) status.textContent = autoSaveEnabled ? 'Progress otomatis disimpan setiap 45 detik.' : 'Auto-save nonaktif. Simpan progress secara manual.';
}
function openSettings() { closePanels(); updateSettingsPanel(); document.querySelector('#settings-panel').classList.remove('hidden'); }
function saveCameraPreferences() {
  try { localStorage.setItem('estate-camera-preferences', JSON.stringify({ sensitivity: cameraSensitivity, invertY: invertCameraY })); }
  catch (error) { console.warn('Could not save camera preferences:', error); }
  updateSettingsPanel();
}
function resetCameraView(notify = true) {
  cameraYawTarget = avatar.rotation.y;
  cameraPitchTarget = 0.24;
  cameraDistanceTarget = 8.8;
  if (notify) showToast('CAMERA VIEW DIKEMBALIKAN');
}
function toggleAutoSave() {
  autoSaveEnabled = !autoSaveEnabled;
  try { localStorage.setItem('estate-auto-save', String(autoSaveEnabled)); } catch {}
  if (autoSaveEnabled && isStarted) saveGame(false);
  updateSettingsPanel(); showToast('AUTO-SAVE ' + (autoSaveEnabled ? 'AKTIF' : 'NONAKTIF'));
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) { showToast('FULLSCREEN TIDAK DIDUKUNG BROWSER INI'); }
  updateSettingsPanel();
}
function exportSaveBackup() {
  try {
    saveGame(false);
    const raw = localStorage.getItem('estate-explorer-save-v4');
    if (!raw) { showToast('BELUM ADA PROGRESS UNTUK DIEKSPOR'); return; }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'estate-explorer-save.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    showToast('SAVE BACKUP BERHASIL DIUNDUH');
  } catch (error) { showToast('GAGAL MEMBUAT SAVE BACKUP'); }
}
async function importSaveBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version) || !data.player || !Number.isFinite(data.player.x) || !Number.isFinite(data.player.z)) {
      throw new Error('Invalid save backup');
    }
    localStorage.setItem('estate-explorer-save-v4', JSON.stringify(data));
    if (!loadGame(false)) throw new Error('Could not restore imported save');
    saveGame(false);
    showToast('SAVE BACKUP BERHASIL DIIMPOR ✓');
  } catch (error) {
    console.warn('Could not import save backup:', error);
    showToast('FILE BACKUP TIDAK VALID');
  } finally {
    document.querySelector('#import-save-file').value = '';
  }
}
document.addEventListener('fullscreenchange', updateSettingsPanel);

function payHouseholdBills() {
  const total = Math.max(0, Math.floor(unpaidBills));
  if (!total) { showToast('TIDAK ADA TAGIHAN'); return; }
  if (wallet < total) { showToast('UANG BELUM CUKUP UNTUK BAYAR TAGIHAN'); return; }
  wallet -= total; billsPaid += total; unpaidBills = 0;
  recordTransaction('Household bills', -total);
  setWallet(wallet); updateHouseholdPanel(); saveGame(false); showToast('TAGIHAN RUMAH LUNAS ✓');
}
function changeNeed(key, amount, message) {
  const before = needs[key]; needs[key] = clamp(needs[key] + amount, 0, 100);
  updateNeedsHud(true);
  if (needs[key] === before) showToast(key.toUpperCase() + ' SUDAH MAKSIMAL');
  else showToast(message);
}
function sleepAtHome(guestSuite = false) {
  if(guestSuite&&guestSuiteRental.tenantActive){showToast('GUEST SUITE SEDANG DISEWA · KAMAR TIDAK TERSEDIA');return;}
  if (needs.energy > 92) { showToast('ENERGI MASIH PENUH'); return; }
  const recovery = 65 + propertyUpgrades.bedroom * 10 + (guestSuite && propertyUpgrades.guestSuite > 1 ? 10 : 0);
  needs.energy = Math.min(100, needs.energy + recovery);
  needs.hunger = Math.max(0, needs.hunger - 8);
  recordDailyTaskProgress('homeCare');
  advanceGameTime(8 * 60);
  updateNeedsHud(true);
  showToast('KAMU BANGUN DENGAN LEBIH SEGAR');
}
function practiceCreativeStudio() {
  if (propertyUpgrades.studio <= 0) { showToast('CREATIVE STUDIO BELUM DIBANGUN'); return; }
  if (needs.energy < 10) { showToast('ENERGY TERLALU RENDAH · BUTUH 10 ENERGY'); return; }
  const xp = propertyUpgrades.studio > 1 ? 45 : 35;
  playPlayerGesture('work', { x: -20.8, y: 0.2, z: -5.2 });
  needs.energy = Math.max(0,needs.energy-10);
  addSkillXp('career',xp);
  recordDailyTaskProgress('skillPractice',xp);
  advanceGameTime(45);
  updateNeedsHud(true);renderSkills();renderCareerPanel();
  saveGame(false);
  showToast(`CREATIVE SESSION COMPLETE · CAREER +${xp} XP · ENERGY -10`);
}
function showerAtHome() {
  if (needs.hygiene > 94) { showToast('KAMU SUDAH BERSIH'); return; }
  needs.hygiene = Math.min(100, needs.hygiene + 82);
  needs.energy = Math.max(0, needs.energy - 6);
  recordDailyTaskProgress('homeCare');
  advanceGameTime(20);
  updateNeedsHud(true); showToast('SELESAI MANDI · HYGIENE +82');
}
function useToilet() {
  if (needs.bladder > 94) { showToast('BELUM PERLU KE TOILET'); return; }
  needs.bladder = Math.min(100, needs.bladder + 88);
  recordDailyTaskProgress('homeCare');
  advanceGameTime(5);
  updateNeedsHud(true); showToast('SELESAI · BLADDER +88');
}
function cookMeal() {
  if (handheldState.item && handheldState.item !== 'pan') { showToast('LETAKKAN BARANG TERLEBIH DAHULU'); return; }
  if (needs.hunger > 91) { showToast('KAMU BELUM LAPAR'); return; }
  const restore = Math.min(82, 54 + (skillProgress('cooking').level - 1) * 3 + propertyUpgrades.kitchen * 8);
  needs.hunger = Math.min(100, needs.hunger + restore);
  needs.energy = Math.max(0, needs.energy - 3);
  addSkillXp('cooking', 20);
  playPlayerGesture('cook', { x: -6.5, y: 0, z: -7.1 }, handheldState.item === 'pan' && handheldState.persistent ? null : 'pan');
  recordDailyTaskProgress('homeCare');
  recordDailyTaskProgress('mealPrep');
  advanceGameTime(35);
  updateNeedsHud(true); showToast(`MASAKAN SIAP · HUNGER +${restore}`);
}
function farmClockMinutes(){return (Math.max(1,gameDay)-1)*1440+gameMinutes;}
function farmPlotProgress(index){
  const plot=farmState.plots[index],crop=plot?.crop?farmCropDefinitions[plot.crop]:null;
  if(!crop||!plot.wateredAt)return 0;
  return clamp((farmClockMinutes()-plot.wateredAt)/crop.growthMinutes,0,1);
}
function farmStageForProgress(progress){return progress>=1?3:progress>=0.55?2:progress>0?1:0;}
function updateFarmPlotVisual(index){
  const state=farmState.plots[index],world=farmPlots[index];
  for(const [key,variant] of Object.entries(world.variants)){
    const active=state.crop===key&&state.stage>0;variant.group.visible=active;
    if(active){const progress=state.stage===1?0.55:state.stage===2?0.82:1;variant.group.scale.setScalar(progress);variant.fruit.visible=state.stage>=3;}
  }
  world.moisture.visible=!!state.crop&&!!state.wateredAt&&state.stage<3;
  world.lastCrop=state.crop;world.lastStage=state.stage;
}
function refreshFarmGrowth(){
  let changed=false;
  farmState.plots.forEach((plot,index)=>{
    if(!plot.crop||!farmCropDefinitions[plot.crop]||!plot.wateredAt)return;
    const stage=farmStageForProgress(farmPlotProgress(index));
    if(stage!==plot.stage){plot.stage=stage;updateFarmPlotVisual(index);changed=true;}
  });
  if(changed&&!document.querySelector('#farm-panel').classList.contains('hidden'))renderFarmPanel();
  return changed;
}
function renderFarmPanel(){
  const chosen=farmCropDefinitions[farmState.selectedSeed]||farmCropDefinitions.tomato;
  const balance=document.querySelector('#farm-seed-balance');if(balance)balance.textContent=`SELECTED · ${chosen.name.toUpperCase()} SEEDS ×${inventory[chosen.seedItem]||0}`;
  document.querySelectorAll('[data-farm-seed]').forEach(button=>{
    const key=button.dataset.farmSeed,crop=farmCropDefinitions[key],count=inventory[crop.seedItem]||0;
    button.classList.toggle('selected',key===farmState.selectedSeed);button.disabled=count<=0;
    button.querySelector('small').textContent=`OWNED ×${count}`;
  });
  const list=document.querySelector('#farm-plot-list');if(!list)return;list.replaceChildren();
  farmState.plots.forEach((plot,index)=>{
    const card=document.createElement('article');card.className='farm-plot-card';
    const title=document.createElement('b');title.textContent=`BED ${String(index+1).padStart(2,'0')}`;
    const detail=document.createElement('small');
    if(!plot.crop)detail.textContent='EMPTY · READY TO PLANT';
    else{const crop=farmCropDefinitions[plot.crop],progress=Math.round(farmPlotProgress(index)*100);detail.textContent=!plot.wateredAt?`${crop.name.toUpperCase()} · NEEDS WATER`:plot.stage>=3?`${crop.name.toUpperCase()} · READY TO HARVEST`:`${crop.name.toUpperCase()} · ${progress}% GROWN`;}
    card.append(title,detail);list.append(card);
  });
  const status=document.querySelector('#farm-workshop-status'),build=document.querySelector('#farm-workshop-build'),recipes=document.querySelector('#farm-recipe-list');
  if(!farmWorkshopState.built){status.textContent=`LOCKED · BUILD THE ARTISAN WORKSHOP FOR $${farmWorkshopBuildCost}`;build.classList.remove('hidden');build.textContent=`BUILD WORKSHOP · $${farmWorkshopBuildCost}`;build.disabled=wallet<farmWorkshopBuildCost;recipes.classList.add('hidden');recipes.replaceChildren();}
  else{
    build.classList.add('hidden');recipes.classList.remove('hidden');
    if(farmWorkshopState.activeBatch){const recipe=farmRecipeDefinitions[farmWorkshopState.activeBatch.recipe],remaining=farmWorkshopRemaining();status.textContent=`PROCESSING · ${recipe.name.toUpperCase()} · ${Math.ceil(remaining)} GAME MIN LEFT`;}
    else status.textContent=`READY · ${farmWorkshopState.processedLifetime} GOODS PRODUCED LIFETIME`;
    recipes.replaceChildren();
    for(const recipe of Object.values(farmRecipeDefinitions)){
      const card=document.createElement('article');card.className='farm-recipe-card';
      const icon=document.createElement('div');icon.className='farm-recipe-icon';icon.textContent=recipe.icon;
      const info=document.createElement('div');info.className='farm-recipe-info';
      const name=document.createElement('b');name.textContent=recipe.name;
      const detail=document.createElement('small');detail.textContent=`${recipe.inputCount} ${recipe.inputName} → ${recipe.outputCount} · ${recipe.duration} min · sale $${recipe.salePrice}`;
      const description=document.createElement('small');description.textContent=recipe.description;
      info.append(name,detail,description);
      const action=document.createElement('button');action.type='button';action.textContent='PROCESS';
      action.disabled=!!farmWorkshopState.activeBatch||(inventory[recipe.inputItem]||0)<recipe.inputCount||needs.energy<8;
      action.addEventListener('click',()=>startFarmProcessing(recipe.key));
      card.append(icon,info,action);recipes.append(card);
    }
  }
}
function openFarmPanel(){
  if(inBoat||inVehicle||divingState.active||playerSeated){showToast('BERDIRI DI AREA TAMAN UNTUK MENGELOLA KEBUN');return;}
  closePanels();renderFarmPanel();document.querySelector('#farm-panel').classList.remove('hidden');
}
function selectFarmSeed(key){
  if(!farmCropDefinitions[key])return;
  farmState.selectedSeed=key;renderFarmPanel();saveGame(false);
}
function plantFarmPlot(index){
  const plot=farmState.plots[index],crop=farmCropDefinitions[farmState.selectedSeed];
  if(!plot||plot.crop){showToast('BED TANAM SUDAH TERISI');return;}
  if(handheldState.item&&handheldState.item!=='wateringCan'){showToast('LETAKKAN BARANG SEBELUM BERKEBUN');return;}
  if((inventory[crop.seedItem]||0)<1){showToast(`BIBIT ${crop.name.toUpperCase()} HABIS · BELI DI TOWN MARKET`);return;}
  if(needs.energy<1){showToast('ENERGY MINIMAL 1 UNTUK MENANAM');return;}
  inventory[crop.seedItem]--;plot.crop=crop.key;plot.wateredAt=0;plot.stage=0;needs.energy=Math.max(0,needs.energy-1);
  playPlayerGesture('work',{x:farmPlots[index].x,y:0,z:farmPlots[index].z});advanceGameTime(5);updateNeedsHud(true);updateFarmPlotVisual(index);addSkillXp('gardening',6);renderInventory();renderFarmPanel();saveGame(false);
  showToast(`${crop.name.toUpperCase()} DITANAM · SIRAM BED ${index+1} AGAR MULAI TUMBUH`);
}
function waterFarmPlot(index){
  const plot=farmState.plots[index];if(!plot?.crop||plot.wateredAt)return;
  if(handheldState.item&&handheldState.item!=='wateringCan'){showToast('LETAKKAN BARANG SEBELUM MENYIRAM');return;}
  if(needs.energy<2){showToast('ENERGY MINIMAL 2 UNTUK MENYIRAM');return;}
  needs.energy=Math.max(0,needs.energy-2);plot.wateredAt=farmClockMinutes();plot.stage=1;
  playPlayerGesture('water',{x:farmPlots[index].x,y:0,z:farmPlots[index].z},handheldState.item==='wateringCan'&&handheldState.persistent?null:'wateringCan');
  addSkillXp('gardening',8);advanceGameTime(5);refreshFarmGrowth();updateNeedsHud(true);renderFarmPanel();saveGame(false);
  showToast(`${farmCropDefinitions[plot.crop].name.toUpperCase()} DISIRAM · TUNGGU HINGGA MATANG`);
}
function harvestFarmPlot(index){
  const plot=farmState.plots[index],crop=plot?.crop?farmCropDefinitions[plot.crop]:null;
  if(!crop||plot.stage<3){showToast('TANAMAN BELUM SIAP DIPANEN');return;}
  const bonus=Math.floor((skillProgress('gardening').level-1)/3),yieldCount=crop.baseYield+bonus;
  inventory[crop.harvestItem]=(inventory[crop.harvestItem]||0)+yieldCount;
  plot.crop=null;plot.wateredAt=0;plot.stage=0;needs.energy=Math.max(0,needs.energy-1);
  playPlayerGesture('pickup',{x:farmPlots[index].x,y:0,z:farmPlots[index].z});addSkillXp('gardening',crop.xp);advanceGameTime(5);updateFarmPlotVisual(index);updateNeedsHud(true);renderInventory();renderFarmPanel();recordDailyTaskProgress('harvestCrop');saveGame(false);
  showToast(`${crop.name.toUpperCase()} DIPANEN · +${yieldCount} ${crop.harvestName.toUpperCase()} · GARDENING +${crop.xp} XP`);
}
function interactFarmPlot(index){
  const plot=farmState.plots[index];
  if(!plot.crop){plantFarmPlot(index);return;}
  if(!plot.wateredAt){waterFarmPlot(index);return;}
  if(plot.stage>=3){harvestFarmPlot(index);return;}
  const crop=farmCropDefinitions[plot.crop];showToast(`${crop.name.toUpperCase()} TUMBUH · ${Math.round(farmPlotProgress(index)*100)}% · TUNGGU HINGGA SIAP DIPANEN`);
}
function sellFarmProduce(item){
  const crop=Object.values(farmCropDefinitions).find(value=>value.harvestItem===item);if(!crop)return;
  const count=Math.max(0,Math.floor(inventory[item]||0));if(!count){showToast('BELUM ADA HASIL PANEN');return;}
  const level=skillProgress('gardening').level,unitPrice=Math.round(crop.salePrice*(1+(level-1)*0.03)),total=count*unitPrice;
  inventory[item]=0;wallet+=total;recordTransaction(`Town Market harvest sale: ${crop.name}`,total);setWallet(wallet);renderInventory();renderDistrictStore();saveGame(false);
  showToast(`${crop.harvestName.toUpperCase()} TERJUAL · ${count} × $${unitPrice} · +$${total}`);
}
function farmWorkshopRemaining(){return farmWorkshopState.activeBatch?Math.max(0,farmWorkshopState.activeBatch.readyAt-farmClockMinutes()):0;}
function refreshFarmProcessing(){
  const batch=farmWorkshopState.activeBatch;if(!batch)return false;
  const recipe=farmRecipeDefinitions[batch.recipe];
  if(!recipe||farmClockMinutes()<batch.readyAt)return false;
  inventory[recipe.outputItem]=(inventory[recipe.outputItem]||0)+recipe.outputCount;
  farmWorkshopState.processedLifetime+=recipe.outputCount;
  farmWorkshopState.activeBatch=null;
  addSkillXp('cooking',recipe.cookingXp);
  if(!document.querySelector('#farm-panel').classList.contains('hidden'))renderFarmPanel();
  renderInventory();saveGame(false);
  showToast(`${recipe.outputName.toUpperCase()} SIAP · +${recipe.outputCount} PRODUK · COOKING +${recipe.cookingXp} XP`);
  return true;
}
function buildFarmWorkshop(){
  if(farmWorkshopState.built){showToast('ARTISAN WORKSHOP SUDAH DIBANGUN');return;}
  if(wallet<farmWorkshopBuildCost){showToast(`UANG BELUM CUKUP · BUTUH $${farmWorkshopBuildCost}`);return;}
  wallet-=farmWorkshopBuildCost;farmWorkshopState.built=true;farmWorkshopGroup.visible=true;
  recordTransaction('Estate Artisan Workshop construction',-farmWorkshopBuildCost);
  setWallet(wallet);renderFarmPanel();saveGame(false);
  showToast('ARTISAN WORKSHOP DIBANGUN · PRODUKSI OLAHAN TERBUKA');
}
function startFarmProcessing(key){
  const recipe=farmRecipeDefinitions[key];if(!recipe||!farmWorkshopState.built)return;
  if(farmWorkshopState.activeBatch){showToast('WORKSHOP MASIH MEMPROSES PRODUK');return;}
  if((inventory[recipe.inputItem]||0)<recipe.inputCount){showToast(`BUTUH ${recipe.inputCount} ${recipe.inputName.toUpperCase()}`);return;}
  if(needs.energy<8){showToast('ENERGY MINIMAL 8 UNTUK PRODUKSI');return;}
  if(handheldState.item){showToast('LETAKKAN BARANG SEBELUM MENGGUNAKAN WORKSHOP');return;}
  inventory[recipe.inputItem]-=recipe.inputCount;needs.energy=Math.max(0,needs.energy-8);
  const startedAt=farmClockMinutes();farmWorkshopState.activeBatch={recipe:key,startedAt,readyAt:startedAt+recipe.duration};
  playPlayerGesture('work',{x:-46.2,y:0,z:17.1});advanceGameTime(10);updateNeedsHud(true);renderInventory();renderFarmPanel();saveGame(false);
  showToast(`${recipe.name.toUpperCase()} MULAI DIPROSES · ${recipe.duration} MENIT WAKTU GAME`);
}
function sellFarmProcessedGoods(item){
  const recipe=Object.values(farmRecipeDefinitions).find(entry=>entry.outputItem===item);if(!recipe)return;
  const count=Math.max(0,Math.floor(inventory[item]||0));if(!count){showToast('BELUM ADA PRODUK OLAHAN');return;}
  const level=skillProgress('cooking').level,unitPrice=Math.round(recipe.salePrice*(1+(level-1)*0.02)),total=count*unitPrice;
  inventory[item]=0;wallet+=total;recordTransaction(`Town Market artisan sale: ${recipe.outputName}`,total);setWallet(wallet);renderInventory();renderDistrictStore();saveGame(false);
  showToast(`${recipe.outputName.toUpperCase()} TERJUAL · ${count} × $${unitPrice} · +$${total}`);
}
function startGardenJob() {
  resetDailyWorkLimits();
  if (courierNetworkState.phase === 'enroute') { showToast('SELESAIKAN CITY EXPRESS TERLEBIH DAHULU'); return; }
  if (jobPhase === 'collect' || jobPhase === 'deliver') { showToast('SELESAIKAN COURIER ROUTE TERLEBIH DAHULU'); return; }
  if (gardenJobPhase === 'active') { showToast('GARDEN CARE MASIH BERJALAN'); return; }
  if (gardenShiftsToday >= 1) { showToast('JATAH GARDEN CARE HARI INI SUDAH HABIS'); return; }
  if (needs.energy < 10) { showToast('ENERGI MINIMAL 10 UNTUK GARDEN CARE'); return; }
  gardenShiftsToday++;
  needs.energy = Math.max(0, needs.energy - 10);
  gardenJobPhase = 'active'; gardenWatered = [false,false,false];
  gardenTaskMarkers.forEach(marker => { marker.group.visible = true; });
  advanceGameTime(30);
  updateNeedsHud(true); updateJobHud(); renderWorkFinancePanel(); saveGame(false); closePanels(); showToast('GARDEN CARE DIMULAI · SIRAM 3 AREA TAMAN');
}
function waterGarden(index) {
  if (handheldState.item && handheldState.item !== 'wateringCan') { showToast('LETAKKAN BARANG TERLEBIH DAHULU'); return; }
  if (gardenJobPhase !== 'active' || gardenWatered[index]) return;
  gardenWatered[index] = true; gardenTaskMarkers[index].group.visible = false;
  playPlayerGesture('water', { x: gardenTaskMarkers[index].x, y: 0, z: gardenTaskMarkers[index].z }, handheldState.item === 'wateringCan' && handheldState.persistent ? null : 'wateringCan');
  addSkillXp('gardening', 12);
  const count = gardenWatered.filter(Boolean).length;
  if (count === 3) {
    gardenJobPhase = 'complete'; gardenJobsCompleted += 1;
    const reward = 220 + (skillProgress('gardening').level - 1) * 15;
    wallet += reward; changeRelationship('alex',7); setWallet(wallet);
    recordTransaction('Garden care contract', reward);
    recordDailyTaskProgress('paidWork');
    showToast(`TAMAN SELESAI DIRAWAT · +$${reward}`);
  } else showToast('TANAMAN DISIRAM · ' + count + '/3');
  updateJobHud(); saveGame(false);
}
function rejectHangoutInvitation(npc, reason) {
  npc.lastSocialLine = reason;
  npc.greetingTimer = 2.6;
  paintNpcReaction(npc, npc.mood === 'sleepy' ? '💤' : '✋');
  const copy = document.querySelector('#dialogue-copy');
  if (copy) copy.textContent = `${npc.displayName}: ${reason} ${relationshipDialogue(npc.id)}`;
  showToast(`${npc.displayName.toUpperCase()} BELUM BISA HANGOUT`);
}
function startHangout(npcId, activity) {
  const npc = npcs.find(person => person.id === npcId);
  const options = {
    garden: { label: 'Garden stroll', unlock: hangoutUnlocks.garden, energy: 8, social: 16, relationship: 10, xp: 12, minutes: 30, toast: 'JALAN SANTAI DI TAMAN' },
    pool: { label: 'Poolside chill', unlock: hangoutUnlocks.pool, energy: 13, social: 22, relationship: 14, xp: 15, minutes: 45, toast: 'SANTAI DI TEPI KOLAM' },
    coffee: { label: 'Coffee break', unlock: hangoutUnlocks.coffee, energy: -6, social: 20, relationship: 17, xp: 18, minutes: 60, coffee: true, toast: 'COFFEE BREAK' },
    picnic: { label: 'Park picnic', unlock: hangoutUnlocks.picnic, energy: 10, social: 28, hunger: 20, relationship: 22, xp: 24, minutes: 90, sandwich: true, toast: 'PICNIC DI TAMAN KOTA' }
  };
  const plan = options[activity];
  if (!npc || !plan) return;
  resetDailyHangouts();
  if ((hangoutsToday[npcId] || 0) >= 1) { showToast(`${npc.displayName.toUpperCase()} SUDAH HANGOUT HARI INI`); return; }
  if ((relationships[npcId] || 0) < plan.unlock) { showToast(`BUTUH RELATIONSHIP ${plan.unlock} UNTUK ${plan.label.toUpperCase()}`); return; }
  if (plan.energy > 0 && needs.energy < plan.energy) { showToast('ENERGI TIDAK CUKUP UNTUK HANGOUT'); return; }
  const carriedCoffee = handheldState.item === 'coffee' && handheldState.persistent;
  if (plan.coffee && (inventory.coffee || 0) < 1 && !carriedCoffee) { showToast('BUTUH 1 KOPI DARI ESTATE LIVING'); return; }
  if (plan.sandwich && (inventory.sandwich || 0) < 1) { showToast('BUTUH 1 SANDWICH DARI TOWN MARKET'); return; }
  if (hangoutSession || npcSocialSession) {
    const reason = 'Sebentar, aku masih menghabiskan waktu dengan yang lain. Ajak lagi nanti, ya.';
    rejectHangoutInvitation(npc, reason);
    return;
  }
  if (npc.mood === 'sleepy' && activity !== 'coffee') {
    rejectHangoutInvitation(npc, 'Aku mulai mengantuk. Coffee break yang santai lebih cocok sekarang; jalan-jalan kita lanjut besok.');
    return;
  }
  if (npc.mood === 'focused' && activity === 'pool') {
    rejectHangoutInvitation(npc, 'Aku sedang fokus menyelesaikan sesuatu. Kita santai di tepi kolam lain kali, ya.');
    return;
  }
  if (plan.coffee && !carriedCoffee) inventory.coffee--;
  if (plan.coffee && carriedCoffee) clearHandheldObject();
  if (plan.sandwich) inventory.sandwich--;
  needs.energy = clamp(needs.energy - plan.energy, 0, 100);
  needs.social = clamp(needs.social + plan.social, 0, 100);
  if (plan.hunger) needs.hunger = clamp(needs.hunger + plan.hunger, 0, 100);
  hangoutsToday[npcId] = 1;
  const affinityBonus = npc.personality.preferredHangouts.includes(activity) ? 3 : 0;
  const moodBonus = npc.mood === 'sleepy' ? 0 : 1;
  npc.lastSocialLine = activity === 'coffee'
    ? 'Boleh! Coffee break bareng kamu terdengar pas sekali.'
    : activity === 'pool'
      ? 'Ayo! Kita cari udara segar di tepi kolam.'
      : 'Dengan senang hati. Jalan santai di taman akan menyenangkan.';
  const relationshipReward = plan.relationship + affinityBonus + moodBonus;
  advanceGameTime(plan.minutes);
  const destinations = { garden: [-16, 17], pool: [32, 18], coffee: [2, 14], picnic: [13.5, 95.2] };
  const [spotX, spotZ] = destinations[activity];
  npc.restingOnSeat = false;
  npc.cup.visible = false;
  npc.food.visible = false;
  npc.activeSeat = null;
  npc.activeRoutine = '';
  npc.activity = activity;
  npc.npc.position.y = 0;
  hangoutFollowEnabled = true;
  npcSocialSession = null;
  npcs.forEach(person => { person.reaction.visible = false; });
  const completionLines = {
    garden: 'Terima kasih sudah jalan santai bareng. Rasanya enak bisa istirahat sejenak.',
    pool: 'Waktu di tepi kolam tadi menyenangkan. Kita harus mengulanginya lagi.',
    coffee: 'Kopi dan obrolan tadi pas sekali. Terima kasih sudah meluangkan waktu.',
    picnic: 'Piknik di taman kota tadi seru. Makasih sudah menyiapkan sandwich dan waktu buatku.'
  };
  hangoutSession = { npcId, activity, target: new THREE.Vector3(spotX, 0, spotZ), elapsed: 0, arrived: false, playerArrived: false, waitingNotified: false, reactionCycle: -1, relationshipReward, socialXp: plan.xp, gesture: 0, completionLine: completionLines[activity] };
  npc.route = [hangoutSession.target.clone()];
  npc.targetIndex = 0;
  closePanels();
  updateNeedsHud(true);
  if (plan.coffee) renderInventory();
  setWallet(wallet);
  saveGame(false);
  showToast(`${plan.toast} DIMULAI · REWARD +${relationshipReward} SETELAH SELESAI · IKUTI ${npc.displayName.toUpperCase()}`);
}
function giveGift(npcId, item) {
  if (handheldState.item && handheldState.item !== item) { showToast('LETAKKAN BARANG YANG SEDANG DIBAWA'); return; }
  const npc = npcs.find(person => person.id === npcId);
  if (!npc || !['bouquet','coffee'].includes(item)) return;
  if (giftLimitDay !== gameDay) { giftLimitDay = gameDay; giftsGivenToday.alex = 0; giftsGivenToday.mia = 0; }
  if (giftsGivenToday[npcId] >= 1) { showToast(`${npc.displayName.toUpperCase()} SUDAH MENERIMA HADIAH HARI INI`); return; }
  const carriedGift = handheldState.item === item && handheldState.persistent;
  if ((inventory[item] || 0) < 1 && !carriedGift) { showToast('HADIAH TIDAK ADA DI INVENTORY'); return; }
  if (!carriedGift) inventory[item]--;
  giftsGivenToday[npcId]++;
  playPlayerGesture('offer', npc.npc.position, item);
  const basePoints = item === 'bouquet' ? 20 : 9;
  const giftBonus = npc.personality.preferredGifts.includes(item) ? 4 : 0;
  const points = basePoints + giftBonus;
  npc.lastSocialLine = item === 'bouquet'
    ? (giftBonus ? 'Wah, buket bunganya cantik sekali. Kamu ingat hal-hal yang aku suka!' : 'Terima kasih untuk bunganya. Ini kejutan yang manis.')
    : (giftBonus ? 'Kopi ini pas sekali! Kamu tahu cara membuat coffee break-ku lebih menyenangkan.' : 'Terima kasih sudah berbagi kopi denganku.');
  paintNpcReaction(npc, item === 'bouquet' ? '🌷' : '☕');
  npc.greetingTimer = 2.6;
  changeRelationship(npcId, points);
  setNpcMood(npc, 'cheerful');
  addSkillXp('social', item === 'bouquet' ? 18 : 10);
  renderInventory();
  const giftName = item === 'bouquet' ? 'BUKET BUNGA' : 'KOPI';
  showToast(`${npc.displayName.toUpperCase()} SENANG MENERIMA ${giftName} · RELATIONSHIP +${points}`);
  openDialogue(npcId);
}
function drinkCoffee() {
  if (handheldState.item && handheldState.item !== 'coffee') { showToast('LETAKKAN BARANG YANG SEDANG DIBAWA'); return; }
  const carriedCoffee = handheldState.item === 'coffee' && handheldState.persistent;
  if ((inventory.coffee || 0) < 1 && !carriedCoffee) { showToast('KAMU TIDAK PUNYA KOPI'); return; }
  if (needs.energy >= 96) { showToast('ENERGI MASIH CUKUP TINGGI'); return; }
  if (!carriedCoffee) inventory.coffee--;
  playPlayerGesture('drink', null, 'coffee');
  needs.energy = Math.min(100, needs.energy + 22);
  needs.hunger = Math.max(0, needs.hunger - 2);
  advanceGameTime(5);
  renderInventory(); updateNeedsHud(true);
  showToast('KOPI DINIKMATI · ENERGY +22');
}
function talkToNpc(npcId) {
  const npc = npcs.find(person => person.id === npcId);
  if (!npc) return;
  resetDailySocialTalks();
  playPlayerGesture('talk', npc.npc.position);
  const talks = socialTalksToday[npcId] || 0;
  npc.lastSocialLine = npcConversationLine(npc);
  if (talks < 2) {
    const socialLevel = skillProgress('social').level;
    const relationshipReward = talks === 0 ? 7 : 3;
    const socialGain = talks === 0 ? 18 : 10;
    socialTalksToday[npcId] = talks + 1;
    changeNeed('social', socialGain, `WAKTU BERSAMA ${npc.displayName.toUpperCase()} · SOCIAL +${socialGain}`);
    changeRelationship(npcId, relationshipReward + Math.max(0, socialLevel - 1));
    addSkillXp('social', talks === 0 ? 15 : 8);
    showToast(`${npc.displayName.toUpperCase()} SENANG DIAJAK BICARA · RELATIONSHIP +${relationshipReward}`);
  } else {
    npc.lastSocialLine += ' Kita sudah banyak ngobrol hari ini. Senang bisa bertemu lagi.';
    showToast(`${npc.displayName.toUpperCase()} SUDAH CUKUP BANYAK MENGOBROL HARI INI`);
  }
  npc.greetingTimer = 0;
  npc.reaction.visible = false;
  openDialogue(npcId);
}
function addPanelAction(container, label, detail, action, secondary = false) {
  const button = document.createElement('button'); button.className = 'panel-action' + (secondary ? ' secondary' : '');
  const title = document.createElement('strong'); title.textContent = label; button.appendChild(title);
  if (detail) { const note = document.createElement('span'); note.textContent = detail; button.appendChild(note); }
  button.addEventListener('click', action); container.appendChild(button); return button;
}
function openDialogue(npcId) {
  closePanels();
  const npc = npcs.find(item => item.id === npcId);
  if (!npc) return;
  const panel = document.querySelector('#dialogue-panel');
  const actions = document.querySelector('#dialogue-actions');
  const moodLabel = (npcMoodPresentation[npc.mood] || npcMoodPresentation.content).label.toUpperCase();
  document.querySelector('#dialogue-name').textContent = npc.displayName + ' · ' + relationshipRank(relationships[npcId]) + ' · ' + moodLabel;
  actions.replaceChildren();
  if (npcId === 'alex') {
    if (jobPhase === 'idle' || jobPhase === 'complete') {
      resetDailyWorkLimits();
      const courierReward = 450 + (skillProgress('delivery').level - 1) * 30;
      const gardenReward = 220 + (skillProgress('gardening').level - 1) * 15;
      document.querySelector('#dialogue-copy').textContent = (jobsCompleted ? `Ada kiriman baru hari ini. Ambil tiga paket dan antarkan ke Mia. Bayarannya $${courierReward}.` : `Pagi! Aku butuh bantuan mengantar tiga paket ke Mia di area kolam. Selesaikan pengiriman dan kamu mendapat $${courierReward}.`) + ` Aku juga punya tugas merawat taman dengan bayaran $${gardenReward}.`;
      const courierButton = addPanelAction(actions, jobsCompleted ? 'Ambil pekerjaan lagi' : 'Mulai pekerjaan kurir', courierShiftsToday >= 1 ? 'Jatah hari ini habis' : `+$${courierReward} · −14 Energy`, () => { startCourierJob(); closePanels(); });
      courierButton.disabled = courierShiftsToday >= 1 || needs.energy < 14;
    } else {
      document.querySelector('#dialogue-copy').textContent = jobPhase === 'collect' ? `Kamu sudah mengambil ${jobCollected.filter(Boolean).length} dari 3 paket. Cari penanda paket di halaman.` : 'Paketnya sudah lengkap. Antarkan semuanya ke Mia di dekat kolam.';
      addPanelAction(actions, 'Mengerti', '', closePanels, true);
    }
    if (gardenJobPhase === 'active') {
      addPanelAction(actions, 'Garden care berjalan', `${gardenWatered.filter(Boolean).length}/3 area sudah disiram`, closePanels, true);
    } else {
      const gardenReward = 220 + (skillProgress('gardening').level - 1) * 15;
      const gardenButton = addPanelAction(actions, 'Mulai tugas merawat taman', gardenShiftsToday >= 1 ? 'Jatah hari ini habis' : `+$${gardenReward} · −10 Energy`, startGardenJob);
      gardenButton.disabled = gardenShiftsToday >= 1 || needs.energy < 10;
    }
  } else {
    if (jobPhase === 'deliver') {
      document.querySelector('#dialogue-copy').textContent = 'Oh, paketnya datang! Terima kasih sudah mengantarkannya. Ini upah untuk kerja kerasmu.';
      const courierReward = 450 + (skillProgress('delivery').level - 1) * 30;
      addPanelAction(actions, 'Serahkan 3 paket', `Terima $${courierReward}`, () => { completeCourierJob(); closePanels(); });
    } else {
      document.querySelector('#dialogue-copy').textContent = 'Hai! Selamat datang di rumah. Kalau Alex memberimu paket, aku menunggu di sini.';
      addPanelAction(actions, 'Sampai jumpa', '', closePanels, true);
    }
  }
  resetDailyHangouts();
  if (giftLimitDay !== gameDay) { giftLimitDay = gameDay; giftsGivenToday.alex = 0; giftsGivenToday.mia = 0; }
  const giftCount = giftsGivenToday[npcId] || 0;
  const bouquetPoints = 20 + (npc.personality.preferredGifts.includes('bouquet') ? 4 : 0);
  const coffeePoints = 9 + (npc.personality.preferredGifts.includes('coffee') ? 4 : 0);
  const carryingBouquet = handheldState.item === 'bouquet' && handheldState.persistent;
  const carryingCoffee = handheldState.item === 'coffee' && handheldState.persistent;
  const bouquetAction = addPanelAction(actions, 'Give a flower bouquet', carryingBouquet ? `IN HAND · +${bouquetPoints} relationship` : inventory.bouquet > 0 ? `+${bouquetPoints} relationship · 1 gift/day` : 'Buy a bouquet at Estate Living', () => giveGift(npcId, 'bouquet'), true);
  bouquetAction.disabled = (inventory.bouquet < 1 && !carryingBouquet) || giftCount >= 1;
  const coffeeAction = addPanelAction(actions, 'Share a coffee', carryingCoffee ? `IN HAND · +${coffeePoints} relationship` : inventory.coffee > 0 ? `+${coffeePoints} relationship · 1 gift/day` : 'Buy coffee at Estate Living', () => giveGift(npcId, 'coffee'), true);
  coffeeAction.disabled = (inventory.coffee < 1 && !carryingCoffee) || giftCount >= 1;
  if (giftCount >= 1) {
    const note = document.createElement('small'); note.className = 'panel-footnote'; note.textContent = 'Kamu sudah memberi hadiah kepada ' + npc.displayName + ' hari ini. Coba lagi besok.'; actions.append(note);
  }
  const relationshipNote = relationshipDialogue(npcId);
  const socialLine = npc.lastSocialLine || npcConversationLine(npc);
  document.querySelector('#dialogue-copy').textContent = npcPersonalityDialogue(npc) + ' ' + socialLine + ' ' + relationshipNote + ' ' + document.querySelector('#dialogue-copy').textContent;
  npc.lastSocialLine = '';
  const hangoutCount = hangoutsToday[npcId] || 0;
  const hangoutOptions = [
    { key: 'garden', label: 'Garden stroll', detail: `Friend · ${hangoutUnlocks.garden} relationship · 30 menit · −8 energy`, unlock: hangoutUnlocks.garden },
    { key: 'pool', label: 'Poolside chill', detail: `Close Friend · ${hangoutUnlocks.pool} relationship · 45 menit · −13 energy`, unlock: hangoutUnlocks.pool },
    { key: 'coffee', label: 'Coffee break', detail: `Close Friend · ${hangoutUnlocks.coffee} relationship · 1 kopi · 60 menit · +6 energy`, unlock: hangoutUnlocks.coffee, coffee: true },
    { key: 'picnic', label: 'Park picnic', detail: `Best Friend · ${hangoutUnlocks.picnic} relationship · 1 sandwich · 90 menit · −10 energy`, unlock: hangoutUnlocks.picnic, sandwich: true }
  ];
  for (const option of hangoutOptions) {
    const favoriteNote = npc.personality.preferredHangouts.includes(option.key) ? ' · Favorit karakter (+3 relationship)' : '';
    const button = addPanelAction(actions, option.label, option.detail + favoriteNote, () => startHangout(npcId, option.key), true);
    button.classList.add('hangout-action');
    const unlocked = (relationships[npcId] || 0) >= option.unlock;
    const hasCoffee = !option.coffee || inventory.coffee > 0 || carryingCoffee;
    const hasSandwich = !option.sandwich || inventory.sandwich > 0;
    button.disabled = hangoutCount >= 1 || !unlocked || !hasCoffee || !hasSandwich;
  }
  if (hangoutCount >= 1) {
    const note = document.createElement('small'); note.className = 'panel-footnote'; note.textContent = 'Hangout dengan ' + npc.displayName + ' sudah dilakukan hari ini. Kalian bisa bertemu lagi besok.'; actions.append(note);
  }
  panel.classList.remove('hidden');
}
function startCourierJob() {
  resetDailyWorkLimits();
  if (courierNetworkState.phase === 'enroute') { showToast('SELESAIKAN CITY EXPRESS TERLEBIH DAHULU'); return; }
  if (gardenJobPhase === 'active') { showToast('SELESAIKAN GARDEN CARE TERLEBIH DAHULU'); return; }
  if (jobPhase === 'collect' || jobPhase === 'deliver') { showToast('ROUTE KURIR MASIH BERJALAN'); return; }
  if (courierShiftsToday >= 1) { showToast('JATAH COURIER ROUTE HARI INI SUDAH HABIS'); return; }
  if (needs.energy < 14) { showToast('ENERGI MINIMAL 14 UNTUK COURIER ROUTE'); return; }
  courierShiftsToday++;
  needs.energy = Math.max(0, needs.energy - 14);
  jobPhase = 'collect'; jobCollected = [false,false,false]; inventory.parcel = 0;
  syncCourierHandheld();
  parcelObjects.forEach(parcel => { parcel.group.visible = true; });
  advanceGameTime(45);
  updateNeedsHud(true); updateJobHud(); renderWorkFinancePanel(); saveGame(false); showToast('PEKERJAAN DIMULAI · CARI 3 PAKET');
}
function collectParcel(index) {
  if (handheldState.item && handheldState.item !== 'parcel') { showToast('LETAKKAN BARANG SEBELUM MENGAMBIL PAKET'); return; }
  if (jobPhase !== 'collect' || jobCollected[index]) return;
  jobCollected[index] = true; parcelObjects[index].group.visible = false;
  inventory.parcel += 1;
  syncCourierHandheld();
  playPlayerGesture('pickup', { x: parcelObjects[index].x, y: 0, z: parcelObjects[index].z }, 'parcel', inventory.parcel);
  syncCourierHandheld();
  needs.energy = Math.max(0, needs.energy - 2);
  advanceGameTime(8);
  renderInventory(); updateNeedsHud(true);
  const count = jobCollected.filter(Boolean).length;
  showToast(`PAKET DIAMBIL · ${count}/3`);
  if (count === 3) { jobPhase = 'deliver'; showToast('SEMUA PAKET TERKUMPUL · TEMUI MIA'); }
  updateJobHud(); saveGame(false);
}
function completeCourierJob() {
  if (jobPhase !== 'deliver') return;
  if (inventory.parcel < 3) { showToast('AMBIL KEMBALI SEMUA PAKET SEBELUM PENGIRIMAN'); return; }
  const recipient = npcs.find(person => person.id === 'mia');
  const parcelCount = inventory.parcel;
  inventory.parcel = Math.max(0,inventory.parcel-3);
  syncCourierHandheld();
  if (recipient) playPlayerGesture('handoff', recipient.npc.position, 'parcel', Math.max(1, parcelCount));
  const reward = 450 + (skillProgress('delivery').level - 1) * 30;
  wallet += reward; jobsCompleted += 1; jobPhase = 'complete';
  recordTransaction('Courier delivery contract', reward);
  addSkillXp('delivery', 30);
  changeRelationship('alex', 10); changeRelationship('mia', 14);
  recordDailyTaskProgress('paidWork');
  setWallet(wallet); renderInventory(); updateJobHud(); saveGame(false); showToast(`PENGIRIMAN SELESAI · +$${reward}`);
}
const placedDecorObjects = {};
const decorCatalog = {
  plant: { name: 'Indoor Plant', description: 'Tanaman dekoratif', cost: 180, radius: 0.65 },
  floorLamp: { name: 'Floor Lamp', description: 'Lampu sudut', cost: 260, radius: 0.48 },
  bookshelf: { name: 'Bookshelf', description: 'Rak buku kayu · membaca untuk Career XP', cost: 340, radius: 0.95 },
  sideTable: { name: 'Side Table', description: 'Meja kecil serbaguna', cost: 220, radius: 0.72 },
  areaRug: { name: 'Area Rug', description: 'Karpet ruang keluarga', cost: 150, radius: 1.65 }
};
const propertyUpgradeObjects = {};
function applyPropertyUpgradeVisuals() {
  // Rebuild dynamic expansion colliders from the saved room levels on every load or purchase.
  for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].propertyExpansion) colliders.splice(i,1);
  const expansionsBuilt = propertyUpgrades.studio > 0 || propertyUpgrades.guestSuite > 0;
  if (expansionsBuilt) {
    const baseIndex = colliders.indexOf(westWallCollider);
    if (baseIndex >= 0) colliders.splice(baseIndex,1);
  } else if (!colliders.includes(westWallCollider)) {
    colliders.unshift(westWallCollider);
  }
  westWallMesh.visible = !expansionsBuilt;

  for (const object of Object.values(propertyUpgradeObjects)) {
    house.remove(object);
    object.traverse(child => {
      if (child.geometry && !sharedPrimitiveGeometrySet.has(child.geometry)) child.geometry.dispose();
      if (child.material && child.material.userData?.propertyUpgradeMaterial) child.material.dispose();
    });
  }
  for (const key of Object.keys(propertyUpgradeObjects)) delete propertyUpgradeObjects[key];
  const makeGroup = key => { const object = new THREE.Group(); house.add(object); propertyUpgradeObjects[key] = object; return object; };

  // Solar roof: four panels per renovation level.
  if (propertyUpgrades.solar > 0) {
    const g = makeGroup('solar');
    const panelMaterial = mat(0x233b4b,0.22,0.62); panelMaterial.userData.propertyUpgradeMaterial = true;
    const frameMaterial = mat(0x89999a,0.34,0.7); frameMaterial.userData.propertyUpgradeMaterial = true;
    const count = propertyUpgrades.solar * 4;
    for (let i=0;i<count;i++) {
      const x = -1.8 + (i%4)*1.85;
      const z = -7.1 + Math.floor(i/4)*2.2;
      box(g,x,9.13,z,1.55,0.075,1.78,frameMaterial,false,false);
      box(g,x,9.18,z,1.42,0.055,1.64,panelMaterial,false,false);
      box(g,x,9.213,z,0.035,0.012,1.58,frameMaterial,false,false);
    }
    for (const z of [-8.15,-5.95]) box(g,1.0,9.08,z,8.3,0.07,0.08,frameMaterial,false,false);
  }

  // Kitchen renovation: backsplash, premium cabinet faces and a layered range hood.
  if (propertyUpgrades.kitchen > 0) {
    const g = makeGroup('kitchen');
    const stone = mat(0x89958b,0.3,0.18); stone.userData.propertyUpgradeMaterial = true;
    const brass = mat(0xb89b64,0.32,0.55); brass.userData.propertyUpgradeMaterial = true;
    const cabinet = mat(0x3d514a,0.46,0.1); cabinet.userData.propertyUpgradeMaterial = true;
    box(g,-11.67,2.12,-5.2,0.08,1.45,7.35,stone,false,false);
    for (const z of [-7.6,-5.2,-2.8]) {
      box(g,-11.52,2.95,z,0.52,0.95,1.95,cabinet);
      box(g,-11.23,2.95,z,0.035,0.12,0.08,brass,false,false);
    }
    box(g,-10.25,1.43,-5.2,2.85,0.09,7.3,brass,false,false);
    if (propertyUpgrades.kitchen > 1) {
      box(g,-10.25,3.62,-6.3,2.3,0.22,1.05,brass);
      box(g,-10.25,3.28,-6.3,2.0,0.48,0.84,cabinet);
      for (const z of [-7.1,-5.5]) box(g,-9.18,3.3,z,0.035,0.28,0.035,brass,false,false);
      box(g,-11.65,3.65,-2.9,0.14,0.12,2.0,brass,false,false);
    }
  }

  // Bedroom suite: finished headboard, soft carpet, and matched bedside lighting.
  if (propertyUpgrades.bedroom > 0) {
    const g = makeGroup('bedroom');
    const headboard = mat(0x6d796d,0.66); headboard.userData.propertyUpgradeMaterial = true;
    const fabric = mat(0xc7bda9,0.88); fabric.userData.propertyUpgradeMaterial = true;
    const metal = mat(0xb89b64,0.3,0.52); metal.userData.propertyUpgradeMaterial = true;
    box(g,-5.2,6.0,-3.72,4.35,1.45,0.24,headboard);
    box(g,-5.2,4.99,-1.0,4.55,0.045,5.1,fabric,false,true);
    for (const x of [-7.8,-2.6]) {
      box(g,x,5.17,-3.3,0.92,0.08,0.92,metal);
      cylinder(g,x,5.78,-3.3,0.14,0.14,0.18,metal,10);
      const glow = createManagedPointLight(0xffd39c,0.34,4.5); glow.position.set(x,6.0,-3.3); g.add(glow);
    }
    if (propertyUpgrades.bedroom > 1) {
      for (const x of [-7.25,-3.15]) {
        box(g,x,6.9,-1.15,0.12,2.0,0.12,metal);
        box(g,x,7.88,-1.15,0.8,0.2,0.85,fabric);
      }
      box(g,-5.2,6.82,-3.55,4.6,0.12,0.14,metal,false,false);
    }
  }

  // A fully usable backyard terrace appears only once its first construction phase is purchased.
  if (propertyUpgrades.terrace > 0) {
    const g = makeGroup('terrace');
    const deck = mat(0x795a40,0.72); deck.userData.propertyUpgradeMaterial = true;
    const lightWood = mat(0xb08a61,0.58); lightWood.userData.propertyUpgradeMaterial = true;
    const dark = mat(0x46564e,0.5); dark.userData.propertyUpgradeMaterial = true;
    const fabric = mat(0xb8b9a7,0.86); fabric.userData.propertyUpgradeMaterial = true;
    box(g,-0.5,0.12,-15.0,11.2,0.22,8.0,deck);
    for (let i=0;i<8;i++) box(g,-5.6+i*1.45,0.245,-15.0,0.055,0.025,7.7,lightWood,false,false);
    for (const x of [-5.55,4.55]) for (const z of [-18.45,-11.55]) box(g,x,1.65,z,0.18,3.05,0.18,dark);
    box(g,-0.5,3.22,-15.0,10.5,0.2,7.1,lightWood);
    box(g,-0.5,0.34,-19.1,11.1,0.12,0.45,lightWood);
    // Two outdoor sofas face a low coffee table.
    for (const x of [-3.55,2.55]) {
      box(g,x,0.67,-17.3,2.5,0.65,1.0,dark);
      box(g,x,1.12,-17.72,2.5,0.85,0.22,dark);
      box(g,x,1.02,-17.28,2.25,0.16,0.82,fabric);
      for (const dx of [-0.92,0.92]) box(g,x+dx,0.31,-17.3,0.12,0.58,0.12,lightWood);
    }
    box(g,-0.5,0.56,-14.35,2.0,0.16,1.2,lightWood);
    for (const x of [-1.15,0.15]) box(g,x,0.31,-14.35,0.12,0.5,0.12,dark);
    if (propertyUpgrades.terrace > 1) {
      for (let i=0;i<11;i++) box(g,-5.4+i*0.98,3.38,-15.0,0.08,0.22,7.0,dark,false,false);
      for (const x of [-5.0,4.0]) {
        const lantern = createManagedPointLight(0xffd49b,0.48,6); lantern.position.set(x,2.8,-15.0); g.add(lantern);
        box(g,x,2.82,-15.0,0.38,0.42,0.38,brassMaterialForTerrace(),false,false);
      }
    }
  }

  // West wing construction: each room is its own persistent build, connected by a real opening.
  const studioBuilt = propertyUpgrades.studio > 0;
  const guestBuilt = propertyUpgrades.guestSuite > 0;
  if (studioBuilt || guestBuilt) {
    const g = makeGroup('expansion');
    const wallMaterial = mat(0xd5d2c6,0.84); wallMaterial.userData.propertyUpgradeMaterial = true;
    const exteriorMaterial = mat(0x69766f,0.78); exteriorMaterial.userData.propertyUpgradeMaterial = true;
    const floorMaterial = mat(0xbdb6a7,0.93); floorMaterial.userData.propertyUpgradeMaterial = true;
    const trimMaterial = mat(0x343f3b,0.42,0.22); trimMaterial.userData.propertyUpgradeMaterial = true;
    const glassMaterial = createSurfaceMaterial({color:0x8bbac0,roughness:0.17,metalness:0.12,transparent:true,opacity:0.48}); glassMaterial.userData.propertyUpgradeMaterial = true;
    const wood = mat(0x79583f,0.58); wood.userData.propertyUpgradeMaterial = true;
    const brass = mat(0xb89b64,0.34,0.55); brass.userData.propertyUpgradeMaterial = true;
    const dark = mat(0x45554f,0.52); dark.userData.propertyUpgradeMaterial = true;
    const cream = mat(0xe5dfd0,0.9); cream.userData.propertyUpgradeMaterial = true;

    const rooms = [];
    if (studioBuilt) rooms.push({key:'studio',z0:-10,z1:-1.1,level:propertyUpgrades.studio});
    if (guestBuilt) rooms.push({key:'guestSuite',z0:-0.9,z1:8.0,level:propertyUpgrades.guestSuite});

    for (const room of rooms) {
      const depth=room.z1-room.z0, centerZ=(room.z0+room.z1)/2;
      // Finished floor, roof cap, and the outer western wall.
      box(g,-20,0.12,centerZ,15.8,0.18,depth-0.12,floorMaterial,false,true);
      box(g,-20,4.72,centerZ,16.3,0.24,depth+0.22,trimMaterial);
      box(g,-28.0,2.35,centerZ,0.42,4.5,depth+0.1,exteriorMaterial);
      // Long horizontal window with dark mullions.
      box(g,-28.235,2.55,centerZ,0.07,1.85,Math.min(5.0,depth*0.58),glassMaterial,false,false);
      for (const z of [centerZ-2.55,centerZ+2.55]) {
        if (Math.abs(z-centerZ) < depth/2-0.4) box(g,-28.29,2.55,z,0.12,2.0,0.12,trimMaterial,false,false);
      }
      box(g,-28.29,1.58,centerZ,0.12,0.1,Math.min(5.2,depth*0.62),brass,false,false);
      // A small warm ceiling fixture makes the new rooms feel occupied.
      const ceilingLight=createManagedPointLight(0xffd7a7,0.8,11);ceilingLight.position.set(-20,3.75,centerZ);g.add(ceilingLight);
      // Outer short wall at the far end of each purchased room.
      const outerZ=room.key==='studio'?-10:8.0;
      box(g,-20,2.35,outerZ,16.0,4.5,0.42,wallMaterial);
      // The partition between two built rooms is shared, not double-rendered.
      const dividerZ=-1.0;
      if (room.key==='studio' && !guestBuilt) box(g,-20,2.35,dividerZ,16.0,4.5,0.42,wallMaterial);
      if (room.key==='guestSuite' && !studioBuilt) box(g,-20,2.35,dividerZ,16.0,4.5,0.42,wallMaterial);
      if (studioBuilt && guestBuilt && room.key==='studio') {
        box(g,-25.9,2.35,dividerZ,4.2,4.5,0.42,wallMaterial);
        box(g,-14.1,2.35,dividerZ,4.2,4.5,0.42,wallMaterial);
        // Connecting arch between the two rooms.
        box(g,-20,4.48,dividerZ,3.8,0.22,0.42,trimMaterial);
        for (const x of [-22.0,-18.0]) box(g,x,2.25,dividerZ,0.16,4.35,0.46,trimMaterial);
      }

      if (room.key==='studio') {
        // Main creative workstation and a separate hands-on workbench.
        box(g,-25.2,0.86,-5.55,2.9,0.16,2.1,wood);
        for (const x of [-26.25,-24.15]) for (const z of [-6.25,-4.85]) box(g,x,0.43,z,0.12,0.78,0.12,trimMaterial);
        box(g,-25.75,1.55,-5.15,0.16,1.22,1.12,dark);
        box(g,-25.65,1.58,-5.15,0.08,0.94,0.82,glassMaterial,false,false);
        box(g,-23.3,0.63,-5.3,0.92,0.16,0.92,dark);
        box(g,-23.3,1.08,-5.65,0.92,0.82,0.16,dark);
        box(g,-18.15,0.78,-7.5,3.4,0.16,1.45,wood);
        for (const x of [-19.45,-16.85]) for (const z of [-8.0,-7.0]) box(g,x,0.39,z,0.12,0.72,0.12,trimMaterial);
        box(g,-18.15,1.05,-8.3,3.4,0.55,0.18,exteriorMaterial);
        for (let i=0;i<4;i++) box(g,-19.35+i*0.8,1.34,-8.18,0.52,0.06,0.1,brass,false,false);
        // Studio premium tier: secondary screen, filing shelf and extra task light.
        if (room.level>1) {
          box(g,-25.0,1.58,-6.1,0.95,0.78,0.08,dark);
          box(g,-24.96,1.6,-6.045,0.82,0.6,0.025,glassMaterial,false,false);
          box(g,-15.1,1.4,-4.4,0.34,2.5,3.0,wood);
          for (let y of [0.7,1.3,1.9,2.5]) box(g,-15.0,y,-4.4,0.45,0.055,2.8,brass,false,false);
          const taskLight=createManagedPointLight(0xb8d7e2,0.48,6);taskLight.position.set(-25,2.7,-5.3);g.add(taskLight);
        }
      } else {
        // Guest suite: full bed, upholstered headboard, side tables and wardrobe.
        box(g,-21.1,0.54,3.35,4.7,0.48,3.15,wood);
        box(g,-21.1,0.84,3.35,4.5,0.2,2.95,cream);
        box(g,-21.1,1.0,3.55,4.2,0.15,2.45,cream);
        box(g,-21.1,1.52,1.82,4.95,2.25,0.24,dark);
        box(g,-21.1,1.52,1.66,4.55,1.92,0.08,wood,false,false);
        for (const x of [-23.7,-18.5]) {
          box(g,x,0.62,1.65,0.88,0.82,0.88,wood);
          box(g,x,1.08,1.65,0.94,0.09,0.94,brass,false,false);
          const lamp=createManagedPointLight(0xffd19b,0.35,4.3);lamp.position.set(x,1.7,1.65);g.add(lamp);
          cylinder(g,x,1.42,1.65,0.13,0.16,0.2,brass,10);
        }
        box(g,-14.6,1.3,3.2,1.55,2.4,4.8,exteriorMaterial);
        for (const z of [1.6,3.2,4.8]) box(g,-13.79,1.3,z,0.045,1.95,0.045,brass,false,false);
        if (room.level>1) {
          box(g,-25.0,0.16,3.45,4.8,0.045,4.0,cream,false,true);
          box(g,-16.0,1.15,6.3,2.5,1.95,0.72,wood);
          box(g,-15.58,1.18,5.91,0.08,1.45,0.035,brass,false,false);
          box(g,-20.0,2.7,7.73,3.2,1.35,0.07,brass,false,false);
          box(g,-20.0,2.7,7.68,2.9,1.05,0.05,cream,false,false);
        }
      }
      // Every built room has its own outer-wall and end-wall collision boundaries.
      colliders.push({minX:-28.32,maxX:-27.68,minZ:room.z0-0.25,maxZ:room.z1+0.25,propertyExpansion:true});
      colliders.push({minX:-28.25,maxX:-11.75,minZ:outerZ-0.32,maxZ:outerZ+0.32,propertyExpansion:true});
    }

    // Restore the west wall with an opening only where a purchased room joins it.
    const doorGaps=[];
    if(studioBuilt)doorGaps.push({start:-7.35,end:-3.15});
    if(guestBuilt)doorGaps.push({start:2.85,end:7.05});
    let cursor=-10;
    const addMainWallSegment=(start,end)=>{
      if(end-start<0.25)return;
      const length=end-start,center=(start+end)/2;
      box(g,-12,2.35,center,0.42,4.5,length,wallMaterial);
      colliders.push({minX:-12.32,maxX:-11.68,minZ:start,maxZ:end,propertyExpansion:true});
    };
    for(const gap of doorGaps){
      addMainWallSegment(cursor,gap.start);cursor=gap.end;
      // Clear architectural door frame: the doorway remains physically open.
      for(const z of [gap.start,gap.end])box(g,-12,2.22,z,0.18,4.28,0.16,trimMaterial);
      box(g,-12,4.42,(gap.start+gap.end)/2,0.18,0.2,gap.end-gap.start,brass,false,false);
    }
    addMainWallSegment(cursor,8.4);

    // The two rooms share a wall with a central connecting opening when both are built.
    if(studioBuilt && guestBuilt){
      colliders.push({minX:-28.3,maxX:-23.0,minZ:-1.28,maxZ:-0.72,propertyExpansion:true});
      colliders.push({minX:-19.0,maxX:-11.7,minZ:-1.28,maxZ:-0.72,propertyExpansion:true});
    } else {
      colliders.push({minX:-28.3,maxX:-11.7,minZ:-1.28,maxZ:-0.72,propertyExpansion:true});
    }
  }
}
function brassMaterialForTerrace() { const material = mat(0xb89b64,0.34,0.55); material.userData.propertyUpgradeMaterial = true; return material; }
function createDecorModel(item) {
  const decor = new THREE.Group();
  if (item === 'plant') {
    cylinder(decor,0,0.35,0,0.34,0.25,0.7,mat(0x9c785a),10);
    cylinder(decor,0,0.72,0,0.31,0.31,0.08,mat(0x4c3829),10);
    for (const [x,y,z,r] of [[0,1.25,0,0.48],[-0.28,1.08,0.07,0.35],[0.28,1.12,-0.06,0.37],[0.04,1.48,-0.05,0.33]]) sphere(decor,x,y,z,r,leafLightMat,10,8);
  } else if (item === 'floorLamp') {
    cylinder(decor,0,0.12,0,0.34,0.34,0.16,goldMat,12);
    cylinder(decor,0,1.05,0,0.055,0.055,1.75,trimMat,8);
    cylinder(decor,0,2.05,0,0.42,0.24,0.48,whiteMat,12);
    const glow = createManagedPointLight(0xffd5a0,0.72,7); glow.position.set(0,1.95,0); decor.add(glow);
  } else if (item === 'bookshelf') {
    box(decor,0,1.05,0,1.75,2.1,0.42,woodMat);
    box(decor,0,1.05,0.23,1.52,1.88,0.035,mat(0x302d29),false,false);
    for (const y of [0.38,0.92,1.46,2.0]) box(decor,0,y,0.02,1.55,0.075,0.44,woodMat);
    const colors=[0x9f5f4e,0x6b8267,0xb9a16f,0x627a91,0x9b806d,0x77735d];
    for(let shelf=0;shelf<3;shelf++){let x=-0.62;for(let i=0;i<5;i++){const w=0.15+(i%2)*0.035;box(decor,x+w/2,0.66+shelf*0.54,0,w,0.39+(i%3)*0.045,0.29,mat(colors[(i+shelf)%colors.length]));x+=w+0.08;}}
  } else if (item === 'sideTable') {
    box(decor,0,0.68,0,1.15,0.13,0.9,woodMat);
    for(const x of [-0.48,0.48])for(const z of [-0.35,0.35])box(decor,x,0.34,z,0.085,0.66,0.085,trimMat);
    box(decor,0,0.25,0,0.96,0.08,0.72,woodMat);
  } else if (item === 'areaRug') {
    const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.25,2.35),mat(0x7c7669,0.98));rug.rotation.x=-Math.PI/2;rug.position.y=0.035;rug.receiveShadow=true;decor.add(rug);
    const border=new THREE.Mesh(new THREE.PlaneGeometry(3.05,2.15),mat(0xb9a782,0.98));border.rotation.x=-Math.PI/2;border.position.y=0.039;decor.add(border);
    const inset=new THREE.Mesh(new THREE.PlaneGeometry(2.88,1.98),mat(0x777f70,0.98));inset.rotation.x=-Math.PI/2;inset.position.y=0.043;decor.add(inset);
  }
  decor.userData.decorType=item;return decor;
}
function setDecorGhost(decor,enabled){decor.traverse(child=>{if(!child.isMesh)return;if(enabled){if(!child.userData.ghostMaterial){child.userData.originalMaterial=child.material;const clone=child.material.clone();clone.transparent=true;clone.opacity=0.55;clone.depthWrite=false;child.userData.ghostMaterial=clone;}child.material=child.userData.ghostMaterial;}else if(child.userData.originalMaterial)child.material=child.userData.originalMaterial;});}
function decorFloorForPlayer(){return player.position.y>4.25?4.86:0.22;}
function canPlaceDecor(item,x,z,floorY){
  const radius=decorCatalog[item]?.radius??0.6,upstairs=floorY>3;
  const minX=-11.25+radius*0.25,maxX=upstairs?6.15-radius*0.25:6.25-radius*0.25;
  if(x<minX||x>maxX||z<-9.1+radius*0.25||z>7.05-radius*0.25)return false;
  if(!upstairs&&x>6.35&&z>-7.2&&z<3.7)return false;
  if(!upstairs&&x>7.05&&z<-4.25)return false;
  if(!upstairs&&x<-8.45&&z<-0.7)return false;
  // Avoid clipping into fixed furniture that forms the room's main circulation paths.
  if(!upstairs&&x>3.15&&x<7.9&&z>-4.25&&z<-1.45)return false; // dining table
  if(!upstairs&&x>-3.4&&x<1.5&&z>-4.25&&z<-2.55)return false; // living sofa
  if(!upstairs&&x<-5.0&&x>-7.4&&z>-3.2&&z<-1.1)return false; // lounge seat
  if(!upstairs&&x>1.0&&x<3.5&&z>-3.0&&z<-1.1)return false; // lounge seat
  if(upstairs&&x>-7.8&&x<-2.9&&z>-3.8&&z<1.5)return false; // bedroom bed
  if(upstairs&&x>0.45&&x<4.9&&z>-5.3&&z<-3.0)return false; // study desk
  if(decorPositions.some(entry=>Math.abs(entry.y-floorY)<0.35&&Math.hypot(entry.x-x,entry.z-z)<radius+(decorCatalog[entry.item]?.radius??0.6)))return false;
  return true;
}
const placementRaycaster=new THREE.Raycaster(),placementPointer=new THREE.Vector2(),placementPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),placementHit=new THREE.Vector3();
function updatePlacementTarget(clientX,clientY){
  if(!placementMode)return;const rect=renderer.domElement.getBoundingClientRect();
  placementPointer.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
  placementRaycaster.setFromCamera(placementPointer,camera);placementPlane.constant=-placementMode.floorY;
  if(!placementRaycaster.ray.intersectPlane(placementPlane,placementHit))return;
  const x=clamp(placementHit.x,-12,7),z=clamp(placementHit.z,-10,8);
  placementMode.x=x;placementMode.z=z;placementMode.valid=canPlaceDecor(placementMode.item,x,z,placementMode.floorY);
  placementMode.object.position.set(x,placementMode.floorY,z);placementMode.object.rotation.y=placementMode.yaw;
  placementMode.object.traverse(child=>{if(child.isMesh&&child.userData.ghostMaterial)child.userData.ghostMaterial.color.setHex(placementMode.valid?0xb8e8c5:0xf0a39a);});
  document.querySelector('#placement-confirm-btn').disabled=!placementMode.valid;
}
function startDecorPlacement(item){
  if(!decorCatalog[item]||(inventory[item]||0)<1||placementMode||inVehicle)return;
  const insideGround=Math.abs(player.position.x)<11.2&&player.position.z>-9.2&&player.position.z<7.2;
  const upstairs=player.position.y>4.25&&Math.abs(player.position.x)<6.2&&player.position.z>-9.2&&player.position.z<7.0;
  if(!insideGround&&!upstairs){showToast('MASUK KE DALAM RUMAH UNTUK MENATA FURNITURE');return;}
  closePanels();
  const floorY=decorFloorForPlayer(),object=createDecorModel(item);setDecorGhost(object,true);house.add(object);
  const fx=Math.sin(avatar.rotation.y),fz=-Math.cos(avatar.rotation.y);
  placementMode={item,object,floorY,x:player.position.x+fx*2.2,z:player.position.z+fz*2.2,yaw:0,valid:false};
  object.position.set(placementMode.x,floorY,placementMode.z);placementMode.valid=canPlaceDecor(item,placementMode.x,placementMode.z,floorY);
  document.querySelector('#placement-controls').classList.remove('hidden');document.querySelector('#placement-item-name').textContent=decorCatalog[item].name.toUpperCase();
  document.querySelector('#placement-confirm-btn').disabled=!placementMode.valid;showToast('ATUR POSISI DEKORASI · PUTAR LALU TEKAN PLACE');
  updatePlacementTarget(innerWidth/2,innerHeight/2);
}
function rotateDecorPlacement(){if(!placementMode)return;placementMode.yaw=(placementMode.yaw+Math.PI/4)%(Math.PI*2);placementMode.object.rotation.y=placementMode.yaw;}
function disposeDecorPreview(object){object.traverse(child=>{if(child.userData.ghostMaterial)child.userData.ghostMaterial.dispose();if(child.geometry&&!sharedPrimitiveGeometrySet.has(child.geometry))child.geometry.dispose();});}
function cancelDecorPlacement(notify=true){if(!placementMode)return;house.remove(placementMode.object);disposeDecorPreview(placementMode.object);placementMode=null;document.querySelector('#placement-controls').classList.add('hidden');if(notify)showToast('PENEMPATAN DIBATALKAN · ITEM TETAP DI INVENTORY');}
function confirmDecorPlacement(){
  if(!placementMode)return;if(!placementMode.valid){showToast('POSISI TIDAK VALID · PILIH AREA LANTAI YANG KOSONG');return;}
  const {item,object,x,z,floorY,yaw}=placementMode;setDecorGhost(object,false);
  object.traverse(child=>{if(child.userData.ghostMaterial){child.userData.ghostMaterial.dispose();delete child.userData.ghostMaterial;delete child.userData.originalMaterial;}});
  decorInstanceId++;
  const record={id:decorInstanceId,item,x,y:floorY,z,yaw};decorPositions.push(record);placedDecorObjects[record.id]=object;
  inventory[item]=Math.max(0,(inventory[item]||0)-1);decorPlaced[item]=true;placementMode=null;
  recordDailyTaskProgress('decorate');
  document.querySelector('#placement-controls').classList.add('hidden');renderInventory();renderShop();saveGame(false);
  showToast(`${decorCatalog[item].name.toUpperCase()} BERHASIL DITEMPATKAN`);
}
function syncPlacedDecor(){
  for(const object of Object.values(placedDecorObjects))house.remove(object);for(const key of Object.keys(placedDecorObjects))delete placedDecorObjects[key];
  for(const record of decorPositions){if(!decorCatalog[record.item])continue;const object=createDecorModel(record.item);object.position.set(record.x,record.y,record.z);object.rotation.y=record.yaw||0;house.add(object);placedDecorObjects[record.id]=object;decorPlaced[record.item]=true;decorInstanceId=Math.max(decorInstanceId,Number(record.id)||0);}
}
function renderShop(){document.querySelectorAll('[data-buy]').forEach(button=>{const item=button.dataset.buy;button.textContent=(inventory[item]||0)>0?'BUY MORE':'BUY';button.disabled=!decorCatalog[item]&&!['bouquet','coffee'].includes(item);});}
function buyDecor(item){const product=decorCatalog[item]||({bouquet:{name:'Flower Bouquet',cost:120},coffee:{name:'Coffee',cost:35}}[item]);if(!product)return;if(wallet<product.cost){showToast('UANG KAMU BELUM CUKUP');return;}wallet-=product.cost;recordTransaction(`Purchase: ${product.name}`, -product.cost);inventory[item]=(inventory[item]||0)+1;setWallet(wallet);renderInventory();renderShop();saveGame(false);showToast(`${product.name.toUpperCase()} DITAMBAHKAN KE INVENTORY`);}
function placeDecor(item){if(!decorCatalog[item]||!inventory[item])return;startDecorPlacement(item);}

const neighborhoodProducts = {
  cafe: [
    { id:'coffee', name:'House Coffee', category:'FRESH BREW', cost:35, description:'+22 Energy · Can be shared as a gift', icon:'☕' },
    { id:'pastry', name:'Butter Pastry', category:'BAKERY', cost:18, description:'+17 Hunger · +5 Energy', icon:'🥐' }
  ],
  market: [
    { id:'sandwich', name:'Fresh Sandwich', category:'READY MEAL', cost:24, description:'+34 Hunger · +5 Energy', icon:'🥪' },
    { id:'apple', name:'Fresh Apple', category:'FRUIT', cost:12, description:'+18 Hunger · +8 Energy', icon:'🍎' },
    { id:'water', name:'Bottled Water', category:'DRINKS', cost:8, description:'+9 Hygiene · +3 Energy', icon:'▤' },
    { id:'seedTomato', name:'Tomato Seed Pack', category:'GARDEN SEEDS · ×3', cost:30, quantity:3, description:'Grow juicy tomatoes · 4 game hours to mature', icon:'🍅' },
    { id:'seedCarrot', name:'Carrot Seed Pack', category:'GARDEN SEEDS · ×3', cost:24, quantity:3, description:'Grow fresh carrots · 3 game hours to mature', icon:'🥕' },
    { id:'seedStrawberry', name:'Strawberry Seed Pack', category:'GARDEN SEEDS · ×3', cost:42, quantity:3, description:'Grow sweet strawberries · 5 game hours to mature', icon:'🍓' }
  ]
};
const provisionEffects = {
  sandwich: { hunger:34, energy:5, message:'SANDWICH DINIKMATI' },
  apple: { hunger:18, energy:8, message:'APEL SEGAR DIMAKAN' },
  water: { hygiene:9, energy:3, message:'AIR MINERAL DIMINUM' },
  pastry: { hunger:17, energy:5, message:'PASTRY DINIKMATI' }
};
function renderDistrictStore() {
  const cafe = districtStoreType === 'cafe';
  districtStoreTitle.textContent = cafe ? 'Corner Cafe' : 'Town Market';
  districtStoreCopy.textContent = cafe
    ? 'Tempat rehat kecil di lingkungan baru. Beli kopi hangat atau pastry untuk mengisi tenaga dan rasa lapar.'
    : 'Persediaan harian untuk perjalananmu. Bekali inventory dengan makanan dan minuman sebelum beraktivitas.';
  districtProductList.replaceChildren();
  for (const product of neighborhoodProducts[districtStoreType]) {
    const card=document.createElement('article');card.className='district-product-card';
    const icon=document.createElement('div');icon.className='district-product-icon';icon.textContent=product.icon;
    const info=document.createElement('div');info.className='district-product-info';
    const category=document.createElement('small');category.textContent=product.category;
    const name=document.createElement('b');name.textContent=product.name;
    const description=document.createElement('p');description.textContent=product.description;
    info.append(category,name,description);
    const action=document.createElement('button');action.type='button';action.className='district-buy-btn';action.textContent=`BUY · $${product.cost}`;
    action.disabled=wallet<product.cost;action.addEventListener('click',()=>buyNeighborhoodProduct(product.id));
    const count=document.createElement('small');count.className='district-stock';count.textContent=`OWNED ×${inventory[product.id]||0}`;
    const side=document.createElement('div');side.className='district-product-side';side.append(action,count);
    card.append(icon,info,side);districtProductList.append(card);
  }
  if(!cafe){
    const title=document.createElement('div');title.className='farm-market-section';title.textContent='SELL YOUR HARVEST';districtProductList.append(title);
    for(const crop of Object.values(farmCropDefinitions)){
      const count=inventory[crop.harvestItem]||0;if(!count)continue;
      const card=document.createElement('article');card.className='district-product-card farm-sale-card';
      const icon=document.createElement('div');icon.className='district-product-icon';icon.textContent=crop.icon;
      const info=document.createElement('div');info.className='district-product-info';
      const category=document.createElement('small');category.textContent='FRESH ESTATE PRODUCE';
      const name=document.createElement('b');name.textContent=crop.harvestName;
      const price=Math.round(crop.salePrice*(1+(skillProgress('gardening').level-1)*0.03));
      const desc=document.createElement('p');desc.textContent=`${count} in bag · $${price} each · ${skillProgress('gardening').level>1?'Gardening skill bonus active':''}`;
      info.append(category,name,desc);const side=document.createElement('div');side.className='district-product-side';
      const sell=document.createElement('button');sell.type='button';sell.className='district-buy-btn';sell.textContent=`SELL · $${(count*price).toLocaleString('en-US')}`;sell.addEventListener('click',()=>sellFarmProduce(crop.harvestItem));side.append(sell);
      card.append(icon,info,side);districtProductList.append(card);
    }
    const crafted=Object.values(farmRecipeDefinitions).filter(recipe=>(inventory[recipe.outputItem]||0)>0);
    if(crafted.length){const title=document.createElement('div');title.className='farm-market-section';title.textContent='SELL ARTISAN GOODS';districtProductList.append(title);}
    for(const recipe of crafted){
      const count=inventory[recipe.outputItem],price=Math.round(recipe.salePrice*(1+(skillProgress('cooking').level-1)*0.02));
      const card=document.createElement('article');card.className='district-product-card farm-sale-card artisan-sale-card';
      const icon=document.createElement('div');icon.className='district-product-icon';icon.textContent=recipe.icon;
      const info=document.createElement('div');info.className='district-product-info';
      const category=document.createElement('small');category.textContent='ESTATE ARTISAN · COOKING BONUS';
      const name=document.createElement('b');name.textContent=recipe.outputName;
      const desc=document.createElement('p');desc.textContent=`${count} in bag · $${price} each · Cooking level ${skillProgress('cooking').level}`;
      info.append(category,name,desc);const side=document.createElement('div');side.className='district-product-side';
      const sell=document.createElement('button');sell.type='button';sell.className='district-buy-btn';sell.textContent=`SELL · $${(count*price).toLocaleString('en-US')}`;sell.addEventListener('click',()=>sellFarmProcessedGoods(recipe.outputItem));side.append(sell);
      card.append(icon,info,side);districtProductList.append(card);
    }
  }
  if(cafe){
    const card=document.createElement('article');card.className='cafe-store-business-card';
    const info=document.createElement('div');const title=document.createElement('b');title.textContent=cafeBusinessState.owned?'YOUR CORNER CAFE':'OWN THIS BUSINESS';
    const desc=document.createElement('p');desc.textContent=cafeBusinessState.owned?`Your cafe is ${cafeBusinessState.open?'open':'closed'} · ${cafeBusinessState.stock+cafeBusinessState.localStock} servings ready (${cafeBusinessState.localStock} locally sourced) · ${cafeBusinessState.operatingDays} operating days.`:'Buy the storefront and manage daily sales, supplies, reputation and equipment.';info.append(title,desc);
    const manage=document.createElement('button');manage.type='button';manage.className='district-buy-btn';manage.textContent='OPEN BUSINESS BOARD';manage.addEventListener('click',openWorkFinancePanel);card.append(info,manage);districtProductList.append(card);
  }
  document.querySelector('#district-wallet').textContent='$'+wallet.toLocaleString('en-US');
}
function openDistrictStore(type) {
  if (!['cafe','market'].includes(type)) return;
  if (handheldState.item) { showToast('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM BERBELANJA'); return; }
  districtStoreType=type;townVisited[type]=true;recordDailyTaskProgress('destination');closePanels();renderDistrictStore();districtPanel.classList.remove('hidden');saveGame(false);
}
function buyNeighborhoodProduct(item) {
  const product=Object.values(neighborhoodProducts).flat().find(entry=>entry.id===item);
  if (!product || !neighborhoodProducts[districtStoreType].some(entry=>entry.id===item)) return;
  if (wallet<product.cost) { showToast('UANG KAMU BELUM CUKUP');return; }
  wallet-=product.cost;inventory[item]=(inventory[item]||0)+(product.quantity||1);
  recordTransaction(`Neighborhood: ${product.name}`,-product.cost);
  setWallet(wallet);renderDistrictStore();renderInventory();saveGame(false);
  showToast(`${product.name.toUpperCase()} DITAMBAHKAN · INVENTORY ×${inventory[item]}`);
}
function consumeProvision(item) {
  const effect=provisionEffects[item];
  if (!effect || (inventory[item]||0)<1) { showToast('ITEM TIDAK ADA DI INVENTORY');return; }
  if (handheldState.item) { showToast('LETAKKAN BARANG YANG SEDANG DIBAWA');return; }
  inventory[item]--;
  for (const [need,amount] of Object.entries(effect)) if (need!=='message') needs[need]=clamp(needs[need]+amount,0,100);
  advanceGameTime(item==='sandwich'?8:4);
  updateNeedsHud(true);renderInventory();saveGame(false);
  showToast(`${effect.message} · ${Object.entries(effect).filter(([key])=>key!=='message').map(([key,value])=>`${key.toUpperCase()} +${value}`).join(' · ')}`);
}
function visitTownPark() {
  if (needs.energy<5) { showToast('ENERGY TERLALU RENDAH UNTUK JALAN SANTAI');return; }
  townVisited.park=true;
  needs.energy=Math.max(0,needs.energy-5);needs.social=clamp(needs.social+9,0,100);
  advanceGameTime(20);recordDailyTaskProgress('destination');updateNeedsHud(true);saveGame(false);
  showToast('TOWN PARK STROLL · SOCIAL +9 · ENERGY -5');
}

function renderInventory() {
  const list = document.querySelector('#inventory-list'); list.replaceChildren();
  const entries = [
    ['houseKey','Kunci rumah','Akses properti'],['phone','Smartphone','Perangkat pribadi'],['parcel','Paket kurir','Barang pekerjaan'],
    ...Object.entries(decorCatalog).map(([key,item]) => [key,item.name,item.description]),
    ['bouquet','Flower Bouquet','Hadiah untuk Alex atau Mia'],['coffee','Coffee','Minuman energi · +22 Energy'],
    ['sandwich','Fresh Sandwich','Makanan siap saji · +34 Hunger'],['apple','Fresh Apple','Buah segar · +18 Hunger · +8 Energy'],
    ['water','Bottled Water','Minuman · +9 Hygiene'],['pastry','Butter Pastry','Roti · +17 Hunger · +5 Energy'],
    ...Object.entries(fishCatalog).map(([key,fish])=>[key,fish.name,fish.description]),
    ...Object.values(farmCropDefinitions).map(crop=>[crop.seedItem,crop.seedName,'Seed packet · ready to plant']),
    ...Object.values(farmCropDefinitions).map(crop=>[crop.harvestItem,crop.harvestName,`Fresh produce · sale price $${crop.salePrice} each`]),
    ...Object.values(farmRecipeDefinitions).map(recipe=>[recipe.outputItem,recipe.outputName,`Artisan product · sale price $${recipe.salePrice} each`])
  ];
  for (const [key,label,description] of entries) {
    const row = document.createElement('div'); row.className = 'inventory-row';
    const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = label;
    const note = document.createElement('small'); note.textContent = description; info.append(name,note); row.appendChild(info);
    if (decorCatalog[key] && inventory[key] > 0) {
      const btn = document.createElement('button'); btn.textContent = 'PASANG'; btn.addEventListener('click', () => placeDecor(key)); row.appendChild(btn);
      const count = document.createElement('small'); count.textContent = 'x' + inventory[key]; row.appendChild(count);
    } else if (key === 'coffee' && (inventory[key] > 0 || (handheldState.item === 'coffee' && handheldState.persistent))) {
      const btn = document.createElement('button'); btn.textContent = 'MINUM'; btn.addEventListener('click', drinkCoffee); row.appendChild(btn);
      const count = document.createElement('small'); count.textContent = inventory[key] > 0 ? 'x' + inventory[key] : 'DIPEGANG'; row.appendChild(count);
    } else if (provisionEffects[key] && inventory[key] > 0) {
      const btn=document.createElement('button');btn.textContent=key==='water'?'MINUM':'MAKAN';btn.addEventListener('click',()=>consumeProvision(key));row.appendChild(btn);
      const count=document.createElement('small');count.textContent='x'+inventory[key];row.appendChild(count);
    } else {
      const count = document.createElement('small'); count.textContent = 'x' + inventory[key]; row.appendChild(count);
    }
    list.appendChild(row);
  }
}
function openShop() { closePanels(); renderInventory(); renderShop(); document.querySelector('#shop-panel').classList.remove('hidden'); }
function openInventory() { closePanels(); renderInventory(); document.querySelector('#inventory-panel').classList.remove('hidden'); }
function openStyle() { closePanels(); document.querySelector('#style-panel').classList.remove('hidden'); }
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { if(button.dataset.close==='fishing-panel')cancelFishingSession();document.getElementById(button.dataset.close).classList.add('hidden'); }));
document.querySelector('#fishing-action-btn').addEventListener('click',()=>fishingState.phase==='bite'?reelFishingLine():startFishingCast());
document.querySelector('#fishing-sell-btn').addEventListener('click',sellFishingCatch);
document.querySelector('#pay-bills-btn').addEventListener('click', payHouseholdBills);
document.querySelector('#property-manage-btn').addEventListener('click', openPropertyPanel);
document.querySelector('#guest-rental-primary').addEventListener('click',handleGuestSuiteRentalPrimary);
document.querySelector('#guest-rental-secondary').addEventListener('click',endGuestSuiteTenancy);
document.querySelectorAll('[data-farm-seed]').forEach(button=>button.addEventListener('click',()=>selectFarmSeed(button.dataset.farmSeed)));
document.querySelector('#farm-workshop-build').addEventListener('click',buildFarmWorkshop);
document.querySelector('#cafe-business-license').addEventListener('click',buyCafeBusiness);
document.querySelector('#cafe-business-restock').addEventListener('click',restockCafeBusiness);
document.querySelector('#cafe-business-toggle').addEventListener('click',toggleCafeBusiness);
document.querySelector('#cafe-business-upgrades').addEventListener('click',event=>{const button=event.target.closest('[data-cafe-upgrade]');if(button)upgradeCafeBusiness(button.dataset.cafeUpgrade);});
document.querySelector('#cafe-local-supply-list').addEventListener('click',event=>{const button=event.target.closest('[data-cafe-supply]');if(button)deliverCafeLocalSupply(button.dataset.cafeSupply);});
document.querySelector('#garage-build').addEventListener('click',buildVehicleGarage);
document.querySelector('#dealer-buy-bike').addEventListener('click',purchaseMotorcycle);
document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => buyDecor(button.dataset.buy)));
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => {
  outfitKey = button.dataset.style; shirtMat.color.setHex(outfitColors[outfitKey]); showToast('OUTFIT BERHASIL DIGANTI');
}));
document.querySelector('#inventory-btn').addEventListener('click', openInventory);
document.querySelector('#placement-rotate-btn').addEventListener('click', rotateDecorPlacement);
document.querySelector('#placement-confirm-btn').addEventListener('click', confirmDecorPlacement);
document.querySelector('#placement-cancel-btn').addEventListener('click', () => cancelDecorPlacement());
document.querySelector('#style-btn').addEventListener('click', openStyle);
document.querySelector('#skills-btn').addEventListener('click', openSkills);
document.querySelector('#tasks-btn').addEventListener('click', openDailyTasks);
document.querySelector('#work-btn').addEventListener('click', openWorkFinancePanel);
document.querySelector('#career-study-btn').addEventListener('click', studyCareerSkill);
document.querySelector('#career-work-btn').addEventListener('click', workFreelanceProject);
document.querySelector('#settings-btn').addEventListener('click', openSettings);
document.querySelector('#settings-fullscreen-btn').addEventListener('click', toggleFullscreen);
document.querySelector('#camera-invert-toggle').addEventListener('click', () => { invertCameraY = !invertCameraY; saveCameraPreferences(); showToast('INVERT CAMERA Y ' + (invertCameraY ? 'ON' : 'OFF')); });
document.querySelectorAll('[data-camera-sensitivity]').forEach(button => button.addEventListener('click', () => { cameraSensitivity = button.dataset.cameraSensitivity; saveCameraPreferences(); showToast('CAMERA SENSITIVITY · ' + cameraSensitivity.toUpperCase()); }));
document.querySelector('#camera-reset-btn').addEventListener('pointerdown', e => { e.preventDefault(); resetCameraView(); });
document.querySelector('#export-save-btn').addEventListener('click', exportSaveBackup);
document.querySelector('#import-save-file').addEventListener('change', event => importSaveBackup(event.target.files?.[0]));
document.querySelector('#autosave-toggle').addEventListener('click', toggleAutoSave);
document.querySelectorAll('[data-quality]').forEach(button => button.addEventListener('click', () => applyGraphicsQuality(button.dataset.quality, true)));

setWallet(wallet); renderInventory(); renderShop(); updateJobHud(); updateNeedsHud(true); renderWorkFinancePanel(); applyPropertyUpgradeVisuals();

function updateObjectives(id) {
  if (objectiveState[id]) return;
  objectiveState[id] = true;
  const completed = Object.values(objectiveState).filter(Boolean).length;
  document.querySelector('#tour-count').textContent = String(completed).padStart(2, '0') + ' / 04';
  document.querySelector('#tour-progress').style.width = (completed / 4 * 100) + '%';
  const next = objectiveLabels.find(([key]) => !objectiveState[key]);
  document.querySelector('#tour-objective').textContent = next ? next[1] : 'Tour selesai — properti berhasil dijelajahi!';
  showToast(completed === 4 ? 'PROPERTY TOUR COMPLETE ✓' : 'OBJECTIVE COMPLETE · ' + completed + '/4');
}
function nearestPlacedBookshelf(maxDistance = Infinity) {
  let nearest = null;
  let nearestDistance = maxDistance;
  for (const shelf of decorPositions) {
    if (shelf.item !== 'bookshelf') continue;
    const dx = player.position.x - shelf.x;
    const dy = (player.position.y - shelf.y) * 1.25;
    const dz = player.position.z - shelf.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < nearestDistance) { nearest = shelf; nearestDistance = distance; }
  }
  return nearest;
}
function readAtBookshelf() {
  if (handheldState.item && handheldState.item !== 'book') { showToast('LETAKKAN BARANG YANG SEDANG DIBAWA'); return; }
  const shelf = nearestPlacedBookshelf(2.7);
  if (!shelf) { showToast('DEKATI BOOKSHELF UNTUK MEMBACA'); return; }
  if (needs.energy < 6) { showToast('ENERGY TERLALU RENDAH · BUTUH 6 ENERGY'); return; }
  const careerLevel = skillProgress('career').level;
  const xp = 22 + (careerLevel - 1) * 2;
  const carriedBook = handheldState.item === 'book' && handheldState.persistent;
  playPlayerGesture('read', { x: shelf.x, y: shelf.y, z: shelf.z }, 'book');
  if (carriedBook) handheldState.persistent = true;
  needs.energy = Math.max(0, needs.energy - 6);
  needs.social = clamp(needs.social + 2, 0, 100);
  advanceGameTime(30);
  addSkillXp('career', xp);
  updateNeedsHud(true);
  renderCareerPanel();
  saveGame(false);
  showToast(`READING SESSION COMPLETE · CAREER +${xp} XP · ENERGY -6`);
}

const seatingSpots = [
  { id: 'living-sofa', name: 'sofa ruang keluarga', x: -1.0, z: -3.4, floorY: 0.2, seatY: 1.26, yaw: 0, style: 'sofa', radius: 2.2 },
  { id: 'lounge-left', name: 'kursi lounge', x: -4.15, z: -2.2, floorY: 0.2, seatY: 1.16, yaw: 0, style: 'sofa', radius: 1.8 },
  { id: 'lounge-right', name: 'kursi lounge', x: 2.25, z: -2.2, floorY: 0.2, seatY: 1.16, yaw: 0, style: 'sofa', radius: 1.8 },
  { id: 'garden-bench', name: 'bangku taman', x: -18.6, z: 18.2, floorY: 0, seatY: 0.71, yaw: Math.PI / 2, style: 'bench', radius: 1.8 },
  { id: 'town-park-bench', name: 'bangku Town Park', x: 13.5, z: 98.2, floorY: 0, seatY: 0.71, yaw: 0, style: 'bench', radius: 1.8 },
  { id: 'pool-lounger', name: 'sun lounger tepi kolam', x: 34.4, z: 18.4, floorY: 0, seatY: 0.42, yaw: -0.22, style: 'lounger', radius: 1.85 },
  { id: 'coffee-stool-left', name: 'kursi coffee nook', x: 2.9, z: 14.2, floorY: 0, seatY: 0.54, yaw: Math.PI / 2, style: 'stool', radius: 1.45 },
  { id: 'coffee-stool-right', name: 'kursi coffee nook', x: 6.1, z: 14.2, floorY: 0, seatY: 0.54, yaw: -Math.PI / 2, style: 'stool', radius: 1.45 },
  { id: 'garden-terrace-left', name: 'sofa garden terrace', x: -3.55, z: -17.3, floorY: 0.12, seatY: 0.79, yaw: 0, style: 'terrace', radius: 1.8, requiresUpgrade: 'terrace' },
  { id: 'garden-terrace-right', name: 'sofa garden terrace', x: 2.55, z: -17.3, floorY: 0.12, seatY: 0.79, yaw: 0, style: 'terrace', radius: 1.8, requiresUpgrade: 'terrace' }
];

function currentVehicleLightsOn() { return vehicleLightsMode === 'on' || (vehicleLightsMode === 'auto' && vehicleNightMix > 0.45); }
function toggleVehicleLights() {
  if (!inVehicle) return;
  vehicleLightsMode = vehicleLightsMode === 'auto' ? 'on' : vehicleLightsMode === 'on' ? 'off' : 'auto';
  const label = vehicleLightsMode.toUpperCase();
  setTextIfChanged(vehicleLightsLabel, label);
  showToast(`HEADLIGHTS · ${label}`);
  saveGame(false);
}
function playVehicleHorn() {
  if (!isStarted || !inVehicle || isUiOpen() || vehicleHornCooldown > 0) return;
  vehicleHornCooldown = 0.42;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { showToast('BEEP!'); return; }
    vehicleHornAudio ||= new AudioContextClass();
    if (vehicleHornAudio.state === 'suspended') vehicleHornAudio.resume();
    const startAt = vehicleHornAudio.currentTime;
    const gain = vehicleHornAudio.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.13, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.27);
    gain.connect(vehicleHornAudio.destination);
    for (const frequency of [392, 494]) {
      const oscillator = vehicleHornAudio.createOscillator();
      oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.connect(gain); oscillator.start(startAt); oscillator.stop(startAt + 0.29);
    }
  } catch { showToast('KLAKSON TIDAK TERSEDIA'); }
}
function setVehicleBrake(held) {
  vehicleBrakeHeld = !!held && inVehicle;
}
function setBoatBrake(held) { boatBrakeHeld=!!held&&inBoat; }
function canDockAtNorthShoal(x=marinaBoat.position.x,z=marinaBoat.position.z) {
  const distance=Math.hypot(x-44,z-218);
  return x>=32.7&&x<=37.6&&Math.abs(z-218)<=2.8&&distance<=10.0;
}
function resetDiveSiteForDay(){
  if(divingState.day===gameDay)return;
  divingState.day=gameDay;divingState.collected=[false,false,false];divingState.bonusClaimed=false;
  diveTargets.forEach(target=>{target.group.visible=true;});
}
function nearestDiveTarget(maxDistance=3.1){
  if(!divingState.active)return null;
  resetDiveSiteForDay();let nearest=null,nearestDistance=maxDistance;
  diveTargets.forEach((target,index)=>{
    if(divingState.collected[index])return;
    const distance=Math.hypot(player.position.x-target.x,player.position.y-target.y,player.position.z-target.z);
    if(distance<nearestDistance){nearest=target;nearest.index=index;nearest.distance=distance;nearestDistance=distance;}
  });return nearest;
}
function updateDiveHud(){
  if(!diveHud)return;
  diveHud.classList.toggle('hidden',!divingState.active);diveHud.setAttribute('aria-hidden',String(!divingState.active));
  underwaterOverlay?.classList.toggle('active',divingState.active);
  if(!divingState.active)return;
  const seconds=Math.ceil(divingState.oxygen),count=divingState.collected.filter(Boolean).length,target=nearestDiveTarget();
  setTextIfChanged(diveOxygenLabel, `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);
  setWidthIfChanged(diveOxygenFill, `${Math.round(clamp(divingState.oxygen/divingState.maxOxygen*100,0,100))}%`);
  diveOxygenFill.classList.toggle('low',divingState.oxygen<22);
  setTextIfChanged(diveDepthLabel, `${Math.max(0,-player.position.y).toFixed(1)} M`);
  setTextIfChanged(diveTargetLabel, target?`NEARBY · ${target.name} · PRESS E`:'EXPLORE THE REEF');
  setTextIfChanged(diveProgressLabel, `${count}/3 DISCOVERED`);
  interaction.classList.remove('hidden');interactButton.classList.remove('hidden');setTextIfChanged(interactButton, 'E');
  setTextIfChanged(interactionText, target?`E · Collect ${target.name}`:'E · Surface');
}
function startDive(){
  if(divingState.active)return;
  if(!boatDockedAtIsland){showToast('SANDARKAN SPEEDBOAT DI NORTH SHOAL TERLEBIH DULU');return;}
  if(needs.energy<8){showToast('ENERGY MINIMAL 8 UNTUK MULAI REEF DIVE');return;}
  resetDiveSiteForDay();needs.energy=clamp(needs.energy-8,0,100);advanceGameTime(20);
  divingState.active=true;divingState.oxygen=divingState.maxOxygen;divingState.timeAccumulator=0;
  player.visible=true;diveGear.visible=true;player.position.set(40.0,-2.25,223.0);velocity.set(0,0,0);moveInput.set(0,0);verticalSpeed=0;isGrounded=false;
  cameraDistanceTarget=8.4;cameraPitchTarget=0.12;renderSkills();updateNeedsHud(true);updateDiveHud();saveGame(false);
  showToast('REEF DIVE DIMULAI · TEMUKAN 3 HARTA DAN SPESIES · OKSIGEN 90 DETIK');
}
function endDive(emergency=false){
  if(!divingState.active)return;
  divingState.active=false;diveGear.visible=false;player.visible=true;player.position.set(40.0,getGroundHeight(40.0,218),218);velocity.set(0,0,0);verticalSpeed=0;isGrounded=true;moveInput.set(0,0);
  if(emergency){needs.energy=clamp(needs.energy-6,0,100);showToast('OKSIGEN HABIS · KAMU KEMBALI KE PANTAI · ENERGY -6');}
  else showToast(`REEF DIVE SELESAI · ${divingState.collected.filter(Boolean).length}/3 TEMUAN DIAMANKAN`);
  cameraDistanceTarget=8.8;cameraPitchTarget=0.24;updateDiveHud();updateNeedsHud(true);saveGame(false);
}
function collectDiveTarget(){
  if(!divingState.active)return;
  const target=nearestDiveTarget(2.75);
  if(!target){showToast('DEKATI HARTA / SPESIES BAWAH LAUT TERLEBIH DULU');return;}
  const index=target.index;if(divingState.collected[index])return;
  divingState.collected[index]=true;target.group.visible=false;divingState.total++;
  const level=skillProgress('diving').level,payout=Math.round(target.reward*(1+(level-1)*0.03));
  wallet+=payout;recordTransaction(`Reef discovery: ${target.name}`,payout);setWallet(wallet);addSkillXp('diving',target.xp);addSkillXp('fishing',8);
  recordDailyTaskProgress('destination');
  const count=divingState.collected.filter(Boolean).length;let bonus=0;
  if(count===diveTargets.length&&!divingState.bonusClaimed){divingState.bonusClaimed=true;bonus=220;wallet+=bonus;recordTransaction('Reef exploration completion bonus',bonus);setWallet(wallet);}
  updateDiveHud();saveGame(false);
  showToast(bonus?`REEF EXPEDITION COMPLETE · +$${payout} + BONUS $${bonus} · DIVING XP +${target.xp}`:`${target.name} DISCOVERED · +$${payout} · DIVING XP +${target.xp}`);
}
function updateDive(dt){
  const proximityOrigin=inBoat?marinaBoat.position:inVehicle?vehicle.position:player.position;
  const nearReef=Math.hypot(proximityOrigin.x-47,proximityOrigin.z-228)<72;
  if(!divingState.active&&!nearReef)return;
  resetDiveSiteForDay();const time=performance.now()*0.001;
  reefFish.forEach((fish,index)=>{const data=fish.userData;fish.position.x=data.baseX+Math.sin(time*0.7+data.phase)*data.radius;fish.position.z=data.baseZ+Math.cos(time*0.54+data.phase)*data.radius*0.65;fish.position.y=-3.3+Math.sin(time*1.7+data.phase)*0.2;fish.rotation.y=Math.atan2(Math.cos(time*0.7+data.phase)*0.7,-Math.sin(time*0.54+data.phase)*0.35);data.tail.rotation.y=Math.sin(time*8+data.phase)*0.35;});
  diveTargets.forEach((target,index)=>{target.group.position.y=target.baseY+Math.sin(time*1.2+index)*0.09;target.halo.rotation.z=time*0.34+index;target.light.intensity=target.group.visible?0.55+Math.sin(time*2.1+index)*0.18:0;});
  diveBubbles.forEach((bubble,index)=>{const cycle=(time*0.55+bubble.phase)%3.4;bubble.mesh.position.y=-5.15+cycle;bubble.mesh.position.x=bubble.baseX+Math.sin(time*0.9+bubble.phase)*0.22;bubble.mesh.position.z=bubble.baseZ+Math.cos(time*0.72+bubble.phase)*0.2;bubble.mesh.visible=true;});
  if(!divingState.active)return;
  if(!isUiOpen())divingState.oxygen=Math.max(0,divingState.oxygen-dt);
  updateDiveHud();
  if(divingState.oxygen<=0.001)endDive(true);
}
function resetBoatSalvageForDay(){
  if(boatSalvageState.day===gameDay)return;
  boatSalvageState.day=gameDay;boatSalvageState.collected=[false,false,false];boatSalvageState.bonusClaimed=false;
  boatSalvagePods.forEach(pod=>{pod.group.visible=true;});
}
function nearestBoatSalvage(maxDistance=6.4){
  if(!inBoat||boatRaceState.phase==='running')return null;
  resetBoatSalvageForDay();
  let nearest=null,nearestDistance=maxDistance;
  boatSalvagePods.forEach((pod,index)=>{
    if(boatSalvageState.collected[index])return;
    const distance=Math.hypot(marinaBoat.position.x-pod.x,marinaBoat.position.z-pod.z);
    if(distance<nearestDistance){nearest=pod;nearest.index=index;nearest.distance=distance;nearestDistance=distance;}
  });
  return nearest;
}
function collectNearbyBoatSalvage(){
  if(!inBoat){showToast('NAIK SPEEDBOAT UNTUK MENGAMBIL KARGO');return;}
  if(boatRaceState.phase==='running'){showToast('SELESAIKAN COASTAL CIRCUIT SEBELUM MENGAMBIL KARGO');return;}
  const pod=nearestBoatSalvage(5.0);
  if(!pod){showToast('DEKATI SALVAGE FLOAT TERLEBIH DAHULU');return;}
  if(Math.abs(boatSpeed)>2.5){showToast('TERLALU CEPAT · TURUNKAN SPEED DI BAWAH 9 KM/H');return;}
  const index=pod.index;if(boatSalvageState.collected[index])return;
  boatSalvageState.collected[index]=true;pod.group.visible=false;boatSalvageState.total++;
  const sailingLevel=skillProgress('sailing').level;
  const payout=Math.round(pod.reward*(1+(sailingLevel-1)*0.04));
  wallet+=payout;recordTransaction(`Coastal salvage: ${pod.name}`,payout);setWallet(wallet);addSkillXp('sailing',pod.xp);
  recordDailyTaskProgress('destination');
  const recovered=boatSalvageState.collected.filter(Boolean).length;
  let bonus=0;
  if(recovered===boatSalvagePods.length&&!boatSalvageState.bonusClaimed){
    boatSalvageState.bonusClaimed=true;bonus=180;wallet+=bonus;recordTransaction('Coastal salvage complete-day bonus',bonus);setWallet(wallet);
  }
  updateBoatHud();saveGame(false);
  showToast(bonus?`SEMUA KARGO DIAMANKAN · +$${payout} + BONUS $${bonus} · SAILING XP +${pod.xp}`:`KARGO DIAMANKAN · +$${payout} · ${recovered}/3 · SAILING XP +${pod.xp}`);
}
function updateBoatSalvage(dt){
  resetBoatSalvageForDay();
  const time=performance.now()*0.001;
  boatSalvagePods.forEach((pod,index)=>{
    pod.group.position.y=0.045+Math.sin(time*1.25+pod.phase)*0.095;
    pod.group.rotation.y=Math.sin(time*0.36+pod.phase)*0.07;
    pod.ring.rotation.z=time*0.24+pod.phase;
    pod.pennant.rotation.z=-Math.PI/2+Math.sin(time*1.1+pod.phase)*0.09;
    pod.glow.intensity=pod.group.visible?0.6+Math.sin(time*2.2+pod.phase)*0.22:0;
  });
  const nearby=nearestBoatSalvage();
  const available=!!nearby;
  boatSalvageButton?.classList.toggle('hidden',!inBoat||!available);
  if(boatSalvageButton)setTextIfChanged(boatSalvageButton, Math.abs(boatSpeed)>2.5?'SLOW':'SALVAGE');
  if(boatSalvagePrompt){boatSalvagePrompt.classList.toggle('hidden',!inBoat||!available);setTextIfChanged(boatSalvagePrompt, available?(Math.abs(boatSpeed)>2.5?`SLOW DOWN · ${nearby.name}`:`CARGO NEARBY · F / SALVAGE · ${nearby.name}`):'SAIL TO FIND FLOATING CARGO');}
  if(boatSalvageCountLabel){const count=boatSalvageState.collected.filter(Boolean).length;setTextIfChanged(boatSalvageCountLabel, `${count}/3`);}
}
function updateBoatHud() {
  const speed=Math.round(Math.abs(boatSpeed)*3.6);
  boatHud.classList.toggle('hidden',!inBoat);boatHud.setAttribute('aria-hidden',String(!inBoat));
  setTextIfChanged(boatSpeedLabel, String(speed).padStart(2,'0'));
  setTextIfChanged(boatGearLabel, boatSpeed < -0.25 ? 'R' : boatSpeed > 0.25 ? 'F' : 'N');
  setTextIfChanged(boatTripLabel, boatTripDistance.toFixed(2)+' KM');
  setTextIfChanged(boatStatusLabel, !inBoat?'DOCKED':boatRaceState.phase==='running'?'RACE ACTIVE':canDockAtNorthShoal()?'ISLAND DOCK READY':boatBrakeHeld||keys.has('Space')?'BRAKING':speed>3?'CRUISING':'READY');
  boatBrakeButton.classList.toggle('hidden',!inBoat);
  if(boatRaceStartButton)boatRaceStartButton.classList.toggle('hidden',!inBoat||!isAtBoatRaceStart()||boatRaceState.phase==='running'||boatRaceState.phase==='finished');
  updateBoatSalvage(0);
  renderBoatRaceHud();
}
function isAtBoatRaceStart(){return Math.hypot(marinaBoat.position.x-boatRaceCourse.start.x,marinaBoat.position.z-boatRaceCourse.start.z)<5.2;}
function formatBoatRaceTime(seconds){const value=Math.max(0,Number(seconds)||0);const minutes=Math.floor(value/60),secs=value-minutes*60;return String(minutes).padStart(2,'0')+':'+secs.toFixed(2).padStart(5,'0');}
function renderBoatRaceHud(){
  if(!boatRaceHud)return;
  const visible=inBoat&&(boatRaceState.phase==='running'||boatRaceState.phase==='finished'&&boatRaceState.resultTimer>0);
  boatRaceHud.classList.toggle('hidden',!visible);boatRaceHud.setAttribute('aria-hidden',String(!visible));
  if(!visible)return;
  const total=boatRaceCourse.checkpoints.length;
  const complete=boatRaceState.checkpoint;
  setTextIfChanged(boatRaceTimeLabel, formatBoatRaceTime(boatRaceState.phase==='finished'?boatRaceState.lastTime:boatRaceState.elapsed));
  setTextIfChanged(boatRaceStageLabel, boatRaceState.phase==='finished'?'FINISH':`${String(Math.min(complete+1,total)).padStart(2,'0')} / ${String(total).padStart(2,'0')}`);
  setTextIfChanged(boatRaceNextLabel, boatRaceState.phase==='finished'?'COASTAL CIRCUIT COMPLETE':boatRaceCourse.checkpoints[complete]?.label||'RETURN TO START / FINISH');
  setWidthIfChanged(boatRaceProgressFill, `${Math.round((boatRaceState.phase==='finished'?1:complete/(total+1))*100)}%`);
  setTextIfChanged(boatRaceResultLabel, boatRaceState.phase==='finished'?`TIME ${formatBoatRaceTime(boatRaceState.lastTime)} · BEST ${formatBoatRaceTime(boatRaceState.bestTime)}`:`BEST ${boatRaceState.bestTime>0?formatBoatRaceTime(boatRaceState.bestTime):'--:--.--'} · CHECKPOINTS ${complete}/${total}`);
}
function startBoatRace(){
  if(!inBoat){showToast('NAIK SPEEDBOAT UNTUK MEMULAI COASTAL CIRCUIT');return;}
  if(boatRaceState.phase==='running'){showToast('COASTAL CIRCUIT SEDANG BERLANGSUNG');return;}
  if(Math.abs(boatSpeed)>0.8){showToast('KURANGI KECEPATAN SEBELUM START');return;}
  if(!isAtBoatRaceStart()){showToast('DEKATI GERBANG START / FINISH');return;}
  marinaBoat.position.set(boatRaceCourse.start.x,0.18,boatRaceCourse.start.z);boatHeading=0;marinaBoat.rotation.y=0;boatSpeed=0;
  boatRaceState.phase='running';boatRaceState.elapsed=0;boatRaceState.checkpoint=0;boatRaceState.resultTimer=0;
  renderBoatRaceHud();updateBoatHud();showToast('COASTAL CIRCUIT DIMULAI · LEWATI 5 CHECKPOINT!');saveGame(false);
}
function finishBoatRace(){
  boatRaceState.phase='finished';boatRaceState.lastTime=boatRaceState.elapsed;boatRaceState.completed++;
  if(!boatRaceState.bestTime||boatRaceState.lastTime<boatRaceState.bestTime)boatRaceState.bestTime=boatRaceState.lastTime;
  if(boatRaceState.rewardDay!==gameDay){
    boatRaceState.rewardDay=gameDay;wallet+=220;recordTransaction('Harborfront Coastal Circuit reward',220);setWallet(wallet);
    showToast(`COASTAL CIRCUIT SELESAI · +$220 · ${formatBoatRaceTime(boatRaceState.lastTime)}`);
  }else showToast(`COASTAL CIRCUIT SELESAI · ${formatBoatRaceTime(boatRaceState.lastTime)} · BEST ${formatBoatRaceTime(boatRaceState.bestTime)}`);
  recordDailyTaskProgress('destination');updateBoatHud();boatRaceState.resultTimer=9;renderBoatRaceHud();saveGame(false);
}
function updateBoatRace(dt){
  if(boatRaceState.phase==='finished'){
    boatRaceState.resultTimer=Math.max(0,boatRaceState.resultTimer-dt);if(boatRaceState.resultTimer<=0){boatRaceState.phase='idle';renderBoatRaceHud();}return;
  }
  if(boatRaceState.phase!=='running'||!inBoat||isUiOpen())return;
  boatRaceState.elapsed+=dt;
  const next=boatRaceCourse.checkpoints[boatRaceState.checkpoint];
  if(next){
    const distance=Math.hypot(marinaBoat.position.x-next.x,marinaBoat.position.z-next.z);
    if(distance<3.65){boatRaceState.checkpoint++;boatRaceHud.classList.remove('checkpoint-hit');void boatRaceHud.offsetWidth;boatRaceHud.classList.add('checkpoint-hit');
      if(boatRaceState.checkpoint===boatRaceCourse.checkpoints.length)showToast('CHECKPOINT 5/5 · KEMBALI KE GERBANG FINISH!');
      else showToast(`CHECKPOINT ${boatRaceState.checkpoint}/${boatRaceCourse.checkpoints.length} · ${boatRaceCourse.checkpoints[boatRaceState.checkpoint]?.label||''}`);
    }
  }else if(Math.hypot(marinaBoat.position.x-boatRaceCourse.start.x,marinaBoat.position.z-boatRaceCourse.start.z)<3.65)finishBoatRace();
  renderBoatRaceHud();
}
function abortBoatRace(){if(boatRaceState.phase==='running'){boatRaceState.phase='idle';boatRaceState.elapsed=0;boatRaceState.checkpoint=0;renderBoatRaceHud();showToast('COASTAL CIRCUIT DIBATALKAN');}}

function boardOrExitMarinaBoat() {
  if(inBoat){
    abortBoatRace();inBoat=false;boatSpeed=0;boatBrakeHeld=false;keys.delete('Space');
    if(canDockAtNorthShoal()){
      boatDockedAtIsland=true;marinaBoat.position.set(34.8,0.18,218);boatHeading=-Math.PI/2;marinaBoat.rotation.y=boatHeading;boatHelm.rotation.z=0;
      player.visible=true;player.position.set(40.0,getGroundHeight(40.0,218),218);velocity.set(0,0,0);isGrounded=true;verticalSpeed=0;
      showToast('NORTH SHOAL ISLAND · SPEEDBOAT TERTAMBAT · JELAJAHI PULAU');
    }else{
      boatDockedAtIsland=false;marinaBoat.position.set(34,0.18,216);boatHeading=0;marinaBoat.rotation.y=0;boatHelm.rotation.z=0;
      player.visible=true;player.position.set(23.0,0,204.9);velocity.set(0,0,0);isGrounded=true;verticalSpeed=0;
      showToast('SPEEDBOAT KEMBALI KE HARBORFRONT · TRIP '+boatTripDistance.toFixed(2)+' KM');
    }
  }else{
    if(inVehicle||playerSeated){showToast('TURUN DARI KENDARAAN / TEMPAT DUDUK DULU');return;}
    if(handheldState.item){showToast('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM NAIK SPEEDBOAT');return;}
    if(boatDockedAtIsland){
      boatDockedAtIsland=false;inBoat=true;boatSpeed=0;boatBrakeHeld=false;keys.delete('Space');player.visible=false;
      showToast('SPEEDBOAT SIAP · BERLAYAR KEMBALI KE HARBORFRONT');
    }else{
      if(wallet<45){showToast('UANG TIDAK CUKUP · SEWA SPEEDBOAT $45');return;}
      wallet-=45;boatRentalCount++;recordTransaction('Harborfront speedboat rental',-45);setWallet(wallet);
      inBoat=true;boatSpeed=0;boatBrakeHeld=false;keys.delete('Space');player.visible=false;
      marinaBoat.position.set(34,0.18,216);boatHeading=0;marinaBoat.rotation.y=0;
      showToast('SPEEDBOAT DISEWA · $45 · WASD / JOYSTICK UNTUK BERLAYAR');
    }
  }
  updateBoatHud();saveGame(false);
}
function updateMarinaBoatControls(dt) {
  const controlsLocked=isUiOpen();
  const throttle=controlsLocked?0:clamp((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joystickVector.y,-1,1);
  const steering=controlsLocked?0:clamp((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystickVector.x,-1,1);
  const previousSpeed=boatSpeed;
  if(boatBrakeHeld||keys.has('Space'))boatSpeed=THREE.MathUtils.damp(boatSpeed,0,7.2,dt);
  else if(throttle>0.04)boatSpeed=THREE.MathUtils.damp(boatSpeed,7.4*throttle,1.55,dt);
  else if(throttle< -0.04)boatSpeed=THREE.MathUtils.damp(boatSpeed,-3.2*Math.abs(throttle),1.9,dt);
  else boatSpeed=THREE.MathUtils.damp(boatSpeed,0,0.48,dt);
  const steeringStrength=clamp(Math.abs(boatSpeed)/1.4,0,1);
  boatHeading-=steering*0.78*steeringStrength*dt*Math.sign(boatSpeed||1);
  const dx=-Math.sin(boatHeading)*boatSpeed*dt,dz=-Math.cos(boatHeading)*boatSpeed*dt;
  const oldX=marinaBoat.position.x,oldZ=marinaBoat.position.z;
  const boundedX=clamp(oldX+dx,11.5,67.0),boundedZ=clamp(oldZ+dz,204.0,236.0);
  const islandHit=Math.hypot(boundedX-44,boundedZ-218)<9.55 && !(boundedX>=32.7&&boundedX<=37.6&&Math.abs(boundedZ-218)<=2.8);
  const nextX=islandHit?oldX:boundedX,nextZ=islandHit?oldZ:boundedZ;
  marinaBoat.position.x=nextX;marinaBoat.position.z=nextZ;
  const blocked=islandHit||Math.abs(nextX-(oldX+dx))>0.001||Math.abs(nextZ-(oldZ+dz))>0.001;
  if(blocked)boatSpeed*=0.34;
  const travelled=Math.hypot(nextX-oldX,nextZ-oldZ);boatTripDistance+=travelled/1000;
  boatHelm.rotation.z=THREE.MathUtils.damp(boatHelm.rotation.z,-steering*0.55,7,dt);
  marinaBoat.rotation.y=boatHeading;
  marinaBoat.rotation.z=THREE.MathUtils.damp(marinaBoat.rotation.z,clamp(-previousSpeed*boatSpeed*0.0018,-0.035,0.035),4,dt);
  updateBoatHud();
}
function updateVehicleHud(braking = false) {
  vehicleHud.classList.toggle('hidden', !inVehicle);
  vehicleHud.setAttribute('aria-hidden', String(!inVehicle));
  const speedKmh = Math.round(Math.abs(vehicleSpeed) * 3.6);
  setTextIfChanged(vehicleSpeedLabel, String(speedKmh).padStart(2, '0'));
  setTextIfChanged(vehicleGearLabel, !inVehicle ? 'P' : vehicleSpeed < -0.35 ? 'R' : vehicleSpeed > 0.35 ? 'D' : 'N');
  setTextIfChanged(vehicleLightsLabel, vehicleLightsMode.toUpperCase());
  setTextIfChanged(vehicleTripLabel, vehicleTripDistance.toFixed(2) + ' KM');
  setTextIfChanged(vehicleFuelLabel, `${Math.ceil(vehicleFuel)}%`);
  setTextIfChanged(vehicleCleanlinessLabel, `${Math.round(100 - vehicleDirt)}%`);
  setTextIfChanged(vehicleStatusLabel, !inVehicle ? 'PARKED' : vehicleFuel <= 0.01 ? 'OUT OF FUEL' : vehicleFuel < 18 ? 'LOW FUEL' : vehicleImpact > 0.08 ? 'COLLISION' : braking ? 'BRAKING' : speedKmh > 4 ? 'CRUISING' : 'READY');
}
function refuelVehicle() {
  if (vehicleSpeed > 0.45) { showToast('BERHENTI TOTAL DI AREA POM'); return; }
  if (vehicleFuel >= 99.9) { showToast('TANGKI SUDAH PENUH'); return; }
  const cost = Math.max(1, Math.ceil((100 - vehicleFuel) * (selectedVehicleType==='motorcycle'?0.58:0.72)));
  if (wallet < cost) { showToast(`UANG TIDAK CUKUP · BUTUH $${cost}`); return; }
  wallet -= cost; vehicleFuel = 100; vehicleFuelEmptyNotified = false; vehicleLowFuelNotified = false;
  townVisited.fuelStop = true; recordDailyTaskProgress('destination'); recordTransaction(`Northside Fuel refill · ${currentVehicleName()}`, -cost); setWallet(wallet); updateVehicleHud(); saveGame(false);
  showToast(`${currentVehicleName().toUpperCase()} TANGKI PENUH · $${cost} · SIAP MELANJUTKAN PERJALANAN`);
}
function washVehicle() {
  if (!inVehicle) { showToast(`MASUK KE ${currentVehicleName().toUpperCase()} UNTUK MENGGUNAKAN AUTO SPA`); return; }
  if (Math.abs(vehicleSpeed) > 0.25) { showToast('BERHENTI DI DALAM AREA CUCI'); return; }
  if (vehicleDirt < 1) { showToast(`${currentVehicleName().toUpperCase()} SUDAH BERSIH · TIDAK PERLU DICUCI`); return; }
  const cost = Math.max(8, Math.ceil(vehicleDirt * 0.55));
  if (wallet < cost) { showToast(`UANG TIDAK CUKUP · BUTUH $${cost}`); return; }
  wallet -= cost;
  vehicleDirt = 0;
  vehicleWashTimer = 4.4;
  recordTransaction(`Northside Auto Spa wash · ${currentVehicleName()}`, -cost);
  recordDailyTaskProgress('vehicleCare');
  setWallet(wallet);
  updateVehicleHud();
  saveGame(false);
  showToast(`${currentVehicleName().toUpperCase()} AUTO SPA DIMULAI · $${cost} · FOAM WASH AKTIF`);
}
function updateVehicleWash(dt) {
  const active = vehicleWashTimer > 0;
  if (active) vehicleWashTimer = Math.max(0, vehicleWashTimer - dt);
  vehicleWashBrushes.forEach((brush,index) => {
    const direction = index % 2 ? -1 : 1;
    brush.rotation.y = THREE.MathUtils.damp(brush.rotation.y, active ? direction * 2.8 : 0, active ? 9 : 3, dt);
  });
  vehicleWashLights.forEach(light => {
    light.intensity = THREE.MathUtils.damp(light.intensity, active ? 1.8 : 0, active ? 8 : 4, dt);
  });
  if (active && vehicleWashTimer <= 0.001) showToast('AUTO SPA SELESAI · SUV 100% BERSIH');
}

function visitHarborfrontMarina() {
  if (needs.energy < 3) { showToast('ENERGY TERLALU RENDAH UNTUK MENJELAJAH'); return; }
  const firstVisit = !townVisited.marina;
  townVisited.marina = true;
  needs.energy = clamp(needs.energy - 3, 0, 100);
  needs.social = clamp(needs.social + 14, 0, 100);
  advanceGameTime(30);
  if (firstVisit) { wallet += 120; recordTransaction('Harborfront Marina discovery reward',120); setWallet(wallet); }
  recordDailyTaskProgress('destination');
  updateNeedsHud(true);
  saveGame(false);
  showToast(firstVisit ? 'HARBORFRONT MARINA DITEMUKAN · +$120 · SOCIAL +14' : 'MARINA PIER · SOCIAL +14');
}

function visitNorthShoalIsland() {
  if(needs.energy<4){showToast('ENERGY MINIMAL 4 UNTUK MENJELAJAH NORTH SHOAL');return;}
  const firstVisit=!townVisited.northShoal;
  townVisited.northShoal=true;needs.energy=clamp(needs.energy-4,0,100);needs.social=clamp(needs.social+16,0,100);advanceGameTime(35);
  if(firstVisit){wallet+=180;recordTransaction('North Shoal Island discovery reward',180);setWallet(wallet);}
  recordDailyTaskProgress('destination');updateNeedsHud(true);saveGame(false);
  showToast(firstVisit?'NORTH SHOAL ISLAND DITEMUKAN · +$180 · SOCIAL +16':'NORTH SHOAL ISLAND · SOCIAL +16');
}
function collectNorthShoalTreasure() {
  if(!townVisited.northShoal){showToast('JELAJAHI NORTH SHOAL TERLEBIH DAHULU');return;}
  if(townVisited.northShoalTreasure){showToast('PETI SUDAH KOSONG · HARTA SUDAH DIAMBIL');return;}
  townVisited.northShoalTreasure=true;shoalChest.visible=false;wallet+=250;needs.energy=clamp(needs.energy+6,0,100);recordTransaction('North Shoal hidden treasure',250);setWallet(wallet);
  recordDailyTaskProgress('destination');updateNeedsHud(true);saveGame(false);showToast('HIDDEN TREASURE DITEMUKAN · +$250 · ENERGY +6');
}

function fishStockValue() {
  return Object.entries(fishCatalog).reduce((total,[id,fish]) => total + Math.max(0,Math.floor(inventory[id]||0))*fish.price,0);
}
function renderFishingPanel() {
  const status=document.querySelector('#fishing-status'), action=document.querySelector('#fishing-action-btn'), fill=document.querySelector('#fishing-meter-fill');
  const meterLabel=document.querySelector('#fishing-meter-label'), summary=document.querySelector('#fishing-catch-summary'), sellButton=document.querySelector('#fishing-sell-btn');
  if(!status||!action||!fill||!summary||!sellButton)return;
  const copy={idle:'Lempar umpan dan perhatikan pelampung. Saat ikan menyambar, tarik sebelum waktunya habis.',waiting:'Umpan sudah masuk air. Tunggu sampai pelampung bergerak...',bite:'ADA SAMBARAN! TARIK SEKARANG!',missed:'Ikan berhasil lepas. Atur timing dan coba lagi.',caught:fishingState.lastCatch?`Berhasil mendapatkan ${fishingState.lastCatch}!`:'Tangkapan berhasil.'};
  status.textContent=copy[fishingState.phase]||copy.idle;
  action.textContent=fishingState.phase==='bite'?'REEL NOW!':fishingState.phase==='waiting'?'WAIT FOR A BITE':fishingState.phase==='missed'||fishingState.phase==='caught'?'CAST AGAIN · $8':'CAST LINE · $8';
  action.disabled=fishingState.phase==='waiting'||fishingState.phase==='bite';
  const progress=fishingState.phase==='waiting'&&fishingState.totalWait>0?1-fishingState.timer/fishingState.totalWait:fishingState.phase==='bite'?fishingState.timer/fishingState.biteDuration:fishingState.phase==='caught'?1:0;
  fill.style.width=`${clamp(progress,0,1)*100}%`;fill.classList.toggle('bite',fishingState.phase==='bite');
  meterLabel.textContent=fishingState.phase==='bite'?'REEL WINDOW':fishingState.phase==='waiting'?'WAITING FOR BITE':'FISHING LINE';
  const count=Object.keys(fishCatalog).reduce((sum,id)=>sum+Math.max(0,Math.floor(inventory[id]||0)),0);
  summary.textContent=`${count} FISH STORED · SELL VALUE $${fishStockValue().toLocaleString('en-US')} · SESSION ${fishingState.catches}`;
  sellButton.textContent=`SELL ALL CATCH · $${fishStockValue().toLocaleString('en-US')}`;sellButton.disabled=fishStockValue()<=0;
}
function openFishingPanel() {
  if(handheldState.item){showToast('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM MEMANCING');return;}
  closePanels();fishingState.phase='idle';fishingState.timer=0;fishingState.totalWait=0;renderFishingPanel();
  document.querySelector('#fishing-panel').classList.remove('hidden');showToast('HARBORFRONT FISHING SPOT · SIAPKAN UMPAN');
}
function cancelFishingSession() {
  fishingState.phase='idle';fishingState.timer=0;fishingState.totalWait=0;heldFishingRod.visible=false;marinaFishingFloat.visible=false;marinaFishingRipple.visible=false;
}
function startFishingCast() {
  if(fishingState.phase==='waiting'||fishingState.phase==='bite')return;
  if(needs.energy<4){showToast('ENERGY MINIMAL 4 UNTUK MEMANCING');return;}
  if(wallet<8){showToast('UANG TIDAK CUKUP · BUTUH $8 UNTUK UMPAN');return;}
  wallet-=8;recordTransaction('Harborfront fishing bait',-8);setWallet(wallet);needs.energy=clamp(needs.energy-2,0,100);advanceGameTime(5);
  fishingState.phase='waiting';fishingState.totalWait=2.3+Math.random()*3.1;fishingState.timer=fishingState.totalWait;
  heldFishingRod.visible=true;marinaFishingFloat.visible=true;updateNeedsHud(true);renderFishingPanel();saveGame(false);
}
function missFishingCatch() {
  fishingState.phase='missed';fishingState.timer=0;renderFishingPanel();showToast('IKAN LEPAS · COBA TARIK LEBIH CEPAT');
}
function reelFishingLine() {
  if(fishingState.phase!=='bite')return;
  const level=skillProgress('fishing').level,roll=Math.random();
  const treasureChance=Math.min(0.12,0.035+(level-1)*0.008),rareChance=Math.min(0.38,0.16+(level-1)*0.03);
  const fishId=roll<treasureChance?'fishGolden':roll<treasureChance+rareChance?'fishBass':'fishSardine',fish=fishCatalog[fishId];
  inventory[fishId]=Math.max(0,Math.floor(inventory[fishId]||0))+1;fishingState.phase='caught';fishingState.timer=0;fishingState.catches++;fishingState.lastCatch=fish.name;
  addSkillXp('fishing',18+level*2);needs.social=clamp(needs.social+2,0,100);advanceGameTime(10);heldFishingRod.visible=true;
  updateNeedsHud(true);renderInventory();renderFishingPanel();saveGame(false);showToast(`${fish.name.toUpperCase()} TERTANGKAP · FISHING +${18+level*2} XP`);
}
function sellFishingCatch() {
  const total=fishStockValue();if(total<=0){showToast('BELUM ADA IKAN UNTUK DIJUAL');return;}
  for(const id of Object.keys(fishCatalog))inventory[id]=0;
  wallet+=total;recordTransaction('Harborfront fish market sale',total);setWallet(wallet);renderFishingPanel();renderInventory();saveGame(false);showToast(`HASIL TANGKAPAN TERJUAL · +$${total}`);
}
function updateFishing(dt) {
  if(fishingState.phase!=='waiting'&&fishingState.phase!=='bite')return;
  fishingState.timer=Math.max(0,fishingState.timer-dt);
  if(fishingState.phase==='waiting'&&fishingState.timer<=0){fishingState.phase='bite';fishingState.timer=fishingState.biteDuration;renderFishingPanel();showToast('PELAMPUNG BERGERAK · TARIK SEKARANG!');return;}
  if(fishingState.phase==='bite'&&fishingState.timer<=0){missFishingCatch();return;}
  const fill=document.querySelector('#fishing-meter-fill');
  if(fill){const progress=fishingState.phase==='waiting'&&fishingState.totalWait>0?1-fishingState.timer/fishingState.totalWait:fishingState.timer/fishingState.biteDuration;setWidthIfChanged(fill, `${Math.round(clamp(progress,0,1)*100)}%`);}
}

function visitRiversideLookout() {
  if (needs.energy < 4) { showToast('ENERGY TERLALU RENDAH UNTUK MENJELAJAH'); return; }
  const firstVisit = !townVisited.riverside; townVisited.riverside = true;
  needs.energy = clamp(needs.energy - 4, 0, 100); needs.social = clamp(needs.social + 12, 0, 100); advanceGameTime(25);
  if (firstVisit) { wallet += 85; recordTransaction('Riverside discovery reward', 85); setWallet(wallet); }
  recordDailyTaskProgress('destination'); updateNeedsHud(true); saveGame(false);
  showToast(firstVisit ? 'RIVERSIDE LOOKOUT DITEMUKAN · +$85 · SOCIAL +12' : 'RIVERSIDE LOOKOUT · SOCIAL +12');
}
function currentVehicleName(){return selectedVehicleType==='motorcycle'?'Sport Motorcycle':'Luxury SUV';}
function applyVehicleSelection(type,{deliver=true,save=true}={}){
  if(!['suv','motorcycle'].includes(type))return false;
  if(type==='motorcycle'&&!motorcycleOwned){showToast('MOTORCYCLE BELUM DIMILIKI · BELI DI MOTOR SHOWROOM');return false;}
  if(inVehicle||inBoat||divingState.active){showToast('KELUAR DARI KENDARAAN SEBELUM MENGGANTI FLEET');return false;}
  vehicleFleetTelemetry[selectedVehicleType]={fuel:vehicleFuel,dirt:vehicleDirt,tripDistance:vehicleTripDistance};
  selectedVehicleType=type;
  vehicleCarModel.visible=type==='suv';vehicleMotorcycleModel.visible=type==='motorcycle';motorcycleRider.visible=false;
  if(deliver){vehicle.position.set(dealerVehicleBay.x,0,dealerVehicleBay.z);vehicle.rotation.y=dealerVehicleBay.yaw;}
  vehicleSpeed=0;vehicleBrakeHeld=false;vehicleWashTimer=0;vehicleImpact=0;
  const telemetry=vehicleFleetTelemetry[type]||{fuel:100,dirt:0,tripDistance:0};
  vehicleFuel=clamp(Number(telemetry.fuel??100),0,100);vehicleDirt=clamp(Number(telemetry.dirt??0),0,100);vehicleTripDistance=clamp(Number(telemetry.tripDistance)||0,0,99999);
  vehicleFuelEmptyNotified=vehicleFuel<=0.01;vehicleLowFuelNotified=vehicleFuel>0.01&&vehicleFuel<18;
  vehicleGarageState.paint=vehiclePaintOptions[vehicleGarageState.paint]?vehicleGarageState.paint:'midnight';applyVehiclePaint();
  updateVehicleHud();
  if(save)saveGame(false);
  showToast(`${currentVehicleName().toUpperCase()} SIAP · UNIT DI DELIVERY BAY`);
  return true;
}
function renderVehicleDealerPanel(){
  const status=document.querySelector('#dealer-status'),buy=document.querySelector('#dealer-buy-bike'),fleet=document.querySelector('#dealer-fleet-options');
  if(!motorcycleOwned){status.textContent=`SPORT MOTORCYCLE · $${motorcyclePurchasePrice.toLocaleString('en-US')} · READY FOR DELIVERY`;buy.classList.remove('hidden');buy.disabled=wallet<motorcyclePurchasePrice;fleet.classList.add('hidden');fleet.replaceChildren();return;}
  buy.classList.add('hidden');fleet.classList.remove('hidden');status.textContent=`MOTORCYCLE OWNED · CURRENT RIDE: ${currentVehicleName().toUpperCase()}`;fleet.replaceChildren();
  for(const [key,label,detail] of [['suv','LUXURY SUV','Comfort · stable · utility'],['motorcycle','SPORT MOTORCYCLE','Agile · faster · compact']]){
    const button=document.createElement('button');button.type='button';button.className='dealer-fleet-choice'+(selectedVehicleType===key?' selected':'');button.disabled=selectedVehicleType===key;
    const name=document.createElement('b');name.textContent=label;const copy=document.createElement('small');copy.textContent=detail;const state=document.createElement('strong');state.textContent=selectedVehicleType===key?'CURRENT VEHICLE':'SELECT & DELIVER';button.append(name,copy,state);button.addEventListener('click',()=>{if(applyVehicleSelection(key))renderVehicleDealerPanel();});fleet.append(button);
  }
}
function openVehicleDealerPanel(){if(inVehicle||inBoat||divingState.active||playerSeated){showToast('KUNJUNGI SHOWROOM DENGAN BERJALAN KAKI');return;}closePanels();renderVehicleDealerPanel();document.querySelector('#vehicle-dealer-panel').classList.remove('hidden');}
function purchaseMotorcycle(){
  if(motorcycleOwned){showToast('SPORT MOTORCYCLE SUDAH DIMILIKI');return;}
  if(wallet<motorcyclePurchasePrice){showToast(`UANG BELUM CUKUP · BUTUH $${motorcyclePurchasePrice.toLocaleString('en-US')}`);return;}
  wallet-=motorcyclePurchasePrice;motorcycleOwned=true;recordTransaction('Estate Motor Showroom · Sport Motorcycle',-motorcyclePurchasePrice);setWallet(wallet);
  vehicleFleetTelemetry.motorcycle={fuel:100,dirt:0,tripDistance:0};
  applyVehicleSelection('motorcycle',{deliver:true,save:false});renderVehicleDealerPanel();saveGame(false);
  showToast('SPORT MOTORCYCLE DIBELI · UNIT BARU SUDAH DI DELIVERY BAY');
}

function vehicleGarageUpgradeCost(key){const definition=vehicleGarageUpgradeDefinitions[key];return definition?.prices[vehicleGarageState[key]]??Infinity;}
function renderVehicleGaragePanel(){
  const status=document.querySelector('#garage-status'),build=document.querySelector('#garage-build'),upgrades=document.querySelector('#garage-upgrade-list'),paintSection=document.querySelector('#garage-paint-options'),paints=paintSection.querySelector('.garage-paint-grid');
  if(!vehicleGarageState.built){status.textContent=`LOCKED · BUILD THE ESTATE MOTOR GARAGE FOR $${vehicleGarageBuildCost.toLocaleString('en-US')}`;build.classList.remove('hidden');build.textContent=`BUILD GARAGE · $${vehicleGarageBuildCost.toLocaleString('en-US')}`;build.disabled=wallet<vehicleGarageBuildCost;upgrades.classList.add('hidden');paintSection.classList.add('hidden');return;}
  status.textContent=`GARAGE ACTIVE · ${vehicleGarageState.paint.toUpperCase()} FINISH · UPGRADES PERSIST`;build.classList.add('hidden');upgrades.classList.remove('hidden');paintSection.classList.remove('hidden');upgrades.replaceChildren();
  for(const [key,definition] of Object.entries(vehicleGarageUpgradeDefinitions)){
    const level=vehicleGarageState[key],card=document.createElement('article');card.className='garage-upgrade-card'+(level?' upgraded':'');
    const head=document.createElement('div');head.className='garage-upgrade-head';
    const info=document.createElement('div');const eyebrow=document.createElement('small');eyebrow.textContent=definition.eyebrow;const name=document.createElement('b');name.textContent=definition.name;info.append(eyebrow,name);
    const tier=document.createElement('strong');tier.textContent=`LV ${level}/${definition.max}`;head.append(info,tier);
    const copy=document.createElement('p');copy.textContent=definition.description;
    const effect=document.createElement('div');effect.className='garage-upgrade-effect';const current=document.createElement('small');current.textContent=`CURRENT · ${level?definition.effect(level):'STOCK SETUP'}`;effect.append(current);
    const action=document.createElement('button');action.type='button';action.className='garage-upgrade-buy';
    if(level>=definition.max){action.textContent='MAX LEVEL INSTALLED';action.disabled=true;}
    else{const cost=vehicleGarageUpgradeCost(key);action.textContent=`INSTALL LEVEL ${level+1} · $${cost.toLocaleString('en-US')}`;action.disabled=wallet<cost;action.addEventListener('click',()=>purchaseVehicleGarageUpgrade(key));}
    card.append(head,copy,effect,action);upgrades.append(card);
  }
  paints.replaceChildren();
  for(const [key,paint] of Object.entries(vehiclePaintOptions)){
    const button=document.createElement('button');button.type='button';button.className='garage-paint-choice'+(vehicleGarageState.paint===key?' selected':'');button.disabled=vehicleGarageState.paint===key||wallet<paint.price;
    const swatch=document.createElement('i');swatch.style.background=`#${paint.hex.toString(16).padStart(6,'0')}`;
    const label=document.createElement('span');label.textContent=paint.name;
    const price=document.createElement('small');price.textContent=vehicleGarageState.paint===key?'EQUIPPED':paint.price===0?'DEFAULT':`$${paint.price}`;
    button.append(swatch,label,price);button.addEventListener('click',()=>purchaseVehiclePaint(key));paints.append(button);
  }
}
function openVehicleGaragePanel(){closePanels();renderVehicleGaragePanel();document.querySelector('#garage-panel').classList.remove('hidden');}
function buildVehicleGarage(){
  if(vehicleGarageState.built){showToast('ESTATE MOTOR GARAGE SUDAH AKTIF');return;}
  if(wallet<vehicleGarageBuildCost){showToast(`UANG BELUM CUKUP · BUTUH $${vehicleGarageBuildCost}`);return;}
  wallet-=vehicleGarageBuildCost;vehicleGarageState.built=true;vehicleGarageGroup.visible=true;
  recordTransaction('Estate Motor Garage construction',-vehicleGarageBuildCost);setWallet(wallet);renderVehicleGaragePanel();saveGame(false);showToast('ESTATE MOTOR GARAGE SELESAI DIBANGUN · GARASI SIAP DIGUNAKAN');
}
function purchaseVehicleGarageUpgrade(key){
  const definition=vehicleGarageUpgradeDefinitions[key];if(!vehicleGarageState.built||!definition)return;
  const level=vehicleGarageState[key];if(level>=definition.max){showToast('UPGRADE SUDAH MAKSIMAL');return;}
  const cost=vehicleGarageUpgradeCost(key);if(wallet<cost){showToast(`UANG BELUM CUKUP · BUTUH $${cost}`);return;}
  wallet-=cost;vehicleGarageState[key]=level+1;recordTransaction(`Estate Garage ${definition.name} Lv.${level+1}`,-cost);setWallet(wallet);renderVehicleGaragePanel();saveGame(false);
  showToast(`${definition.name.toUpperCase()} LEVEL ${level+1} TERPASANG · ${definition.effect(level+1)}`);
}
function purchaseVehiclePaint(key){
  const paint=vehiclePaintOptions[key];if(!vehicleGarageState.built||!paint||vehicleGarageState.paint===key)return;
  if(wallet<paint.price){showToast(`UANG BELUM CUKUP · BUTUH $${paint.price}`);return;}
  wallet-=paint.price;vehicleGarageState.paint=key;applyVehiclePaint();recordTransaction(`Estate Garage paint: ${paint.name}`,-paint.price);setWallet(wallet);renderVehicleGaragePanel();saveGame(false);showToast(`Warna SUV diganti · ${paint.name.toUpperCase()}`);
}

const interactables = [
  {id:'vehicle-dealer-kiosk',x:12.25,y:0.2,z:60.2,radius:2.7,enabled:()=>!inVehicle&&!inBoat&&!divingState.active&&!playerSeated,label:()=>motorcycleOwned?'Buka Estate Motor Showroom · pilih kendaraan':'Kunjungi Estate Motor Showroom · beli Sport Motorcycle',action:openVehicleDealerPanel},
  {id:'garage-kiosk',x:13.25,y:0.2,z:31.4,radius:2.9,enabled:()=>!inVehicle&&!inBoat&&!divingState.active&&!playerSeated,label:()=>vehicleGarageState.built?'Kelola Estate Motor Garage · upgrade & cat SUV':`Bangun Estate Motor Garage · $${vehicleGarageBuildCost.toLocaleString('en-US')}`,action:openVehicleGaragePanel},
  {id:'farm-board',x:-36.0,y:0.2,z:14.5,radius:2.7,enabled:()=>!inVehicle&&!inBoat&&!divingState.active&&!playerSeated,label:()=>'Kelola Estate Garden · pilih bibit & cek pertumbuhan',action:openFarmPanel},
  {id:'farm-workshop',x:-46.2,y:0.2,z:17.1,radius:2.9,enabled:()=>farmWorkshopState.built&&!inVehicle&&!inBoat&&!divingState.active&&!playerSeated,label:()=>farmWorkshopState.activeBatch?`Cek produksi ${farmRecipeDefinitions[farmWorkshopState.activeBatch.recipe].name} · ${Math.ceil(farmWorkshopRemaining())} min`:'Gunakan Artisan Workshop · olah hasil panen',action:openFarmPanel},
  ...farmPlots.map(plot=>({id:'farm-plot-'+plot.index,x:plot.x,y:0.1,z:plot.z,radius:2.35,enabled:()=>!inVehicle&&!inBoat&&!divingState.active&&!playerSeated,label:()=>{const state=farmState.plots[plot.index];if(!state.crop)return `Tanam ${farmCropDefinitions[farmState.selectedSeed].name} · Bed ${plot.index+1}`;const crop=farmCropDefinitions[state.crop];if(!state.wateredAt)return `Siram ${crop.name} · Bed ${plot.index+1}`;if(state.stage>=3)return `Panen ${crop.name} · Bed ${plot.index+1}`;return `${crop.name} tumbuh · ${Math.round(farmPlotProgress(plot.index)*100)}%`;},action:()=>interactFarmPlot(plot.index)})),
  {
    id:'north-shoal-dive',x:40.65,y:0.35,z:222.2,radius:2.35,
    enabled:()=>boatDockedAtIsland&&!divingState.active&&!inBoat&&!inVehicle&&!playerSeated,
    label:()=>`Start reef dive · 90 sec oxygen · $ rewards`,action:startDive
  },
  ...seatingSpots.map(seat => ({
    id: 'seat-' + seat.id, x: seat.x, y: seat.floorY, z: seat.z, radius: seat.radius,
    enabled: () => !playerSeated && !inVehicle && (!seat.requiresUpgrade || propertyUpgrades[seat.requiresUpgrade] > 0) && !npcs.some(person => person.activeSeat?.id === seat.id),
    label: () => `Duduk di ${seat.name}`,
    action: () => sitOnSeat(seat)
  })),
  {
    id: 'bookshelf-reading',
    get x(){ return nearestPlacedBookshelf()?.x ?? 100000; },
    get y(){ return nearestPlacedBookshelf()?.y ?? 0; },
    get z(){ return nearestPlacedBookshelf()?.z ?? 100000; },
    radius: 2.7,
    enabled: () => !playerSeated && !inVehicle && !!nearestPlacedBookshelf(2.7),
    label: () => `Baca buku · +${22 + (skillProgress('career').level - 1) * 2} Career XP`,
    action: readAtBookshelf
  },
  {
    id: 'vehicle', get x(){ return vehicle.position.x; }, get z(){ return vehicle.position.z; }, y: 0, get radius(){return selectedVehicleType==='motorcycle'?4.0:3.7;},
    label: () => inVehicle ? `Keluar dari ${currentVehicleName()}` : `Kendarai ${currentVehicleName()}`,
    action: () => {
      if (inVehicle && vehicleWashTimer > 0.08) { showToast('TUNGGU AUTO SPA SELESAI'); return; }
      if (!inVehicle && handheldState.item) { showToast('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM MENYETIR'); return; }
      inVehicle = !inVehicle;
      vehicleSpeed = 0; vehicleBrakeHeld = false; keys.delete('Space');
      if (inVehicle) {
        player.visible = false;motorcycleRider.visible=selectedVehicleType==='motorcycle';
        showToast(`${currentVehicleName().toUpperCase()} AKTIF · WASD / JOYSTICK UNTUK MENYETIR`);
      } else {
        player.visible = true;motorcycleRider.visible=false;
        const exitOffset=selectedVehicleType==='motorcycle'?1.65:2.45;
        const sideX = Math.cos(vehicle.rotation.y) * exitOffset;
        const sideZ = -Math.sin(vehicle.rotation.y) * exitOffset;
        let exitX = clamp(vehicle.position.x + sideX, -50, 50);
        let exitZ = clamp(vehicle.position.z + sideZ, -43, 226.8);
        if (collides(exitX, exitZ)) { exitX = clamp(vehicle.position.x - sideX, -50, 50); exitZ = clamp(vehicle.position.z - sideZ, -43, 226.8); }
        player.position.set(exitX, 0, exitZ);
        velocity.set(0,0,0);
        showToast('KENDARAAN DIPARKIR · KAMU KELUAR');
      }
      updateVehicleHud();
    }
  },
  {
    id: 'creative-studio', x: -20.8, y: 0.2, z: -5.2, radius: 2.7,
    enabled: () => propertyUpgrades.studio > 0,
    label: () => 'Gunakan workstation studio · Latihan Career',
    action: practiceCreativeStudio
  },
  {
    id: 'guest-suite-bed', x: -17.9, y: 0.2, z: 3.4, radius: 2.6,
    enabled: () => propertyUpgrades.guestSuite > 0 && !guestSuiteRental.tenantActive,
    label: () => 'Tidur di guest suite',
    action: () => sleepAtHome(true)
  },
  {
    id: 'mailbox', x: -7.1, y: 0, z: 43.8, radius: 2.8,
    label: () => 'Periksa surat & tagihan rumah', action: openHouseholdPanel
  },
  { id:'neighborhood-cafe', x:-25, y:0, z:83.0, radius:4.2, label:()=>'Masuk ke Corner Cafe', action:()=>openDistrictStore('cafe') },
  { id:'neighborhood-market', x:25, y:0, z:83.0, radius:4.2, label:()=>'Belanja di Town Market', action:()=>openDistrictStore('market') },
  { id:'town-park', x:13.5, y:0, z:90.7, radius:3.5, label:()=>'Jalan santai di Town Park', action:visitTownPark },
  { id:'fuel-stop', x:28, y:0, z:128.6, radius:5.8, enabled:()=>(inVehicle && Math.abs(vehicleSpeed) < 0.45 && vehicleFuel < 99.9) || (!inVehicle && Math.abs(vehicleSpeed) < 0.1 && vehicleFuel < 99.9 && Math.hypot(vehicle.position.x-28,vehicle.position.z-128.6)<9), label:()=>`Isi bahan bakar ${currentVehicleName()} · $${Math.max(1,Math.ceil((100-vehicleFuel)*(selectedVehicleType==='motorcycle'?0.58:0.72)))}`, action:refuelVehicle },
  { id:'car-wash', x:-30, y:0, z:138.5, radius:4.2, enabled:()=>inVehicle && Math.abs(vehicleSpeed)<0.45 && vehicleDirt>=1 && Math.hypot(vehicle.position.x+30,vehicle.position.z-138.5)<3.4, label:()=>`Cuci ${currentVehicleName()} · $${Math.max(8,Math.ceil(vehicleDirt*0.55))}`, action:washVehicle },
  { id:'riverside-lookout', x:-18, y:0, z:148.1, radius:4.6, enabled:()=>!inVehicle, label:()=>'Jelajahi Riverside Lookout', action:visitRiversideLookout },
  { id:'marina-boat', get x(){return inBoat?marinaBoat.position.x:boatDockedAtIsland?marinaBoat.position.x+2.7:23.0;}, get z(){return inBoat?marinaBoat.position.z:boatDockedAtIsland?marinaBoat.position.z:204.9;}, y:0.2, get radius(){return boatDockedAtIsland&&!inBoat?3.0:2.6;}, enabled:()=>inBoat||(!inVehicle&&!playerSeated), label:()=>inBoat?(canDockAtNorthShoal()?'Sandar di North Shoal Island · E':'Kembali ke Harborfront Marina · E'):boatDockedAtIsland?'Naik speedboat · E':'Sewa speedboat · $45', action:boardOrExitMarinaBoat },
  { id:'marina-fishing', x:25, y:0.2, z:207.2, radius:3.2, enabled:()=>!inVehicle && !inBoat && !playerSeated, label:()=>'Memancing di Harborfront Pier', action:openFishingPanel },
  { id:'north-shoal-discovery', x:43.7, y:0.35, z:218, radius:5.6, enabled:()=>!inVehicle&&!inBoat&&!playerSeated, label:()=>'Jelajahi North Shoal Island', action:visitNorthShoalIsland },
  { id:'north-shoal-treasure', x:46.05, y:0.35, z:220.55, radius:2.25, enabled:()=>!inVehicle&&!inBoat&&!playerSeated, label:()=>townVisited.northShoalTreasure?'Periksa peti harta kosong':'Buka peti harta tersembunyi', action:collectNorthShoalTreasure },
  { id:'harborfront-marina', x:25, y:0.2, z:201.8, radius:4.0, enabled:()=>!inVehicle, label:()=>'Jelajahi Harborfront Marina', action:visitHarborfrontMarina },
  ...gardenTaskMarkers.map(marker => ({
    id: 'garden-' + marker.index, x: marker.x, y: 0, z: marker.z, radius: 2.2,
    enabled: () => gardenJobPhase === 'active' && !gardenWatered[marker.index],
    label: () => 'Siram area taman', action: () => waterGarden(marker.index)
  })),
  {
    id: 'alex', get x(){ return npcs[0].npc.position.x; }, get z(){ return npcs[0].npc.position.z; }, y: 0, radius: 3.2,
    label: () => npcs[0].playerNearby ? 'Sapa Alex' : 'Bicara dengan Alex', action: () => talkToNpc('alex')
  },
  {
    id: 'mia', get x(){ return npcs[1].npc.position.x; }, get z(){ return npcs[1].npc.position.z; }, y: 0, radius: 3.2,
    label: () => jobPhase === 'deliver' ? 'Antarkan paket ke Mia' : npcs[1].playerNearby ? 'Sapa Mia' : 'Bicara dengan Mia', action: () => talkToNpc('mia')
  },
  {
    id: 'furniture-shop', x: -9, y: 0, z: 34.2, radius: 3.3,
    label: () => 'Lihat katalog furnitur', action: openShop
  },
  ...parcelObjects.map(parcel => ({
    id: 'parcel-' + parcel.index, get x(){ return parcel.x; }, get z(){ return parcel.z; }, y: 0, radius: 2.35,
    enabled: () => jobPhase === 'collect' && !jobCollected[parcel.index],
    label: () => 'Ambil paket', action: () => collectParcel(parcel.index)
  })),
  {
    id: 'door', x: 0, y: 0, z: 8.3, radius: 5.3,
    label: () => doorOpen ? 'Tutup pintu utama' : 'Buka pintu utama',
    action: () => { doorOpen = !doorOpen; showToast(doorOpen ? 'Pintu utama terbuka' : 'Pintu utama tertutup'); }
  },
  {
    id: 'lights', x: -10.35, y: 0, z: 3.8, radius: 2.4,
    label: () => lightsOn ? 'Matikan lampu ruang utama' : 'Nyalakan lampu ruang utama',
    action: () => { lightsOn = !lightsOn; if (lightsOn) updateObjectives('lights'); showToast(lightsOn ? 'Lampu dinyalakan' : 'Lampu dimatikan'); }
  },
  {
    id: 'tv', x: -1.0, y: 0, z: -7.5, radius: 2.5,
    label: () => tvOn ? 'Matikan televisi' : 'Nyalakan televisi',
    action: () => { tvOn = !tvOn; tvScreenMat.emissive.setHex(tvOn ? 0x4b8496 : 0x0d1d24); tvScreenMat.emissiveIntensity = tvOn ? 1.6 : 0.35; tvGlow.intensity = tvOn ? 1.25 : 0; updateObjectives('tv'); showToast(tvOn ? 'Televisi menyala' : 'Televisi dimatikan'); }
  },
  {
    id: 'fridge', x: -10.1, y: 0, z: -0.7, radius: 2.1,
    label: () => fridgeOpen ? 'Ambil makanan dari kulkas' : 'Buka kulkas',
    action: () => { if (!fridgeOpen) { fridgeOpen = true; showToast('KULKAS DIBUKA · AMBIL MAKANAN'); } else { fridgeOpen = false; const mealRestore = 38 + propertyUpgrades.kitchen * 4; changeNeed('hunger', mealRestore, `MAKANAN SELESAI · HUNGER +${mealRestore}`); } }
  },
  {
    id: 'stove', x: -6.5, y: 0, z: -7.1, radius: 2.15,
    label: () => 'Masak makanan', action: cookMeal
  },
  {
    id: 'shower', x: 10.65, y: 0, z: -8.0, radius: 2.15,
    label: () => 'Mandi / bersihkan diri', action: showerAtHome
  },
  {
    id: 'toilet', x: 8.15, y: 0, z: -8.0, radius: 1.85,
    label: () => 'Gunakan toilet', action: useToilet
  },
  {
    id: 'study', x: 2.7, y: 4.85, z: -3.1, radius: 2.0,
    label: () => 'Gunakan komputer / cari kerja',
    action: openCareerPanel
  },
  {
    id: 'bed', x: -5.2, y: 4.85, z: 1.2, radius: 2.2,
    label: () => 'Tidur / istirahat',
    action: sleepAtHome
  }
];

const objectSurfaces = [
  { id: 'kitchen-island', x: -6.5, z: -7.1, topY: 1.28, halfX: 1.48, halfZ: 0.74, enabled: () => true },
  { id: 'dining-table', x: 5.5, z: -2.9, topY: 0.94, halfX: 1.82, halfZ: 1.02, enabled: () => true },
  { id: 'terrace-table', x: -0.5, z: -14.35, topY: 0.64, halfX: 0.82, halfZ: 0.46, enabled: () => propertyUpgrades.terrace > 0 },
  { id: 'studio-desk', x: -25.2, z: -5.55, topY: 0.94, halfX: 1.22, halfZ: 0.82, enabled: () => propertyUpgrades.studio > 0 },
  { id: 'studio-workbench', x: -18.15, z: -7.5, topY: 0.86, halfX: 1.48, halfZ: 0.58, enabled: () => propertyUpgrades.studio > 0 },
  { id: 'guest-side-table', x: -23.7, z: 1.65, topY: 1.125, halfX: 0.34, halfZ: 0.34, enabled: () => propertyUpgrades.guestSuite > 0 }
];

function dropGroundHeight(x, z, referenceY = 0) {
  if (x > 6.55 && x < 9.45 && z >= -7.15 && z <= 3.55) return 0.2 + clamp((3.55 - z) / 10.7, 0, 1) * 4.5;
  const insideExpansion = x < -12.5 && x > -27.5 && ((propertyUpgrades.studio > 0 && z > -10 && z < -1.1) || (propertyUpgrades.guestSuite > 0 && z > -0.9 && z < 8));
  if (insideExpansion) return 0.2;
  const insideHouse = Math.abs(x) < 11.5 && z > -9.5 && z < 7.9;
  if (insideHouse && referenceY > 3.45) return 4.85;
  return insideHouse ? 0.2 : 0;
}

function registerWorldDropTarget(drop) {
  const target = {
    id: 'world-drop-' + drop.id,
    get x() { return drop.group.position.x; },
    get y() { return drop.group.position.y - drop.restHeight; },
    get z() { return drop.group.position.z; },
    radius: 2.35,
    enabled: () => !playerSeated && !inVehicle && !handheldState.item,
    label: () => `Ambil ${drop.item === 'parcel' ? `${drop.count} paket` : worldDropNames[drop.item]}`,
    action: () => pickUpWorldDrop(drop)
  };
  drop.target = target;
  interactables.push(target);
}

function createWorldDrop(item, count, persistent, position, velocity = { x: 0, y: 0, z: 0 }, options = {}) {
  if (!heldProps[item]) return null;
  const source = heldProps[item];
  avatar.updateMatrixWorld(true);
  const object = source.clone(true);
  avatar.add(object);
  object.visible = true;
  object.updateMatrixWorld(true);
  scene.attach(object);
  object.position.set(position.x, position.y, position.z);
  object.rotation.set(position.rotationX || 0, Number.isFinite(position.rotationY) ? position.rotationY : avatar.rotation.y, position.rotationZ || 0);
  object.scale.copy(source.scale);
  if (item === 'parcel') object.children.forEach((child, index) => { child.visible = index < Math.max(1, Math.min(3, count)); });
  object.traverse(child => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });
  const drop = {
    id: ++worldDropInstanceId, item, count: Math.max(1, Math.min(3, Math.floor(count) || 1)), persistent: !!persistent,
    group: object, velocity: new THREE.Vector3(velocity.x || 0, velocity.y || 0, velocity.z || 0),
    angularVelocity: new THREE.Vector3(options.angularX || 0, options.angularY || 0, options.angularZ || 0),
    restHeight: worldDropRestHeight[item] || 0.12,
    groundLevel: Number.isFinite(options.groundLevel) ? options.groundLevel : dropGroundHeight(position.x, position.z, player.position.y),
    surfaceId: options.surfaceId || null,
    age: 0, target: null
  };
  worldDrops.push(drop);
  registerWorldDropTarget(drop);
  return drop;
}

function clearWorldDrops() {
  for (const drop of worldDrops) {
    scene.remove(drop.group);
    const targetIndex = interactables.findIndex(target => target.id === 'world-drop-' + drop.id);
    if (targetIndex >= 0) interactables.splice(targetIndex, 1);
  }
  worldDrops.length = 0;
  worldDropInstanceId = 0;
}

function restoreWorldDrops(savedDrops) {
  clearWorldDrops();
  if (!Array.isArray(savedDrops)) return;
  for (const saved of savedDrops.slice(0, 40)) {
    if (!saved || !heldProps[saved.item] || ![saved.x, saved.y, saved.z].every(Number.isFinite)) continue;
    const count = Math.max(1, Math.min(3, Math.floor(Number(saved.count) || 1)));
    const x = clamp(saved.x, -51, 51), z = clamp(saved.z, -46, 226.8);
    const referenceY = clamp(Number(saved.groundLevel) || 0, 0, 5.2);
    const groundY = dropGroundHeight(x, z, referenceY);
    const restHeight = worldDropRestHeight[saved.item] || 0.12;
    const surfaceId = typeof saved.surfaceId === 'string' && objectSurfaces.some(surface => surface.id === saved.surfaceId) ? saved.surfaceId : null;
    const safeY = surfaceId ? clamp(Number(saved.y), groundY + restHeight, 9) : Math.max(groundY + restHeight, clamp(Number(saved.y), groundY + restHeight, 9));
    const drop = createWorldDrop(saved.item, count, !!saved.persistent, {
      x, y: safeY, z, rotationY: Number.isFinite(saved.rotationY) ? saved.rotationY : 0
    }, { x: 0, y: 0, z: 0 }, { groundLevel: groundY, surfaceId });
    if (drop) drop.age = Math.max(0, Number(saved.age) || 0);
  }
}

function nearestObjectSurface() {
  let best = null, bestDistance = 3.7;
  for (const surface of objectSurfaces) {
    if (surface.enabled && !surface.enabled()) continue;
    const x = surface.x + clamp(player.position.x - surface.x, -surface.halfX + 0.14, surface.halfX - 0.14);
    const z = surface.z + clamp(player.position.z - surface.z, -surface.halfZ + 0.14, surface.halfZ - 0.14);
    const distance = Math.hypot(player.position.x - x, player.position.z - z);
    if (distance < bestDistance) { best = { ...surface, placeX: x, placeZ: z }; bestDistance = distance; }
  }
  return best;
}

function dropHandheldObject(placeOnSurface = false) {
  if (!isStarted || isUiOpen() || inVehicle || playerSeated || !handheldState.item) return;
  if (worldDrops.length >= 40) { showToast('DUNIA SUDAH PENUH BARANG JATUH · AMBIL BEBERAPA DULU'); return; }
  const item = handheldState.item;
  const count = handheldState.count;
  const persistent = handheldState.persistent;
  const forwardX = -Math.sin(avatar.rotation.y), forwardZ = -Math.cos(avatar.rotation.y);
  let position, throwVelocity, options;
  if (placeOnSurface) {
    const surface = nearestObjectSurface();
    if (!surface) { showToast('TIDAK ADA MEJA ATAU PERMUKAAN DI DEKATMU'); return; }
    position = { x: surface.placeX, y: surface.topY + (worldDropRestHeight[item] || 0.12), z: surface.placeZ, rotationY: avatar.rotation.y };
    throwVelocity = { x: 0, y: 0, z: 0 };
    options = { surfaceId: surface.id, groundLevel: surface.topY };
  } else {
    position = { x: player.position.x + forwardX * 0.95, y: player.position.y + 0.82, z: player.position.z + forwardZ * 0.95, rotationY: avatar.rotation.y };
    throwVelocity = { x: velocity.x * 0.22 + forwardX * 2.65, y: 2.05, z: velocity.z * 0.22 + forwardZ * 2.65 };
    options = { groundLevel: dropGroundHeight(player.position.x, player.position.z, player.position.y), angularX: 1.9, angularY: 2.7, angularZ: 1.5 };
  }
  const drop = createWorldDrop(item, count, persistent, position, throwVelocity, options);
  if (!drop) return;
  if (item === 'parcel' && persistent) {
    inventory.parcel = Math.max(0, inventory.parcel - count);
    syncCourierHandheld();
    renderInventory(); updateJobHud();
  }
  playerGesture.type = 'none'; playerGesture.elapsed = 0; playerGesture.weight = 0; playerGesture.target = null;
  clearHandheldObject();
  playerFace.expression = 'neutral'; playerFace.expressionTimer = 0;
  saveGame(false);
  showToast(placeOnSurface ? `BARANG DILETAKKAN · ${worldDropNames[item].toUpperCase()}` : `BARANG DILEMPAR · ${worldDropNames[item].toUpperCase()}`);
}

function pickUpWorldDrop(drop) {
  if (!drop || !worldDrops.includes(drop) || !isStarted || isUiOpen() || inVehicle || playerSeated) return;
  if (handheldState.item) { showToast('LETAKKAN BARANG YANG SEDANG DIBAWA'); return; }
  const pickupPosition = { x: drop.group.position.x, y: drop.group.position.y, z: drop.group.position.z };
  worldDrops.splice(worldDrops.indexOf(drop), 1);
  scene.remove(drop.group);
  const targetIndex = interactables.findIndex(target => target.id === 'world-drop-' + drop.id);
  if (targetIndex >= 0) interactables.splice(targetIndex, 1);
  if (drop.item === 'parcel' && drop.persistent) {
    inventory.parcel = clamp(inventory.parcel + drop.count, 0, 3);
    playPlayerGesture('pickup', pickupPosition, 'parcel', inventory.parcel);
    setHandheldObject('parcel', inventory.parcel, true);
    renderInventory(); updateJobHud();
  } else {
    playPlayerGesture('pickup', pickupPosition, drop.item, drop.count);
    setHandheldObject(drop.item, drop.count, true);
  }
  saveGame(false);
  showToast(`KAMU MENGAMBIL ${drop.item === 'parcel' ? `${drop.count} PAKET` : worldDropNames[drop.item].toUpperCase()}`);
}

function updateWorldDropPhysics(dt) {
  for (const drop of worldDrops) {
    drop.age += dt;
    if (drop.surfaceId) continue;
    const group = drop.group;
    drop.velocity.y -= 14.5 * dt;
    const nextX = group.position.x + drop.velocity.x * dt;
    const nextZ = group.position.z + drop.velocity.z * dt;
    if (collides(nextX, group.position.z)) drop.velocity.x *= -0.24;
    else group.position.x = nextX;
    if (collides(group.position.x, nextZ)) drop.velocity.z *= -0.24;
    else group.position.z = nextZ;
    group.position.y += drop.velocity.y * dt;
    const floorY = dropGroundHeight(group.position.x, group.position.z, drop.groundLevel) + drop.restHeight;
    if (group.position.y <= floorY) {
      group.position.y = floorY;
      if (Math.abs(drop.velocity.y) > 1.0) drop.velocity.y = -drop.velocity.y * 0.2;
      else drop.velocity.y = 0;
      drop.velocity.x *= Math.exp(-5.8 * dt);
      drop.velocity.z *= Math.exp(-5.8 * dt);
      drop.angularVelocity.multiplyScalar(Math.exp(-5.2 * dt));
    }
    group.rotation.x += drop.angularVelocity.x * dt;
    group.rotation.y += drop.angularVelocity.y * dt;
    group.rotation.z += drop.angularVelocity.z * dt;
    if (Math.abs(drop.velocity.x) < 0.015) drop.velocity.x = 0;
    if (Math.abs(drop.velocity.z) < 0.015) drop.velocity.z = 0;
    if (Math.abs(drop.velocity.y) < 0.015 && Math.abs(group.position.y - floorY) < 0.006) drop.velocity.y = 0;
  }
}
function sitOnSeat(seat) {
  if (!seat || inVehicle || playerSeated) return;
  if (handheldState.item) { showToast('LETAKKAN BARANG TERLEBIH DAHULU'); return; }
  playerSeated = true;
  activeSeat = seat;
  velocity.set(0, 0, 0);
  verticalSpeed = 0;
  isGrounded = true;
  moveInput.set(0, 0);
  player.position.set(seat.x, seat.floorY, seat.z);
  avatar.position.y = seat.seatY - seat.floorY - 0.91;
  avatar.rotation.set(0, seat.yaw, 0);
  playerMotion.state = 'idle'; playerMotion.speed = 0; playerMotion.blend = 0; playerMotion.turnRate = 0; playerMotion.landingKick = 0;
  bodyPivot.rotation.set(0, 0, 0);
  headPivot.rotation.set(0, 0, 0);
  hipPivot.rotation.set(0, 0, 0);
  torsoMesh.rotation.set(seat.style === 'lounger' ? -0.2 : 0.035, 0, 0);
  legL.rotation.set(seat.style === 'lounger' ? -0.34 : -1.02, 0, 0);
  legR.rotation.set(seat.style === 'lounger' ? -0.34 : -1.02, 0, 0);
  kneeL.rotation.x = 0.34; kneeR.rotation.x = 0.34;
  footL.rotation.x = -0.12; footR.rotation.x = -0.12;
  armL.rotation.set(-0.08, 0, 0.08);
  armR.rotation.set(-0.08, 0, -0.08);
  elbowL.rotation.x = 0.18; elbowR.rotation.x = 0.18;
  wristL.rotation.set(0, 0, 0); wristR.rotation.set(0, 0, 0);
  clearHandheldObject();
  playerGesture.type = 'none'; playerGesture.weight = 0;
  avatar.rotation.x = 0;
  showToast(`KAMU DUDUK · ${seat.name.toUpperCase()} · TEKAN E UNTUK BANGKIT`);
}
function doSeatedActivity() {
  if (!playerSeated || !activeSeat || !isStarted || isUiOpen()) return;
  if (seatedActivityTimer > 0) { showToast('AKTIVITAS MASIH BERLANGSUNG'); return; }
  const style = activeSeat.style;
  let duration = 0;
  let socialXp = 0;
  if (style === 'stool') {
    if ((inventory.coffee || 0) < 1) { showToast('BELI KOPI DI ESTATE LIVING TERLEBIH DAHULU'); return; }
    inventory.coffee -= 1;
    needs.energy = clamp(needs.energy + 22, 0, 100);
    needs.social = clamp(needs.social + 4, 0, 100);
    seatedActivity = 'coffee';
    duration = 15; socialXp = 6;
    renderInventory();
    showToast('COFFEE BREAK · ENERGY +22 · SOCIAL +4');
  } else if (style === 'sofa') {
    if (!tvOn) {
      tvOn = true;
      updateObjectives('tv');
    }
    needs.social = clamp(needs.social + 10, 0, 100);
    needs.energy = clamp(needs.energy + 2, 0, 100);
    seatedActivity = 'watching';
    duration = 30; socialXp = 12;
    showToast('TV SESSION · SOCIAL +10 · SOCIAL SKILL +12 XP');
  } else if (style === 'lounger') {
    needs.energy = clamp(needs.energy + 18, 0, 100);
    needs.social = clamp(needs.social + 6, 0, 100);
    seatedActivity = 'sunbathing';
    duration = 25; socialXp = 8;
    showToast('POOLSIDE RELAX · ENERGY +18 · SOCIAL +6');
  } else if (style === 'bench') {
    needs.social = clamp(needs.social + 10, 0, 100);
    needs.energy = clamp(needs.energy + 5, 0, 100);
    seatedActivity = 'garden';
    duration = 20; socialXp = 10;
    showToast('GARDEN MOMENT · SOCIAL +10 · ENERGY +5');
  } else if (style === 'terrace') {
    const socialGain = 12 + propertyUpgrades.terrace * 4;
    const energyGain = 5 + propertyUpgrades.terrace * 4;
    needs.social = clamp(needs.social + socialGain, 0, 100);
    needs.energy = clamp(needs.energy + energyGain, 0, 100);
    seatedActivity = 'terrace';
    duration = 20; socialXp = 12;
    showToast(`TERRACE BREAK · SOCIAL +${socialGain} · ENERGY +${energyGain}`);
  }
  if (duration > 0) advanceGameTime(duration);
  if (socialXp > 0) addSkillXp('social', socialXp);
  seatedActivityTimer = 5.5;
  updateNeedsHud(true);
  saveGame(false);
}

function standFromSeat(notify = true) {
  if (!playerSeated || !activeSeat) return;
  const seat = activeSeat;
  const exitX = seat.x + Math.sin(seat.yaw) * 0.88;
  const exitZ = seat.z - Math.cos(seat.yaw) * 0.88;
  const blocked = collides(exitX, seat.z);
  const safeX = blocked ? seat.x + Math.cos(seat.yaw) * 0.88 : exitX;
  const safeZ = blocked ? seat.z + Math.sin(seat.yaw) * 0.88 : exitZ;
  player.position.set(safeX, getGroundHeight(safeX, safeZ), safeZ);
  playerSeated = false;
  activeSeat = null;
  seatedActivity = null;
  seatedActivityTimer = 0;
  seatActivityButton.classList.add('hidden');
  avatar.position.y = 0;
  avatar.rotation.set(0, seat.yaw, 0);
  bodyPivot.rotation.set(0, 0, 0);
  torsoMesh.rotation.set(0, 0, 0);
  headPivot.rotation.set(0, 0, 0);
  hipPivot.rotation.set(0, 0, 0);
  legL.rotation.set(0, 0, 0);
  legR.rotation.set(0, 0, 0);
  kneeL.rotation.set(0, 0, 0); kneeR.rotation.set(0, 0, 0);
  footL.rotation.set(0, 0, 0); footR.rotation.set(0, 0, 0);
  armL.rotation.set(0, 0, 0);
  armR.rotation.set(0, 0, 0);
  elbowL.rotation.set(0, 0, 0); elbowR.rotation.set(0, 0, 0);
  wristL.rotation.set(0, 0, 0); wristR.rotation.set(0, 0, 0);
  clearHandheldObject();
  playerGesture.type = 'none'; playerGesture.weight = 0;
  syncCourierHandheld();
  avatar.position.y = 0;
  playerMotion.blend = 0; playerMotion.state = 'idle'; playerMotion.landingKick = 0;
  velocity.set(0, 0, 0);
  verticalSpeed = 0;
  isGrounded = true;
  if (notify) showToast('KAMU BERDIRI');
}
function playPlayerGesture(type = 'reach', target = null, heldItem = null, heldCount = 1) {
  if (!gestureDurations[type] || inVehicle || playerSeated) return;
  playerGesture.type = type;
  playerGesture.elapsed = 0;
  playerGesture.duration = gestureDurations[type];
  playerGesture.weight = 0;
  if (heldItem) setHandheldObject(heldItem, heldItem === 'parcel' ? Math.max(1, heldCount || inventory.parcel || 1) : 1, false);
  else if (type === 'read') setHandheldObject('book');
  else if (!handheldState.persistent) clearHandheldObject();
  playerGesture.target = target && Number.isFinite(target.x) && Number.isFinite(target.z)
    ? new THREE.Vector3(target.x, Number.isFinite(target.y) ? target.y : 0, target.z)
    : null;
  playerFace.expression = type === 'wave' || type === 'talk' || type === 'offer' || type === 'handoff' ? 'smile' : ['inspect','read','work','pickup','water','cook'].includes(type) ? 'focused' : 'neutral';
  playerFace.expressionTimer = playerGesture.duration;
}

function updatePlayerInteractionAnimation(dt) {
  // Small, irregular blinks and subtle expression changes keep the face from feeling frozen.
  playerFace.blinkTimer -= dt;
  if (playerFace.blinkTimer <= 0 && playerFace.blinkRemaining <= 0) {
    playerFace.blinkRemaining = 0.15;
    playerFace.blinkTimer = 2.2 + Math.random() * 2.7;
  }
  if (playerFace.blinkRemaining > 0) playerFace.blinkRemaining = Math.max(0, playerFace.blinkRemaining - dt);
  const blinkProgress = playerFace.blinkRemaining > 0 ? 1 - playerFace.blinkRemaining / 0.15 : 0;
  const blinkAmount = playerFace.blinkRemaining > 0 ? Math.sin(blinkProgress * Math.PI) : 0;
  const eyeScale = 1 - blinkAmount * 0.9;
  eyeL.scale.y = THREE.MathUtils.damp(eyeL.scale.y, eyeScale, 32, dt);
  eyeR.scale.y = THREE.MathUtils.damp(eyeR.scale.y, eyeScale, 32, dt);
  const smiling = playerFace.expression === 'smile' && playerFace.expressionTimer > 0;
  mouthMesh.scale.x = THREE.MathUtils.damp(mouthMesh.scale.x, smiling ? 1.35 : 1, 7, dt);
  mouthMesh.scale.y = THREE.MathUtils.damp(mouthMesh.scale.y, smiling ? 1.45 : 1, 7, dt);
  browL.rotation.z = THREE.MathUtils.damp(browL.rotation.z, playerFace.expression === 'focused' ? -0.18 : -0.08, 6, dt);
  browR.rotation.z = THREE.MathUtils.damp(browR.rotation.z, playerFace.expression === 'focused' ? 0.18 : 0.08, 6, dt);
  if (playerFace.expressionTimer > 0) playerFace.expressionTimer = Math.max(0, playerFace.expressionTimer - dt);
  else playerFace.expression = 'neutral';

  if (playerSeated || inVehicle || !player.visible) {
    return;
  }
  if (playerGesture.type === 'none') {
    const carryingParcel = handheldState.item === 'parcel' && handheldState.persistent;
    // Only override the locomotion arm swing when the player is actually carrying packages.
    if (carryingParcel) {
      armL.rotation.x = THREE.MathUtils.damp(armL.rotation.x, 0.46, 9, dt);
      armR.rotation.x = THREE.MathUtils.damp(armR.rotation.x, 0.46, 9, dt);
      armL.rotation.z = THREE.MathUtils.damp(armL.rotation.z, 0.13, 9, dt);
      armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, -0.13, 9, dt);
      elbowL.rotation.x = THREE.MathUtils.damp(elbowL.rotation.x, 0.62, 9, dt);
      elbowR.rotation.x = THREE.MathUtils.damp(elbowR.rotation.x, 0.62, 9, dt);
    }
    wristL.rotation.x = THREE.MathUtils.damp(wristL.rotation.x, 0, 10, dt);
    wristL.rotation.y = THREE.MathUtils.damp(wristL.rotation.y, 0, 10, dt);
    wristL.rotation.z = THREE.MathUtils.damp(wristL.rotation.z, 0, 10, dt);
    wristR.rotation.x = THREE.MathUtils.damp(wristR.rotation.x, 0, 10, dt);
    wristR.rotation.y = THREE.MathUtils.damp(wristR.rotation.y, 0, 10, dt);
    wristR.rotation.z = THREE.MathUtils.damp(wristR.rotation.z, 0, 10, dt);
    return;
  }
  playerGesture.elapsed += dt;
  const progress = clamp(playerGesture.elapsed / playerGesture.duration, 0, 1);
  const envelope = Math.pow(Math.sin(progress * Math.PI), 0.72);
  playerGesture.weight = envelope;
  const wave = Math.sin(playerGesture.elapsed * 15.5);
  const talkBeat = Math.sin(playerGesture.elapsed * 8.2);
  const carryParcel = handheldState.item === 'parcel' && handheldState.persistent;
  const pose = { armLX: carryParcel ? 0.46 : 0, armRX: carryParcel ? 0.46 : 0, armLZ: carryParcel ? 0.13 : 0, armRZ: carryParcel ? -0.13 : 0, elbowLX: carryParcel ? 0.62 : 0.08, elbowRX: carryParcel ? 0.62 : 0.08, wristRX: 0, wristRY: 0, wristRZ: 0, chest: 0, headX: 0, headY: 0 };

  if (playerGesture.type === 'wave') {
    pose.armRX = 0.12; pose.armRZ = 1.02; pose.elbowRX = 1.12 + wave * 0.07;
    pose.wristRZ = wave * 0.34; pose.wristRY = wave * 0.14;
    pose.headX = -0.035; pose.headY = 0.04;
  } else if (playerGesture.type === 'reach') {
    pose.armRX = 0.92; pose.elbowRX = 0.34; pose.armRZ = -0.06;
    pose.chest = 0.085; pose.headX = 0.07;
  } else if (playerGesture.type === 'inspect') {
    pose.armRX = 0.42; pose.elbowRX = 0.8; pose.armRZ = 0.12;
    pose.chest = 0.13; pose.headX = 0.16;
  } else if (playerGesture.type === 'read') {
    pose.armRX = 0.52; pose.armLX = 0.52; pose.elbowRX = 0.7; pose.elbowLX = 0.7;
    pose.armRZ = -0.16; pose.armLZ = 0.16; pose.headX = 0.15;
  } else if (playerGesture.type === 'talk') {
    pose.armRX = 0.18 + Math.max(0, talkBeat) * 0.23;
    pose.elbowRX = 0.36 + Math.max(0, talkBeat) * 0.2;
    pose.armRZ = -0.22 - Math.max(0, -talkBeat) * 0.15;
    pose.armLX = 0.08; pose.elbowLX = 0.22; pose.headX = Math.sin(playerGesture.elapsed * 3.2) * 0.035;
  } else if (playerGesture.type === 'offer') {
    pose.armRX = 0.62; pose.armLX = 0.62; pose.elbowRX = 0.34; pose.elbowLX = 0.34;
    pose.armRZ = -0.12; pose.armLZ = 0.12; pose.chest = 0.055;
  } else if (playerGesture.type === 'work' || playerGesture.type === 'water' || playerGesture.type === 'cook') {
    pose.armRX = playerGesture.type === 'water' ? 0.72 : 0.84; pose.armLX = 0.38;
    pose.elbowRX = playerGesture.type === 'water' ? 0.86 : 0.54; pose.elbowLX = 0.4;
    pose.wristRX = playerGesture.type === 'water' ? -0.38 : 0.05;
    pose.wristRZ = playerGesture.type === 'water' ? -0.2 : 0;
    pose.chest = 0.16; pose.headX = 0.2;
  } else if (playerGesture.type === 'pickup') {
    pose.armRX = 0.94; pose.armLX = 0.94; pose.armRZ = -0.1; pose.armLZ = 0.1;
    pose.elbowRX = 0.9; pose.elbowLX = 0.9; pose.chest = 0.18; pose.headX = 0.15;
  } else if (playerGesture.type === 'drink') {
    pose.armRX = 0.78; pose.elbowRX = 1.05; pose.wristRX = -0.22; pose.wristRZ = -0.12; pose.headX = 0.18;
  } else if (playerGesture.type === 'handoff') {
    pose.armRX = 0.8; pose.armLX = 0.8; pose.armRZ = -0.1; pose.armLZ = 0.1;
    pose.elbowRX = 0.42; pose.elbowLX = 0.42; pose.chest = 0.06; pose.headX = 0.04;
  }

  const weight = envelope;
  const damp = (current, target, rate = 15) => THREE.MathUtils.damp(current, target * weight, rate, dt);
  armL.rotation.x = damp(armL.rotation.x, pose.armLX);
  armR.rotation.x = damp(armR.rotation.x, pose.armRX);
  armL.rotation.z = damp(armL.rotation.z, pose.armLZ);
  armR.rotation.z = damp(armR.rotation.z, pose.armRZ);
  elbowL.rotation.x = damp(elbowL.rotation.x, pose.elbowLX);
  elbowR.rotation.x = damp(elbowR.rotation.x, pose.elbowRX);
  wristR.rotation.x = damp(wristR.rotation.x, pose.wristRX);
  wristR.rotation.y = damp(wristR.rotation.y, pose.wristRY);
  wristR.rotation.z = damp(wristR.rotation.z, pose.wristRZ);
  bodyPivot.rotation.x = damp(bodyPivot.rotation.x, pose.chest, 10);
  headPivot.rotation.x = damp(headPivot.rotation.x, pose.headX, 10);
  headPivot.rotation.y = damp(headPivot.rotation.y, pose.headY, 10);

  if (playerGesture.target && playerMotion.speed < 1.25) {
    const dx = playerGesture.target.x - player.position.x;
    const dz = playerGesture.target.z - player.position.z;
    if (Math.hypot(dx, dz) > 0.15) {
      const targetYaw = Math.atan2(-dx, -dz);
      const diff = Math.atan2(Math.sin(targetYaw - avatar.rotation.y), Math.cos(targetYaw - avatar.rotation.y));
      avatar.rotation.y += diff * Math.min(1, dt * 4.8 * weight);
      const localYaw = Math.atan2(Math.sin(targetYaw - avatar.rotation.y), Math.cos(targetYaw - avatar.rotation.y));
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, clamp(localYaw, -0.42, 0.42), 8, dt);
    }
  }
  if (progress >= 1) {
    playerGesture.type = 'none';
    playerGesture.target = null;
    playerGesture.weight = 0;
    if (inventory.parcel > 0 && handheldState.item === 'parcel') syncCourierHandheld();
    else if (!handheldState.persistent) clearHandheldObject();
  }
}

function gestureForInteraction(target) {
  if (!target) return 'reach';
  if (target.id === 'alex' || target.id === 'mia') return 'wave';
  if (target.id === 'bookshelf-reading') return 'read';
  if (target.id === 'creative-studio' || target.id.startsWith('garden-') || target.id.startsWith('parcel-')) return 'work';
  if (target.id === 'mailbox' || target.id === 'furniture-shop' || target.id === 'guest-suite-bed') return 'inspect';
  if (target.id.startsWith('seat-') || target.id === 'vehicle') return 'none';
  return 'reach';
}

function interact() {
  if (!isStarted || isUiOpen()) return;
  if(divingState.active){if(nearestDiveTarget(2.75))collectDiveTarget();else endDive(false);return;}
  if (playerSeated) { standFromSeat(); return; }
  const interactionPosition = inBoat ? marinaBoat.position : inVehicle ? vehicle.position : player.position;
  let nearest = null, nearestDistance = Infinity;
  for (const target of interactables) {
    if(inBoat&&target.id!=='marina-boat')continue;
    if (target.enabled && !target.enabled()) continue;
    const dx = interactionPosition.x - target.x;
    const dy = (inVehicle||inBoat ? 0 : player.position.y) - target.y;
    const dz = interactionPosition.z - target.z;
    const distance = Math.hypot(dx, dy * 1.25, dz);
    if (distance < target.radius && distance < nearestDistance) {
      nearest = target; nearestDistance = distance;
    }
  }
  currentTarget = nearest;
  if (currentTarget) {
    const actionOwnsGesture = currentTarget.id === 'bookshelf-reading' || currentTarget.id === 'creative-studio' || currentTarget.id === 'stove' || currentTarget.id.startsWith('garden-') || currentTarget.id.startsWith('parcel-') || currentTarget.id === 'marina-fishing';
    const gesture = gestureForInteraction(currentTarget);
    if (!actionOwnsGesture && gesture !== 'none' && !inVehicle && !inBoat) playPlayerGesture(gesture, { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z });
    currentTarget.action();
  }
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && placementMode) { cancelDecorPlacement(); return; }
  if (e.code === 'Escape' && isUiOpen()) { closePanels(); return; }
  if (placementMode) {
    if (e.code === 'KeyQ' && !e.repeat) { rotateDecorPlacement(); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); confirmDecorPlacement(); return; }
    return;
  }
  if (isUiOpen()) return;
  if (e.code === 'KeyR' && !e.repeat && inBoat && isAtBoatRaceStart()) { e.preventDefault(); startBoatRace(); return; }
  if (e.code === 'KeyR' && !e.repeat && inVehicle && isAtRoadRallyStart()) { e.preventDefault(); startRoadRally(); return; }
  if (e.code === 'KeyR' && !e.repeat && playerSeated) { e.preventDefault(); doSeatedActivity(); return; }
  if (e.code === 'KeyF' && !e.repeat && inBoat) { e.preventDefault(); collectNearbyBoatSalvage(); return; }
  if (e.code === 'KeyG' && !e.repeat) { e.preventDefault(); dropHandheldObject(false); return; }
  if (e.code === 'KeyH' && !e.repeat) { e.preventDefault(); dropHandheldObject(true); return; }
  if (inBoat && e.code === 'Space') e.preventDefault();
  if (inVehicle && e.code === 'KeyV' && !e.repeat) { e.preventDefault(); playVehicleHorn(); return; }
  if (inVehicle && e.code === 'KeyL' && !e.repeat) { e.preventDefault(); toggleVehicleLights(); return; }
  if (inVehicle && e.code === 'Space') { e.preventDefault(); }
  if (e.code === 'KeyC' && !e.repeat) { e.preventDefault(); resetCameraView(); return; }
  keys.add(e.code);
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyF' && !e.repeat && hangoutSession) {
    hangoutFollowEnabled = !hangoutFollowEnabled;
    showToast(hangoutFollowEnabled ? 'AUTO FOLLOW AKTIF · IKUTI NPC' : 'AUTO FOLLOW DIMATIKAN');
  }
  if (e.code === 'Space' && !e.repeat && !divingState.active) jump();
  if (e.code === 'KeyE' && !e.repeat) interact();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); isRunning = false; vehicleBrakeHeld = false; boatBrakeHeld = false; vehicleSpeed = 0; boatSpeed = 0; });
window.addEventListener('pagehide', () => { if (isStarted && autoSaveEnabled) { try { saveGame(false); } catch (error) { console.warn('Final auto-save failed:', error); } } });
document.addEventListener('visibilitychange', () => { if (document.hidden && isStarted && autoSaveEnabled) { try { saveGame(false); } catch (error) { console.warn('Background auto-save failed:', error); } } });

function formatGameTime() {
  const hours = Math.floor(gameMinutes / 60) % 24;
  const mins = Math.floor(gameMinutes % 60);
  return String(hours).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
}
function advanceGameTime(deltaMinutes) {
  const oldDay = gameDay, oldMinute = gameMinutes;
  const absolute = oldMinute + Math.max(0, deltaMinutes);
  const dayOffset = Math.floor(absolute / 1440);
  const nextDay = oldDay + dayOffset;
  const nextMinute = absolute % 1440;
  let newBills = 0;
  let rentalChanged = false;
  let cafeBusinessChanged = false;
  for (let day = oldDay; day <= nextDay; day++) {
    const dueCrossed = day === oldDay
      ? oldMinute < 420 && (day < nextDay || nextMinute >= 420)
      : day < nextDay || nextMinute >= 420;
    if (dueCrossed) {
      cafeBusinessChanged = processCafeBusinessDay(day) || cafeBusinessChanged;
      if (day > lastBilledDay) { lastBilledDay = day; unpaidBills += propertyDailyBill(); newBills++; rentalChanged = processGuestSuiteRentalDay(day) || rentalChanged; }
    }
  }
  gameDay = nextDay; gameMinutes = nextMinute; lastClockMinute = -1;
  resetBoatSalvageForDay();resetDiveSiteForDay();refreshFarmGrowth();refreshFarmProcessing();
  if (giftLimitDay !== gameDay) { giftLimitDay = gameDay; giftsGivenToday.alex = 0; giftsGivenToday.mia = 0; }
  resetDailyHangouts();
  resetDailySocialTalks();
  resetDailyTasks();
  resetDailyWorkLimits();
  resetCourierNetworkDay();
  if (careerWorkDay !== gameDay) { careerWorkDay = gameDay; careerShiftsToday = 0; }
  const dayLabel = document.querySelector('#house-day');
  if (dayLabel) dayLabel.textContent = 'DAY ' + gameDay;
  if (newBills) {
    updateHouseholdPanel();
    showToast(newBills === 1 ? `TAGIHAN HARIAN TERBIT · $${propertyDailyBill()} · CEK KOTAK SURAT` : `${newBills} TAGIHAN HARIAN TERBIT · CEK KOTAK SURAT`);
  }
  if(rentalChanged){updateHouseholdPanel();if(!document.querySelector('#property-panel').classList.contains('hidden'))renderPropertyPanel();saveGame(false);}
  if(cafeBusinessChanged){renderWorkFinancePanel();saveGame(false);}
}
function saveGame(notify = true) {
  const saveWhilePiloting = inBoat && !boatDockedAtIsland;
  const saveWhileDiving = divingState.active;
  const savePlayerX = saveWhilePiloting ? 23.0 : saveWhileDiving ? 40.0 : playerSeated && activeSeat ? activeSeat.x + Math.sin(activeSeat.yaw) * 0.88 : player.position.x;
  const savePlayerZ = saveWhilePiloting ? 204.9 : saveWhileDiving ? 218.0 : playerSeated && activeSeat ? activeSeat.z - Math.cos(activeSeat.yaw) * 0.88 : player.position.z;
  const savePlayerY = saveWhilePiloting ? 0 : saveWhileDiving || playerSeated && activeSeat ? getGroundHeight(savePlayerX, savePlayerZ) : player.position.y;
  vehicleFleetTelemetry[selectedVehicleType]={fuel:vehicleFuel,dirt:vehicleDirt,tripDistance:vehicleTripDistance};
  const savedBoat = saveWhilePiloting ? { x:34, z:216, yaw:0, tripDistance:boatTripDistance, rentals:boatRentalCount, islandDocked:false, raceBestTime:boatRaceState.bestTime, raceRewardDay:boatRaceState.rewardDay, salvageDay:boatSalvageState.day, salvageCollected:[...boatSalvageState.collected], salvageBonusClaimed:boatSalvageState.bonusClaimed, salvageTotal:boatSalvageState.total } : { x:marinaBoat.position.x, z:marinaBoat.position.z, yaw:boatHeading, tripDistance:boatTripDistance, rentals:boatRentalCount, islandDocked:boatDockedAtIsland, raceBestTime:boatRaceState.bestTime, raceRewardDay:boatRaceState.rewardDay, salvageDay:boatSalvageState.day, salvageCollected:[...boatSalvageState.collected], salvageBonusClaimed:boatSalvageState.bonusClaimed, salvageTotal:boatSalvageState.total };
  const data = {
    version: 18,
    player: { x: savePlayerX, y: savePlayerY, z: savePlayerZ, yaw: avatar.rotation.y },
    townVisited: { ...townVisited },
    vehicle: { x: vehicle.position.x, z: vehicle.position.z, yaw: vehicle.rotation.y },
    vehicleSettings: { lightsMode: vehicleLightsMode, tripDistance: vehicleTripDistance, fuel: vehicleFuel, dirt: vehicleDirt },
    vehicleFleet: { selected:selectedVehicleType, motorcycleOwned, telemetry:{suv:{...vehicleFleetTelemetry.suv},motorcycle:{...vehicleFleetTelemetry.motorcycle}} },
    vehicleGarage: { ...vehicleGarageState },
    cityExpress: {day:courierNetworkState.day,phase:courierNetworkState.phase,routeIndex:courierNetworkState.routeIndex,elapsed:courierNetworkState.elapsed,acceptedToday:courierNetworkState.acceptedToday,completedTotal:courierNetworkState.completedTotal,lastReward:courierNetworkState.lastReward,bestTime:courierNetworkState.bestTime,lastDuration:courierNetworkState.lastDuration},
    roadRally: {bestTime:roadRallyState.bestTime,rewardDay:roadRallyState.rewardDay,completed:roadRallyState.completed,lastTier:roadRallyState.lastTier},
    boat: savedBoat,
    dive: { day:divingState.day, collected:[...divingState.collected], bonusClaimed:divingState.bonusClaimed, total:divingState.total },
    rental: { ...guestSuiteRental },
    cafeBusiness: { ...cafeBusinessState },
    farm: { selectedSeed:farmState.selectedSeed, plots:farmState.plots.map(plot=>({crop:plot.crop,wateredAt:plot.wateredAt,stage:plot.stage})) },
    farmWorkshop: { built:farmWorkshopState.built, activeBatch:farmWorkshopState.activeBatch?{...farmWorkshopState.activeBatch}:null, processedLifetime:farmWorkshopState.processedLifetime },
    gameMinutes, cameraYaw: cameraYawTarget, objectives: objectiveState,
    states: { doorOpen, lightsOn, tvOn, fridgeOpen },
    wallet, propertyUpgrades, lifetimeIncome, lifetimeSpending, transactionHistory, workLimitDay, courierShiftsToday, gardenShiftsToday, inventory, decorPlaced, decorPositions, worldDrops: worldDrops.map(drop => ({ item: drop.item, count: drop.count, persistent: drop.persistent, x: drop.group.position.x, y: drop.group.position.y, z: drop.group.position.z, rotationY: drop.group.rotation.y, groundLevel: drop.groundLevel, surfaceId: drop.surfaceId, age: Math.min(drop.age, 86400) })), heldObject: handheldState.item && handheldState.persistent ? { item: handheldState.item, count: handheldState.count } : null, jobPhase, jobCollected, jobsCompleted, outfitKey, needs, relationships, skills, careerWorkDay, careerShiftsToday, giftLimitDay, giftsGivenToday, hangoutLimitDay, hangoutsToday, hangoutSession: hangoutSession ? { npcId: hangoutSession.npcId, activity: hangoutSession.activity, elapsed: hangoutSession.elapsed, target: [hangoutSession.target.x, hangoutSession.target.z], relationshipReward: hangoutSession.relationshipReward, socialXp: hangoutSession.socialXp, completionLine: hangoutSession.completionLine } : null, socialTalkLimitDay, socialTalksToday, dailyTaskDay, dailyTaskProgress, dailyTaskClaimed, gardenJobPhase, gardenWatered, gardenJobsCompleted, gameDay, lastBilledDay, unpaidBills, billsPaid, settings: { graphicsQuality, autoSaveEnabled }
  };
  localStorage.setItem('estate-explorer-save-v4', JSON.stringify(data));
  autoSaveElapsed = 0;
  if (notify) showToast('PROGRESS TERSIMPAN ✓');
  return true;
}
function loadGame(notify = true) {
  try {
    const raw = localStorage.getItem('estate-explorer-save-v4') || localStorage.getItem('estate-explorer-save-v3');
    if (!raw) { if (notify) showToast('BELUM ADA SAVE DATA'); return false; }
    const data = JSON.parse(raw);
    if (![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)) throw new Error('Save version is not supported');
    hangoutSession = null;
    clearHandheldObject();
    playerGesture.type = 'none'; playerGesture.elapsed = 0; playerGesture.weight = 0;
    if (playerSeated) standFromSeat(false);
    player.position.set(clamp(data.player.x,-51,51), Math.max(0,data.player.y||0), clamp(data.player.z,-43,226.8));
    avatar.rotation.y = data.player.yaw || 0;
    vehicle.position.set(clamp(data.vehicle.x,-50.2,50.2),0,clamp(data.vehicle.z,-44,224.4));
    vehicle.rotation.y = data.vehicle.yaw || 0;
    const savedFleet=data.vehicleFleet||{};motorcycleOwned=!!savedFleet.motorcycleOwned;selectedVehicleType=savedFleet.selected==='motorcycle'&&motorcycleOwned?'motorcycle':'suv';
    vehicleCarModel.visible=selectedVehicleType==='suv';vehicleMotorcycleModel.visible=selectedVehicleType==='motorcycle';motorcycleRider.visible=false;
    for(const type of ['suv','motorcycle']){const saved=savedFleet.telemetry?.[type]||{};vehicleFleetTelemetry[type]={fuel:clamp(Number(saved.fuel??100),0,100),dirt:clamp(Number(saved.dirt??0),0,100),tripDistance:clamp(Number(saved.tripDistance)||0,0,99999)};}
    inBoat=false;boatSpeed=0;boatBrakeHeld=false;player.visible=true;
    marinaBoat.position.set(clamp(Number(data.boat?.x??34),11.5,67.0),0.18,clamp(Number(data.boat?.z??216),204.0,236.0));
    boatHeading=Number.isFinite(data.boat?.yaw)?data.boat.yaw:0;marinaBoat.rotation.y=boatHeading;boatDockedAtIsland=!!data.boat?.islandDocked;
    boatTripDistance=clamp(Number(data.boat?.tripDistance)||0,0,99999);boatRentalCount=clamp(Math.floor(Number(data.boat?.rentals)||0),0,999999);
    boatRaceState.phase='idle';boatRaceState.elapsed=0;boatRaceState.checkpoint=0;boatRaceState.bestTime=clamp(Number(data.boat?.raceBestTime)||0,0,99999);boatRaceState.rewardDay=Math.max(0,Math.floor(Number(data.boat?.raceRewardDay)||0));boatRaceState.lastTime=0;boatRaceState.completed=0;boatRaceState.resultTimer=0;
    const savedRoadRally=data.roadRally||{};roadRallyState.phase='idle';roadRallyState.elapsed=0;roadRallyState.checkpoint=0;roadRallyState.bestTime=clamp(Number(savedRoadRally.bestTime)||0,0,99999);roadRallyState.lastTime=0;roadRallyState.rewardDay=Math.max(0,Math.floor(Number(savedRoadRally.rewardDay)||0));roadRallyState.completed=Math.max(0,Math.floor(Number(savedRoadRally.completed)||0));roadRallyState.lastTier=['GOLD','SILVER','BRONZE','FINISH','--'].includes(savedRoadRally.lastTier)?savedRoadRally.lastTier:'--';roadRallyState.resultTimer=0;roadRallyState.hudSecond=-1;renderRoadRallyHud();
    boatSalvageState.day=Math.max(1,Math.floor(Number(data.boat?.salvageDay??data.gameDay)||1));boatSalvageState.collected=Array.isArray(data.boat?.salvageCollected)&&data.boat.salvageCollected.length===3?data.boat.salvageCollected.map(Boolean):[false,false,false];boatSalvageState.bonusClaimed=!!data.boat?.salvageBonusClaimed;boatSalvageState.total=Math.max(0,Math.floor(Number(data.boat?.salvageTotal)||0));
    divingState.active=false;divingState.oxygen=divingState.maxOxygen;divingState.day=Math.max(1,Math.floor(Number(data.dive?.day??data.gameDay)||1));divingState.collected=Array.isArray(data.dive?.collected)&&data.dive.collected.length===3?data.dive.collected.map(Boolean):[false,false,false];divingState.bonusClaimed=!!data.dive?.bonusClaimed;divingState.total=Math.max(0,Math.floor(Number(data.dive?.total)||0));diveGear.visible=false;
    vehicleLightsMode = ['auto','on','off'].includes(data.vehicleSettings?.lightsMode) ? data.vehicleSettings.lightsMode : 'auto';
    vehicleTripDistance = clamp(Number(data.vehicleSettings?.tripDistance) || 0, 0, 99999);
    vehicleFuel = clamp(Number(data.vehicleSettings?.fuel ?? 100), 0, 100);
    vehicleDirt = clamp(Number(data.vehicleSettings?.dirt ?? 0), 0, 100);
    const activeTelemetry=savedFleet.telemetry?.[selectedVehicleType];
    if(activeTelemetry){vehicleFuel=clamp(Number(activeTelemetry.fuel??vehicleFuel),0,100);vehicleDirt=clamp(Number(activeTelemetry.dirt??vehicleDirt),0,100);vehicleTripDistance=clamp(Number(activeTelemetry.tripDistance??vehicleTripDistance),0,99999);}
    else vehicleFleetTelemetry.suv={fuel:vehicleFuel,dirt:vehicleDirt,tripDistance:vehicleTripDistance};
    vehicleFleetTelemetry[selectedVehicleType]={fuel:vehicleFuel,dirt:vehicleDirt,tripDistance:vehicleTripDistance};
    const savedVehicleGarage=data.vehicleGarage||{};
    vehicleGarageState.built=!!savedVehicleGarage.built;
    for(const key of Object.keys(vehicleGarageUpgradeDefinitions))vehicleGarageState[key]=clamp(Math.floor(Number(savedVehicleGarage[key])||0),0,vehicleGarageUpgradeDefinitions[key].max);
    vehicleGarageState.paint=vehiclePaintOptions[savedVehicleGarage.paint]?savedVehicleGarage.paint:'midnight';
    vehicleGarageGroup.visible=vehicleGarageState.built;
    applyVehiclePaint();
    vehicleWashTimer = 0;
    vehicleFuelEmptyNotified = vehicleFuel <= 0.01; vehicleLowFuelNotified = vehicleFuel > 0.01 && vehicleFuel < 18;
    vehicleSpeed = 0; vehicleBrakeHeld = false;
    gameMinutes = data.gameMinutes ?? 540;
    cameraYaw = Number.isFinite(data.cameraYaw) ? data.cameraYaw : 0;
    cameraYawTarget = cameraYaw;
    Object.assign(objectiveState, data.objectives || {});
    doorOpen = !!data.states?.doorOpen;
    lightsOn = !!data.states?.lightsOn;
    tvOn = !!data.states?.tvOn;
    fridgeOpen = !!data.states?.fridgeOpen;
    wallet = data.version >= 4 ? (data.wallet ?? 650) : 650;
    Object.assign(propertyUpgrades, { solar: 0, kitchen: 0, bedroom: 0, terrace: 0, studio: 0, guestSuite: 0 }, data.propertyUpgrades || {});
    for (const key of Object.keys(propertyUpgradeDefinitions)) propertyUpgrades[key] = clamp(Math.floor(Number(propertyUpgrades[key]) || 0), 0, propertyUpgradeDefinitions[key].levels.length);
    const savedRental=data.rental||{};
    Object.assign(guestSuiteRental,{listing:!!savedRental.listing&&propertyUpgrades.guestSuite>=2,tenantActive:!!savedRental.tenantActive&&!!savedRental.listing&&propertyUpgrades.guestSuite>=2,tenantName:String(savedRental.tenantName||'').slice(0,36),moveInDay:clamp(Math.floor(Number(savedRental.moveInDay)||0),0,9999999),leaseEndDay:clamp(Math.floor(Number(savedRental.leaseEndDay)||0),0,9999999),daysPaid:clamp(Math.floor(Number(savedRental.daysPaid)||0),0,999999),grossEarned:clamp(Math.floor(Number(savedRental.grossEarned)||0),0,999999999),feesPaid:clamp(Math.floor(Number(savedRental.feesPaid)||0),0,999999999),lifetimePaidDays:clamp(Math.floor(Number(savedRental.lifetimePaidDays??savedRental.daysPaid)||0),0,9999999),lifetimeGrossEarned:clamp(Math.floor(Number(savedRental.lifetimeGrossEarned??savedRental.grossEarned)||0),0,999999999),lifetimeFeesPaid:clamp(Math.floor(Number(savedRental.lifetimeFeesPaid??savedRental.feesPaid)||0),0,999999999),lastPaidDay:clamp(Math.floor(Number(savedRental.lastPaidDay)||0),0,9999999)});
    if(!guestSuiteRental.listing){guestSuiteRental.tenantActive=false;guestSuiteRental.tenantName='';guestSuiteRental.moveInDay=0;guestSuiteRental.leaseEndDay=0;}
    const savedCafeBusiness=data.cafeBusiness||{};
    cafeBusinessState.owned=!!savedCafeBusiness.owned;
    cafeBusinessState.open=cafeBusinessState.owned&&!!savedCafeBusiness.open;
    cafeBusinessState.stock=clamp(Math.floor(Number(savedCafeBusiness.stock)||0),0,cafeBusinessConfig.stockCapacity);
    cafeBusinessState.localStock=cafeBusinessState.owned?clamp(Math.floor(Number(savedCafeBusiness.localStock)||0),0,cafeBusinessConfig.localStockCapacity):0;
    cafeBusinessState.localDeliveries=clamp(Math.floor(Number(savedCafeBusiness.localDeliveries)||0),0,9999999);
    cafeBusinessState.lifetimeLocalServings=clamp(Math.floor(Number(savedCafeBusiness.lifetimeLocalServings)||0),0,999999999);
    cafeBusinessState.lastLocalServings=clamp(Math.floor(Number(savedCafeBusiness.lastLocalServings)||0),0,cafeBusinessConfig.dailyStockUse);
    cafeBusinessState.reputation=clamp(Math.floor(Number(savedCafeBusiness.reputation)||0),0,10);
    cafeBusinessState.espresso=clamp(Math.floor(Number(savedCafeBusiness.espresso)||0),0,3);
    cafeBusinessState.patio=clamp(Math.floor(Number(savedCafeBusiness.patio)||0),0,3);
    cafeBusinessState.operatingDays=clamp(Math.floor(Number(savedCafeBusiness.operatingDays)||0),0,9999999);
    cafeBusinessState.lifetimeSales=clamp(Math.floor(Number(savedCafeBusiness.lifetimeSales)||0),0,999999999);
    cafeBusinessState.lifetimeOperatingCosts=clamp(Math.floor(Number(savedCafeBusiness.lifetimeOperatingCosts)||0),0,999999999);
    cafeBusinessState.lastOperatedDay=clamp(Math.floor(Number(savedCafeBusiness.lastOperatedDay)||0),0,9999999);
    cafeBusinessState.lastProfit=clamp(Math.floor(Number(savedCafeBusiness.lastProfit)||0),-999999,999999);
    cafeBusinessState.lastCustomers=clamp(Math.floor(Number(savedCafeBusiness.lastCustomers)||0),0,9999);
    if(!cafeBusinessState.owned)Object.assign(cafeBusinessState,{open:false,stock:0,localStock:0,localDeliveries:0,lifetimeLocalServings:0,lastLocalServings:0,reputation:0,espresso:0,patio:0});
    applyPropertyUpgradeVisuals();
    lifetimeIncome = Math.max(0, Math.floor(Number(data.lifetimeIncome) || 0));
    lifetimeSpending = Math.max(0, Math.floor(Number(data.lifetimeSpending) || 0));
    transactionHistory.splice(0, transactionHistory.length, ...(Array.isArray(data.transactionHistory) ? data.transactionHistory.filter(entry => entry && Number.isFinite(entry.amount)).slice(0,12).map(entry => ({ label: String(entry.label || 'Transaction').slice(0,64), amount: Math.trunc(entry.amount), day: Math.max(1,Math.floor(entry.day||1)), time: /^\d{2}:\d{2}$/.test(entry.time||'') ? entry.time : '00:00' })) : []));
    Object.assign(inventory, { houseKey: 1, phone: 1, parcel: 0, plant: 0, floorLamp: 0, bookshelf: 0, sideTable: 0, areaRug: 0, bouquet: 0, coffee: 0, sandwich: 0, apple: 0, water: 0, pastry: 0, fishSardine: 0, fishBass: 0, fishGolden: 0, seedTomato:0, seedCarrot:0, seedStrawberry:0, harvestTomato:0, harvestCarrot:0, harvestStrawberry:0, tomatoPreserve:0, carrotJuice:0, strawberryJam:0 }, data.inventory || {});
    const savedWorkshop=data.farmWorkshop||{};
    farmWorkshopState.built=!!savedWorkshop.built;
    farmWorkshopState.activeBatch=savedWorkshop.activeBatch&&farmRecipeDefinitions[savedWorkshop.activeBatch.recipe]&&Number.isFinite(Number(savedWorkshop.activeBatch.readyAt))?{recipe:savedWorkshop.activeBatch.recipe,startedAt:clamp(Number(savedWorkshop.activeBatch.startedAt)||0,0,999999999),readyAt:clamp(Number(savedWorkshop.activeBatch.readyAt)||0,0,999999999)}:null;
    farmWorkshopState.processedLifetime=clamp(Math.floor(Number(savedWorkshop.processedLifetime)||0),0,999999999);
    farmWorkshopGroup.visible=farmWorkshopState.built;
    farmState.selectedSeed=farmCropDefinitions[data.farm?.selectedSeed]?data.farm.selectedSeed:'tomato';
    const savedFarmPlots=Array.isArray(data.farm?.plots)?data.farm.plots:[];
    farmState.plots.forEach((plot,index)=>{const saved=savedFarmPlots[index]||{};plot.crop=farmCropDefinitions[saved.crop]?saved.crop:null;plot.wateredAt=plot.crop?clamp(Number(saved.wateredAt)||0,0,999999999):0;plot.stage=plot.crop?clamp(Math.floor(Number(saved.stage)||0),0,3):0;});
    Object.assign(townVisited, { cafe:false, market:false, park:false, fuelStop:false, riverside:false, marina:false, northShoal:false, northShoalTreasure:false }, data.townVisited || {});
    shoalChest.visible=!townVisited.northShoalTreasure;
    syncCourierHandheld();
    Object.assign(decorPlaced, { plant: false, floorLamp: false, bookshelf: false, sideTable: false, areaRug: false }, data.decorPlaced || {});
    decorPositions.splice(0,decorPositions.length,...(Array.isArray(data.decorPositions) ? data.decorPositions.filter(item => decorCatalog[item.item] && [item.x,item.y,item.z].every(Number.isFinite)).map(item => ({ id: Number(item.id)||0, item: item.item, x: item.x, y: item.y, z: item.z, yaw: Number(item.yaw)||0 })) : []));
    if (!Array.isArray(data.decorPositions)) {
      if (data.decorPlaced?.plant) decorPositions.push({ id: 1, item: 'plant', x: 6.2, y: 0.22, z: -4.4, yaw: 0 });
      if (data.decorPlaced?.floorLamp) decorPositions.push({ id: 2, item: 'floorLamp', x: -5.7, y: 0.22, z: -4.9, yaw: 0 });
    }
    decorInstanceId = decorPositions.reduce((max,item) => Math.max(max,Number(item.id)||0),0);
    jobPhase = data.jobPhase || 'idle'; jobCollected = data.jobCollected || [false,false,false]; jobsCompleted = data.jobsCompleted || 0;
    outfitKey = data.outfitKey || 'forest'; shirtMat.color.setHex(outfitColors[outfitKey] || outfitColors.forest);
    Object.assign(needs, { hunger: 100, energy: 100, social: 50, hygiene: 100, bladder: 100 }, data.needs || {});
    Object.assign(relationships, { alex: 12, mia: 12 }, data.relationships || {});
    Object.assign(skills, { cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 }, data.skills || {});
    for (const key of Object.keys(skills)) skills[key] = clamp(Number(skills[key]) || 0, 0, 2700);
    gardenJobPhase = data.gardenJobPhase || 'idle';
    gardenWatered = Array.isArray(data.gardenWatered) && data.gardenWatered.length === 3 ? data.gardenWatered.map(Boolean) : [false,false,false];
    gardenJobsCompleted = data.gardenJobsCompleted || 0;
    if (data.settings?.graphicsQuality) applyGraphicsQuality(data.settings.graphicsQuality);
    if (typeof data.settings?.autoSaveEnabled === 'boolean') {
      autoSaveEnabled = data.settings.autoSaveEnabled;
      try { localStorage.setItem('estate-auto-save', String(autoSaveEnabled)); } catch {}
    }
    gameDay = Math.max(1, data.gameDay || 1);
    const savedExpress=data.cityExpress||{};
    courierNetworkState.day=Math.max(1,Math.floor(Number(savedExpress.day)||gameDay));
    courierNetworkState.phase=savedExpress.phase==='enroute'&&Number.isInteger(savedExpress.routeIndex)&&courierNetworkRoutes[savedExpress.routeIndex]?'enroute':'idle';
    courierNetworkState.routeIndex=courierNetworkState.phase==='enroute'?savedExpress.routeIndex:-1;
    courierNetworkState.elapsed=clamp(Number(savedExpress.elapsed)||0,0,3600);
    courierNetworkState.acceptedToday=clamp(Math.floor(Number(savedExpress.acceptedToday)||0),0,2);
    courierNetworkState.completedTotal=Math.max(0,Math.floor(Number(savedExpress.completedTotal)||0));
    courierNetworkState.lastReward=Math.max(0,Math.floor(Number(savedExpress.lastReward)||0));
    courierNetworkState.bestTime=clamp(Number(savedExpress.bestTime)||0,0,3600);
    courierNetworkState.lastDuration=clamp(Number(savedExpress.lastDuration)||0,0,3600);
    courierNetworkState.hudSecond=-1;
    courierNetworkMarker.group.visible=courierNetworkState.phase==='enroute';
    if(courierNetworkMarker.group.visible){const activeRoute=currentCourierNetworkRoute();courierNetworkMarker.group.position.set(activeRoute.x,0,activeRoute.z);}
    resetCourierNetworkDay();
    resetBoatSalvageForDay();boatSalvagePods.forEach((pod,index)=>{pod.group.visible=!boatSalvageState.collected[index];});
    resetDiveSiteForDay();diveTargets.forEach((target,index)=>{target.group.visible=!divingState.collected[index];});
    refreshFarmGrowth();refreshFarmProcessing();farmPlots.forEach((plot,index)=>updateFarmPlotVisual(index));
    workLimitDay = Math.max(1, data.workLimitDay || gameDay);
    courierShiftsToday = workLimitDay === gameDay ? clamp(Math.floor(data.courierShiftsToday || 0), 0, 1) : 0;
    gardenShiftsToday = workLimitDay === gameDay ? clamp(Math.floor(data.gardenShiftsToday || 0), 0, 1) : 0;
    resetDailyWorkLimits();
    careerWorkDay = Math.max(1, data.careerWorkDay || gameDay);
    careerShiftsToday = careerWorkDay === gameDay ? clamp(Math.floor(data.careerShiftsToday || 0), 0, 2) : 0;
    giftLimitDay = Math.max(1, data.giftLimitDay || gameDay);
    Object.assign(giftsGivenToday, { alex: 0, mia: 0 }, data.giftsGivenToday || {});
    if (giftLimitDay !== gameDay) { giftLimitDay = gameDay; giftsGivenToday.alex = 0; giftsGivenToday.mia = 0; }
    for (const key of ['alex','mia']) giftsGivenToday[key] = clamp(Math.floor(giftsGivenToday[key] || 0), 0, 1);
    hangoutLimitDay = Math.max(1, data.hangoutLimitDay || gameDay);
    Object.assign(hangoutsToday, { alex: 0, mia: 0 }, data.hangoutsToday || {});
    resetDailyHangouts();
    for (const key of ['alex','mia']) hangoutsToday[key] = clamp(Math.floor(hangoutsToday[key] || 0), 0, 1);
    const savedHangout = data.version >= 16 ? data.hangoutSession : null;
    if (savedHangout && ['alex','mia'].includes(savedHangout.npcId) && ['garden','pool','coffee','picnic'].includes(savedHangout.activity)
      && Array.isArray(savedHangout.target) && savedHangout.target.length === 2 && savedHangout.target.every(Number.isFinite)) {
      const person = npcs.find(item => item.id === savedHangout.npcId);
      if (person) {
        const targetX = clamp(savedHangout.target[0], -50, 50), targetZ = clamp(savedHangout.target[1], -43, 105);
        const target = new THREE.Vector3(targetX, 0, targetZ);
        person.npc.position.copy(person.spawnPosition);
        person.npc.rotation.y = 0;
        person.activeRoutine = ''; person.activeSeat = null; person.restingOnSeat = false;
        person.cup.visible = false; person.food.visible = false; person.activity = savedHangout.activity;
        person.route = [target.clone()]; person.targetIndex = 0;
        hangoutsToday[person.id] = 1;
        hangoutSession = {
          npcId: person.id, activity: savedHangout.activity, target,
          elapsed: clamp(Number(savedHangout.elapsed) || 0, 0, 12), arrived: false, playerArrived: false, waitingNotified: false, reactionCycle: -1,
          relationshipReward: clamp(Math.floor(Number(savedHangout.relationshipReward) || 0), 0, 40),
          socialXp: clamp(Math.floor(Number(savedHangout.socialXp) || 0), 0, 40), gesture: 0,
          completionLine: String(savedHangout.completionLine || 'Terima kasih sudah menghabiskan waktu bersama.').slice(0, 220)
        };
        hangoutFollowEnabled = true;
      }
    }
    socialTalkLimitDay = Math.max(1, data.socialTalkLimitDay || gameDay);
    Object.assign(socialTalksToday, { alex: 0, mia: 0 }, data.socialTalksToday || {});
    resetDailySocialTalks();
    for (const key of ['alex','mia']) socialTalksToday[key] = clamp(Math.floor(socialTalksToday[key] || 0), 0, 2);
    dailyTaskDay = Math.max(1, data.dailyTaskDay || gameDay);
    Object.assign(dailyTaskProgress, data.dailyTaskProgress || {});
    Object.assign(dailyTaskClaimed, data.dailyTaskClaimed || {});
    resetDailyTasks();
    for (const id of activeDailyTaskIds()) {
      dailyTaskProgress[id] = clamp(Number(dailyTaskProgress[id]) || 0, 0, dailyTaskDefinitions[id].goal);
      dailyTaskClaimed[id] = !!dailyTaskClaimed[id];
    }
    lastBilledDay = Math.max(1, data.lastBilledDay ?? gameDay);
    unpaidBills = Math.max(0, data.unpaidBills || 0); billsPaid = Math.max(0, data.billsPaid || 0);
    updateNeedsHud(true); renderSkills(); renderCareerPanel();
    inVehicle = false; vehicleSpeed = 0; player.visible = true;
    parcelObjects.forEach(parcel => { parcel.group.visible = jobPhase === 'collect' && !jobCollected[parcel.index]; });
    gardenTaskMarkers.forEach(marker => { marker.group.visible = gardenJobPhase === 'active' && !gardenWatered[marker.index]; });
    syncPlacedDecor();
    restoreWorldDrops(data.worldDrops);
    if (data.heldObject && heldProps[data.heldObject.item] && data.heldObject.item !== 'parcel') setHandheldObject(data.heldObject.item, data.heldObject.count, true);
    setWallet(wallet); renderInventory(); renderShop(); updateJobHud(); updateNeedsHud(true); updateHouseholdPanel(); updateSettingsPanel(); renderWorkFinancePanel(); renderPropertyPanel(); renderCourierNetworkHud(true); closePanels();
    const completed = Object.values(objectiveState).filter(Boolean).length;
    document.querySelector('#tour-count').textContent = String(completed).padStart(2,'0') + ' / 04';
    document.querySelector('#tour-progress').style.width = (completed/4*100) + '%';
    const next = objectiveLabels.find(([key]) => !objectiveState[key]);
    document.querySelector('#tour-objective').textContent = next ? next[1] : 'Tour selesai — properti berhasil dijelajahi!';
    if (notify) showToast('PROGRESS BERHASIL DIMUAT ✓');
    return true;
  } catch (error) {
    console.warn('Could not load Estate Explorer save:', error);
    if (notify) showToast('SAVE DATA TIDAK BISA DIBACA');
    return false;
  }
}
document.querySelector('#save-btn').addEventListener('click', () => saveGame());
document.querySelector('#load-btn').addEventListener('click', () => loadGame());
window.addEventListener('keydown', e => {
  if (e.code === 'F6') { e.preventDefault(); saveGame(); }
  if (e.code === 'F9') { e.preventDefault(); loadGame(); }
});

renderer.domElement.style.touchAction = 'none';
function pinchDistance() {
  const points = [...cameraPointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (placementMode) {
    updatePlacementTarget(e.clientX,e.clientY);
    return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  cameraPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, pointerType: e.pointerType });
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
  if (cameraPointers.size === 1) {
    dragging = true;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
  } else if (cameraPointers.size >= 2) {
    dragging = false;
    previousPinchDistance = pinchDistance();
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (placementMode) {
    updatePlacementTarget(e.clientX,e.clientY);
    return;
  }
  if (!cameraPointers.has(e.pointerId)) return;
  const previous = cameraPointers.get(e.pointerId);
  cameraPointers.set(e.pointerId, { ...previous, x: e.clientX, y: e.clientY });
  if (cameraPointers.size >= 2) {
    const nextDistance = pinchDistance();
    if (previousPinchDistance > 0 && nextDistance > 0) {
      cameraDistanceTarget = clamp(cameraDistanceTarget - (nextDistance - previousPinchDistance) * 0.018, 5.4, 14.2);
    }
    previousPinchDistance = nextDistance;
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  const baseSensitivity = e.pointerType === 'touch' ? 0.007 : 0.005;
  const sensitivity = baseSensitivity * cameraSensitivityOptions[cameraSensitivity];
  cameraYawTarget -= dx * sensitivity;
  cameraPitchTarget = clamp(cameraPitchTarget + dy * sensitivity * 0.6 * (invertCameraY ? -1 : 1), -0.08, 0.78);
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
});
function finishCameraPointer(e) {
  cameraPointers.delete(e.pointerId);
  if (cameraPointers.size === 1) {
    const remaining = [...cameraPointers.values()][0];
    lastPointer.x = remaining.x; lastPointer.y = remaining.y;
    dragging = true;
  } else {
    dragging = false;
  }
  previousPinchDistance = cameraPointers.size >= 2 ? pinchDistance() : 0;
}
renderer.domElement.addEventListener('pointerup', finishCameraPointer);
renderer.domElement.addEventListener('pointercancel', finishCameraPointer);
renderer.domElement.addEventListener('lostpointercapture', finishCameraPointer);
renderer.domElement.addEventListener('wheel', (e) => {
  if (placementMode) return;
  e.preventDefault();
  cameraDistanceTarget = clamp(cameraDistanceTarget + clamp(e.deltaY * 0.0028, -1.25, 1.25), 5.4, 14.2);
}, { passive: false });

// Touch joystick
const stickRing = document.querySelector('#stick-ring');
const stickKnob = document.querySelector('#stick-knob');
const followButton = document.querySelector('#follow-btn');
followButton.addEventListener('click', () => {
  if (!hangoutSession) return;
  hangoutFollowEnabled = !hangoutFollowEnabled;
  followButton.classList.toggle('active', hangoutFollowEnabled);
  setTextIfChanged(followButton, hangoutFollowEnabled ? 'FOLLOW ON' : 'FOLLOW OFF');
  showToast(hangoutFollowEnabled ? 'AUTO FOLLOW AKTIF' : 'AUTO FOLLOW DIMATIKAN');
});
function updateStick(e) {
  const rect = stickRing.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx, dy = e.clientY - cy;
  const max = rect.width * 0.34;
  const len = Math.hypot(dx, dy);
  const s = len > max ? max / len : 1;
  const x = dx * s, y = dy * s;
  joystickVector.set(x / max, -y / max);
  stickKnob.style.transform = `translate(${x}px,${y}px)`;
}
stickRing.addEventListener('pointerdown', (e) => { joystickPointer = e.pointerId; stickRing.setPointerCapture(e.pointerId); updateStick(e); });
stickRing.addEventListener('pointermove', (e) => { if (e.pointerId === joystickPointer) updateStick(e); });
function resetStick() { joystickPointer = null; joystickVector.set(0,0); stickKnob.style.transform = 'translate(0,0)'; }
stickRing.addEventListener('pointerup', resetStick);
stickRing.addEventListener('pointercancel', resetStick);

document.querySelector('#jump-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); if(divingState.active)keys.add('Space');else jump(); });
document.querySelector('#jump-btn').addEventListener('pointerup',()=>keys.delete('Space'));document.querySelector('#jump-btn').addEventListener('pointercancel',()=>keys.delete('Space'));
document.querySelector('#sprint-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); if(divingState.active)keys.add('ShiftLeft');else isRunning = true; });
document.querySelector('#sprint-btn').addEventListener('pointerup', () => {isRunning = false;keys.delete('ShiftLeft');});
document.querySelector('#sprint-btn').addEventListener('pointercancel', () => {isRunning = false;keys.delete('ShiftLeft');});
interactButton.addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
seatActivityButton.addEventListener('pointerdown', (e) => { e.preventDefault(); doSeatedActivity(); });
dropButton.addEventListener('pointerdown', (e) => { e.preventDefault(); dropHandheldObject(false); });
placeButton.addEventListener('pointerdown', (e) => { e.preventDefault(); dropHandheldObject(true); });
brakeButton.addEventListener('pointerdown', (e) => { e.preventDefault(); brakeButton.setPointerCapture?.(e.pointerId); setVehicleBrake(true); });
brakeButton.addEventListener('pointerup', () => setVehicleBrake(false));
brakeButton.addEventListener('pointercancel', () => setVehicleBrake(false));
brakeButton.addEventListener('lostpointercapture', () => setVehicleBrake(false));
boatBrakeButton.addEventListener('pointerdown',e=>{e.preventDefault();boatBrakeButton.setPointerCapture?.(e.pointerId);setBoatBrake(true);});
boatBrakeButton.addEventListener('pointerup',()=>setBoatBrake(false));
boatBrakeButton.addEventListener('pointercancel',()=>setBoatBrake(false));
boatBrakeButton.addEventListener('lostpointercapture',()=>setBoatBrake(false));
boatRaceStartButton?.addEventListener('pointerdown',e=>{e.preventDefault();startBoatRace();});
roadRallyStartButton?.addEventListener('pointerdown',e=>{e.preventDefault();startRoadRally();});
boatSalvageButton?.addEventListener('pointerdown',e=>{e.preventDefault();collectNearbyBoatSalvage();});
hornButton.addEventListener('pointerdown', (e) => { e.preventDefault(); playVehicleHorn(); });
lightsButton.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleVehicleLights(); });

startButton.addEventListener('click', () => {
  isStarted = true;
  root.classList.remove('prestart');
  startScreen.classList.add('dismissed');
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Small world details — clouds
for (const [x,y,z,s] of [[-34,25,-48,1.2],[15,31,-60,1.5],[48,24,-35,1.1],[-62,29,2,1.0]]) {
  const cloud = group(scene, x, y, z);
  for (const [cx,cy,cz,r] of [[0,0,0,2.5],[2.2,.4,0,2],[-2,.1,.2,1.8],[.6,1.1,.3,1.8]]) sphere(cloud,cx*s,cy*s,cz*s,r*s,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.52}),10,8);
}

function getGroundHeight(x, z) {
  const shoalDx=x-44,shoalDz=z-218;
  if(shoalDx*shoalDx+shoalDz*shoalDz<6.52*6.52)return 0.35;
  // The stairwell is a gentle invisible ramp beneath the visible stair treads.
  if (x > 6.55 && x < 9.45 && z >= -7.15 && z <= 3.55) {
    return 0.2 + clamp((3.55 - z) / 10.7, 0, 1) * 4.5;
  }
  const insideExpansion = x < -12.5 && x > -27.5 && ((propertyUpgrades.studio > 0 && z > -10 && z < -1.1) || (propertyUpgrades.guestSuite > 0 && z > -0.9 && z < 8));
  if (insideExpansion) return 0.2;
  const insideHouse = Math.abs(x) < 11.5 && z > -9.5 && z < 7.9;
  if (insideHouse && player.position.y > 3.45) return 4.85;
  return insideHouse ? 0.2 : 0;
}

function updateNpc(npcData, dt) {
  if (hangoutSession?.npcId === npcData.id) {
    npcData.food.visible = false;
    const session = hangoutSession;
    const target = session.target;
    const dx = target.x - npcData.npc.position.x;
    const dz = target.z - npcData.npc.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.45) {
      const vx = dx / distance, vz = dz / distance;
      npcData.npc.position.x += vx * 1.65 * dt;
      npcData.npc.position.z += vz * 1.65 * dt;
      npcData.npc.rotation.y = Math.atan2(vx, -vz);
      npcData.phase += dt * 7;
      const swing = Math.sin(npcData.phase) * 0.48;
      npcData.legs[0].rotation.x = swing; npcData.legs[1].rotation.x = -swing;
      npcData.arms[0].rotation.x = -swing * 0.7; npcData.arms[1].rotation.x = swing * 0.7;
    } else {
      session.arrived = true;
      const playerDistance = Math.hypot(player.position.x - npcData.npc.position.x, player.position.z - npcData.npc.position.z);
      session.playerArrived = !inVehicle && !inBoat && !playerSeated && playerDistance <= 4.4;
      if (session.playerArrived) {
        session.elapsed += dt;
      } else if (!session.waitingNotified) {
        session.waitingNotified = true;
        showToast(`${npcData.displayName.toUpperCase()} SUDAH TIBA · DEKATI UNTUK MEMULAI HANGOUT`);
      }
      npcData.phase += dt * (session.activity === 'coffee' ? 2.8 : 2.1);
      const reactionCycle = Math.floor(session.elapsed / 2.4);
      const reactionEmoji = session.activity === 'coffee' ? ['☕','☺','♡','☕'] : session.activity === 'pool' ? ['☀','☺','♡','✦'] : session.activity === 'picnic' ? ['🥪','☺','♡','🌳'] : ['♡','☺','✿','♡'];
      const emoji = reactionEmoji[reactionCycle % reactionEmoji.length];
      if (session.reactionCycle !== reactionCycle) {
        session.reactionCycle = reactionCycle;
        const ctx = npcData.reactionCtx;
        ctx.clearRect(0, 0, 128, 96); ctx.fillStyle = 'rgba(15,28,25,.88)';
        ctx.beginPath(); ctx.roundRect(10, 5, 108, 76, 22); ctx.fill();
        ctx.strokeStyle = 'rgba(236,226,197,.9)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#fff4d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '54px sans-serif'; ctx.fillText(emoji, 64, 43);
        npcData.reactionTexture.needsUpdate = true;
      }
      npcData.reaction.visible = true;
      npcData.reaction.position.y = 3.55 + Math.sin(session.elapsed * 3) * 0.06;
      const wave = Math.sin(npcData.phase);
      const seated = session.activity !== 'coffee';
      const legPose = seated ? -1.02 : 0;
      npcData.legs.forEach((leg, index) => {
        leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, legPose + (seated ? Math.sin(npcData.phase * 0.5 + index) * 0.025 : 0), 5, dt);
      });
      npcData.torso.rotation.x = THREE.MathUtils.damp(npcData.torso.rotation.x, seated ? 0.09 : 0, 4, dt);
      npcData.npc.position.y = Math.sin(session.elapsed * 2.2) * 0.025;
      if (session.activity === 'coffee') {
        const sipping = Math.sin(session.elapsed * 2.2) > 0.48;
        npcData.food.visible = false;
        npcData.cup.visible = true;
        npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, sipping ? -1.18 : -0.12 + wave * 0.08, 5, dt);
        npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.12 + wave * 0.08, 4, dt);
        npcData.arms[1].rotation.x = THREE.MathUtils.damp(npcData.arms[1].rotation.x, 0, 5, dt);
      } else if (session.activity === 'picnic') {
        npcData.cup.visible = false;
        npcData.food.visible = true;
        const takingBite = Math.sin(session.elapsed * 1.9) > 0.48;
        npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, takingBite ? -1.12 : -0.16 + wave * 0.06, 5, dt);
        npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.16 + wave * 0.08, 4, dt);
        npcData.arms[1].rotation.x = THREE.MathUtils.damp(npcData.arms[1].rotation.x, takingBite ? -0.18 : 0, 5, dt);
      } else {
        npcData.cup.visible = false;
        npcData.food.visible = false;
        const gesture = Math.sin(session.elapsed * 2.7);
        npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.18 + Math.max(0, gesture) * 0.58, 5, dt);
        npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, -0.12 - Math.max(0, -gesture) * 0.52, 5, dt);
        npcData.arms[0].rotation.x = THREE.MathUtils.damp(npcData.arms[0].rotation.x, wave * 0.12, 5, dt);
        npcData.arms[1].rotation.x = THREE.MathUtils.damp(npcData.arms[1].rotation.x, -wave * 0.12, 5, dt);
      }
      if (session.elapsed >= 12) {
        const finishedName = npcData.displayName;
        npcData.cup.visible = false;
        npcData.food.visible = false;
        npcData.reaction.visible = false;
        npcData.npc.position.y = 0;
        npcData.torso.rotation.x = 0;
        npcData.arms.forEach(arm => { arm.rotation.set(0, 0, 0); });
        npcData.legs.forEach(leg => { leg.rotation.set(0, 0, 0); });
        npcData.lastSocialLine = session.completionLine || 'Terima kasih sudah menghabiskan waktu bersama.';
        hangoutSession = null;
        changeRelationship(npcData.id, session.relationshipReward || 0);
        addSkillXp('social', session.socialXp || 0);
        setNpcMood(npcData, 'cheerful');
        updateNeedsHud(true);
        saveGame(false);
        showToast(`HANGOUT SELESAI · ${finishedName.toUpperCase()} · RELATIONSHIP +${session.relationshipReward || 0}`);
        openDialogue(npcData.id);
      }
    }
    return;
  }
  npcData.reaction.visible = false;
  const hour = gameMinutes / 60;
  const routine = npcData.schedule.find(slot => slot.from < slot.to
    ? hour >= slot.from && hour < slot.to
    : hour >= slot.from || hour < slot.to) || npcData.schedule[0];
  if (routine.label !== npcData.activeRoutine) {
    npcData.activeRoutine = routine.label;
    npcData.activeSeat = routine.seat || null;
    npcData.activity = routine.activity || 'garden';
    npcData.restingOnSeat = false;
    npcData.cup.visible = false;
    npcData.food.visible = false;
    if (npcData.activity === 'watch-tv') tvOn = true;
    npcData.npc.position.y = 0;
    npcData.torso.rotation.x = 0;
    npcData.legs.forEach(leg => leg.rotation.set(0, 0, 0));
    npcData.arms.forEach(arm => arm.rotation.set(0, 0, 0));
    npcData.route = routine.route.map(p => new THREE.Vector3(p[0], 0, p[1]));
    npcData.targetIndex = 0;
  }
  if (npcData.activeSeat && playerSeated && activeSeat?.id === npcData.activeSeat.id) {
    npcData.restingOnSeat = false;
    npcData.cup.visible = false;
    npcData.food.visible = false;
    npcData.npc.position.y = 0;
    const waitX = npcData.activeSeat.x + Math.cos(npcData.activeSeat.yaw) * 1.45;
    const waitZ = npcData.activeSeat.z + Math.sin(npcData.activeSeat.yaw) * 1.45;
    const waitDx = waitX - npcData.npc.position.x;
    const waitDz = waitZ - npcData.npc.position.z;
    const waitDistance = Math.hypot(waitDx, waitDz);
    if (waitDistance > 0.3) {
      npcData.npc.position.x += waitDx / waitDistance * 1.05 * dt;
      npcData.npc.position.z += waitDz / waitDistance * 1.05 * dt;
      npcData.npc.rotation.y = Math.atan2(waitDx, -waitDz);
      npcData.phase += dt * 5.2;
      const waitSwing = Math.sin(npcData.phase) * 0.32;
      npcData.legs[0].rotation.x = waitSwing; npcData.legs[1].rotation.x = -waitSwing;
      npcData.arms[0].rotation.x = -waitSwing * 0.7; npcData.arms[1].rotation.x = waitSwing * 0.7;
    }
    return;
  }
  const target = npcData.route[npcData.targetIndex];
  const dx = target.x - npcData.npc.position.x;
  const dz = target.z - npcData.npc.position.z;
  const distance = Math.hypot(dx,dz);
  const finalSeatWaypoint = npcData.activeSeat && npcData.targetIndex === npcData.route.length - 1;
  if (distance < 0.35 && finalSeatWaypoint) {
    npcData.restingOnSeat = true;
    npcData.npc.position.set(npcData.activeSeat.x, npcData.activeSeat.seatY - 0.88, npcData.activeSeat.z);
    npcData.npc.rotation.y = npcData.activeSeat.yaw;
  } else if (distance < 0.35) {
    npcData.targetIndex = (npcData.targetIndex + 1) % npcData.route.length;
  } else {
    npcData.restingOnSeat = false;
    const vx = dx / distance, vz = dz / distance;
    npcData.npc.position.x += vx * 1.05 * dt;
    npcData.npc.position.z += vz * 1.05 * dt;
    npcData.npc.rotation.y = Math.atan2(vx,-vz);
    npcData.phase += dt * 5.2;
    const swing = Math.sin(npcData.phase) * 0.38;
    npcData.legs[0].rotation.x = swing; npcData.legs[1].rotation.x = -swing;
    npcData.arms[0].rotation.x = -swing * 0.7; npcData.arms[1].rotation.x = swing * 0.7;
  }
  if (npcData.restingOnSeat) {
    npcData.phase += dt * 1.45;
    npcData.npc.position.y = npcData.activeSeat.seatY - 0.88 + Math.sin(npcData.phase * 1.3) * 0.012;
    npcData.legs.forEach(leg => { leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, -1.02, 5, dt); });
    const idleGesture = Math.sin(npcData.phase * 1.8);
    const sipping = Math.sin(npcData.phase * 2.25) > 0.38;
    npcData.cup.visible = npcData.activity === 'coffee';
    npcData.food.visible = npcData.activity === 'eat';
    if (npcData.activity === 'coffee' || npcData.activity === 'eat') {
      npcData.torso.rotation.x = THREE.MathUtils.damp(npcData.torso.rotation.x, 0.085, 4, dt);
      npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.08 + Math.max(0, idleGesture) * 0.13, 4, dt);
      npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, sipping ? -1.08 : -0.12, 5, dt);
      npcData.arms[1].rotation.x = THREE.MathUtils.damp(npcData.arms[1].rotation.x, 0, 5, dt);
    } else if (npcData.activity === 'watch-tv') {
      npcData.torso.rotation.x = THREE.MathUtils.damp(npcData.torso.rotation.x, -0.13, 3, dt);
      npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.12 + Math.max(0, idleGesture) * 0.06, 3, dt);
      npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, -0.12 - Math.max(0, -idleGesture) * 0.06, 3, dt);
    } else if (npcData.activity === 'sunbathe') {
      npcData.torso.rotation.x = THREE.MathUtils.damp(npcData.torso.rotation.x, -0.2, 3, dt);
      npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.04, 3, dt);
      npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, -0.04, 3, dt);
    } else {
      npcData.torso.rotation.x = THREE.MathUtils.damp(npcData.torso.rotation.x, 0.045, 4, dt);
      npcData.arms[0].rotation.z = THREE.MathUtils.damp(npcData.arms[0].rotation.z, 0.08 + Math.max(0, idleGesture) * 0.12, 4, dt);
      npcData.arms[1].rotation.z = THREE.MathUtils.damp(npcData.arms[1].rotation.z, -0.08 - Math.max(0, -idleGesture) * 0.12, 4, dt);
    }
  }
}
function paintNpcReaction(npcData, emoji) {
  const ctx = npcData.reactionCtx;
  ctx.clearRect(0, 0, 128, 96);
  ctx.fillStyle = 'rgba(15,28,25,.88)';
  ctx.beginPath(); ctx.roundRect(10, 5, 108, 76, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(236,226,197,.9)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff4d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '54px sans-serif'; ctx.fillText(emoji, 64, 43);
  npcData.reactionTexture.needsUpdate = true;
}
function updateNpcPlayerSocial(dt) {
  if (!isStarted || inVehicle || inBoat || playerSeated || hangoutSession || npcSocialSession) return;
  for (const npcData of npcs) {
    npcData.greetingCooldown = Math.max(0, npcData.greetingCooldown - dt);
    npcData.greetingTimer = Math.max(0, npcData.greetingTimer - dt);
    const dx = player.position.x - npcData.npc.position.x;
    const dz = player.position.z - npcData.npc.position.z;
    const distance = Math.hypot(dx, dz);
    if (!npcData.playerNearby && distance <= 6.2 && npcData.greetingCooldown <= 0) {
      npcData.playerNearby = true;
      npcData.greetingTimer = 2.8;
      npcData.greetingCooldown = 26;
      npcData.lastSocialLine = npcConversationLine(npcData);
      paintNpcReaction(npcData, '👋');
      if (playerMotion.speed < 1.25 && !playerSeated && !hangoutSession) playPlayerGesture('wave', npcData.npc.position);
      showToast(`${npcData.displayName.toUpperCase()} MENYAPAMU · DEKAT UNTUK BICARA`);
    } else if (npcData.playerNearby && distance > 8.0) {
      npcData.playerNearby = false;
    }
    if (npcData.playerNearby && distance < 5.4) {
      const yaw = Math.atan2(dx, -dz);
      const diff = Math.atan2(Math.sin(yaw - npcData.npc.rotation.y), Math.cos(yaw - npcData.npc.rotation.y));
      npcData.npc.rotation.y += diff * Math.min(1, dt * 3.6);
    }
    if (npcData.greetingTimer > 0) {
      npcData.reaction.visible = true;
      npcData.reaction.position.y = 3.55 + Math.sin(performance.now() * 0.004) * 0.055;
    } else {
      npcData.reaction.visible = false;
    }
  }
}
function updateNpcSocial(dt) {
  npcSocialCooldown = Math.max(0, npcSocialCooldown - dt);
  const [alex, mia] = npcs;
  const distance = Math.hypot(alex.npc.position.x - mia.npc.position.x, alex.npc.position.z - mia.npc.position.z);
  const sameSocialActivity = alex.activity === mia.activity && ['coffee', 'eat'].includes(alex.activity);
  const eligible = !hangoutSession && sameSocialActivity && alex.restingOnSeat && mia.restingOnSeat && distance < 4.8;
  if (!npcSocialSession && eligible && npcSocialCooldown <= 0) npcSocialSession = { elapsed: 0, cycle: -1 };
  if (!npcSocialSession) return;
  if (!eligible) {
    alex.reaction.visible = false; mia.reaction.visible = false;
    npcSocialSession = null;
    return;
  }
  npcSocialSession.elapsed += dt;
  const elapsed = npcSocialSession.elapsed;
  const centerX = (alex.npc.position.x + mia.npc.position.x) * 0.5;
  const centerZ = (alex.npc.position.z + mia.npc.position.z) * 0.5;
  for (const [index, person] of [alex, mia].entries()) {
    const dx = centerX - person.npc.position.x;
    const dz = centerZ - person.npc.position.z;
    const yaw = Math.atan2(dx, -dz);
    const diff = Math.atan2(Math.sin(yaw - person.npc.rotation.y), Math.cos(yaw - person.npc.rotation.y));
    person.npc.rotation.y += diff * Math.min(1, dt * 3.8);
    const gesture = Math.sin(elapsed * 2.6 + index * Math.PI);
    person.arms[0].rotation.z = THREE.MathUtils.damp(person.arms[0].rotation.z, 0.14 + Math.max(0, gesture) * 0.4, 5, dt);
    person.arms[1].rotation.z = THREE.MathUtils.damp(person.arms[1].rotation.z, -0.14 - Math.max(0, -gesture) * 0.36, 5, dt);
    person.reaction.visible = true;
    person.reaction.position.y = 3.55 + Math.sin(elapsed * 3 + index) * 0.055;
  }
  const cycle = Math.floor(elapsed / 2.2);
  if (cycle !== npcSocialSession.cycle) {
    npcSocialSession.cycle = cycle;
    const emojis = alex.activity === 'coffee' ? ['☕', '☺', '♡', '✦'] : ['🍽', '☺', '♡', '✦'];
    const emoji = emojis[cycle % emojis.length];
    paintNpcReaction(alex, emoji); paintNpcReaction(mia, emoji);
  }
  if (elapsed >= 10) {
    changeRelationship('alex', 1);
    changeRelationship('mia', 1);
    setNpcMood(alex, 'cheerful');
    setNpcMood(mia, 'cheerful');
    alex.reaction.visible = false; mia.reaction.visible = false;
    npcSocialSession = null;
    npcSocialCooldown = 100;
    showToast(alex.activity === 'coffee' ? 'ALEX & MIA NGOBROL SANTAI · RELATIONSHIP +1' : 'MAKAN BERSAMA · RELATIONSHIP +1');
  }
}
function updatePlayerLocomotionAnimation(dt, { speed = 0, sprint = false, grounded = true, verticalSpeed = 0, turnRate = 0 } = {}) {
  const maxSpeed = sprint ? 8.2 : 4.7;
  const gaitStrength = clamp(speed / maxSpeed, 0, 1);
  const targetBlend = speed > 0.22 ? Math.max(0.12, gaitStrength) : 0;
  playerMotion.blend = THREE.MathUtils.damp(playerMotion.blend, targetBlend, targetBlend > playerMotion.blend ? 13 : 9, dt);
  playerMotion.speed = speed;
  playerMotion.turnRate = turnRate;
  playerMotion.gaitPhase += dt * THREE.MathUtils.lerp(7.4, 12.4, sprint ? 1 : 0) * Math.max(0.18, gaitStrength);
  const phase = playerMotion.gaitPhase;
  const stride = Math.sin(phase);
  const oppositeStride = Math.sin(phase + Math.PI);
  const air = grounded ? 0 : 1;
  const rising = clamp(verticalSpeed / 7.6, 0, 1);
  const falling = clamp(-verticalSpeed / 8.5, 0, 1);
  const landing = playerMotion.landingKick;
  const amplitude = THREE.MathUtils.lerp(0.39, 0.61, sprint) * playerMotion.blend;

  // Alternating thigh swing, knee flex and ankle counter-rotation.
  legL.rotation.x = stride * amplitude + air * (-0.18 * rising + 0.24 * falling) + landing * 0.1;
  legR.rotation.x = oppositeStride * amplitude + air * (-0.18 * rising + 0.24 * falling) + landing * 0.1;
  kneeL.rotation.x = Math.max(0, oppositeStride) * (sprint ? 0.72 : 0.46) * playerMotion.blend + air * (0.22 * rising + 0.76 * falling) + landing * 0.48;
  kneeR.rotation.x = Math.max(0, stride) * (sprint ? 0.72 : 0.46) * playerMotion.blend + air * (0.22 * rising + 0.76 * falling) + landing * 0.48;
  footL.rotation.x = -Math.max(0, stride) * 0.28 * playerMotion.blend - air * (0.2 + 0.18 * falling) + landing * 0.24;
  footR.rotation.x = -Math.max(0, oppositeStride) * 0.28 * playerMotion.blend - air * (0.2 + 0.18 * falling) + landing * 0.24;

  // Natural opposite arm swing, with a soft elbow bend and relaxed hands.
  armL.rotation.x = -stride * amplitude * 0.78 - air * (0.54 * rising - 0.2 * falling);
  armR.rotation.x = -oppositeStride * amplitude * 0.78 - air * (0.54 * rising - 0.2 * falling);
  elbowL.rotation.x = 0.08 + Math.max(0, -stride) * 0.26 * playerMotion.blend + air * 0.16;
  elbowR.rotation.x = 0.08 + Math.max(0, -oppositeStride) * 0.26 * playerMotion.blend + air * 0.16;
  armL.rotation.z = THREE.MathUtils.damp(armL.rotation.z, 0.035 + playerMotion.blend * 0.025, 7, dt);
  armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, -0.035 - playerMotion.blend * 0.025, 7, dt);

  // Hips and chest absorb acceleration and turns; head counterbalances the torso.
  const forwardLean = playerMotion.blend * (0.025 + (sprint ? 0.09 : 0.025)) + air * (rising ? -0.07 : 0.08) - landing * 0.14;
  bodyPivot.rotation.x = THREE.MathUtils.damp(bodyPivot.rotation.x, forwardLean, 8.5, dt);
  const sideLean = clamp(-turnRate * 0.035, -0.16, 0.16) + Math.sin(phase) * 0.018 * playerMotion.blend;
  bodyPivot.rotation.z = THREE.MathUtils.damp(bodyPivot.rotation.z, sideLean, 8, dt);
  torsoMesh.rotation.x = THREE.MathUtils.damp(torsoMesh.rotation.x, Math.sin(phase * 2) * 0.018 * playerMotion.blend, 8, dt);
  torsoMesh.rotation.y = THREE.MathUtils.damp(torsoMesh.rotation.y, Math.sin(phase) * 0.022 * playerMotion.blend, 7, dt);
  headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, air ? -0.05 * rising + 0.08 * falling : -0.025 * playerMotion.blend, 6, dt);
  headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, -sideLean * 0.5 + Math.sin(phase * 0.5) * 0.012 * playerMotion.blend, 6, dt);

  const idleBreath = Math.sin(performance.now() * 0.0017) * 0.006;
  avatar.position.y = grounded
    ? Math.abs(Math.sin(phase * 2)) * 0.052 * playerMotion.blend + idleBreath * (1 - playerMotion.blend)
    : 0;
  shadowDisc.material.opacity = 0.22 - Math.min(0.09, player.position.y * 0.045);
  const shadowScale = clamp(1 - player.position.y * 0.075, 0.66, 1);
  shadowDisc.scale.setScalar(shadowScale);

  playerMotion.landingKick = THREE.MathUtils.damp(playerMotion.landingKick, 0, 11, dt);
  playerMotion.state = !grounded
    ? verticalSpeed > 0.45 ? 'jumping' : 'falling'
    : playerMotion.landingKick > 0.08 ? 'landing'
    : playerMotion.speed > 0.4 && playerMotion.blend > 0.08 ? sprint ? 'running' : 'walking'
    : 'idle';
  walkClock = phase;
}

function updateDayNight(dt) {
  if (isStarted) {
    advanceGameTime(dt * 2.4);
  }
  const hour = gameMinutes / 60;
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const nightMix = 1 - daylight;
  vehicleNightMix = nightMix;
  blendedSkyColor.copy(nightSkyColor).lerp(daySkyColor, daylight);
  scene.background.copy(blendedSkyColor); scene.fog.color.copy(blendedSkyColor);
  if(divingState.active){scene.background.setHex(0x082e3e);scene.fog.color.setHex(0x0c4050);scene.fog.near=4;scene.fog.far=37;}else{scene.fog.near=70;scene.fog.far=WORLD_FOG_DISTANCE;}
  hemi.intensity = 0.42 + daylight * 1.6;
  sun.intensity = 0.04 + daylight * 2.9;
  sun.position.set(Math.cos((hour - 12) / 24 * Math.PI * 2) * 58, Math.sin(((hour - 6) / 12) * Math.PI) * 62 + 3, 35);
  sun.color.copy(nightSunColor).lerp(daySunColor, daylight);
  fill.intensity = 0.12 + daylight * 0.65;
  gardenLights.forEach(light => { light.intensity = nightMix * 0.85; });
  districtStreetLights.forEach(light => { light.intensity = nightMix * 1.05; });
  marinaWaterLights.forEach(light => { light.intensity = nightMix * 0.7; });
  const headlightsOn = currentVehicleLightsOn();
  vehicleHeadlights.forEach(light => { light.intensity = headlightsOn && selectedVehicleType==='suv' ? 2.65 : 0; });
  motorcycleHeadlight.intensity=headlightsOn&&selectedVehicleType==='motorcycle'?2.45:0;
  if (Math.floor(gameMinutes) !== lastClockMinute) {
    setTextIfChanged(clockLabel, formatGameTime());
    lastClockMinute = Math.floor(gameMinutes);
  }
}

function updateMarina(dt) {
  const time = performance.now() * 0.001;
  marinaBoat.position.y = 0.18 + Math.sin(time * 0.85) * 0.045;
  marinaBoat.rotation.z = Math.sin(time * 0.62) * 0.008 + clamp(boatSpeed*0.0018,-0.035,0.035);
  marinaBoat.rotation.y = boatHeading + Math.sin(time * 0.24) * 0.018;
  if(marinaFishingFloat.visible){const pulse=fishingState.phase==='bite'?0.11:0.035;marinaFishingFloat.position.y=0.18+Math.sin(time*(fishingState.phase==='bite'?10:2.2))*pulse;marinaFishingRipple.visible=true;const scale=0.78+(Math.sin(time*1.8)+1)*0.15;marinaFishingRipple.scale.set(scale,1,scale);marinaFishingRipple.material.opacity=0.23+(Math.sin(time*1.8)+1)*0.1;}else marinaFishingRipple.visible=false;
}

function updateVehicleDust(dt) {
  for (const particle of vehicleDustParticles) {
    if (particle.life <= 0) continue;
    particle.life = Math.max(0, particle.life - dt);
    const lifeRatio = particle.life / particle.maxLife;
    particle.material.opacity = 0.28 * lifeRatio;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.velocity.y += 0.34 * dt;
    particle.velocity.x *= Math.max(0, 1 - dt * 0.75);
    particle.velocity.z *= Math.max(0, 1 - dt * 0.75);
    particle.mesh.scale.setScalar(0.55 + (1 - lifeRatio) * 1.75);
    if (particle.life <= 0.001) {
      particle.mesh.visible = false;
      particle.material.opacity = 0;
    }
  }
  if (!isStarted || !inVehicle || Math.abs(vehicleSpeed) < 2.8 || isPavedRoadSurface(vehicle.position.x, vehicle.position.z)) {
    vehicleDustEmitTimer = Math.min(vehicleDustEmitTimer, 0.06);
    return;
  }
  vehicleDustEmitTimer -= dt;
  if (vehicleDustEmitTimer > 0) return;
  vehicleDustEmitTimer = Math.max(0.075, 0.18 - Math.abs(vehicleSpeed) * 0.004);
  const cos = Math.cos(vehicle.rotation.y), sin = Math.sin(vehicle.rotation.y);
  const travelSign = Math.sign(vehicleSpeed);
  const forwardX = -sin * travelSign, forwardZ = -cos * travelSign;
  for (const side of [-1, 1]) {
    const particle = vehicleDustParticles[vehicleDustCursor++ % vehicleDustParticles.length];
    const localX = side * 1.02, localZ = 1.78;
    particle.mesh.position.set(
      vehicle.position.x + localX * cos + localZ * sin + (Math.random() - 0.5) * 0.18,
      0.16 + Math.random() * 0.08,
      vehicle.position.z - localX * sin + localZ * cos + (Math.random() - 0.5) * 0.18
    );
    particle.maxLife = 0.62 + Math.random() * 0.3;
    particle.life = particle.maxLife;
    particle.velocity.set(-forwardX * (0.42 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.48, 0.24 + Math.random() * 0.16, -forwardZ * (0.42 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.48);
    particle.mesh.scale.setScalar(0.55);
    particle.material.opacity = 0.28;
    particle.mesh.visible = true;
  }
}

function update(dt) {
  let nearest = null, nearestDistance = Infinity;
  updateDayNight(dt);
  updateFishing(dt);
  updateVehicleDust(dt);
  updateVehicleWash(dt);
  updateCourierNetwork(dt);
  updateRoadRally(dt);
  updateMarina(dt);
  updateBoatSalvage(dt);
  updateDive(dt);
  updateWorldDropPhysics(dt);
  npcs.forEach(npc => updateNpc(npc,dt));
  updateNpcSocial(dt);
  npcs.forEach(npc => updateNpcMood(npc,dt));
  npcs.forEach(npc => updateNpcBodyLanguage(npc,dt));
  updateNpcPlayerSocial(dt);
  followButton.classList.toggle('hidden', !hangoutSession);
  followButton.classList.toggle('active', hangoutFollowEnabled);
  setTextIfChanged(followButton, hangoutFollowEnabled ? 'FOLLOW ON' : 'FOLLOW OFF');
  if (isStarted) {
    const movementRequested = keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD')
      || keys.has('ArrowUp') || keys.has('ArrowDown') || keys.has('ArrowLeft') || keys.has('ArrowRight')
      || joystickVector.lengthSq() > 0.08;
    if (playerSeated && movementRequested && !isUiOpen()) standFromSeat(false);
    if (autoSaveEnabled) {
      autoSaveElapsed += dt;
      if (autoSaveElapsed >= 45) saveGame(false);
    }
    needsHudTimer += dt;
    const walking = !inVehicle && !inBoat && !divingState.active && moveInput.lengthSq() > 0.025 && !isUiOpen();
    needs.hunger = Math.max(0, needs.hunger - dt * 0.018);
    needs.energy = playerSeated
      ? clamp(needs.energy + dt * 0.12, 0, 100)
      : clamp(needs.energy - dt * (walking ? (isRunning || keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.19 : 0.095) : 0.018), 0, 100);
    const socialDecay = 0.012 * (1 - Math.min(0.35, (skillProgress('social').level - 1) * 0.04));
    needs.social = Math.max(0, needs.social - dt * socialDecay);
    needs.hygiene = Math.max(0, needs.hygiene - dt * 0.009);
    needs.bladder = Math.max(0, needs.bladder - dt * 0.014);
    updateNeedsHud();
  }
  parcelObjects.forEach(parcel => { parcel.light.intensity = parcel.group.visible ? 0.45 + Math.sin(performance.now() * 0.004 + parcel.index) * 0.18 : 0; });
  gardenTaskMarkers.forEach(marker => {
    marker.glow.intensity = marker.group.visible ? 0.45 + Math.sin(performance.now() * 0.003 + marker.index) * 0.16 : 0;
    if (marker.group.visible) marker.group.rotation.y += dt * 0.45;
  });
  if (isStarted) {
    if(inBoat){updateMarinaBoatControls(dt);updateBoatRace(dt);}
    else if(divingState.active){
      const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
      const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      moveInput.set(isUiOpen()?0:right+joystickVector.x,isUiOpen()?0:forward+joystickVector.y);if(moveInput.length()>1)moveInput.normalize();
      const sin=Math.sin(cameraYaw),cos=Math.cos(cameraYaw),dirX=moveInput.x*cos+moveInput.y*sin,dirZ=moveInput.x*sin-moveInput.y*cos;
      const swimSpeed=2.65,targetVX=dirX*swimSpeed,targetVZ=dirZ*swimSpeed;
      velocity.x=THREE.MathUtils.damp(velocity.x,targetVX,4.2,dt);velocity.z=THREE.MathUtils.damp(velocity.z,targetVZ,4.2,dt);
      player.position.x=clamp(player.position.x+velocity.x*dt,34.0,59.0);player.position.z=clamp(player.position.z+velocity.z*dt,217.0,236.0);
      const verticalInput=(keys.has('Space')?1:0)-((keys.has('ShiftLeft')||keys.has('ShiftRight'))?1:0);
      verticalSpeed=THREE.MathUtils.damp(verticalSpeed,verticalInput*1.45,3.8,dt);player.position.y=clamp(player.position.y+verticalSpeed*dt,-5.65,-1.05);
      isGrounded=true;let turnRate=0;if(moveInput.lengthSq()>0.025){const yaw=Math.atan2(-dirX,-dirZ),diff=Math.atan2(Math.sin(yaw-avatar.rotation.y),Math.cos(yaw-avatar.rotation.y));turnRate=diff*7;avatar.rotation.y+=diff*Math.min(1,dt*7);}
      updatePlayerLocomotionAnimation(dt,{speed:Math.hypot(velocity.x,velocity.z),grounded:true,verticalSpeed:0,turnRate});
      const swimBeat=Math.sin(performance.now()*0.006);bodyPivot.rotation.x=THREE.MathUtils.damp(bodyPivot.rotation.x,-0.10+swimBeat*0.035,4,dt);armL.rotation.x=THREE.MathUtils.damp(armL.rotation.x,-0.72+swimBeat*0.16,4,dt);armR.rotation.x=THREE.MathUtils.damp(armR.rotation.x,-0.72-swimBeat*0.16,4,dt);kneeL.rotation.x=THREE.MathUtils.damp(kneeL.rotation.x,0.48+swimBeat*0.28,4,dt);kneeR.rotation.x=THREE.MathUtils.damp(kneeR.rotation.x,-0.42-swimBeat*0.28,4,dt);
      currentTarget=null;interaction.classList.remove('hidden');interactButton.classList.remove('hidden');setTextIfChanged(interactButton, 'E');const nearbyDive=nearestDiveTarget(2.75);setTextIfChanged(interactionText, nearbyDive?`E · Collect ${nearbyDive.name}`:'E · Surface');
      setTextIfChanged(locationLabel, 'NORTH SHOAL · REEF DIVE');updateDiveHud();
    }
    else if (inVehicle) {
      const previousSpeed = vehicleSpeed;
      const controlsLocked = isUiOpen();
      const requestedThrottle = controlsLocked || vehicleWashTimer > 0 ? 0 : clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + joystickVector.y, -1, 1);
      const throttle = vehicleFuel > 0.01 ? requestedThrottle : 0;
      const steering = controlsLocked || vehicleWashTimer > 0 ? 0 : clamp((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joystickVector.x, -1, 1);
      const braking = !controlsLocked && (vehicleBrakeHeld || keys.has('Space'));
      if (braking) vehicleSpeed = Math.sign(vehicleSpeed) * Math.max(0, Math.abs(vehicleSpeed) - 14.5 * dt);
      else if (throttle > 0.04) {
        const enginePower=(selectedVehicleType==='motorcycle'?25.5:18.0)*(1+vehicleGarageState.engine*0.11);
        const targetSpeed = vehicleSpeed < -0.45 ? 0 : enginePower * throttle;
        vehicleSpeed = THREE.MathUtils.damp(vehicleSpeed, targetSpeed, vehicleSpeed < -0.45 ? 5.5 : (selectedVehicleType==='motorcycle'?1.82:1.45)+vehicleGarageState.engine*0.22, dt);
      } else if (throttle < -0.04) {
        const reversePower=selectedVehicleType==='motorcycle'?4.4:6.8;
        const targetSpeed = vehicleSpeed > 0.45 ? 0 : -reversePower * Math.abs(throttle);
        vehicleSpeed = THREE.MathUtils.damp(vehicleSpeed, targetSpeed, vehicleSpeed > 0.45 ? 5.8 : 1.8, dt);
      } else vehicleSpeed = THREE.MathUtils.damp(vehicleSpeed, 0, 0.82, dt);
      if (vehicleWashTimer > 0) vehicleSpeed = 0;
      vehicleAcceleration = dt > 0 ? (vehicleSpeed - previousSpeed) / dt : 0;
      const tunedTopSpeed=(selectedVehicleType==='motorcycle'?25.5:18)*(1+vehicleGarageState.engine*0.11);
      const speedRatio = clamp(Math.abs(vehicleSpeed) / tunedTopSpeed, 0, 1);
      const steerAngle = steering * (selectedVehicleType==='motorcycle'?0.60:0.48) * (1+vehicleGarageState.handling*0.13) * clamp(Math.abs(vehicleSpeed) / 3.5, 0, 1);
      vehicleFrontWheelPivots.forEach(pivot => { pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, selectedVehicleType==='suv'?steerAngle:0, 8, dt); });
      motorcycleSteering.rotation.y=THREE.MathUtils.damp(motorcycleSteering.rotation.y,selectedVehicleType==='motorcycle'?steerAngle:0,8,dt);
      const startX = vehicle.position.x, startZ = vehicle.position.z;
      const previousYaw = vehicle.rotation.y;
      const yawRate = vehicleYawRate(vehicleSpeed, steering*(selectedVehicleType==='motorcycle'?1.18:1)*(1+vehicleGarageState.handling*0.13));
      vehicle.rotation.y -= yawRate * dt;
      if (vehicleCollides(vehicle.position.x, vehicle.position.z)) {
        vehicle.rotation.y = previousYaw;
        vehicleSpeed *= 0.78;
        vehicleImpact = 0.18;
      }
      const deltaX = -Math.sin(vehicle.rotation.y) * vehicleSpeed * dt;
      const deltaZ = -Math.cos(vehicle.rotation.y) * vehicleSpeed * dt;
      const hitObstacle = moveVehicleSafely(deltaX, deltaZ);
      if (hitObstacle) { vehicleSpeed *= 0.38; vehicleImpact = 0.24; }
      const drivenDistance = Math.hypot(vehicle.position.x - startX, vehicle.position.z - startZ);
      vehicleTripDistance += drivenDistance / 1000;
      if (drivenDistance > 0) {
        vehicleFuel = Math.max(0, vehicleFuel - drivenDistance * 0.018 * (1-vehicleGarageState.efficiency*0.13));
        if (selectedVehicleType==='suv'&&(!isPavedRoadSurface(startX,startZ) || !isPavedRoadSurface(vehicle.position.x,vehicle.position.z))) vehicleDirt = clamp(vehicleDirt + drivenDistance * 0.028, 0, 100);
        if(selectedVehicleType==='motorcycle'&&(!isPavedRoadSurface(startX,startZ)||!isPavedRoadSurface(vehicle.position.x,vehicle.position.z)))vehicleDirt=clamp(vehicleDirt+drivenDistance*0.018,0,100);
      }
      if (vehicleFuel <= 0.01) {
        vehicleFuel = 0; vehicleSpeed = 0;
        if (!vehicleFuelEmptyNotified) { vehicleFuelEmptyNotified = true; showToast(`BAHAN BAKAR HABIS · ${currentVehicleName().toUpperCase()} PERLU DIISI DI NORTHSIDE FUEL`); }
      } else if (vehicleFuel < 18 && !vehicleLowFuelNotified) {
        vehicleLowFuelNotified = true; showToast('BAHAN BAKAR MENIPIS · CARI NORTHSIDE FUEL');
      } else if (vehicleFuel > 24) vehicleLowFuelNotified = false;
      vehicleWheels.forEach(wheel => { wheel.rotation.x += selectedVehicleType==='suv'?vehicleSpeed * dt / 0.43:0; });
      bikeFrontWheel.rotation.x+=selectedVehicleType==='motorcycle'?vehicleSpeed*dt/0.43:0;bikeRearWheel.rotation.x+=selectedVehicleType==='motorcycle'?vehicleSpeed*dt/0.43:0;
      vehicleBody.rotation.x = THREE.MathUtils.damp(vehicleBody.rotation.x, selectedVehicleType==='suv'?clamp(-vehicleAcceleration * 0.007, -0.12, 0.14):0, 7, dt);
      vehicleBody.rotation.z = THREE.MathUtils.damp(vehicleBody.rotation.z, selectedVehicleType==='suv'?clamp(-steering * speedRatio * 0.075, -0.075, 0.075):0, 6, dt);
      motorcycleChassis.rotation.x=THREE.MathUtils.damp(motorcycleChassis.rotation.x,selectedVehicleType==='motorcycle'?clamp(-vehicleAcceleration*0.006,-0.09,0.11):0,7,dt);
      motorcycleChassis.rotation.z=THREE.MathUtils.damp(motorcycleChassis.rotation.z,selectedVehicleType==='motorcycle'?clamp(-steering*speedRatio*0.2,-0.2,0.2):0,6,dt);
      vehicleBrakeMat.emissiveIntensity = THREE.MathUtils.damp(vehicleBrakeMat.emissiveIntensity, braking || vehicleSpeed < -0.6 ? 1.8 : 0.35, 12, dt);
      vehicleBrakeLights.forEach(light => { light.intensity = THREE.MathUtils.damp(light.intensity, selectedVehicleType==='suv'&&(braking || vehicleSpeed < -0.6) ? 1.5 : 0, 12, dt); });
      motorcycleBrakeLight.intensity=THREE.MathUtils.damp(motorcycleBrakeLight.intensity,selectedVehicleType==='motorcycle'&&(braking||vehicleSpeed < -0.6)?1.45:0,12,dt);
      vehicleImpact = Math.max(0, vehicleImpact - dt);
      vehicle.position.y = THREE.MathUtils.damp(vehicle.position.y, vehicleImpact > 0 ? 0.055 : 0, 12, dt);
      vehicleHornCooldown = Math.max(0, vehicleHornCooldown - dt);
      updateVehicleHud(braking);
    } else if (!playerSeated) {
    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const right = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let inputRight = right + joystickVector.x;
    let inputForward = forward + joystickVector.y;
    if (hangoutSession && hangoutFollowEnabled && !isUiOpen() && Math.hypot(inputRight, inputForward) < 0.12) {
      const followingNpc = npcs.find(person => person.id === hangoutSession.npcId);
      if (followingNpc) {
        const npc = followingNpc.npc;
        const behindX = npc.position.x + Math.sin(npc.rotation.y) * 1.65;
        const behindZ = npc.position.z + Math.cos(npc.rotation.y) * 1.65;
        const followX = behindX - player.position.x;
        const followZ = behindZ - player.position.z;
        const followDistance = Math.hypot(followX, followZ);
        if (followDistance > 0.28) {
          const wx = followX / followDistance;
          const wz = followZ / followDistance;
          inputRight = wx * Math.cos(cameraYaw) + wz * Math.sin(cameraYaw);
          inputForward = wx * Math.sin(cameraYaw) - wz * Math.cos(cameraYaw);
        } else {
          inputRight = 0; inputForward = 0;
        }
      }
    }
    moveInput.set(isUiOpen() ? 0 : inputRight, isUiOpen() ? 0 : inputForward);
    if (moveInput.length() > 1) moveInput.normalize();
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || isRunning;
    const needsPenalty = needs.hunger < 15 || needs.energy < 12 ? 0.72 : 1;
    const speed = (sprint ? 8.2 : 4.7) * needsPenalty;
    const sin = Math.sin(cameraYaw), cos = Math.cos(cameraYaw);
    const dirX = moveInput.x * cos + moveInput.y * sin;
    const dirZ = moveInput.x * sin - moveInput.y * cos;
    const targetVX = dirX * speed, targetVZ = dirZ * speed;
    const hasMoveInput = moveInput.lengthSq() > 0.025;
    const response = hasMoveInput ? (sprint ? 13 : 14) : 18;
    velocity.x = THREE.MathUtils.damp(velocity.x, targetVX, response, dt);
    velocity.z = THREE.MathUtils.damp(velocity.z, targetVZ, response, dt);
    let nx = player.position.x + velocity.x * dt;
    let nz = player.position.z + velocity.z * dt;
    if (collides(nx, player.position.z)) { nx = player.position.x; velocity.x *= -0.12; }
    if (collides(player.position.x, nz)) { nz = player.position.z; velocity.z *= -0.12; }
    player.position.x = clamp(nx, -51, 51);
    player.position.z = clamp(nz, -43, 226.8);

    const wasGrounded = isGrounded;
    verticalSpeed -= 18 * dt;
    player.position.y += verticalSpeed * dt;
    const floorHeight = getGroundHeight(player.position.x, player.position.z);
    if (player.position.y <= floorHeight) {
      if (!wasGrounded) playerMotion.landingKick = clamp(Math.abs(verticalSpeed) / 9, 0.18, 1);
      player.position.y = floorHeight;
      verticalSpeed = 0;
      isGrounded = true;
    }

    const moving = moveInput.lengthSq() > 0.025;
    let turnRate = 0;
    if (moving) {
      const desiredYaw = Math.atan2(-dirX, -dirZ);
      const diff = (desiredYaw - avatar.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const turnStep = diff * Math.min(1, dt * 12);
      avatar.rotation.y += turnStep;
      turnRate = dt > 0 ? turnStep / dt : 0;
    }
    updatePlayerLocomotionAnimation(dt, {
      speed: Math.hypot(velocity.x, velocity.z), sprint,
      grounded: isGrounded, verticalSpeed, turnRate
    });

    const entered = Math.abs(player.position.x) < 11.5 && player.position.z < 8.0 && player.position.z > -9.5 && player.position.y < 3.5;
    if (entered) updateObjectives('enter');
    if (player.position.y > 4.35) updateObjectives('upstairs');

    nearest = null; nearestDistance = Infinity;
    const interactionPosition = inBoat ? marinaBoat.position : inVehicle ? vehicle.position : player.position;
    for (const target of interactables) {
      if(inBoat&&target.id!=='marina-boat')continue;
      if (target.enabled && !target.enabled()) continue;
      const dx = interactionPosition.x - target.x;
      const dy = (inVehicle||inBoat ? 0 : player.position.y) - target.y;
      const dz = interactionPosition.z - target.z;
      const distance = Math.hypot(dx, dy * 1.25, dz);
      if (distance < target.radius && distance < nearestDistance) {
        nearest = target; nearestDistance = distance;
      }
    }
    currentTarget = nearest;
    interaction.classList.toggle('hidden', !nearest || !!placementMode);
    interactButton.classList.toggle('hidden', !nearest || !!placementMode);
    if (nearest) setTextIfChanged(interactionText, nearest.label());

    if (player.position.y > 4.25) {
      setTextIfChanged(locationLabel, 'UPPER FLOOR');
    } else if (player.position.x < -12.5 && player.position.x > -27.5 && player.position.z < -1.1 && propertyUpgrades.studio > 0) {
      setTextIfChanged(locationLabel, 'CREATIVE STUDIO');
    } else if (player.position.x < -12.5 && player.position.x > -27.5 && player.position.z > -0.9 && propertyUpgrades.guestSuite > 0) {
      setTextIfChanged(locationLabel, 'GUEST SUITE');
    } else if (entered) {
      setTextIfChanged(locationLabel, player.position.z > 1.8 ? 'ENTRANCE HALL' : player.position.x < -5.5 ? 'KITCHEN' : player.position.x > 3.0 ? 'DINING ROOM' : 'LIVING ROOM');
    } else if (Math.hypot(player.position.x-44,player.position.z-218)<7.0) {
      setTextIfChanged(locationLabel, 'NORTH SHOAL ISLAND');
    } else if (player.position.z > 183 && player.position.x > 10 && player.position.x < 45) {
      setTextIfChanged(locationLabel, 'HARBORFRONT MARINA');
    } else if (player.position.z > 130 && player.position.z < 146 && player.position.x < -20 && player.position.x > -40) {
      setTextIfChanged(locationLabel, 'NORTHSIDE AUTO SPA');
    } else if (player.position.z > 143 && player.position.x < -7) {
      setTextIfChanged(locationLabel, 'RIVERSIDE LOOKOUT');
    } else if (player.position.z > 118 && player.position.x > 17 && player.position.x < 40) {
      setTextIfChanged(locationLabel, 'NORTHSIDE FUEL');
    } else if (player.position.z > 81 && player.position.x < -15) {
      setTextIfChanged(locationLabel, 'CORNER CAFE');
    } else if (player.position.z > 81 && player.position.x > 15 && player.position.x < 36) {
      setTextIfChanged(locationLabel, 'TOWN MARKET');
    } else if (player.position.z > 85 && player.position.x > 7 && player.position.x < 21) {
      setTextIfChanged(locationLabel, 'TOWN PARK');
    } else if (player.position.z > 50) {
      setTextIfChanged(locationLabel, 'NEIGHBORHOOD');
    } else if (player.position.z > 13) {
      setTextIfChanged(locationLabel, 'FRONT GARDEN');
    } else if (Math.abs(player.position.x) > 14 && player.position.z < 8) {
      setTextIfChanged(locationLabel, 'POOL TERRACE');
    } else {
      setTextIfChanged(locationLabel, 'GARDEN');
    }
    }
    if (playerSeated) {
      currentTarget = null;
      interaction.classList.remove('hidden');
      interactButton.classList.remove('hidden');
      setTextIfChanged(interactionText, 'E · Bangkit  /  R · Aktivitas');
      setTextIfChanged(interactButton, 'UP');
      seatActivityButton.classList.remove('hidden');
    } else if (inBoat) {
      setTextIfChanged(locationLabel, marinaBoat.position.x>32.5&&Math.hypot(marinaBoat.position.x-44,marinaBoat.position.z-218)<12?'BOATING · NORTH SHOAL':'BOATING · HARBORFRONT');
      currentTarget=interactables.find(target=>target.id==='marina-boat')||null;
      interaction.classList.remove('hidden');interactButton.classList.remove('hidden');
      setTextIfChanged(interactionText, currentTarget.label());setTextIfChanged(interactButton, 'E');
    } else if (inVehicle) {
      setTextIfChanged(locationLabel, vehicle.position.z > 183 && vehicle.position.x > 10 && vehicle.position.x < 45 ? 'DRIVING · HARBORFRONT MARINA' : vehicle.position.z > 130 && vehicle.position.z < 146 && vehicle.position.x < -20 && vehicle.position.x > -40 ? 'DRIVING · NORTHSIDE AUTO SPA' : vehicle.position.z > 143 && vehicle.position.x < -7 ? 'DRIVING · RIVERSIDE LOOKOUT' : vehicle.position.z > 118 && vehicle.position.x > 17 && vehicle.position.x < 40 ? 'DRIVING · NORTHSIDE FUEL' : vehicle.position.z > 50 ? 'DRIVING · NEIGHBORHOOD' : `DRIVING · ${currentVehicleName().toUpperCase()}`);
      nearest = null; nearestDistance = Infinity;
      for (const target of interactables) {
        if (target.id !== 'fuel-stop' && target.id !== 'car-wash') continue;
        if (target.enabled && !target.enabled()) continue;
        const distance = Math.hypot(vehicle.position.x - target.x, vehicle.position.z - target.z);
        if (distance < target.radius && distance < nearestDistance) { nearest = target; nearestDistance = distance; }
      }
      const vehicleTarget = interactables.find(target => target.id === 'vehicle') || null;
      const serviceTarget = nearest;
      currentTarget = serviceTarget || vehicleTarget;
      interaction.classList.remove('hidden');
      interactButton.classList.remove('hidden');
      setTextIfChanged(interactionText, serviceTarget ? serviceTarget.label() : 'Keluar dari kendaraan');
      setTextIfChanged(interactButton, 'E');
    } else {
      setTextIfChanged(interactButton, 'E');
      seatActivityButton.classList.add('hidden');
    }
  }
  const canHandleWorldObjects = isStarted && !!handheldState.item && !playerSeated && !inVehicle && !inBoat && !divingState.active && !isUiOpen();
  const canDrive = isStarted && inVehicle && !isUiOpen();
  const canPilotBoat = isStarted && inBoat && !isUiOpen();
  document.querySelector('#vehicle-desktop-hint').classList.toggle('hidden', !inVehicle);
  document.querySelector('#boat-desktop-hint').classList.toggle('hidden', !inBoat);
  document.querySelector('#dive-desktop-hint').classList.toggle('hidden',!divingState.active);
  diveHud?.classList.toggle('hidden',!divingState.active);
  if(boatRaceStartButton)boatRaceStartButton.classList.toggle('hidden',!inBoat||!isAtBoatRaceStart()||boatRaceState.phase==='running'||boatRaceState.phase==='finished');
  document.querySelector('#desktop-hint').classList.toggle('hidden', inVehicle || inBoat || divingState.active);
  vehicleHud.classList.toggle('hidden', !inVehicle);
  boatHud.classList.toggle('hidden', !inBoat);
  brakeButton.classList.toggle('hidden', !canDrive);
  hornButton.classList.toggle('hidden', !canDrive);
  lightsButton.classList.toggle('hidden', !canDrive);
  boatBrakeButton.classList.toggle('hidden', !canPilotBoat);
  jumpButton.classList.toggle('hidden', inVehicle || inBoat);
  sprintButton.classList.toggle('hidden', inVehicle || inBoat);
  if(divingState.active){setTextIfChanged(jumpButton, 'UP');setTextIfChanged(sprintButton, 'DOWN');}
  else{setTextIfChanged(jumpButton, 'JUMP');setTextIfChanged(sprintButton, 'RUN');}
  if (stickLabel) setTextIfChanged(stickLabel, inVehicle ? 'STEER · THROTTLE' : inBoat ? 'SAIL · STEER' : divingState.active ? 'SWIM · DIVE' : 'MOVE');
  mobileActions.classList.toggle('driving-controls', inVehicle || inBoat || divingState.active);
  dropButton.classList.toggle('hidden', !canHandleWorldObjects);
  placeButton.classList.toggle('hidden', !canHandleWorldObjects);
  const doorAngle = doorOpen ? 1.22 : 0;
  leftDoor.rotation.y = THREE.MathUtils.damp(leftDoor.rotation.y, -doorAngle, 5, dt);
  rightDoor.rotation.y = THREE.MathUtils.damp(rightDoor.rotation.y, doorAngle, 5, dt);
  const fridgeTargetAngle = fridgeOpen ? -1.25 : 0;
  fridgeDoor.rotation.y = THREE.MathUtils.damp(fridgeDoor.rotation.y, fridgeTargetAngle, 5, dt);
  interiorLights.forEach(light => {
    if (light.userData.basePower === undefined) light.userData.basePower = light.intensity;
    light.intensity = THREE.MathUtils.damp(light.intensity, lightsOn ? light.userData.basePower : 0, 5, dt);
  });
  interiorAccent.intensity = THREE.MathUtils.damp(interiorAccent.intensity, lightsOn ? 0.65 : 0, 4, dt);
  tvScreenMat.emissive.setHex(tvOn ? 0x4b8496 : 0x0d1d24);
  tvScreenMat.emissiveIntensity = THREE.MathUtils.damp(tvScreenMat.emissiveIntensity, tvOn ? 1.6 : 0.35, 5, dt);
  tvGlow.intensity = THREE.MathUtils.damp(tvGlow.intensity, tvOn ? 1.25 : 0, 5, dt);

  // Face-to-face hangout: settle both characters into a small conversation beat.
  let framingHangout = false;
  if (!inVehicle && !inBoat && !playerSeated && hangoutSession?.arrived) {
    const npcData = npcs.find(person => person.id === hangoutSession.npcId);
    if (npcData) {
      const dx = npcData.npc.position.x - player.position.x;
      const dz = npcData.npc.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      const stationary = Math.hypot(velocity.x, velocity.z) < 0.45 && moveInput.lengthSq() < 0.025;
      if (distance < 4.4 && stationary) {
        framingHangout = true;
        const playerYaw = Math.atan2(dx, -dz);
        const npcYaw = Math.atan2(-dx, dz);
        const playerDiff = Math.atan2(Math.sin(playerYaw - avatar.rotation.y), Math.cos(playerYaw - avatar.rotation.y));
        const npcDiff = Math.atan2(Math.sin(npcYaw - npcData.npc.rotation.y), Math.cos(npcYaw - npcData.npc.rotation.y));
        avatar.rotation.y += playerDiff * Math.min(1, dt * 5.5);
        npcData.npc.rotation.y += npcDiff * Math.min(1, dt * 4.5);
        const talkBeat = Math.sin(hangoutSession.elapsed * 2.35);
        armL.rotation.z = THREE.MathUtils.damp(armL.rotation.z, 0.10 + Math.max(0, talkBeat) * 0.34, 5, dt);
        armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, -0.08 - Math.max(0, -talkBeat) * 0.28, 5, dt);
      }
    }
  }
  if (!framingHangout && !playerSeated) {
    armL.rotation.z = THREE.MathUtils.damp(armL.rotation.z, 0, 6, dt);
    armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, 0, 6, dt);
  }
  if (playerSeated && activeSeat) {
    if (seatedActivityTimer > 0) seatedActivityTimer = Math.max(0, seatedActivityTimer - dt);
    avatar.position.y = activeSeat.seatY - activeSeat.floorY - 0.91 + Math.sin(performance.now() * 0.0018) * 0.006;
    torsoMesh.rotation.x = THREE.MathUtils.damp(torsoMesh.rotation.x, activeSeat.style === 'lounger' ? -0.2 : 0.035, 4, dt);
    const seatedArmBeat = Math.sin(performance.now() * 0.0016) * 0.025;
    const activeGesture = seatedActivityTimer > 0 ? Math.sin(performance.now() * 0.003) * 0.08 : 0;
    armL.rotation.x = THREE.MathUtils.damp(armL.rotation.x, -0.08 + seatedArmBeat - activeGesture, 4, dt);
    armR.rotation.x = THREE.MathUtils.damp(armR.rotation.x, -0.08 - seatedArmBeat - activeGesture * 0.6, 4, dt);
    if (seatedActivityTimer <= 0) seatedActivity = null;
    if (seatedActivity === 'coffee' && seatedActivityTimer > 0) {
      armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, -0.28, 5, dt);
    } else if (seatedActivity === 'watching' && seatedActivityTimer > 0) {
      torsoMesh.rotation.x = THREE.MathUtils.damp(torsoMesh.rotation.x, -0.045, 4, dt);
    } else {
      armR.rotation.z = THREE.MathUtils.damp(armR.rotation.z, -0.08, 4, dt);
    }
  }

  updatePlayerInteractionAnimation(dt);

  // Smooth third-person camera with orbit damping, pinch/wheel zoom and wall avoidance.
  const yawDelta = Math.atan2(Math.sin(cameraYawTarget - cameraYaw), Math.cos(cameraYawTarget - cameraYaw));
  cameraYaw += yawDelta * (1 - Math.exp(-10 * dt));
  cameraPitch = THREE.MathUtils.damp(cameraPitch, cameraPitchTarget, 9, dt);
  cameraDistance = THREE.MathUtils.damp(cameraDistance, cameraDistanceTarget, 8, dt);

  const cp = Math.cos(cameraPitch);
  let cameraTarget = inBoat ? marinaBoat.position : inVehicle ? vehicle.position : player.position;
  let cameraDistanceNow = inBoat || inVehicle ? Math.max(10, cameraDistance * 1.25) : divingState.active ? Math.min(cameraDistance,7.8) : playerSeated ? Math.min(cameraDistance, 7.4) : cameraDistance;
  if (framingHangout && hangoutSession) {
    const npcData = npcs.find(person => person.id === hangoutSession.npcId);
    if (npcData) {
      hangoutCameraTarget.set(
        (player.position.x + npcData.npc.position.x) * 0.5,
        (player.position.y + npcData.npc.position.y) * 0.5,
        (player.position.z + npcData.npc.position.z) * 0.5
      );
      cameraTarget = hangoutCameraTarget;
      cameraDistanceNow = Math.max(cameraDistanceNow, 10.2);
    }
  }
  cameraDesiredLookAt.set(
    cameraTarget.x + (inBoat ? boatSpeed * -Math.sin(boatHeading) * 0.08 : inVehicle ? vehicleSpeed * -Math.sin(vehicle.rotation.y) * 0.06 : velocity.x * 0.075),
    cameraTarget.y + (inBoat ? 1.3 : inVehicle ? 1.15 : divingState.active ? 0.28 : playerSeated ? avatar.position.y + 1.55 : framingHangout ? 1.35 : 1.55) + (!playerSeated && !inVehicle && !inBoat && !divingState.active ? avatar.position.y * 0.22 : 0),
    cameraTarget.z + (inBoat ? boatSpeed * -Math.cos(boatHeading) * 0.08 : inVehicle ? vehicleSpeed * -Math.cos(vehicle.rotation.y) * 0.06 : velocity.z * 0.075)
  );
  const desiredCameraY = cameraTarget.y + (inBoat ? 4.6 : inVehicle ? 4.0 : divingState.active ? 1.5 : playerSeated ? 2.8 : 3.0) + Math.sin(cameraPitch) * cameraDistanceNow;
  cameraDesiredPosition.set(
    cameraTarget.x + Math.sin(cameraYaw) * cameraDistanceNow * cp,
    desiredCameraY,
    cameraTarget.z + Math.cos(cameraYaw) * cameraDistanceNow * cp
  );
  cameraRayDirection.copy(cameraDesiredPosition).sub(cameraDesiredLookAt);
  const desiredCameraDistance = cameraRayDirection.length();
  if (desiredCameraDistance > 0.001) cameraRayDirection.multiplyScalar(1 / desiredCameraDistance);
  cameraOcclusionTimer += dt;
  if (cameraOcclusionTimer >= (isTouchDevice ? 0.18 : 0.10) && !inVehicle && !inBoat && !divingState.active) {
    cameraOcclusionTimer = 0;
    cameraOcclusionRaycaster.set(cameraDesiredLookAt, cameraRayDirection);
    cameraOcclusionRaycaster.near = 0.28;
    cameraOcclusionRaycaster.far = desiredCameraDistance;
    const obstruction = cameraOcclusionRaycaster.intersectObject(house, true).find(hit => hit.object.visible && hit.distance > 0.3);
    cameraObstructed = !!obstruction;
    cameraOcclusionDistance = obstruction ? Math.max(1.75, obstruction.distance - 0.42) : desiredCameraDistance;
  } else if (inVehicle || inBoat || divingState.active) {
    cameraObstructed = false;
    cameraOcclusionDistance = desiredCameraDistance;
  }
  const safeCameraDistance = Math.min(desiredCameraDistance, cameraOcclusionDistance);
  cameraDesiredPosition.copy(cameraDesiredLookAt).addScaledVector(cameraRayDirection, safeCameraDistance);
  cameraLookAt.lerp(cameraDesiredLookAt, 1 - Math.exp(-11 * dt));
  camera.position.lerp(cameraDesiredPosition, 1 - Math.exp(-(cameraObstructed ? 13 : 6.2) * dt));
  camera.lookAt(cameraLookAt);

  const sprintCamera = !inVehicle && !playerSeated && (keys.has('ShiftLeft') || keys.has('ShiftRight') || isRunning) && playerMotion.speed > 3.5;
  const targetFov = divingState.active ? 66 : inBoat ? 62 : inVehicle ? 60 : sprintCamera ? 61 : 58;
  const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 4.5, dt);
  if (Math.abs(nextFov - camera.fov) > 0.015) { camera.fov = nextFov; camera.updateProjectionMatrix(); }
  water.position.y = 0.27 + Math.sin(performance.now() * 0.0007) * 0.025;
}

window.__estateDebug = () => ({
  position: player.position.toArray(),
  vehiclePosition: vehicle.position.toArray(),
  velocity: velocity.toArray(),
  input: moveInput.toArray(),
  characterMotion: { ...playerMotion, grounded: isGrounded, verticalSpeed, sprinting: (keys.has('ShiftLeft') || keys.has('ShiftRight') || isRunning) && playerMotion.speed > 0.22, articulated: true,
    pose: { chestLean: bodyPivot.rotation.x, bodyBank: bodyPivot.rotation.z, headTilt: headPivot.rotation.x, leftKnee: kneeL.rotation.x, rightKnee: kneeR.rotation.x, leftElbow: elbowL.rotation.x, rightElbow: elbowR.rotation.x, rightWrist: [wristR.rotation.x,wristR.rotation.y,wristR.rotation.z] }, facingDirection: [-Math.sin(avatar.rotation.y), 0, -Math.cos(avatar.rotation.y)] },
  interactionMotion: { type: playerGesture.type, elapsed: playerGesture.elapsed, duration: playerGesture.duration, weight: playerGesture.weight, expression: playerFace.expression, blinkRemaining: playerFace.blinkRemaining, bookVisible: gestureBook.visible },
  handheld: { item: handheldState.item, count: handheldState.count, persistent: handheldState.persistent, visible: Object.fromEntries(Object.entries(heldProps).map(([key, prop]) => [key, prop.visible])) },
  worldObjects: worldDrops.map(drop => ({ id: drop.id, item: drop.item, count: drop.count, persistent: drop.persistent, position: drop.group.position.toArray(), velocity: drop.velocity.toArray(), surfaceId: drop.surfaceId, settled: !!drop.surfaceId || drop.velocity.lengthSq() < 0.002 })),
  renderStats: { sceneChildren: scene.children.length, houseChildren: house.children.length, playerVisible: player.visible, avatarVisible: avatar.visible, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cameraNear: camera.near, cameraFar: camera.far },
  camera: { yaw: cameraYaw, yawTarget: cameraYawTarget, pitch: cameraPitch, pitchTarget: cameraPitchTarget, distance: cameraDistance, distanceTarget: cameraDistanceTarget, sensitivity: cameraSensitivity, invertY: invertCameraY, obstructed: cameraObstructed, safeDistance: cameraOcclusionDistance, fov: camera.fov, position: camera.position.toArray(), lookAt: cameraLookAt.toArray() },
  started: isStarted,
  keys: [...keys],
  graphicsQuality, autoSaveEnabled, rendererFallbackActive,
  performance: { deviceClass:isAppleTablet?'ipad':isTouchDevice?'touch':'desktop', pixelRatio:renderer.getPixelRatio(), adaptiveRenderScale, antialias:renderer.getContextAttributes()?.antialias??null, shadows:renderer.shadowMap.enabled, viewDistance:camera.far, fogDistance:scene.fog.far, measuredFps, updateMs:lastUpdateCostMs, renderMs:lastRenderCostMs, uiOpen:hasOpenPanel, enabledDynamicLights:[...managedPointLights].filter(light=>light.visible).length, managedDynamicLights:managedPointLights.size, primitiveGeometryCache:Object.fromEntries(Object.entries(primitiveGeometryCache).map(([kind,cache])=>[kind,cache.size])), renderCalls:renderer.info.render.calls, triangles:renderer.info.render.triangles },
  nearby: currentTarget?.id ?? null,
  floorHeight: getGroundHeight(player.position.x, player.position.z),
  objectives: { ...objectiveState },
  states: { doorOpen, lightsOn, tvOn, fridgeOpen },
  boating: inBoat, boat: { speed: boatSpeed, heading: boatHeading, tripDistance: boatTripDistance, rentals: boatRentalCount, position: marinaBoat.position.toArray(), brakeHeld: boatBrakeHeld, islandDocked: boatDockedAtIsland, dockApproach: canDockAtNorthShoal(), race: { phase:boatRaceState.phase, elapsed:boatRaceState.elapsed, checkpoint:boatRaceState.checkpoint, checkpoints:boatRaceCourse.checkpoints.length, bestTime:boatRaceState.bestTime, lastTime:boatRaceState.lastTime, rewardDay:boatRaceState.rewardDay }, salvage: { day:boatSalvageState.day, collected:[...boatSalvageState.collected], recovered:boatSalvageState.collected.filter(Boolean).length, total:boatSalvageState.total, bonusClaimed:boatSalvageState.bonusClaimed, nearby:nearestBoatSalvage()?.name||null } }, diving: { active:divingState.active, oxygen:divingState.oxygen, depth:Math.max(0,-player.position.y), day:divingState.day, collected:[...divingState.collected], recovered:divingState.collected.filter(Boolean).length, total:divingState.total, bonusClaimed:divingState.bonusClaimed, nearby:nearestDiveTarget()?.name||null, targets:diveTargets.map(target=>({name:target.name,position:[target.x,target.y,target.z],visible:target.group.visible})) }, driving: inVehicle, vehicleSpeed, vehicle: { riderVisible:motorcycleRider.visible, dustActive: vehicleDustParticles.filter(particle => particle.life > 0).length, dirt: vehicleDirt, washActive: vehicleWashTimer > 0, fuel: vehicleFuel, lightsMode: vehicleLightsMode, headlightsOn: currentVehicleLightsOn(), tripDistance: vehicleTripDistance, acceleration: vehicleAcceleration, yawRate: vehicleYawRate(vehicleSpeed, keys.has('KeyD') || keys.has('ArrowRight') ? 1 : keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0), braking: vehicleBrakeHeld || keys.has('Space'), frontSteer: vehicleFrontWheelPivots[0]?.rotation.y ?? 0, brakeLightIntensity: vehicleBrakeMat.emissiveIntensity, bodyPitch: vehicleBody.rotation.x, bodyRoll: vehicleBody.rotation.z }, vehicleFleet:{selected:selectedVehicleType,motorcycleOwned,telemetry:{suv:{...vehicleFleetTelemetry.suv},motorcycle:{...vehicleFleetTelemetry.motorcycle}},models:{suv:vehicleCarModel.visible,motorcycle:vehicleMotorcycleModel.visible,rider:motorcycleRider.visible},dealer: {kioskPosition:[12.25,60.2],deliveryBay:[dealerVehicleBay.x,dealerVehicleBay.z],bikePrice:motorcyclePurchasePrice}}, vehicleGarage:{...vehicleGarageState,visible:vehicleGarageGroup.visible,upgradeCosts:Object.fromEntries(Object.keys(vehicleGarageUpgradeDefinitions).map(key=>[key,vehicleGarageUpgradeCost(key)])),paintOptions:Object.keys(vehiclePaintOptions)}, neighborhood: { playerArea: Math.hypot(player.position.x-44,player.position.z-218)<7.0 ? 'north-shoal-island' : player.position.z > 183 && player.position.x > 10 && player.position.x < 45 ? 'marina' : player.position.z > 143 && player.position.x < -7 ? 'riverside' : player.position.z > 118 && player.position.x > 17 && player.position.x < 40 ? 'fuel-stop' : player.position.z > 81 && player.position.x < -15 ? 'cafe' : player.position.z > 81 && player.position.x > 15 && player.position.x < 36 ? 'market' : player.position.z > 85 && player.position.x > 7 && player.position.x < 21 ? 'park' : player.position.z > 50 ? 'street' : 'estate', visited: { ...townVisited }, bounds: { playerZ: [ -43, 226.8 ], playerX: [ -51, 51 ], vehicleZ: [ -44, 224.4 ], boatX: [ 11.5, 67 ], boatZ: [ 204, 236 ] }, gatePassage: { playerClear: !collides(0,48), vehicleClear: !vehicleCollides(0,48) }, northGatePassage: { playerClear: !collides(0,108), vehicleClear: !vehicleCollides(0,108) }, cafeInterior: !collides(-25,88), marketInterior: !collides(25,88), cafeDoor: !collides(-25,81.2), marketDoor: !collides(25,81.2), fuelShopInterior: !collides(28,140.5), fuelShopDoor: !collides(28,134), riverside: !collides(-18,148.1), marina: !collides(25,201.8), marinaDriveway: !vehicleCollides(25,188.5) }, gameTime: formatGameTime(),
  npcPositions: npcs.map(item => item.npc.position.toArray()),
  relationshipThresholds: { ...relationshipThresholds }, hangoutUnlocks: { ...hangoutUnlocks }, hangoutFollowEnabled, hangoutActive: !!hangoutSession, hangout: hangoutSession ? { npcId: hangoutSession.npcId, activity: hangoutSession.activity, arrived: hangoutSession.arrived, playerArrived: hangoutSession.playerArrived, elapsed: hangoutSession.elapsed, relationshipReward: hangoutSession.relationshipReward, target: hangoutSession.target.toArray() } : null, seated: playerSeated, activeSeat: activeSeat?.id || null, seatedActivity, homeActivities: { readingAvailable: !!nearestPlacedBookshelf(2.7), bookshelfCount: decorPositions.filter(item => item.item === 'bookshelf').length, seatedActivityCooldown: seatedActivityTimer }, npcResting: npcs.map(item => ({ id: item.id, resting: item.restingOnSeat, seat: item.activeSeat ? item.activeSeat.style : null })),
  npcSocial: npcs.map(item => ({ id: item.id, nearby: item.playerNearby, greetingTimer: item.greetingTimer, greetingCooldown: item.greetingCooldown })), socialTalksToday: { ...socialTalksToday },
  dailyTasks: { day: dailyTaskDay, active: activeDailyTaskIds().map(id => ({ id, progress: dailyTaskProgress[id] || 0, goal: dailyTaskDefinitions[id].goal, claimed: !!dailyTaskClaimed[id] })) },
  economy: { lifetimeIncome, lifetimeSpending, recentTransactions: transactionHistory.slice(0,12).map(entry => ({ ...entry })) },
  workContracts: { day: workLimitDay, courier: courierShiftsToday, garden: gardenShiftsToday, freelance: careerShiftsToday, courierPhase: jobPhase, gardenPhase: gardenJobPhase },
  cityExpress: {day:courierNetworkState.day,phase:courierNetworkState.phase,routeIndex:courierNetworkState.routeIndex,route:currentCourierNetworkRoute()?{...currentCourierNetworkRoute()}:null,elapsed:courierNetworkState.elapsed,acceptedToday:courierNetworkState.acceptedToday,completedTotal:courierNetworkState.completedTotal,lastReward:courierNetworkState.lastReward,bestTime:courierNetworkState.bestTime,markerVisible:courierNetworkMarker.group.visible,vehicle:selectedVehicleType,vehiclePosition:vehicle.position.toArray()},
  cafeBusiness: {...cafeBusinessState,config:{...cafeBusinessConfig},localSupply:{capacity:cafeBusinessConfig.localStockCapacity,options:cafeLocalSupplyCatalog.map(supply=>({...supply,owned:inventory[supply.item]||0})),cratesVisible:cafeLocalSupplyCrates.map(crate=>crate.visible)},nextUpgrade:{espresso:cafeBusinessUpgradeCost('espresso'),patio:cafeBusinessUpgradeCost('patio')},signSubtitle:cafeBusinessState.owned?(cafeBusinessState.open?'OWNER OPERATED · OPEN':'PLAYER OWNED · CLOSED'):'COFFEE · BAKERY'},
  roadRally: {phase:roadRallyState.phase,elapsed:roadRallyState.elapsed,checkpoint:roadRallyState.checkpoint,totalCheckpoints:roadRallyCourse.checkpoints.length,bestTime:roadRallyState.bestTime,lastTime:roadRallyState.lastTime,rewardDay:roadRallyState.rewardDay,completed:roadRallyState.completed,lastTier:roadRallyState.lastTier,start:roadRallyCourse.start,checkpoints:roadRallyCourse.checkpoints.map(point=>({x:point.x,z:point.z,label:point.label})),atStart:isAtRoadRallyStart(),startButtonBound:!!roadRallyStartButton,startButtonVisible:!!roadRallyStartButton&&!roadRallyStartButton.classList.contains('hidden'),pavedLoop:roadRallyCourse.checkpoints.every(point=>Math.abs(point.x)===43&&[127,176].includes(point.z))},
  farming: { selectedSeed:farmState.selectedSeed, plots:farmState.plots.map((plot,index)=>({index,crop:plot.crop,watered:!!plot.wateredAt,stage:plot.stage,progress:Math.round(farmPlotProgress(index)*100),ready:plot.stage>=3,wateredAt:plot.wateredAt})), seedStock:Object.fromEntries(Object.values(farmCropDefinitions).map(crop=>[crop.key,inventory[crop.seedItem]||0])), harvestStock:Object.fromEntries(Object.values(farmCropDefinitions).map(crop=>[crop.key,inventory[crop.harvestItem]||0])), workshop:{...farmWorkshopState,remainingMinutes:farmWorkshopRemaining(),visible:farmWorkshopGroup.visible}, recipes:Object.fromEntries(Object.values(farmRecipeDefinitions).map(recipe=>[recipe.key,{input:inventory[recipe.inputItem]||0,output:inventory[recipe.outputItem]||0,salePrice:recipe.salePrice}])), seedBoard:[farmBoard.position.x,farmBoard.position.z] },
  property: { upgrades: { ...propertyUpgrades }, dailyBill: propertyDailyBill(), rental: { ...guestSuiteRental, rentPerDay:guestSuiteRentPerDay, managementFee:guestSuiteManagementFee, netPerDay:guestSuiteRentPerDay-guestSuiteManagementFee, unlocked:propertyUpgrades.guestSuite>=2 }, visibleRenovations: Object.keys(propertyUpgradeObjects), terraceSeatsUnlocked: propertyUpgrades.terrace > 0 ? seatingSpots.filter(seat => seat.requiresUpgrade === 'terrace').length : 0, expansionRooms: [propertyUpgrades.studio > 0 ? 'studio' : null, propertyUpgrades.guestSuite > 0 ? 'guestSuite' : null].filter(Boolean), activeRoom: player.position.x < -12.5 && player.position.x > -27.5 && player.position.z < -1.1 && propertyUpgrades.studio > 0 ? 'studio' : player.position.x < -12.5 && player.position.x > -27.5 && player.position.z > -0.9 && propertyUpgrades.guestSuite > 0 ? 'guestSuite' : null, collisionLayout: { baseWestWallActive: colliders.includes(westWallCollider), propertyWalls: colliders.filter(c => c.propertyExpansion).map(c => ({ minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ })), atStudioDoor: collides(-12.0,-5.2), atGuestDoor: collides(-12.0,4.9), inStudio: collides(-20,-5.2), studioInterior: collides(-20,-5.2), studioOuterWall: collides(-27.5,-5.2), guestInterior: collides(-20,3.4), guestOuterWall: collides(-27.5,3.4) } },
  placementActive: !!placementMode, placedDecorations: decorPositions.map(item => ({ ...item })), wallet, inventory: { ...inventory }, skills: { ...skills }, skillLevels: Object.fromEntries(Object.keys(skills).map(key => [key, skillProgress(key).level])), fishing: { phase: fishingState.phase, catches: fishingState.catches, lastCatch: fishingState.lastCatch, storedFish: fishStockValue() }, careerShiftsToday, giftsGivenToday: { ...giftsGivenToday }, hangoutsToday: { ...hangoutsToday }, jobPhase, jobCollected: [...jobCollected], jobsCompleted, decorPlaced: { ...decorPlaced }, outfitKey, needs: { ...needs }, relationships: { ...relationships }, routines: npcs.map(item => ({ id: item.id, routine: item.activeRoutine, activity: item.activity, resting: item.restingOnSeat, personality: item.personality.title, mood: item.mood, moodScore: item.moodScore })), npcSocialActive: !!npcSocialSession, gardenJobPhase, gardenWatered: [...gardenWatered], gardenJobsCompleted, gameDay, unpaidBills, billsPaid
});
let lastUpdateCostMs = 0;
let lastRenderCostMs = 0;
let measuredFps = 0;
let perfSampleFrames = 0;
let perfSampleStartedAt = 0;
let perfOverlay = null;
if (new URLSearchParams(location.search).has('perf')) {
  perfOverlay = document.createElement('pre');
  perfOverlay.id = 'estate-perf-overlay';
  perfOverlay.style.cssText = 'position:fixed;top:8px;left:8px;z-index:20000;margin:0;padding:8px 10px;border-radius:8px;background:rgba(8,15,22,.88);color:#d8f3e8;font:11px/1.45 ui-monospace,monospace;white-space:pre;pointer-events:none;';
  perfOverlay.textContent = 'ESTATE PERF · sampling…';
  document.body.append(perfOverlay);
}
function animate(timestamp) {
  requestAnimationFrame(animate);
  if (document.hidden) { lastAnimationTimestamp = 0; return; }
  if (lastAnimationTimestamp > 0) {
    const frameDelta = timestamp - lastAnimationTimestamp;
    if (frameDelta > 0 && frameDelta < 250) {
      adaptiveFrameTime += (frameDelta - adaptiveFrameTime) * 0.08;
      if (isTouchDevice && timestamp - lastAdaptiveResolutionUpdate > 2200) {
        lastAdaptiveResolutionUpdate = timestamp;
        if (adaptiveFrameTime > 22 && adaptiveRenderScale > 0.72) {
          adaptiveRenderScale = Math.max(0.72, adaptiveRenderScale - 0.08);
          updateRendererResolution();
        } else if (adaptiveFrameTime < 17.5 && adaptiveRenderScale < 1) {
          adaptiveRenderScale = Math.min(1, adaptiveRenderScale + 0.04);
          updateRendererResolution();
        }
      }
    }
  }
  lastAnimationTimestamp = timestamp;
  clock.update(timestamp);
  const dt = Math.min(clock.getDelta(), 0.035);
  const updateStartedAt = performance.now();
  update(dt);
  const renderStartedAt = performance.now();
  lastUpdateCostMs = renderStartedAt - updateStartedAt;
  renderer.render(scene, camera);
  lastRenderCostMs = performance.now() - renderStartedAt;
  perfSampleFrames++;
  if (!perfSampleStartedAt) perfSampleStartedAt = timestamp;
  if (timestamp - perfSampleStartedAt >= 1000) {
    measuredFps = perfSampleFrames * 1000 / (timestamp - perfSampleStartedAt);
    perfSampleFrames = 0;
    perfSampleStartedAt = timestamp;
    if (perfOverlay) {
      perfOverlay.textContent = `ESTATE PERF  ${measuredFps.toFixed(0)} FPS\n${graphicsQuality.toUpperCase()} · ${renderer.getPixelRatio().toFixed(2)} PX · ${isAppleTablet ? 'IPAD' : isTouchDevice ? 'TOUCH' : 'DESKTOP'}\nUPDATE ${lastUpdateCostMs.toFixed(1)}ms · RENDER ${lastRenderCostMs.toFixed(1)}ms\nDRAWS ${renderer.info.render.calls} · TRIS ${(renderer.info.render.triangles / 1000).toFixed(1)}k`;
    }
  }
}
document.addEventListener('visibilitychange', () => { lastAnimationTimestamp = 0; });
// Restore the latest local save automatically so returning players can resume immediately.
try {
  if (localStorage.getItem('estate-explorer-save-v4') || localStorage.getItem('estate-explorer-save-v3')) loadGame(false);
} catch (error) {
  console.warn('Could not restore a previous save.', error);
}
updateSettingsPanel();
resetDailyTasks();
renderDailyTasks();
animate();

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  updateRendererResolution();
}
window.addEventListener('resize', resize);
document.querySelector('#clock').textContent = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',hour12:false});
startupReady = true;
clearTimeout(startupWatchdog);
loading.classList.add('done');
setTimeout(() => loading.remove(), 650);

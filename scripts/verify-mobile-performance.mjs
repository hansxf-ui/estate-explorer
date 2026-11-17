import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;
function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}

check('iPadOS is detected even when Safari requests the desktop website',()=>{
  assert.match(source,/\/iPad\/i\.test\(navigator\.userAgent\)/);
  assert.match(source,/navigator\.platform === 'MacIntel' && navigator\.maxTouchPoints > 1/);
  assert.match(source,/const isTouchDevice = isAppleTablet/);
});
check('Touch devices without a manual choice automatically boot in Performance mode',()=>{
  assert.match(source,/let graphicsQuality = isTouchDevice \? 'performance' : 'balanced'/);
  assert.match(source,/isTouchDevice && !hasManualGraphicsPreference \? 'performance'/);
  assert.match(source,/if \(isTouchDevice && !hasManualGraphicsPreference && !notify\) level = rendererFallbackActive \? 'low' : 'performance'/);
  assert.match(source,/estate-graphics-quality-manual/);
  assert.match(source,/GRAPHICS_PREFERENCE_VERSION = '40\.13'/);
  assert.match(source,/estate-graphics-quality-manual-version/);
});
check('Performance mode cuts pixel fill, shadow rendering and dynamic light count',()=>{
  assert.match(source,/performance: \{ pixelRatio: 0\.64, shadows: false, shadowMap: 512, dynamicLights: false \}/);
  assert.match(source,/low: \{ pixelRatio: 0\.54, shadows: false, shadowMap: 512, dynamicLights: false \}/);
  assert.match(source,/renderer\.shadowMap\.enabled = preset\.shadows/);
  assert.match(source,/sun\.castShadow = preset\.shadows/);
  assert.match(source,/managedPointLights\.forEach\(light => \{ light\.visible = preset\.dynamicLights; \}\)/);
});
check('Touch renderers disable MSAA while desktop rendering preserves antialiasing',()=>{
  assert.match(source,/new THREE\.WebGLRenderer\(\{ antialias: !isTouchDevice, powerPreference: 'high-performance' \}\)/);
  assert.match(source,/performance: \{ deviceClass:isAppleTablet\?'ipad'/);
});
check('The game manages the full set of point lights and creates newly added lights in the active quality mode',()=>{
  assert.match(source,/const managedPointLights = new Set\(\)/);
  assert.match(source,/function createManagedPointLight\(color, intensity, distance, decay = 2\)/);
  assert.match(source,/light\.visible = !!graphicsPresets\[graphicsQuality\]\?\.dynamicLights/);
  assert.equal((source.match(/new THREE\.PointLight\(/g)||[]).length,1,'all scene point lights should pass through the managed factory');
  assert.match(source,/managedDynamicLights:managedPointLights\.size/);
});
check('Repeated box, cylinder and sphere meshes share immutable primitive geometry buffers',()=>{
  assert.match(source,/const primitiveGeometryCache = \{ box: new Map\(\), cylinder: new Map\(\), sphere: new Map\(\) \}/);
  assert.match(source,/function cachedPrimitiveGeometry\(kind, key, create\)/);
  assert.match(source,/const sharedPrimitiveGeometrySet = new WeakSet\(\)/);
  assert.match(source,/sharedPrimitiveGeometrySet\.add\(geometry\)/);
  assert.match(source,/cachedPrimitiveGeometry\('box', key/);
  assert.match(source,/cachedPrimitiveGeometry\('cylinder', key/);
  assert.match(source,/cachedPrimitiveGeometry\('sphere', key/);
  assert.match(source,/child\.geometry && !sharedPrimitiveGeometrySet\.has\(child\.geometry\)/);
  assert.match(source,/child\.geometry&&!sharedPrimitiveGeometrySet\.has\(child\.geometry\)/);
  assert.match(source,/primitiveGeometryCache:Object\.fromEntries/);
});
check('Touch devices use a simpler standard glass shader instead of transmission rendering',()=>{
  assert.match(source,/function createSurfaceMaterial\(parameters\)/);
  assert.match(source,/if \(isTouchDevice\).*new THREE\.MeshLambertMaterial/);
  assert.match(source,/const glassMat = createSurfaceMaterial/);
  assert.match(source,/const vehicleGlass = createSurfaceMaterial/);
  assert.match(source,/const districtGlassMat = createSurfaceMaterial/);
  assert.match(source,/transmission: 0\.15/);
});
check('Adaptive resolution reduces render scale under sustained slow frames and recovers gradually',()=>{
  assert.match(source,/adaptiveFrameTime > 19\.5 && adaptiveRenderScale > 0\.70/);
  assert.match(source,/adaptiveRenderScale - 0\.08/);
  assert.match(source,/adaptiveFrameTime < 15\.8 && adaptiveRenderScale < 1/);
  assert.match(source,/adaptiveRenderScale \+ 0\.025/);
  assert.match(source,/Math\.max\(0\.70, adaptiveRenderScale/);
  assert.match(source,/effectiveRenderPixelRatio\(\)/);
});
check('Changing graphics quality and resizing the viewport reapply the current adaptive pixel ratio',()=>{
  assert.match(source,/adaptiveRenderScale = 1;\n  updateRendererResolution\(\)/);
  assert.match(source,/function updateRendererResolution\(\)/);
  assert.match(source,/function resize\(\)[\s\S]*?updateRendererResolution\(\)/);
  assert.ok(html.includes('data-quality="performance"'));
  assert.ok(html.includes('data-quality="balanced"'));
});
check('Hidden browser tabs skip simulation and GPU rendering until they become visible again',()=>{
  assert.match(source,/if \(document\.hidden\) \{ lastAnimationTimestamp = 0; return; \}/);
  assert.match(source,/document\.addEventListener\('visibilitychange'/);
});
check('The reef fish, bubbles and discovery halos stop animating when the player is far from North Shoal',()=>{
  assert.match(source,/const nearReef=Math\.hypot\(proximityOrigin\.x-47,proximityOrigin\.z-228\)<72/);
  assert.match(source,/if\(!divingState\.active&&!nearReef\)return/);
});
check('Day-night sky and sun blending reuses Color objects rather than allocating them every frame',()=>{
  assert.match(source,/const blendedSkyColor = new THREE\.Color\(\)/);
  assert.match(source,/blendedSkyColor\.copy\(nightSkyColor\)\.lerp\(daySkyColor, daylight\)/);
  const dayNight=source.slice(source.indexOf('function updateDayNight(dt)'),source.indexOf('function updateMarina(dt)'));
  assert.doesNotMatch(dayNight,/new THREE\.Color/);
});
check('Touch camera obstruction checks run less frequently than desktop raycasts',()=>{
  assert.match(source,/cameraOcclusionTimer >= \(isTouchDevice \? 0\.18 : 0\.10\)/);
});
check('Runtime diagnostics expose frame quality, GPU load and geometry-cache counters',()=>{
  for(const key of ['deviceClass','pixelRatio','adaptiveRenderScale','antialias','shadows','enabledDynamicLights','managedDynamicLights','primitiveGeometryCache','staticBatching','renderCalls','triangles'])assert.ok(source.includes(key),key);
});
check('The Settings panel includes a dedicated Performance option with adaptive-resolution guidance',()=>{
  assert.ok(html.includes('iPad menggunakan mode Performance secara otomatis'));
  assert.ok(html.includes('data-quality="performance"'));
  assert.match(css,/#settings-panel \.graphics-quality-section \.quality-options\{grid-template-columns:repeat\(4/);
});
check('Save schema remains V18 and existing progression data is not reset by the optimization',()=>{
  assert.match(source,/version: 18/);
  assert.match(source,/const data = \{/);
  assert.match(source,/settings: \{ graphicsQuality, autoSaveEnabled \}/);
  assert.match(source,/if \(data\.settings\?\.graphicsQuality\) applyGraphicsQuality\(data\.settings\.graphicsQuality\)/);
});
check('The mobile UI-lock hot path reads cached panel state rather than querying every DOM panel per call',()=>{
  assert.match(source,/const panelElements = panelIds\.map\(id => document\.getElementById\(id\)\)\.filter\(Boolean\)/);
  assert.match(source,/new MutationObserver\(\(\) => \{\s*hasOpenPanel = panelElements\.some/);
  assert.match(source,/function isUiOpen\(\) \{ return !!placementMode \|\| hasOpenPanel; \}/);
  assert.doesNotMatch(source,/function isUiOpen\(\) \{[^}]*document\.getElementById/);
});
check('Frequently refreshed HUD text and percentage widths avoid redundant DOM writes',()=>{
  assert.match(source,/function setTextIfChanged\(element, value\)/);
  assert.match(source,/function setWidthIfChanged\(element, value\)/);
  assert.match(source,/setTextIfChanged\(vehicleSpeedLabel/);
  assert.match(source,/setTextIfChanged\(vehicleFuelLabel/);
  assert.match(source,/setWidthIfChanged\(diveOxygenFill/);
  assert.match(source,/setWidthIfChanged\(roadRallyProgressFill/);
});
check('Touch devices receive a shorter camera/fog distance while desktop view distance is preserved',()=>{
  assert.match(source,/const WORLD_VIEW_DISTANCE = isTouchDevice \? 170 : 260/);
  assert.match(source,/const WORLD_FOG_DISTANCE = isTouchDevice \? 155 : 270/);
  assert.match(source,/new THREE\.PerspectiveCamera\(58, innerWidth \/ innerHeight, 0\.1, WORLD_VIEW_DISTANCE\)/);
  assert.match(source,/scene\.fog\.far=WORLD_FOG_DISTANCE/);
});
check('Touch graphics use a lower render scale and adaptive resolution can fall below the old 0.65 floor',()=>{
  assert.match(source,/performance: \{ pixelRatio: 0\.64, shadows: false/);
  assert.match(source,/low: \{ pixelRatio: 0\.54, shadows: false/);
  assert.match(source,/Math\.max\(0\.40, Math\.min\(devicePixelRatio/);
  assert.match(source,/adaptiveFrameTime > 19\.5 && adaptiveRenderScale > 0\.70/);
  assert.match(source,/adaptiveFrameTime < 15\.8 && adaptiveRenderScale < 1/);
});
check('Touch rendering uses lightweight Lambert shading and skips filmic tone mapping',()=>{
  assert.match(source,/return new THREE\.MeshLambertMaterial\(lightweightParameters\)/);
  assert.match(source,/renderer\.toneMapping = isTouchDevice \? THREE\.NoToneMapping/);
  assert.match(source,/function createLitMaterial\(parameters = \{\}\)/);
});
check('Static repeated world primitives are batched into InstancedMesh draw calls once at startup',()=>{
  assert.match(source,/function batchStaticScenePrimitives\(\)/);
  assert.match(source,/new THREE\.InstancedMesh\(first\.geometry, first\.material, meshes\.length\)/);
  assert.match(source,/for \(const mesh of \[\.\.\.scene\.children\]\)/);
  assert.match(source,/batchStaticScenePrimitives\(\);\s*animate\(\);/);
  assert.match(source,/drawCallsSaved/);
});
check('NPC routines are throttled to 30 Hz on touch while player controls continue each frame',()=>{
  assert.match(source,/npcSimulationAccumulator >= 1 \/ 30/);
  assert.match(source,/const npcDt = isTouchDevice/);
  assert.match(source,/const followButtonState = `\$\{!!hangoutSession\}:\$\{!!hangoutFollowEnabled\}`/);
});
check('The opt-in performance overlay is mounted by static HTML before the game module can fail',()=>{
  assert.match(html,/id="estate-perf-overlay" hidden/);
  assert.match(html,/new URLSearchParams\(window\.location\.search\)\.has\('perf'\)/);
  assert.match(html,/overlay\.hidden = false/);
  assert.match(html,/ESTATE PERF · HTML READY/);
  assert.match(html,/z-index:2147483647/);
  assert.match(source,/document\.querySelector\('#estate-perf-overlay'\)/);
  assert.doesNotMatch(source,/document\.body\.append\(perfOverlay\)/);
  assert.ok(html.indexOf('id="estate-perf-overlay"') < html.indexOf('<main id="game"'));
  assert.ok(html.indexOf("new URLSearchParams(window.location.search)") < html.indexOf('<script type="module"'));
});
check('The static monitor exposes script errors and the game module reports renderer failures',()=>{
  assert.match(html,/ESTATE PERF · SCRIPT ERROR/);
  assert.match(html,/ESTATE PERF · SCRIPT REJECTION/);
  assert.match(source,/ESTATE PERF · WEBGL FAILED/);
});
check('The live performance monitor reports device FPS and the render workload without affecting normal sessions',()=>{
  assert.match(html,/new URLSearchParams\(window\.location\.search\)\.has\('perf'\)/);
  assert.match(source,/measuredFps = perfSampleFrames \* 1000/);
  assert.match(source,/UPDATE \$\{lastUpdateCostMs/);
  assert.match(source,/DRAWS \$\{renderer\.info\.render\.calls/);
  assert.match(source,/measuredFps, updateMs:lastUpdateCostMs, renderMs:lastRenderCostMs/);
});
check('The Prototype 40.13 release notes describe the iPad render-budget optimization',()=>{
  assert.match(readme,/Prototype 40\.13 — iPad Render Budget & Static World Batching/);
  assert.match(readme,/actual 60 FPS target must still be checked on the user's iPad hardware/i);
});
check('The Prototype 40.13 package, lockfile, app branding and aggregate tests are synchronized',()=>{
  assert.equal(pkg.version,'0.40.13');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('<title>Estate Explorer — Prototype 40.13</title>'));
  assert.ok(html.includes('BUILD 0.40.13'));
  assert.match(pkg.scripts['test:game'],/test:performance/);
});
console.log(`\n${passed} mobile graphics optimization integration checks passed.`);

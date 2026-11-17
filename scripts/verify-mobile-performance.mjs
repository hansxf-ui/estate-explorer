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
});
check('Performance mode cuts pixel fill, shadow rendering and dynamic light count',()=>{
  assert.match(source,/performance: \{ pixelRatio: 0\.95, shadows: false, shadowMap: 512, dynamicLights: false \}/);
  assert.match(source,/low: \{ pixelRatio: 0\.8, shadows: false, shadowMap: 512, dynamicLights: false \}/);
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
  assert.match(source,/if \(isTouchDevice\).*new THREE\.MeshStandardMaterial/);
  assert.match(source,/const glassMat = createSurfaceMaterial/);
  assert.match(source,/const vehicleGlass = createSurfaceMaterial/);
  assert.match(source,/const districtGlassMat = createSurfaceMaterial/);
  assert.match(source,/transmission: 0\.15/);
});
check('Adaptive resolution reduces render scale under sustained slow frames and recovers gradually',()=>{
  assert.match(source,/adaptiveFrameTime > 22 && adaptiveRenderScale > 0\.72/);
  assert.match(source,/adaptiveRenderScale - 0\.08/);
  assert.match(source,/adaptiveFrameTime < 17\.5 && adaptiveRenderScale < 1/);
  assert.match(source,/adaptiveRenderScale \+ 0\.04/);
  assert.match(source,/Math\.max\(0\.72, adaptiveRenderScale/);
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
  for(const key of ['deviceClass','pixelRatio','adaptiveRenderScale','antialias','shadows','enabledDynamicLights','managedDynamicLights','primitiveGeometryCache','renderCalls','triangles'])assert.ok(source.includes(key),key);
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
check('The Prototype 40.9 release notes describe the mobile renderer optimization without claiming an iPad benchmark',()=>{
  assert.match(readme,/Prototype 40\.9 — iPad & Mobile Rendering Optimization/);
  assert.match(readme,/actual frame-rate benchmarking still needs to be confirmed on the target iPad/i);
});
check('The Prototype 40.9 package, lockfile, app branding and aggregate tests are synchronized',()=>{
  assert.equal(pkg.version,'0.40.9');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('<title>Estate Explorer — Prototype 40.9</title>'));
  assert.ok(html.includes('BUILD 0.40.9'));
  assert.match(pkg.scripts['test:game'],/test:performance/);
});
console.log(`\n${passed} mobile graphics optimization integration checks passed.`);

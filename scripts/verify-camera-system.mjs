import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Camera has smoothed current and target values for yaw, pitch and distance', () => {
  assert.match(source, /let cameraYawTarget = 0/);
  assert.match(source, /let cameraPitchTarget = 0\.24/);
  assert.match(source, /let cameraDistanceTarget = 8\.8/);
  assert.match(source, /cameraYaw \+= yawDelta \* \(1 - Math\.exp\(-10 \* dt\)\)/);
  assert.match(source, /cameraPitch = THREE\.MathUtils\.damp\(cameraPitch, cameraPitchTarget, 9, dt\)/);
  assert.match(source, /cameraDistance = THREE\.MathUtils\.damp\(cameraDistance, cameraDistanceTarget, 8, dt\)/);
});
check('Desktop drag and one-finger touch orbit obey configurable sensitivity and vertical inversion', () => {
  assert.match(source, /cameraPointers\.set\(e\.pointerId/);
  assert.match(source, /cameraYawTarget -= dx \* sensitivity/);
  assert.match(source, /cameraPitchTarget = clamp\(cameraPitchTarget \+ dy \* sensitivity \* 0\.6 \* \(invertCameraY \? -1 : 1\)/);
  assert.match(source, /const baseSensitivity = e\.pointerType === 'touch' \? 0\.007 : 0\.005/);
});
check('Two-finger pinch zoom clamps camera distance to a safe gameplay range', () => {
  assert.match(source, /function pinchDistance\(\)/);
  assert.match(source, /cameraPointers\.size >= 2/);
  assert.match(source, /cameraDistanceTarget = clamp\(cameraDistanceTarget - \(nextDistance - previousPinchDistance\) \* 0\.018, 5\.4, 14\.2\)/);
  assert.match(source, /renderer\.domElement\.addEventListener\('pointercancel', finishCameraPointer\)/);
});
check('Desktop wheel zoom is non-passive and constrained to the same camera distance range', () => {
  assert.match(source, /addEventListener\('wheel',[\s\S]*?e\.preventDefault\(\)[\s\S]*?cameraDistanceTarget = clamp\(cameraDistanceTarget \+ clamp\(e\.deltaY \* 0\.0028, -1\.25, 1\.25\), 5\.4, 14\.2\)/);
  assert.match(source, /\{ passive: false \}\)/);
});
check('The camera recenters behind the character with C and a mobile reset button', () => {
  assert.match(source, /function resetCameraView\(notify = true\)[\s\S]*?cameraYawTarget = avatar\.rotation\.y/);
  assert.match(source, /cameraPitchTarget = 0\.24/);
  assert.match(source, /cameraDistanceTarget = 8\.8/);
  assert.match(source, /e\.code === 'KeyC'[\s\S]*?resetCameraView\(\)/);
  assert.match(source, /#camera-reset-btn/);
  assert.match(html, /id="camera-reset-btn"/);
});
check('Camera sensitivity and invert-Y preferences persist outside game saves', () => {
  assert.match(source, /estate-camera-preferences/);
  assert.match(source, /JSON\.stringify\(\{ sensitivity: cameraSensitivity, invertY: invertCameraY \}\)/);
  assert.match(source, /data-camera-sensitivity/);
  assert.match(html, /data-camera-sensitivity="low"/);
  assert.match(html, /data-camera-sensitivity="normal"/);
  assert.match(html, /data-camera-sensitivity="high"/);
  assert.match(html, /id="camera-invert-toggle"/);
});
check('Camera collision raycasts against the house and moves the view forward before wall clipping', () => {
  assert.match(source, /const cameraOcclusionRaycaster = new THREE\.Raycaster\(\)/);
  assert.match(source, /cameraOcclusionRaycaster\.intersectObject\(house, true\)/);
  assert.match(source, /cameraOcclusionDistance = obstruction \? Math\.max\(1\.75, obstruction\.distance - 0\.42\) : desiredCameraDistance/);
  assert.match(source, /const safeCameraDistance = Math\.min\(desiredCameraDistance, cameraOcclusionDistance\)/);
  assert.match(source, /cameraObstructed \? 13 : 6\.2/);
});
check('Follow-camera target is smoothed, slightly anticipates movement and adjusts FOV for sprint/driving', () => {
  assert.match(source, /cameraLookAt\.lerp\(cameraDesiredLookAt, 1 - Math\.exp\(-11 \* dt\)\)/);
  assert.match(source, /velocity\.x \* 0\.075/);
  assert.match(source, /const targetFov = divingState\.active \? 66 : inBoat \? 62 : inVehicle \? 60 : sprintCamera \? 61 : 58/);
  assert.match(source, /camera\.updateProjectionMatrix\(\)/);
});
check('Character yaw is corrected to face the actual travel vector', () => {
  assert.match(source, /const desiredYaw = Math\.atan2\(-dirX, -dirZ\)/);
  assert.match(source, /facingDirection: \[-Math\.sin\(avatar\.rotation\.y\), 0, -Math\.cos\(avatar\.rotation\.y\)\]/);
});
check('Camera yaw target is saved and restored while the established V12 save schema remains unchanged', () => {
  assert.match(source, /gameMinutes, cameraYaw: cameraYawTarget, objectives: objectiveState/);
  assert.match(source, /cameraYawTarget = cameraYaw/);
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
});
check('Runtime diagnostics expose camera orbit, zoom, obstruction and FOV state', () => {
  assert.match(source, /camera: \{ yaw: cameraYaw, yawTarget: cameraYawTarget/);
  assert.match(source, /sensitivity: cameraSensitivity, invertY: invertCameraY, obstructed: cameraObstructed/);
  assert.match(source, /safeDistance: cameraOcclusionDistance, fov: camera\.fov/);
});
check('Mobile reset control and desktop camera guidance are responsive', () => {
  assert.match(html, /<kbd>WHEEL<\/kbd> Zoom[\s\S]*?<kbd>C<\/kbd> Reset kamera/);
  assert.match(css, /\.camera-reset-btn/);
  assert.match(css, /@media \(pointer:coarse\),\(max-width:700px\)/);
});
check('Prototype 39 release metadata is synchronized across app, package and release notes', () => {
  assert.equal(pkg.version, '0.40.7');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:camera/);
  assert.match(html, /Prototype 40/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.7'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} camera system integration checks passed.`);

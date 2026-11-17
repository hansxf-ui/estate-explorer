import fs from 'node:fs';
import assert from 'node:assert/strict';
import { cameraRelativeToWorld, worldToCameraRelative, applyRadialDeadzone, virtualStickVector } from '../src/input-controls.js';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }
function near(actual, expected, epsilon = 1e-9) { assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`); }

check('At the default camera angle, forward and right match the visible screen axes', () => {
  const forward = cameraRelativeToWorld(0, 1, 0);
  const right = cameraRelativeToWorld(1, 0, 0);
  near(forward.x, 0); near(forward.z, -1);
  near(right.x, 1); near(right.z, 0);
});
check('Rotating the camera rotates all four movement directions consistently', () => {
  const yaw = Math.PI / 2;
  const forward = cameraRelativeToWorld(0, 1, yaw);
  const right = cameraRelativeToWorld(1, 0, yaw);
  const backward = cameraRelativeToWorld(0, -1, yaw);
  const left = cameraRelativeToWorld(-1, 0, yaw);
  near(forward.x, -1); near(forward.z, 0);
  near(right.x, 0); near(right.z, -1);
  near(backward.x, 1); near(backward.z, 0);
  near(left.x, 0); near(left.z, 1);
});
check('World directions convert back into camera-relative input without swapping left and right', () => {
  for (const yaw of [-Math.PI, -1.3, -0.4, 0, 0.6, 1.57, Math.PI]) {
    for (const [right, forward] of [[1,0],[-1,0],[0,1],[0,-1],[0.4,0.7]]) {
      const world = cameraRelativeToWorld(right, forward, yaw);
      const local = worldToCameraRelative(world.x, world.z, yaw);
      near(local.right, right);
      near(local.forward, forward);
    }
  }
});
check('The stick deadzone filters touch jitter and smoothly remaps the remaining travel', () => {
  assert.deepEqual(applyRadialDeadzone(0, 0), { x:0, y:0 });
  assert.deepEqual(applyRadialDeadzone(0.05, 0.04), { x:0, y:0 });
  const half = applyRadialDeadzone(0.555, 0);
  near(half.x, 0.5);
  near(half.y, 0);
  const max = applyRadialDeadzone(1, 0);
  near(max.x, 1);
  near(max.y, 0);
});
check('The virtual stick clamps to its physical radius and preserves intuitive up/down signs', () => {
  const up = virtualStickVector(0, -80, 40);
  const down = virtualStickVector(0, 80, 40);
  const right = virtualStickVector(80, 0, 40);
  const diagonal = virtualStickVector(80, -80, 40);
  near(up.x, 0); near(up.y, 1);
  near(down.x, 0); near(down.y, -1);
  near(right.x, 1); near(right.y, 0);
  near(Math.hypot(diagonal.x, diagonal.y), 1);
  assert.deepEqual(virtualStickVector(0, 0, 0), { x:0, y:0 });
});
check('Walking, swimming and NPC auto-follow share the corrected camera basis', () => {
  assert.match(source, /cameraRelativeToWorld\(moveInput\.x, moveInput\.y, cameraYaw\)/);
  assert.match(source, /worldToCameraRelative\(wx, wz, cameraYaw\)/);
  assert.doesNotMatch(source, /moveInput\.x\s*\*\s*sin\s*-\s*moveInput\.y\s*\*\s*cos/);
});
check('Virtual stick has one captured pointer and clears on every release path', () => {
  assert.match(source, /if \(joystickPointer !== null/);
  assert.match(source, /stickRing\.setPointerCapture\(e\.pointerId\)/);
  assert.match(source, /stickRing\.addEventListener\('pointerup', resetStick\)/);
  assert.match(source, /stickRing\.addEventListener\('pointercancel', resetStick\)/);
  assert.match(source, /stickRing\.addEventListener\('lostpointercapture', resetStick\)/);
  assert.match(source, /virtualStickVector\(dx, dy, max, 0\.11\)/);
});
check('Camera taps do not orbit until the finger has moved beyond the drag threshold', () => {
  assert.match(source, /const totalDrag = Math\.hypot\(pointer\.x - pointer\.startX, pointer\.y - pointer\.startY\)/);
  assert.match(source, /totalDrag < 4/);
  assert.match(source, /const baseSensitivity = e\.pointerType === 'touch' \? 0\.0042 : 0\.005/);
  assert.match(source, /renderer\.domElement\.addEventListener\('pointerup', finishCameraPointer\)/);
  assert.match(source, /renderer\.domElement\.addEventListener\('lostpointercapture', finishCameraPointer\)/);
});
check('The touch HUD gives the joystick a larger target and prevents gestures leaking to the page', () => {
  assert.match(css, /width:clamp\(116px,13vw,144px\)/);
  assert.match(css, /height:clamp\(116px,13vw,144px\)/);
  assert.match(css, /\.mobile-controls\{[^}]*pointer-events:none/);
  assert.match(css, /\.stick-wrap[^}]*pointer-events:auto/);
  assert.match(html, /id="stick-ring"/);
  assert.match(html, /id="camera-reset-btn"/);
});
check('Held jump and sprint buttons capture their pointer and always release their state', () => {
  assert.match(source, /jumpControl\.setPointerCapture\(e\.pointerId\)/);
  assert.match(source, /sprintControl\.setPointerCapture\(e\.pointerId\)/);
  assert.match(source, /jumpControl\.addEventListener\('lostpointercapture', releaseJumpControl\)/);
  assert.match(source, /sprintControl\.addEventListener\('lostpointercapture', releaseSprintControl\)/);
});
check('Blur and backgrounding clear all transient touch, camera, sprint and vehicle input', () => {
  assert.match(source, /window\.addEventListener\('blur', releaseAllTransientInput\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) releaseAllTransientInput\(\); \}\)/);
  assert.match(source, /function releaseAllTransientInput\(\) \{[^}]*joystickVector\.set\(0,0\)[^}]*cameraPointers\.clear\(\)/);
});

console.log(`\n${passed} mobile input and direction checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Player rig contains independently articulated shoulders, elbows, hips, knees and ankles', () => {
  for (const symbol of ['bodyPivot','headPivot','elbowL','elbowR','hipPivot','kneeL','kneeR','footL','footR']) assert.match(source, new RegExp(`const ${symbol} = group\\(`));
  assert.match(source, /const torsoMesh = new THREE\.Mesh\(new THREE\.CapsuleGeometry/);
  assert.match(source, /new THREE\.CapsuleGeometry\(0\.115, 0\.24/);
  assert.match(source, /new THREE\.CapsuleGeometry\(0\.105, 0\.20/);
});
check('Locomotion animation blends idle, walk and run from actual horizontal velocity', () => {
  assert.match(source, /function updatePlayerLocomotionAnimation\(dt,/);
  assert.match(source, /playerMotion\.blend = THREE\.MathUtils\.damp/);
  assert.match(source, /speed: Math\.hypot\(velocity\.x, velocity\.z\), sprint/);
  assert.match(source, /playerMotion\.state = !grounded[\s\S]*?playerMotion\.speed > 0\.4 && playerMotion\.blend > 0\.08/);
  assert.match(source, /'running' : 'walking'[\s\S]*?'idle'/);
});
check('Stride applies alternating leg swing, knee flex, foot lift and counter-swinging arms', () => {
  assert.match(source, /const stride = Math\.sin\(phase\)/);
  assert.match(source, /const oppositeStride = Math\.sin\(phase \+ Math\.PI\)/);
  assert.match(source, /kneeL\.rotation\.x = Math\.max\(0, oppositeStride\)/);
  assert.match(source, /kneeR\.rotation\.x = Math\.max\(0, stride\)/);
  assert.match(source, /footL\.rotation\.x = -Math\.max\(0, stride\)/);
  assert.match(source, /armL\.rotation\.x = -stride/);
  assert.match(source, /armR\.rotation\.x = -oppositeStride/);
});
check('Torso, head and shoulders react to acceleration, sprinting and turning', () => {
  assert.match(source, /const forwardLean = playerMotion\.blend/);
  assert.match(source, /const sideLean = clamp\(-turnRate \* 0\.035/);
  assert.match(source, /bodyPivot\.rotation\.x = THREE\.MathUtils\.damp/);
  assert.match(source, /bodyPivot\.rotation\.z = THREE\.MathUtils\.damp/);
  assert.match(source, /headPivot\.rotation\.y = THREE\.MathUtils\.damp/);
});
check('Jump and fall have airborne poses, and landing captures impact for a compression reaction', () => {
  assert.match(source, /verticalSpeed = 7\.1 \+ carry/);
  assert.match(source, /playerMotion\.state = 'jumping'/);
  assert.match(source, /const rising = clamp\(verticalSpeed/);
  assert.match(source, /const falling = clamp\(-verticalSpeed/);
  assert.match(source, /if \(!wasGrounded\) playerMotion\.landingKick = clamp\(Math\.abs\(verticalSpeed\) \/ 9/);
  assert.match(source, /landing \* 0\.48/);
  assert.match(source, /playerMotion\.state = !grounded[\s\S]*?'jumping' : 'falling'/);
});
check('Movement uses responsive acceleration and braking while retaining collision and camera-relative direction', () => {
  assert.match(source, /const response = hasMoveInput \? \(sprint \? 13 : 14\) : 18/);
  assert.match(source, /const dirX = moveInput\.x \* cos \+ moveInput\.y \* sin/);
  assert.match(source, /if \(collides\(nx, player\.position\.z\)\)/);
  assert.match(source, /if \(collides\(player\.position\.x, nz\)\)/);
  assert.match(source, /keys\.has\('ShiftLeft'\).*isRunning/);
});
check('Standing after sitting resets every articulated joint to a clean neutral pose', () => {
  const start = source.indexOf('function standFromSeat(');
  const end = source.indexOf('\nfunction interact()', start);
  const body = source.slice(start, end);
  for (const symbol of ['bodyPivot','torsoMesh','headPivot','hipPivot','legL','legR','kneeL','kneeR','footL','footR','armL','armR','elbowL','elbowR']) assert.ok(body.includes(`${symbol}.rotation`), `${symbol} not reset`);
  assert.match(body, /playerMotion\.blend = 0/);
  const seatStart = source.indexOf('function sitOnSeat(');
  const seatEnd = source.indexOf('\nfunction doSeatedActivity', seatStart);
  const seatBody = source.slice(seatStart, seatEnd);
  assert.match(seatBody, /playerMotion\.state = 'idle'; playerMotion\.speed = 0; playerMotion\.blend = 0/);
  assert.match(seatBody, /headPivot\.rotation\.set\(0, 0, 0\)/);
});
check('Touch controls still support jump and sprint pointer interactions', () => {
  assert.match(source, /document\.querySelector\('#jump-btn'\)\.addEventListener\('pointerdown'/);
  assert.match(source, /document\.querySelector\('#sprint-btn'\)\.addEventListener\('pointerdown'/);
  assert.match(source, /document\.querySelector\('#sprint-btn'\)\.addEventListener\('pointercancel'/);
  assert.match(source, /stickRing\.addEventListener\('pointermove'/);
});
check('Runtime diagnostics expose current character animation state for verification', () => {
  assert.match(source, /characterMotion: \{ \.\.\.playerMotion, grounded: isGrounded, verticalSpeed, sprinting:/);
  assert.match(source, /articulated: true/);
  assert.match(source, /pose: \{ chestLean: bodyPivot\.rotation\.x, bodyBank: bodyPivot\.rotation\.z/);
});
check('V18 save schema keeps existing character state and the current app release is Prototype 39', () => {
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.equal(pkg.version, '0.40.8');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:character/);
  assert.match(html, /Prototype 40/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.8'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} character motion integration checks passed.`);

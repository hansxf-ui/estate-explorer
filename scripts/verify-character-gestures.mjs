import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Character face now has independently animated eyes, brows and a mouth', () => {
  assert.match(source, /const eyeL = sphere\(headPivot/);
  assert.match(source, /const eyeR = sphere\(headPivot/);
  assert.match(source, /const browL = box\(headPivot/);
  assert.match(source, /const browR = box\(headPivot/);
  assert.match(source, /const mouthMesh = box\(headPivot/);
});
check('Idle facial animation performs randomized, short natural blinks', () => {
  assert.match(source, /blinkTimer: 2\.1 \+ Math\.random\(\) \* 1\.7/);
  assert.match(source, /blinkRemaining = 0\.15/);
  assert.match(source, /Math\.sin\(blinkProgress \* Math\.PI\)/);
  assert.match(source, /eyeL\.scale\.y = THREE\.MathUtils\.damp/);
  assert.match(source, /eyeR\.scale\.y = THREE\.MathUtils\.damp/);
});
check('Expressions alter the player mouth and eyebrow pose rather than relying only on UI text', () => {
  assert.match(source, /playerFace\.expression = type === 'wave'.*?'smile'/);
  assert.match(source, /mouthMesh\.scale\.x = THREE\.MathUtils\.damp/);
  assert.match(source, /browL\.rotation\.z = THREE\.MathUtils\.damp/);
  assert.match(source, /browR\.rotation\.z = THREE\.MathUtils\.damp/);
});
check('Arm rig now has independent wrist pivots and animated hand rotations', () => {
  assert.match(source, /const wristL = group\(elbowL/);
  assert.match(source, /const wristR = group\(elbowR/);
  assert.match(source, /wristR\.rotation\.x = damp/);
  assert.match(source, /wristR\.rotation\.y = damp/);
  assert.match(source, /wristR\.rotation\.z = damp/);
  assert.match(source, /if \(playerGesture\.type === 'none'\) \{[\s\S]*?wristR\.rotation\.z = THREE\.MathUtils\.damp\(wristR\.rotation\.z, 0, 10, dt\)/);
});
check('Contextual gesture controller supports greeting, reach, inspect, read, talk, offer and work', () => {
  for (const type of ['wave','reach','inspect','read','talk','offer','work']) assert.match(source, new RegExp(`${type}: [0-9.]+`));
  assert.match(source, /function playPlayerGesture\(type = 'reach', target = null, heldItem = null, heldCount = 1\)/);
  assert.match(source, /function updatePlayerInteractionAnimation\(dt\)/);
  assert.match(source, /Math\.pow\(Math\.sin\(progress \* Math\.PI\), 0\.72\)/);
});
check('Wave gesture uses a raised arm and timed wrist motion', () => {
  const start = source.indexOf("if (playerGesture.type === 'wave')");
  const end = source.indexOf("} else if (playerGesture.type === 'reach')", start);
  const body = source.slice(start, end);
  assert.match(body, /pose\.armRZ = 1\.02/);
  assert.match(body, /pose\.elbowRX = 1\.12/);
  assert.match(body, /pose\.wristRZ = wave \* 0\.34/);
});
check('Reading gesture displays a small book prop and hides it after the sequence', () => {
  assert.match(source, /const gestureBook = group\(avatar/);
  assert.match(source, /else if \(type === 'read'\) setHandheldObject\('book'\)/);
  assert.match(source, /else if \(playerGesture\.type === 'read'\)/);
  assert.match(source, /gestureBook\.visible = false/);
  assert.match(source, /id === 'bookshelf-reading'\) return 'read'/);
});
check('Object interactions map to appropriate gestures and trigger before the action', () => {
  assert.match(source, /function gestureForInteraction\(target\)/);
  assert.match(source, /target\.id === 'alex' \|\| target\.id === 'mia'\) return 'wave'/);
  assert.match(source, /target\.id === 'creative-studio'.*?return 'work'/);
  assert.match(source, /target\.id === 'mailbox'.*?return 'inspect'/);
  const start = source.indexOf('function interact()');
  const end = source.indexOf("\nwindow.addEventListener('keydown'", start);
  const body = source.slice(start, end);
  assert.ok(body.indexOf('playPlayerGesture(gesture') < body.indexOf('currentTarget.action()'));
});
check('NPC greeting, conversation and gift actions trigger matching player gestures', () => {
  assert.match(source, /playPlayerGesture\('wave', npcData\.npc\.position\)/);
  assert.match(source, /playPlayerGesture\('talk', npc\.npc\.position\)/);
  assert.match(source, /playPlayerGesture\('offer', npc\.npc\.position, item\)/);
});
check('Gesture updates are part of the live animation loop and look toward the interaction target', () => {
  assert.match(source, /updatePlayerInteractionAnimation\(dt\);/);
  assert.match(source, /playerGesture\.target && playerMotion\.speed < 1\.25/);
  assert.match(source, /avatar\.rotation\.y \+= diff \* Math\.min\(1, dt \* 4\.8 \* weight\)/);
  assert.match(source, /headPivot\.rotation\.y = THREE\.MathUtils\.damp/);
});
check('Sitting and standing clear temporary gestures and reset wrist pivots', () => {
  assert.match(source, /wristL\.rotation\.set\(0, 0, 0\); wristR\.rotation\.set\(0, 0, 0\)/);
  assert.match(source, /playerGesture\.type = 'none'; playerGesture\.weight = 0/);
  assert.match(source, /if \(playerSeated \|\| inVehicle \|\| !player\.visible\)/);
});
check('Runtime diagnostics expose active gesture, face expression, blink and book state', () => {
  assert.match(source, /interactionMotion: \{ type: playerGesture\.type/);
  assert.match(source, /expression: playerFace\.expression/);
  assert.match(source, /bookVisible: gestureBook\.visible/);
  assert.match(source, /rightWrist: \[wristR\.rotation\.x,wristR\.rotation\.y,wristR\.rotation\.z\]/);
});
check('Character gesture state remains compatible with V18 saves and Prototype 39 release metadata is aligned', () => {
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.equal(pkg.version, '0.40.10');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:gestures/);
  assert.match(html, /Prototype 40/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.10'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} character interaction and gesture checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { findSafeSeatExit, isValidSaveEnvelope } from '../src/gameplay-invariants.js';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }
function near(actual, expected, epsilon = 1e-8) { assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`); }

check('Seat exit uses the actual forward offset, world blockers and nearby NPC positions', () => {
  assert.match(source,/findSafeSeatExit\(seat, isPlayerExitBlocked\)/);
  const seat = { x:4, z:7, yaw:0 };
  const exit = findSafeSeatExit(seat, () => false);
  near(exit.x, 4);
  near(exit.z, 6.12);
});
check('Seat exit searches alternate sides when the normal exit is blocked', () => {
  const seat = { x:0, z:0, yaw:0 };
  const exit = findSafeSeatExit(seat, (x,z) => x < 0.5 && z < -0.5);
  assert.ok(exit);
  assert.ok(!(exit.x < 0.5 && exit.z < -0.5));
  assert.ok(Math.hypot(exit.x, exit.z) >= 0.87);
});
check('Seat exit searches a wider ring and returns null only when every candidate is blocked', () => {
  const seat = { x:-2, z:9, yaw:Math.PI/2 };
  const exit = findSafeSeatExit(seat, (x,z) => Math.hypot(x-seat.x,z-seat.z) < 1.1);
  assert.ok(exit);
  assert.ok(Math.hypot(exit.x-seat.x,exit.z-seat.z) >= 1.1);
  assert.equal(findSafeSeatExit(seat, () => true), null);
  assert.equal(findSafeSeatExit(null, () => false), null);
});
check('Save envelope accepts all supported V3–V18 versions with required world coordinates', () => {
  for (let version=3; version<=18; version++) {
    assert.equal(isValidSaveEnvelope({version,player:{x:1,y:0,z:2},vehicle:{x:3,z:4}}),true,`version ${version}`);
  }
});
check('Save envelope rejects missing, malformed, unsupported and non-finite core state', () => {
  for (const value of [null,undefined,[],{}, {version:19,player:{x:1,z:2},vehicle:{x:0,z:0}}, {version:18,vehicle:{x:0,z:0}}, {version:18,player:{x:NaN,z:2},vehicle:{x:0,z:0}}, {version:18,player:{x:0,z:2},vehicle:{x:0,z:Infinity}}, {version:18,player:{x:0,y:NaN,z:2},vehicle:{x:0,z:0}}]) {
    assert.equal(isValidSaveEnvelope(value),false);
  }
});
check('Loading validates the full save before mutating state and clears transient gameplay modes', () => {
  const start = source.indexOf('function loadGame(notify = true)');
  const end = source.indexOf("document.querySelector('#save-btn')", start);
  assert.ok(start >= 0 && end > start);
  const body = source.slice(start,end);
  const validation = body.indexOf('if (!isValidSaveEnvelope(data))');
  const mutation = body.indexOf('hangoutSession = null;');
  assert.ok(validation >= 0 && mutation > validation);
  for (const fragment of [
    'cancelDecorPlacement(false)', 'releaseAllTransientInput()', 'cancelFishingSession()',
    'npcSocialSession = null', 'velocity.set(0,0,0)', 'moveInput.set(0,0)',
    'verticalSpeed = 0', 'isGrounded = true', 'inVehicle = false', 'inBoat = false',
    'divingState.active = false', 'resetPlayerRigPose(data.player.yaw)',
    'cameraDistance = cameraDistanceTarget = 8.8'
  ]) assert.ok(body.includes(fragment), fragment);
});
check('Loading refreshes diving, vehicle, boat and contextual HUDs after state restoration', () => {
  const start = source.indexOf('function loadGame(notify = true)');
  const end = source.indexOf("document.querySelector('#save-btn')", start);
  const body = source.slice(start,end);
  for (const fragment of ['updateDiveHud();','updateBoatHud();','updateVehicleHud(false);','interaction.classList.add(\'hidden\')','followButton.classList.add(\'hidden\')']) assert.ok(body.includes(fragment),fragment);
});
check('Load and seat exit share a complete neutral player-rig reset, even when the seat has no safe exit', () => {
  const resetStart = source.indexOf('function resetPlayerRigPose(yaw = 0)');
  const resetEnd = source.indexOf('function', resetStart + 30);
  const resetBody = source.slice(resetStart, resetEnd);
  for (const joint of ['bodyPivot','torsoMesh','headPivot','hipPivot','legL','legR','kneeL','kneeR','footL','footR','armL','armR','elbowL','elbowR','wristL','wristR']) assert.ok(resetBody.includes(joint),joint);
  assert.match(source,/function standFromSeat\(notify = true\)[\s\S]*?resetPlayerRigPose\(seat\.yaw\)/);
  const start = source.indexOf('function loadGame(notify = true)');
  const end = source.indexOf("document.querySelector('#save-btn')",start);
  const body = source.slice(start,end);
  assert.match(body,/playerSeated = false;[\s\S]*?activeSeat = null;[\s\S]*?resetPlayerRigPose\(data\.player\.yaw\)/);
  assert.doesNotMatch(body,/standFromSeat\(false\)/);
});
check('Loaded inventory, needs, relationships, job progress and decoration rows are normalized safely', () => {
  assert.match(source,/for \(const key of Object\.keys\(inventory\)\) inventory\[key\] = clamp\(Math\.floor\(Number\(inventory\[key\]\) \|\| 0\),0,999999\)/);
  assert.match(source,/for \(const key of Object\.keys\(needs\)\) needs\[key\] = clamp\(Number\(needs\[key\]\) \|\| 0,0,100\)/);
  assert.match(source,/for \(const key of Object\.keys\(relationships\)\) relationships\[key\] = clamp\(Number\(relationships\[key\]\) \|\| 0,0,100\)/);
  assert.match(source,/jobCollected = Array\.isArray\(data\.jobCollected\) && data\.jobCollected\.length === 3 \? data\.jobCollected\.map\(Boolean\) : \[false,false,false\]/);
  assert.match(source,/data\.decorPositions\.filter\(item => item && decorCatalog\[item\.item\]/);
  assert.match(source,/wallet = data\.version >= 4 && Number\.isFinite\(savedWallet\) \? clamp\(Math\.floor\(savedWallet\),0,999999999\) : 650/);
});
check('Save failures are caught and reported instead of escaping the game loop', () => {
  const start = source.indexOf('function saveGame(notify = true)');
  const end = source.indexOf('function loadGame(notify = true)',start);
  const body = source.slice(start,end);
  assert.match(body,/try \{[\s\S]*localStorage\.setItem\('estate-explorer-save-v4'/);
  assert.match(body,/catch \(error\)[\s\S]*Could not save Estate Explorer progress/);
  assert.match(body,/return false;/);
});
check('Save import validates the same envelope before replacing the current save', () => {
  const start = source.indexOf('async function importSaveBackup(file)');
  const end = source.indexOf('document.addEventListener(\'fullscreenchange\'',start);
  const body = source.slice(start,end);
  assert.ok(body.indexOf('isValidSaveEnvelope(data)') >= 0);
  assert.ok(body.indexOf('isValidSaveEnvelope(data)') < body.indexOf("localStorage.setItem(saveKey, JSON.stringify(data))"));
  assert.match(body,/if \(!saveGame\(false\)\) throw new Error\('Could not persist imported save'\)/);
});
check('A failed save import restores the previous save and reloads its runtime state', () => {
  const start = source.indexOf('async function importSaveBackup(file)');
  const end = source.indexOf('document.addEventListener(\'fullscreenchange\'',start);
  const body = source.slice(start,end);
  assert.match(body,/previousRaw = localStorage\.getItem\(saveKey\)/);
  assert.match(body,/if \(previousRaw === null\) localStorage\.removeItem\(saveKey\);[\s\S]*?else localStorage\.setItem\(saveKey, previousRaw\)/);
  assert.match(body,/loadGame\(false\);[\s\S]*?Could not roll back failed save import/);
  assert.match(body,/SAVE SEBELUMNYA DIPERTAHANKAN/);
});
check('Furniture placement cannot start from a seated, vehicle, boat or diving state', () => {
  const start = source.indexOf('function startDecorPlacement(item)');
  const end = source.indexOf('function rotateDecorPlacement',start);
  const body = source.slice(start,end);
  for (const fragment of ['inVehicle','inBoat','divingState.active','playerSeated']) assert.ok(body.includes(fragment),fragment);
});
check('Driving interactions are restricted to exiting, refuelling and the car wash', () => {
  assert.match(source,/if\(inVehicle&&!\['vehicle','fuel-stop','car-wash'\]\.includes\(target\.id\)\)continue/);
  const interactStart = source.indexOf('function interact()');
  const interactEnd = source.indexOf("window.addEventListener('keydown'", interactStart);
  const body = source.slice(interactStart,interactEnd);
  assert.ok(body.indexOf("if(inVehicle&&!['vehicle','fuel-stop','car-wash'].includes(target.id))continue") < body.indexOf('if (target.enabled && !target.enabled()) continue'));
});
check('A hangout that crosses midnight still occupies the NPC daily slot on the new day', () => {
  const start = source.indexOf('function startHangout(npcId, activity)');
  const end = source.indexOf('function giveGift(',start);
  const body = source.slice(start,end);
  const advance = body.indexOf('advanceGameTime(plan.minutes)');
  const reset = body.indexOf('resetDailyHangouts()',advance);
  const claim = body.indexOf('hangoutsToday[npcId] = 1',reset);
  const session = body.indexOf('hangoutSession = {',claim);
  assert.ok(advance>=0 && reset>advance && claim>reset && session>claim);
});
check('Vehicle exit uses the same multi-direction collision-safe search and stays in the vehicle if every side is blocked', () => {
  assert.match(source,/findSafeSeatExit\(\{ x:vehicle\.position\.x, z:vehicle\.position\.z, yaw:Math\.PI\/2-vehicle\.rotation\.y \}, isPlayerExitBlocked, exitOffset\)/);
  assert.match(source,/function isPlayerExitBlocked\(x, z\)[\s\S]*?x < -51 \|\| x > 51 \|\| z < -43 \|\| z > 226\.8 \|\| collides\(x, z\)/);
  assert.match(source,/npcs\.some\(person => Math\.hypot\(x-person\.npc\.position\.x, z-person\.npc\.position\.z\) < 0\.9\)/);
  assert.match(source,/if \(!exit\) \{[\s\S]*?inVehicle = true;[\s\S]*?return;[\s\S]*?player\.position\.set\(clamp\(exit\.x/);
});
check('The full audit release metadata and aggregate test command are synchronized', () => {
  assert.equal(pkg.version,'0.40.17');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('<title>Estate Explorer — Prototype 40.17</title>'));
  assert.ok(html.includes('BUILD 0.40.17'));
  assert.match(readme,/Prototype 40\.17 — Full Gameplay Audit/);
  assert.match(pkg.scripts['test:game'],/test:invariants/);
});

console.log(`\n${passed} gameplay invariant and audit regression checks passed.`);

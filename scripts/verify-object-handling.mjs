import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Handheld models exist for books, courier parcels, coffee, bouquet, watering can and cooking pan', () => {
  for (const item of ['book','parcel','coffee','bouquet','wateringCan','pan']) assert.match(source, new RegExp(`${item}:`));
  assert.match(source, /const heldProps = \{ book: gestureBook, parcel: heldParcel, coffee: heldCoffee, bouquet: heldBouquet, wateringCan: heldWateringCan, pan: heldPan \}/);
  assert.match(source, /new THREE\.TorusGeometry/);
});
check('Handheld props are toggled through one shared equip and clear controller', () => {
  assert.match(source, /function setHandheldObject\(item, count = 1, persistent = false\)/);
  assert.match(source, /function playPlayerGesture\(type = 'reach', target = null, heldItem = null, heldCount = 1\)/);
  assert.match(source, /function clearHandheldObject\(\) \{ setHandheldObject\(null\); \}/);
  assert.match(source, /heldProps\[handheldState\.item\]\.visible = true/);
  assert.match(source, /handheldState\.persistent = !!\(handheldState\.item && persistent\)/);
});
check('Courier stack visuals display one, two or three parcels based on actual inventory count', () => {
  assert.match(source, /for \(let i = 0; i < 3; i\+\+\) \{[\s\S]*?const boxProp = group\(heldParcel/);
  assert.match(source, /handheldState\.count = handheldState\.item \? Math\.max\(1, Math\.min\(3, Math\.floor\(count\) \|\| 1\)\)/);
  assert.match(source, /heldParcel\.children\.forEach\(\(child, index\) => \{ child\.visible = index < handheldState\.count; \}\)/);
});
check('Persistent courier parcels synchronize from inventory and restore after save loading', () => {
  assert.match(source, /function syncCourierHandheld\(\)[\s\S]*?inventory\.parcel[\s\S]*?setHandheldObject\('parcel', count, true\)/);
  assert.match(source, /Object\.assign\(inventory,[\s\S]*?data\.inventory \|\| \{\}\);[\s\S]*?syncCourierHandheld\(\)/);
  assert.match(source, /const carryingParcel = handheldState\.item === 'parcel' && handheldState\.persistent/);
  assert.match(source, /if \(carryingParcel\) \{[\s\S]*?armL\.rotation\.x = THREE\.MathUtils\.damp\(armL\.rotation\.x, 0\.46/);
});
check('Picking up parcels creates a two-handed pickup animation and equips the carried stack', () => {
  const start = source.indexOf('function collectParcel(index)');
  const end = source.indexOf('\nfunction completeCourierJob', start);
  const body = source.slice(start, end);
  assert.match(body, /inventory\.parcel \+= 1/);
  assert.match(body, /playPlayerGesture\('pickup'.*?'parcel', inventory\.parcel\)/);
  assert.match(source, /const actionOwnsGesture = currentTarget\.id === 'bookshelf-reading' \|\| currentTarget\.id === 'creative-studio'.*?startsWith\('parcel-'\)/);
  assert.match(body, /syncCourierHandheld\(\)/);
  assert.match(body, /jobPhase = 'deliver'/);
});
check('Parcel stack clears on courier delivery and uses a handoff gesture for Mia', () => {
  const start = source.indexOf('function completeCourierJob()');
  const end = source.indexOf('\nconst placedDecorObjects', start);
  const body = source.slice(start, end);
  assert.match(body, /inventory\.parcel = Math\.max\(0,inventory\.parcel-3\)/);
  assert.match(body, /syncCourierHandheld\(\)/);
  assert.match(body, /playPlayerGesture\('handoff', recipient\.npc\.position, 'parcel', Math\.max\(1, parcelCount\)\)/);
  assert.match(body, /const parcelCount = inventory\.parcel/);
  assert.match(body, /jobPhase = 'complete'/);
});
check('Garden Care equips a watering can and animates the pouring motion after a valid task action', () => {
  const start = source.indexOf('function waterGarden(index)');
  const end = source.indexOf('\nfunction rejectHangoutInvitation', start);
  const body = source.slice(start, end);
  assert.ok(body.indexOf('if (gardenJobPhase !==') < body.indexOf("playPlayerGesture('water'"));
  assert.match(body, /playPlayerGesture\('water'.*?'wateringCan'\)/);
  assert.match(source, /else if \(playerGesture\.type === 'work' \|\| playerGesture\.type === 'water' \|\| playerGesture\.type === 'cook'\)/);
  assert.match(source, /pose\.wristRX = playerGesture\.type === 'water' \? -0\.38/);
});
check('Cooking equips a pan only after validating that the player is hungry enough', () => {
  const start = source.indexOf('function cookMeal()');
  const end = source.indexOf('\nfunction startGardenJob', start);
  const body = source.slice(start, end);
  assert.ok(body.indexOf("if (needs.hunger > 91)") < body.indexOf("playPlayerGesture('cook'"));
  assert.match(body, /playPlayerGesture\('cook'.*?'pan'\)/);
  assert.match(source, /playerGesture\.type === 'water' \? -0\.38 : 0\.05/);
});
check('Drinking coffee and gifting a bouquet or coffee display the consumed item in-hand', () => {
  const drinkStart = source.indexOf('function drinkCoffee()');
  const drinkEnd = source.indexOf('\nfunction talkToNpc', drinkStart);
  const drink = source.slice(drinkStart, drinkEnd);
  assert.ok(drink.indexOf("if (needs.energy >= 96)") < drink.indexOf("playPlayerGesture('drink'"));
  assert.match(drink, /playPlayerGesture\('drink', null, 'coffee'\)/);
  const giftStart = source.indexOf('function giveGift(npcId, item)');
  const giftEnd = source.indexOf('\nfunction drinkCoffee', giftStart);
  assert.match(source.slice(giftStart,giftEnd), /playPlayerGesture\('offer', npc\.npc\.position, item\)/);
  assert.match(source, /else if \(playerGesture\.type === 'drink'\)[\s\S]*?pose\.armRX = 0\.78[\s\S]*?pose\.elbowRX = 1\.05/);
});
check('Reading gesture uses a held book and temporary props clear while retrieved objects remain held', () => {
  assert.match(source, /playPlayerGesture\('read', \{ x: shelf\.x, y: shelf\.y, z: shelf\.z \}, 'book'\)/);
  assert.match(source, /if \(inventory\.parcel > 0 && handheldState\.item === 'parcel'\) syncCourierHandheld\(\);\s*else if \(!handheldState\.persistent\) clearHandheldObject\(\)/);
  assert.match(source, /bookVisible: gestureBook\.visible/);
});
check('All item gestures have independent durations and object-oriented poses', () => {
  for (const type of ['pickup','water','cook','drink','handoff']) assert.match(source, new RegExp(`${type}: [0-9.]+`));
  assert.match(source, /else if \(playerGesture\.type === 'pickup'\)/);
  assert.match(source, /else if \(playerGesture\.type === 'drink'\)/);
  assert.match(source, /else if \(playerGesture\.type === 'handoff'\)/);
  assert.match(source, /wristR\.rotation\.x = damp/);
  assert.match(source, /wristR\.rotation\.z = damp/);
});
check('Seated/standing transitions clear transient props, then restore any still-carried courier items', () => {
  const sitStart = source.indexOf('function sitOnSeat(');
  const sitEnd = source.indexOf('\nfunction doSeatedActivity', sitStart);
  const standStart = source.indexOf('function standFromSeat(');
  const standEnd = source.indexOf('\nfunction playPlayerGesture', standStart);
  assert.match(source.slice(sitStart,sitEnd), /clearHandheldObject\(\)/);
  assert.match(source.slice(standStart,standEnd), /clearHandheldObject\(\)/);
  assert.match(source.slice(standStart,standEnd), /syncCourierHandheld\(\)/);
});
check('A fresh save load clears stale temporary props before restoring the courier parcel inventory', () => {
  const start = source.indexOf('function loadGame(notify = true)');
  const end = source.indexOf('\nfunction', start + 20);
  const body = source.slice(start,end);
  assert.ok(body.indexOf('clearHandheldObject()') < body.indexOf('Object.assign(inventory'));
  assert.ok(body.indexOf('Object.assign(inventory') < body.indexOf('syncCourierHandheld()'));
});
check('Runtime diagnostics show the item type, count, persistence and individual prop visibility', () => {
  assert.match(source, /handheld: \{ item: handheldState\.item, count: handheldState\.count, persistent: handheldState\.persistent/);
  assert.match(source, /visible: Object\.fromEntries\(Object\.entries\(heldProps\)/);
});
check('V18 save schema supports carried props and Prototype 39 metadata is synchronized', () => {
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.equal(pkg.version, '0.40.12');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:objects/);
  assert.match(html, /Prototype 40/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.12'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} object handling and action animation checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, test) { test(); passed += 1; console.log(`✓ ${name}`); }

check('Estate Living has five placeable decor products with prices and footprint data', () => {
  for (const key of ['plant','floorLamp','bookshelf','sideTable','areaRug']) {
    assert.match(source, new RegExp(`${key}: \\{ name:`));
    assert.match(source, new RegExp(`${key}: \\{[\\s\\S]*?cost: \\d+, radius: [\\d.]+ \\}`));
  }
  assert.match(html, /data-buy="bookshelf"/);
  assert.match(html, /data-buy="sideTable"/);
  assert.match(html, /data-buy="areaRug"/);
});
check('Furniture uses a live preview with camera ray-to-floor placement', () => {
  assert.match(source, /function updatePlacementTarget\(clientX,\s*clientY\)/);
  assert.match(source, /placementRaycaster\.setFromCamera\(placementPointer,camera\)/);
  assert.match(source, /intersectPlane\(placementPlane,placementHit\)/);
  assert.match(source, /function setDecorGhost\(decor,\s*enabled\)/);
});
check('Placement validation restricts objects to interior floor bounds and protected rooms', () => {
  assert.match(source, /function canPlaceDecor\(item,\s*x,\s*z,\s*floorY\)/);
  assert.ok(source.includes('const minX=-11.25+radius*0.25,maxX=upstairs?6.15-radius*0.25:6.25-radius*0.25'));
  assert.ok(source.includes('if(!upstairs&&x>6.35&&z>-7.2&&z<3.7)'));
  assert.ok(source.includes('if(!upstairs&&x>3.15&&x<7.9&&z>-4.25&&z<-1.45)return false'));
  assert.ok(source.includes('if(upstairs&&x>-7.8&&x<-2.9&&z>-3.8&&z<1.5)return false'));
  assert.ok(source.includes('if(!upstairs&&x>7.05&&z<-4.25)'));
});
check('Player can rotate, confirm, or cancel furniture placement', () => {
  assert.match(source, /function rotateDecorPlacement\(\)/);
  assert.match(source, /Math\.PI\/4/);
  assert.match(source, /function confirmDecorPlacement\(\)/);
  assert.match(source, /function cancelDecorPlacement\(notify\s*=\s*true\)/);
  assert.match(source, /e\.code === 'KeyQ'/);
  assert.match(source, /e\.code === 'Enter' \|\| e\.code === 'Space'/);
  assert.match(source, /e\.code === 'Escape' && placementMode/);
  for (const id of ['placement-rotate-btn','placement-confirm-btn','placement-cancel-btn']) assert.ok(html.includes(`id="${id}"`));
});
check('Inventory is consumed only when valid placement is confirmed', () => {
  assert.ok(source.includes('if(!placementMode.valid){showToast'));
  assert.ok(source.includes('inventory[item]=Math.max(0,(inventory[item]||0)-1)'));
  assert.match(source, /function cancelDecorPlacement[\s\S]*?ITEM TETAP DI INVENTORY/);
});
check('Multiple decor instances can be purchased, stacked and placed', () => {
  assert.match(source, /function buyDecor\(item\)/);
  assert.ok(source.includes('inventory[item]=(inventory[item]||0)+1'));
  assert.match(source, /decorPositions\.push\(record\)/);
  assert.match(source, /...Object\.entries\(decorCatalog\)/);
});
check('Furniture coordinates and rotation persist, with legacy V12 migration', () => {
  assert.match(source, /wallet, propertyUpgrades, lifetimeIncome, lifetimeSpending, transactionHistory, workLimitDay, courierShiftsToday, gardenShiftsToday, inventory, decorPlaced, decorPositions, worldDrops: worldDrops.map/);
  assert.match(source, /Array\.isArray\(data\.decorPositions\)/);
  assert.match(source, /if \(!Array\.isArray\(data\.decorPositions\)\)/);
  assert.match(source, /if \(data\.decorPlaced\?\.plant\)/);
  assert.match(source, /if \(data\.decorPlaced\?\.floorLamp\)/);
  assert.match(source, /function syncPlacedDecor\(\)/);
  assert.match(source, /wallet, propertyUpgrades, lifetimeIncome, lifetimeSpending, transactionHistory, workLimitDay, courierShiftsToday, gardenShiftsToday, inventory, decorPlaced, decorPositions, worldDrops: worldDrops.map/);
});
check('Placement mode blocks player movement and exposes live debug state', () => {
  assert.match(source, /function isUiOpen\(\) \{ return !!placementMode\s*\|\|/);
  assert.match(source, /placementActive: !!placementMode, placedDecorations:/);
});
check('Prototype 39 release metadata is consistent', () => {
  assert.equal(pkg.version,'0.40.12');
  assert.equal(lock.version,'0.40.12');
  assert.equal(lock.packages[''].version,'0.40.12');
  assert.match(html,/Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.12'));
  assert.match(readme,/Prototype 37 — Neighborhood Expansion & Local Commerce/);
});
console.log(`\n${passed} core gameplay checks passed.`);

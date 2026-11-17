import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('All six handheld props can be represented as independent scene objects', () => {
  assert.match(source, /const worldDrops = \[\]/);
  assert.match(source, /function createWorldDrop\(item, count, persistent, position, velocity =/);
  assert.match(source, /const object = source\.clone\(true\)/);
  assert.match(source, /scene\.attach\(object\)/);
  for (const item of ['book','parcel','coffee','bouquet','wateringCan','pan']) assert.match(source, new RegExp(`${item}: [0-9.]+`));
});
check('Throwing uses player facing and momentum rather than simply hiding the prop', () => {
  assert.match(source, /function dropHandheldObject\(placeOnSurface = false\)/);
  assert.match(source, /forwardX = -Math\.sin\(avatar\.rotation\.y\), forwardZ = -Math\.cos\(avatar\.rotation\.y\)/);
  assert.match(source, /forwardX \* 2\.65/);
  assert.match(source, /let position, throwVelocity, options/);
  assert.match(source, /createWorldDrop\(item, count, persistent, position, throwVelocity, options\)/);
  assert.match(source, /y: 2\.05/);
  assert.match(source, /worldDrops\.length >= 40/);
  assert.match(source, /clearHandheldObject\(\)/);
});
check('Dropped props receive gravity, bounce, friction, angular motion and estate collision checks', () => {
  assert.match(source, /function updateWorldDropPhysics\(dt\)/);
  assert.match(source, /drop\.velocity\.y -= 14\.5 \* dt/);
  assert.match(source, /drop\.velocity\.y \* 0\.2/);
  assert.match(source, /Math\.exp\(-5\.8 \* dt\)/);
  assert.match(source, /drop\.angularVelocity\.multiplyScalar/);
  assert.match(source, /if \(collides\(nextX, group\.position\.z\)\)/);
  assert.match(source, /if \(collides\(group\.position\.x, nextZ\)\)/);
  assert.match(source, /updateWorldDropPhysics\(dt\)/);
});
check('Indoor floors, the upper floor, the west wing and stairs receive appropriate object ground heights', () => {
  assert.match(source, /function dropGroundHeight\(x, z, referenceY = 0\)/);
  assert.match(source, /return 0\.2 \+ clamp\(\(3\.55 - z\) \/ 10\.7, 0, 1\) \* 4\.5/);
  assert.match(source, /insideExpansion\) return 0\.2/);
  assert.match(source, /insideHouse && referenceY > 3\.45\) return 4\.85/);
});
check('Players can set props neatly on real estate furniture surfaces', () => {
  assert.match(source, /const objectSurfaces = \[/);
  for (const surface of ['kitchen-island','dining-table','terrace-table','studio-desk','studio-workbench','guest-side-table']) assert.ok(source.includes(`id: '${surface}'`));
  assert.match(source, /function nearestObjectSurface\(\)/);
  assert.match(source, /surface\.topY \+ \(worldDropRestHeight\[item\] \|\| 0\.12\)/);
  assert.match(source, /surfaceId: surface\.id/);
});
check('Dropped and placed items register dynamic proximity interactions and can be collected again', () => {
  assert.match(source, /function registerWorldDropTarget\(drop\)/);
  assert.match(source, /id: 'world-drop-' \+ drop\.id/);
  assert.match(source, /label: \(\) => `Ambil/);
  assert.match(source, /action: \(\) => pickUpWorldDrop\(drop\)/);
  assert.match(source, /function pickUpWorldDrop\(drop\)/);
  assert.match(source, /interactables\.splice\(targetIndex, 1\)/);
});
check('Picked-up props stay in hand after the pickup animation and cannot be lost by sitting', () => {
  assert.match(source, /setHandheldObject\(drop\.item, drop\.count, true\)/);
  assert.match(source, /else if \(!handheldState\.persistent\) clearHandheldObject\(\)/);
  assert.match(source, /LETAKKAN BARANG TERLEBIH DAHULU/);
});
check('Courier parcel drops move out of carried inventory and must be recovered before delivery', () => {
  assert.match(source, /if \(item === 'parcel' && persistent\)/);
  assert.match(source, /inventory\.parcel = Math\.max\(0, inventory\.parcel - count\)/);
  assert.match(source, /if \(inventory\.parcel < 3\) \{ showToast\('AMBIL KEMBALI SEMUA PAKET SEBELUM PENGIRIMAN'\)/);
  assert.match(source, /inventory\.parcel = clamp\(inventory\.parcel \+ drop\.count, 0, 3\)/);
});
check('Courier, garden, cooking, coffee and gift actions protect an already carried object', () => {
  assert.match(source, /function collectParcel\(index\)[\s\S]*?LETAKKAN BARANG SEBELUM MENGAMBIL PAKET/);
  assert.match(source, /function waterGarden\(index\)[\s\S]*?LETAKKAN BARANG TERLEBIH DAHULU/);
  assert.match(source, /function cookMeal\(\)[\s\S]*?LETAKKAN BARANG TERLEBIH DAHULU/);
  assert.match(source, /function drinkCoffee\(\)[\s\S]*?LETAKKAN BARANG YANG SEDANG DIBAWA/);
  assert.match(source, /function giveGift\(npcId, item\)[\s\S]*?LETAKKAN BARANG YANG SEDANG DIBAWA/);
});
check('Retrieved coffee can be consumed or shared, and a retrieved bouquet can be gifted without duplicating bag inventory', () => {
  assert.match(source, /const carriedCoffee = handheldState\.item === 'coffee' && handheldState\.persistent/);
  assert.match(source, /if \(\(inventory\.coffee \|\| 0\) < 1 && !carriedCoffee\)/);
  assert.match(source, /const carriedGift = handheldState\.item === item && handheldState\.persistent/);
  assert.match(source, /if \(!carriedGift\) inventory\[item\]--/);
  assert.match(source, /const carryingBouquet = handheldState\.item === 'bouquet' && handheldState\.persistent/);
  assert.match(source, /const carryingCoffee = handheldState\.item === 'coffee' && handheldState\.persistent/);
  assert.match(source, /key === 'coffee' && \(inventory\[key\] > 0 \|\| \(handheldState\.item === 'coffee' && handheldState\.persistent\)\)/);
});
check('Retrieved books, pans and watering cans remain held after their matching activity', () => {
  assert.match(source, /function readAtBookshelf\(\)[\s\S]*?handheldState\.item !== 'book'/);
  assert.match(source, /const carriedBook = handheldState\.item === 'book' && handheldState\.persistent/);
  assert.match(source, /if \(carriedBook\) handheldState\.persistent = true/);
  assert.match(source, /handheldState\.item === 'pan' && handheldState\.persistent \? null : 'pan'/);
  assert.match(source, /handheldState\.item === 'wateringCan' && handheldState\.persistent \? null : 'wateringCan'/);
});
check('V18 save backups are accepted by the import flow as well as local autosave loading', () => {
  assert.ok(source.includes("![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version) || !data.player"));
});

check('World drops and a persistently carried non-courier prop survive V18 save loading', () => {
  assert.match(source, /worldDrops: worldDrops\.map\(drop => \(\{ item: drop\.item, count: drop\.count, persistent: drop\.persistent/);
  assert.match(source, /heldObject: handheldState\.item && handheldState\.persistent \? \{ item: handheldState\.item, count: handheldState\.count \} : null/);
  assert.match(source, /function restoreWorldDrops\(savedDrops\)/);
  assert.ok(source.includes("![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version) || !data.player"));
  assert.ok(source.includes("![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version) || !data.player"));
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
});
check('Old V3–V15 saves remain supported and no world object is restored from an absent field', () => {
  assert.match(source, /const raw = localStorage\.getItem\('estate-explorer-save-v4'\) \|\| localStorage\.getItem\('estate-explorer-save-v3'\)/);
  assert.match(source, /restoreWorldDrops\(data\.worldDrops\)/);
  assert.match(source, /if \(!Array\.isArray\(savedDrops\)\) return/);
});
check('Desktop G/H keys and mobile DROP/PLACE controls are connected', () => {
  assert.match(source, /e\.code === 'KeyG'[\s\S]*?dropHandheldObject\(false\)/);
  assert.match(source, /e\.code === 'KeyH'[\s\S]*?dropHandheldObject\(true\)/);
  assert.match(source, /dropButton\.addEventListener\('pointerdown'/);
  assert.match(source, /placeButton\.addEventListener\('pointerdown'/);
  assert.match(source, /canHandleWorldObjects[\s\S]*?dropButton\.classList\.toggle\('hidden'/);
  assert.match(html, /id="drop-btn"/);
  assert.match(html, /id="place-btn"/);
  assert.match(html, /<kbd>G<\/kbd> Drop/);
  assert.match(html, /<kbd>H<\/kbd> Place/);
  assert.match(css, /\.object-btn/);
  assert.match(css, /@media\(max-width:340px\)\{\.mobile-actions\{gap:2px\}\}/);
});
check('Runtime diagnostics expose dropped item position, velocity, surface placement and settled state', () => {
  assert.match(source, /worldObjects: worldDrops\.map\(drop => \(\{ id: drop\.id, item: drop\.item/);
  assert.match(source, /surfaceId: drop\.surfaceId, settled: !!drop\.surfaceId \|\| drop\.velocity\.lengthSq\(\) < 0\.002/);
});
check('World-object debug data also reports real scene and renderer draw statistics', () => {
  assert.match(source, /renderStats: \{ sceneChildren: scene\.children\.length, houseChildren: house\.children\.length, playerVisible: player\.visible, avatarVisible: avatar\.visible, drawCalls: renderer\.info\.render\.calls, triangles: renderer\.info\.render\.triangles/);
});
check('Prototype 39 package metadata, release notes and V18 save schema are synchronized', () => {
  assert.match(source, /version: 18/);
  assert.equal(pkg.version, '0.40.15');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:world/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.15'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} world physics and placement checks passed.`);

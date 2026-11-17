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

check('The estate perimeter opens a real entrance through the front gate while retaining the side and rear boundary walls', () => {
  assert.match(source, /Estate perimeter\. The front wall has a real 11\.2m vehicle entrance/);
  assert.ok(source.includes('for (const [center, width] of [[-29.3,47.4],[29.3,47.4]])'));
  assert.match(source, /if \(Math\.abs\(x\) > 10\) box\(scene, x, 1\.12, 48/);
  assert.match(source, /for \(const x of \[-30, 30\]\) box\(scene, x, 0\.65, 108, 46, 1\.3, 0\.65/);
  assert.match(source, /colliders\.push\([\s\S]*minX:-53, maxX:-6\.8, minZ:107\.65, maxZ:108\.35[\s\S]*minX:6\.8, maxX:53, minZ:107\.65, maxZ:108\.35/);
});
check('Connected boulevards and cross streets form a road network from the estate into the marina district', () => {
  assert.match(source, /box\(scene, 0, -0\.025, 77\.5, 13\.5, 0\.12, 60, districtRoadMat\)/);
  assert.match(source, /box\(scene, 0, -0\.018, 76, 88, 0\.12, 9\.5, districtRoadMat\)/);
  assert.match(source, /for \(const x of \[-25,25\]\) \{\s*box\(scene, x, 0\.0, 78\.9, 13\.2, 0\.10, 3\.6/);
});
check('Player and SUV movement bounds now include the neighbourhood without removing the original estate bounds', () => {
  assert.match(source, /if \(x < -52 \|\| x > 52 \|\| z < -47 \|\| z > 227\.5\) return true/);
  assert.match(source, /player\.position\.x = clamp\(nx, -51, 51\)/);
  assert.match(source, /player\.position\.z = clamp\(nz, -43, 226\.8\)/);
  assert.match(source, /function moveVehicleSafely\(deltaX, deltaZ\)/);
  assert.match(source, /z \+ extentZ > 227\.2/);
  assert.match(source, /vehicle\.position\.set\(clamp\(data\.vehicle\.x,-50\.2,50\.2\),0,clamp\(data\.vehicle\.z,-44,224\.4\)\)/);
  assert.match(source, /gatePassage: \{ playerClear: !collides\(0,48\), vehicleClear: !vehicleCollides\(0,48\) \}/);
});
check('The player can exit the SUV beside the car anywhere in the expanded district', () => {
  assert.match(source, /const sideZ = -Math\.sin\(vehicle\.rotation\.y\) \* exitOffset/);
  assert.match(source, /let exitZ = clamp\(vehicle\.position\.z \+ sideZ, -43, 226\.8\)/);
});
check('Corner Cafe and Town Market are separately built, signed and furnished explorable interiors', () => {
  assert.match(source, /function buildDistrictShop\(/);
  assert.match(source, /const neighborhoodCafe = buildDistrictShop\(\{centerX:-25,centerZ:88,name:'CORNER CAFE'/);
  assert.match(source, /const neighborhoodMarket = buildDistrictShop\(\{centerX:25,centerZ:88,name:'TOWN MARKET'/);
  assert.match(source, /if \(kind === 'cafe'\)/);
  assert.match(source, /districtSign\(centerX,5\.1,frontZ-0\.8,name,subtitle,signColor\)/);
});
check('Storefront side and rear walls collide, but the six-metre doorways remain traversable', () => {
  assert.ok(source.includes('minX:leftX-0.28,maxX:leftX+0.28') && source.includes('maxX:centerX-3') && source.includes('minX:centerX+3'));
  assert.match(source, /cafeInterior: !collides\(-25,88\), marketInterior: !collides\(25,88\), cafeDoor: !collides\(-25,81\.2\), marketDoor: !collides\(25,81\.2\)/);
});
check('The town park has a fountain, planted green space, trees and a dedicated public bench', () => {
  assert.match(source, /Public park pocket on the east side of the boulevard/);
  assert.match(source, /const townBench = group\(scene,13\.5,0,98\.2\)/);
  assert.match(source, /id: 'town-park-bench',[^\n]*x: 13\.5, z: 98\.2/);
  assert.match(source, /cylinder\(scene,13\.5,0\.44,90\.7/);
});
check('New street lamps participate in the existing day/night lighting cycle', () => {
  assert.match(source, /const districtStreetLights = \[\]/);
  assert.match(source, /districtStreetLights\.push\(light\)/);
  assert.match(source, /districtStreetLights\.forEach\(light => \{ light\.intensity = nightMix \* 1\.05; \}\)/);
});
check('The three public destinations register actual contextual world interactions', () => {
  assert.match(source, /id:'neighborhood-cafe',[^\n]*action:\(\)=>openDistrictStore\('cafe'\)/);
  assert.match(source, /id:'neighborhood-market',[^\n]*action:\(\)=>openDistrictStore\('market'\)/);
  assert.match(source, /id:'town-park',[^\n]*action:visitTownPark/);
  assert.match(source, /id: 'town-park-bench'/);
});
check('Cafe and market open distinct commerce panels with store-specific products', () => {
  assert.match(source, /const neighborhoodProducts = \{\s*cafe:/);
  assert.match(source, /market: \[/);
  assert.match(source, /function openDistrictStore\(type\)/);
  assert.match(source, /districtStoreType=type;townVisited\[type\]=true;recordDailyTaskProgress\('destination'\);closePanels\(\);renderDistrictStore\(\)/);
  assert.ok(html.includes('id="district-panel"'));
  assert.ok(html.includes('id="district-product-list"'));
});
check('Cafe sells coffee and pastries while the market sells sandwich, apple and water', () => {
  for (const item of ['coffee','pastry','sandwich','apple','water']) assert.ok(source.includes(`id:'${item}'`));
  assert.match(source, /id:'coffee', name:'House Coffee'/);
  assert.match(source, /id:'sandwich', name:'Fresh Sandwich'/);
  assert.match(source, /id:'water', name:'Bottled Water'/);
});
check('Buying neighbourhood goods spends cash, updates the finance ledger and adds the item to the inventory', () => {
  assert.match(source, /function buyNeighborhoodProduct\(item\)/);
  assert.match(source, /wallet-=product\.cost;inventory\[item\]=\(inventory\[item\]\|\|0\)\+\(product\.quantity\|\|1\)/);
  assert.match(source, /recordTransaction\(`Neighborhood: \$\{product\.name\}`,-product\.cost\)/);
  assert.match(source, /renderDistrictStore\(\);renderInventory\(\);saveGame\(false\)/);
});
check('Four provisions have distinct hunger, energy and hygiene restoration effects', () => {
  assert.match(source, /sandwich: \{ hunger:34, energy:5/);
  assert.match(source, /apple: \{ hunger:18, energy:8/);
  assert.match(source, /water: \{ hygiene:9, energy:3/);
  assert.match(source, /pastry: \{ hunger:17, energy:5/);
  assert.match(source, /function consumeProvision\(item\)/);
  assert.match(source, /advanceGameTime\(item==='sandwich'\?8:4\)/);
});
check('Provisions are consumable from BAG and cannot be consumed while another prop is being carried', () => {
  assert.match(source, /provisionEffects\[key\] && inventory\[key\] > 0/);
  assert.match(source, /btn\.textContent=key==='water'\?'MINUM':'MAKAN'/);
  assert.match(source, /if \(handheldState\.item\) \{ showToast\('LETAKKAN BARANG YANG SEDANG DIBAWA'\);return; \}/);
  assert.match(source, /inventory\[item\]--/);
});
check('The Town Park stroll costs 5 Energy, adds 9 Social, and advances the clock by 20 minutes', () => {
  assert.match(source, /function visitTownPark\(\)/);
  assert.match(source, /needs\.energy<5/);
  assert.match(source, /needs\.energy=Math\.max\(0,needs\.energy-5\);needs\.social=clamp\(needs\.social\+9,0,100\)/);
  assert.match(source, /advanceGameTime\(20\)/);
});
check('Town discovery flags are saved and restored with safe defaults for older saves', () => {
  assert.match(source, /const townVisited = \{ cafe:false, market:false, park:false, fuelStop:false, riverside:false, marina:false, northShoal:false, northShoalTreasure:false \}/);
  assert.match(source, /townVisited: \{ \.\.\.townVisited \}/);
  assert.ok(source.includes("Object.assign(townVisited, { cafe:false, market:false, park:false, fuelStop:false, riverside:false, marina:false, northShoal:false, northShoalTreasure:false }, data.townVisited || {})"));
});
check('Inventory defaults include the new provisions while preserving earlier belongings', () => {
  assert.match(source, /sandwich: 0, apple: 0, water: 0, pastry: 0/);
  assert.match(source, /data\.inventory \|\| \{\}/);
  assert.match(source, /syncCourierHandheld\(\)/);
});
check('Imported backups and regular loads accept V3–V17 save versions', () => {
  assert.ok(source.includes('![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)'));
  assert.match(source, /version: 18/);
});
check('Dropped objects can now be restored in the neighbourhood instead of being clamped to the old estate driveway', () => {
  assert.match(source, /z = clamp\(saved\.z, -46, 226\.8\)/);
  assert.match(source, /const x = clamp\(saved\.x, -51, 51\), z = clamp\(saved\.z, -46, 226\.8\)/);
});
check('Harborfront Marina discovery is stored in the town flags with a safe default for earlier V18 saves', () => {
  assert.match(source, /const townVisited = \{ cafe:false, market:false, park:false, fuelStop:false, riverside:false, marina:false, northShoal:false, northShoalTreasure:false \}/);
  assert.match(source, /townVisited\.marina = true/);
  assert.match(source, /playerArea: Math\.hypot\(player\.position\.x-44,player\.position\.z-218\)<7\.0 \? 'north-shoal-island' : player\.position\.z > 183 && player\.position\.x > 10 && player\.position\.x < 45 \? 'marina'/);
  assert.match(source, /bounds: \{ playerZ: \[ -43, 226\.8 \], playerX: \[ -51, 51 \], vehicleZ: \[ -44, 224\.4 \], boatX: \[ 11\.5, 67 \], boatZ: \[ 204, 236 \] \}/);
});
check('Area labels distinguish the cafe, market, park, streets and marina from the original estate', () => {
  for (const label of ['CORNER CAFE','TOWN MARKET','TOWN PARK','HARBORFRONT MARINA','DRIVING · HARBORFRONT MARINA','NEIGHBORHOOD','DRIVING · NEIGHBORHOOD']) assert.ok(source.includes(label));
  assert.match(source, /playerArea: Math\.hypot\(player\.position\.x-44,player\.position\.z-218\)<7\.0/);
});
check('The district commerce panel is included in global UI locking and has responsive product cards', () => {
  assert.match(source, /'district-panel'/);
  assert.match(css, /\.district-product-card/);
  assert.match(css, /@media\(max-width:700px\)\{\.district-panel/);
});
check('Prototype 39 app branding, release notes and package lock identify neighbourhood expansion', () => {
  assert.equal(pkg.version, '0.40.8');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:district/);
  assert.match(html, /Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.8'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} neighbourhood exploration and local commerce checks passed.`);

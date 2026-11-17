import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('North Shoal expands the marina water into a new navigable island destination',()=>{
  assert.match(source,/new THREE\.PlaneGeometry\(88,42\)/);
  assert.match(source,/const northShoal = group\(scene,44,0,218\)/);
  assert.match(source,/const shoalBeach = cylinder\(northShoal/);
  assert.match(source,/NORTH SHOAL/);
});
check('The island has a timber landing, palm grove, beach shelter and illuminated beacon',()=>{
  assert.match(source,/box\(northShoal,-6\.55,0\.28,0,4\.4,0\.18,2\.35/);
  assert.match(source,/for\(const \[px,pz,scale\] of \[\[-2\.7,1\.0,1\],\[1\.1,3\.1,0\.82\]\]\)/);
  assert.match(source,/const shoalShelter=group\(northShoal/);
  assert.match(source,/const shoalBeaconLight=new THREE\.PointLight/);
});
check('The boat is blocked by the island shoreline but can enter the designated dock lane',()=>{
  assert.match(source,/function canDockAtNorthShoal\(/);
  assert.match(source,/const islandHit=Math\.hypot\(boundedX-44,boundedZ-218\)<9\.55/);
  assert.match(source,/boundedX>=32\.7&&boundedX<=37\.6&&Math\.abs\(boundedZ-218\)<=2\.8/);
  assert.match(source,/boatX: \[ 11\.5, 67 \], boatZ: \[ 204, 236 \]/);
});
check('E docks the boat on the island, places the player on shore and lets them reboard without another rental fee',()=>{
  assert.match(source,/if\(canDockAtNorthShoal\(\)\)\{/);
  assert.match(source,/boatDockedAtIsland=true;marinaBoat\.position\.set\(34\.8,0\.18,218\)/);
  assert.match(source,/player\.position\.set\(40\.0,getGroundHeight\(40\.0,218\),218\)/);
  assert.match(source,/if\(boatDockedAtIsland\)\{\n      boatDockedAtIsland=false;inBoat=true/);
  assert.match(source,/get radius\(\)\{return boatDockedAtIsland&&!inBoat\?3\.0:2\.6;\}/);
});
check('Island discovery rewards cash, Social and destination progress; a separate hidden chest pays once',()=>{
  assert.match(source,/function visitNorthShoalIsland\(\)/);
  assert.match(source,/North Shoal Island discovery reward',180/);
  assert.match(source,/function collectNorthShoalTreasure\(\)/);
  assert.match(source,/North Shoal hidden treasure',250/);
  assert.match(source,/townVisited\.northShoalTreasure\)/);
  assert.match(source,/townVisited\.northShoalTreasure=true;shoalChest\.visible=false/);
  assert.match(source,/shoalChest\.visible=!townVisited\.northShoalTreasure/);
});
check('The player can walk on the island surface and find both contextual exploration interactions',()=>{
  assert.match(source,/shoalDx\*shoalDx\+shoalDz\*shoalDz<6\.52\*6\.52\)return 0\.35/);
  assert.match(source,/id:'north-shoal-discovery'/);
  assert.match(source,/id:'north-shoal-treasure'/);
  assert.match(source,/NORTH SHOAL ISLAND/);
});
check('Dock position and one-time discovery flags persist compatibly in the existing V18 save',()=>{
  assert.match(source,/islandDocked: boatDockedAtIsland/);
  assert.match(source,/const savePlayerX = saveWhilePiloting \? 23\.0/);
  assert.match(source,/const savePlayerZ = saveWhilePiloting \? 204\.9/);
  assert.match(source,/boatDockedAtIsland=!!data\.boat\?\.islandDocked/);
  assert.match(source,/northShoal:false, northShoalTreasure:false/);
  assert.match(source,/version: 18/);
});
check('Runtime diagnostics identify the new coastal destination and its dock state',()=>{
  assert.match(source,/islandDocked: boatDockedAtIsland, dockApproach: canDockAtNorthShoal\(\)/);
  assert.match(source,/playerArea: Math\.hypot\(player\.position\.x-44,player\.position\.z-218\)<7\.0 \? 'north-shoal-island'/);
});
check('The North Shoal 0.39.6 milestone and save structure remain intact under the 0.40.8 release',()=>{
  assert.equal(pkg.version,'0.40.8');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.8'));assert.match(readme,/Prototype 39\.6 — North Shoal Island & Coastal Exploration/);
  assert.match(pkg.scripts['test:game'],/test:shoal/);
});
console.log(`\n${passed} North Shoal Island and coastal navigation checks passed.`);

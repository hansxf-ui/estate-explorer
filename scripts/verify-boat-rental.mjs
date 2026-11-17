import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('The existing marina boat is upgraded with a steering helm, helm wheel spokes and a passenger bench',()=>{
  assert.match(source,/const boatHelm=group\(marinaBoat/);
  assert.match(source,/const boatHelmRim=new THREE\.Mesh\(new THREE\.TorusGeometry/);
  assert.match(source,/box\(marinaBoat,0,0\.72,1\.45,1\.5,0\.24,0\.75/);
});
check('A contextual speedboat rental prompt appears at the end of the pier and switches to a return action while piloting',()=>{
  assert.match(source,/id:'marina-boat',[^\n]*action:boardOrExitMarinaBoat/);
  assert.ok(source.includes("label:()=>inBoat?(canDockAtNorthShoal()?'Sandar di North Shoal Island · E':'Kembali ke Harborfront Marina · E'):boatDockedAtIsland?'Naik speedboat · E':'Sewa speedboat · $45'"));
  assert.match(source,/if\(inBoat\)\{/);
  assert.match(source,/SPEEDBOAT DISEWA · \$45/);
});
check('Rental validates cash and carried objects before charging, records an expense and hides the avatar inside the boat',()=>{
  assert.match(source,/if\(handheldState\.item\)\{showToast\('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM NAIK SPEEDBOAT'\);return;\}/);
  assert.match(source,/if\(wallet<45\)/);
  assert.match(source,/recordTransaction\('Harborfront speedboat rental',-45\)/);
  assert.match(source,/inBoat=true;boatSpeed=0;boatBrakeHeld=false;keys\.delete\('Space'\);player\.visible=false/);
});
check('Watercraft controls use keyboard and touch joystick with acceleration, reverse, turning and a handbrake',()=>{
  assert.match(source,/function updateMarinaBoatControls\(dt\)/);
  assert.match(source,/if \(isStarted && !isUiOpen\(\) && !inVehicle && !inBoat && isGrounded\)/);
  assert.match(source,/keys\.has\('KeyW'\).*keys\.has\('KeyS'\).*joystickVector\.y/);
  assert.match(source,/keys\.has\('KeyD'\).*keys\.has\('KeyA'\).*joystickVector\.x/);
  assert.match(source,/boatBrakeHeld\|\|keys\.has\('Space'\)/);
  assert.match(source,/boatHeading-=steering\*0\.78\*steeringStrength/);
  assert.match(source,/boundedX=clamp\(oldX\+dx,11\.5,67\.0\),boundedZ=clamp\(oldZ\+dz,204\.0,236\.0\)/);
});
check('The boat has its own water-speed, gear, trip and status HUD plus a dedicated mobile brake control',()=>{
  for(const id of ['boat-hud','boat-speed','boat-gear','boat-trip','boat-status','boat-brake-btn','boat-desktop-hint'])assert.ok(html.includes(`id="${id}"`));
  assert.match(source,/function updateBoatHud\(\)/);
  assert.match(source,/boatBrakeButton\.addEventListener\('pointerdown'/);
  assert.match(css,/\.boat-hud/);
  assert.match(css,/\.boat-desktop-hint/);
});
check('Boating mode switches the camera, hides character controls, locks world interactions and allows E to return to the pier',()=>{
  assert.match(source,/if\(inBoat\)\{updateMarinaBoatControls\(dt\);updateBoatRace\(dt\);\}/);
  assert.match(source,/let cameraTarget = inBoat \? marinaBoat\.position/);
  assert.match(source,/if\(inBoat&&target\.id!=='marina-boat'\)continue/);
  assert.match(source,/boatHud\.classList\.toggle\('hidden',!inBoat\)/);
  assert.match(source,/jumpButton\.classList\.toggle\('hidden', inVehicle \|\| inBoat\)/);
  assert.match(source,/player\.position\.set\(23\.0,0,204\.9\)/);
});
check('The boat retains heading, gentle bob and turn response without being reset by marina animation',()=>{
  assert.match(source,/marinaBoat\.rotation\.y = boatHeading \+ Math\.sin/);
  assert.match(source,/marinaBoat\.rotation\.y=boatHeading/);
  assert.match(source,/boatHelm\.rotation\.z=THREE\.MathUtils\.damp/);
});
check('Boat position, heading, trip distance and rental count persist while boarding state safely resets after load',()=>{
  assert.match(source,/const saveWhilePiloting = inBoat && !boatDockedAtIsland/);
  assert.match(source,/const savedBoat = saveWhilePiloting \? \{ x:34, z:216, yaw:0, tripDistance:boatTripDistance, rentals:boatRentalCount, islandDocked:false, raceBestTime:boatRaceState.bestTime, raceRewardDay:boatRaceState.rewardDay, salvageDay:boatSalvageState.day, salvageCollected:\[\.\.\.boatSalvageState\.collected\], salvageBonusClaimed:boatSalvageState\.bonusClaimed, salvageTotal:boatSalvageState\.total \}/);
  assert.match(source,/boat: savedBoat/);
  assert.match(source,/marinaBoat\.position\.set\(clamp\(Number\(data\.boat\?\.x\?\?34\),11\.5,67\.0\),0\.18,clamp\(Number\(data\.boat\?\.z\?\?216\),204\.0,236\.0\)\)/);
  assert.match(source,/boatTripDistance=clamp\(Number\(data\.boat\?\.tripDistance\)\|\|0,0,99999\)/);
  assert.match(source,/version: 18/);
});
check('The marina boat HUD is included in runtime diagnostics and release notes',()=>{
  assert.match(source,/boating: inBoat, boat: \{ speed: boatSpeed, heading: boatHeading, tripDistance: boatTripDistance, rentals: boatRentalCount/ );
  assert.match(readme,/Prototype 39\.5 — Harborfront Speedboat Rental & Driving/);
  assert.equal(pkg.version,'0.40.11');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.11'));assert.match(pkg.scripts['test:game'],/test:boat/);
});
console.log(`\n${passed} marina speedboat rental and driving checks passed.`);

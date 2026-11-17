import fs from 'node:fs';
import assert from 'node:assert/strict';
import { obbIntersectsAabb2D, obbIntersectsCircle2D, vehicleYawRate, isPavedRoadSurface } from '../src/driving-physics.js';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const physicsSource = fs.readFileSync(new URL('../src/driving-physics.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Vehicle OBB collision follows rotation instead of using a fixed world-aligned rectangle', () => {
  const car = { x:0, z:0, yaw:0, halfWidth:1.25, halfLength:2.36 };
  const xSide = { minX:1.7, maxX:1.9, minZ:-0.1, maxZ:0.1 };
  assert.equal(obbIntersectsAabb2D(car, xSide), false);
  car.yaw = Math.PI / 2;
  assert.equal(obbIntersectsAabb2D(car, xSide), true);
  const zSide = { minX:-0.1, maxX:0.1, minZ:1.7, maxZ:1.9 };
  assert.equal(obbIntersectsAabb2D(car, zSide), false);
});
check('Vehicle-to-resident collision checks the closest point on the rotated body', () => {
  const car = { x:0, z:0, yaw:Math.PI/2, halfWidth:1.25, halfLength:2.36 };
  assert.equal(obbIntersectsCircle2D(car, 2.55, 0, 0.25), true);
  assert.equal(obbIntersectsCircle2D(car, 0, 2.55, 0.25), false);
});
check('Steering is disabled while stationary and changes direction correctly in reverse', () => {
  assert.equal(vehicleYawRate(0, 1), 0);
  assert.equal(vehicleYawRate(0.01, 1), 0);
  assert.ok(vehicleYawRate(6, 1) > 0);
  assert.ok(vehicleYawRate(-6, 1) < 0);
  assert.equal(vehicleYawRate(6, 0), 0);
  assert.match(source, /const yawRate = vehicleYawRate\(vehicleSpeed, steering\*\(selectedVehicleType==='motorcycle'\?1\.18:1\)\*\(1\+vehicleGarageState\.handling\*0\.13\)\)/);
});
check('SUV movement resolves collisions in small steps and can slide along a clear axis', () => {
  assert.match(source, /function moveVehicleSafely\(deltaX, deltaZ\)/);
  assert.match(source, /Math\.ceil\(Math\.max\(Math\.abs\(deltaX\), Math\.abs\(deltaZ\)\) \/ 0\.28\)/);
  assert.match(source, /if \(!vehicleCollides\(nextX, nextZ\)\)/);
  assert.match(source, /vehicleCollides\(nextX, vehicle\.position\.z\)/);
  assert.match(source, /vehicleCollides\(vehicle\.position\.x, nextZ\)/);
  assert.doesNotMatch(source, /vehicleSpeed \*= -0\.12/);
});
check('Actual travelled distance drives the odometer and fuel use', () => {
  assert.match(source, /const drivenDistance = Math\.hypot\(vehicle\.position\.x - startX, vehicle\.position\.z - startZ\)/);
  assert.match(source, /vehicleTripDistance \+= drivenDistance \/ 1000/);
  assert.match(source, /vehicleFuel = Math\.max\(0, vehicleFuel - drivenDistance \* 0\.018 \* \(1-vehicleGarageState\.efficiency\*0\.13\)\)/);
  assert.match(source, /vehicleDirt = clamp\(vehicleDirt \+ drivenDistance \* 0\.028, 0, 100\)/);
  assert.doesNotMatch(source, /vehicleTripDistance \+= Math\.abs\(vehicleSpeed\)/);
});
check('Fuel limits engine power and shows low/out-of-fuel feedback', () => {
  assert.match(source, /const throttle = vehicleFuel > 0\.01 \? requestedThrottle : 0/);
  assert.match(source, /BAHAN BAKAR MENIPIS/);
  assert.match(source, /BAHAN BAKAR HABIS/);
  assert.match(html, /id="vehicle-fuel"/);
  assert.match(source, /setTextIfChanged\(vehicleStatusLabel, !inVehicle \? 'PARKED' : vehicleFuel <= 0\.01 \? 'OUT OF FUEL' : vehicleFuel < 18 \? 'LOW FUEL'/);
});
check('Northside Fuel is a real interaction with a parked-car and on-foot recovery path', () => {
  assert.match(source, /id:'fuel-stop', x:28, y:0, z:128\.6/);
  assert.match(source, /Math\.abs\(vehicleSpeed\) < 0\.45/);
  assert.match(source, /Math\.hypot\(vehicle\.position\.x-28,vehicle\.position\.z-128\.6\)<9/);
  assert.match(source, /function refuelVehicle\(\)/);
  assert.match(source, /Northside Fuel refill/);
  assert.match(source, /fuelShopDoor: !collides\(28,134\)/);
});
check('North Shore adds an accessible road gate, fuel stop and Riverside Lookout', () => {
  assert.match(source, /districtSign\(0,4\.8,112\.2,'NORTH SHORE'/);
  assert.match(source, /NORTHSIDE FUEL/);
  assert.match(source, /RIVERSIDE LOOKOUT/);
  assert.match(source, /riversideWater\.position\.set\(-18,0\.015,161\)/);
  assert.match(source, /northGatePassage: \{ playerClear: !collides\(0,108\), vehicleClear: !vehicleCollides\(0,108\) \}/);
  assert.match(source, /clamp\(nz, -43, 226\.8\)/);
  assert.ok(/z \+ extentZ > 227\.2/.test(source), 'vehicle world boundary must reach the marina');
  assert.match(source, /vehicle\.position\.set\(clamp\(data\.vehicle\.x,-50\.2,50\.2\),0,clamp\(data\.vehicle\.z,-44,224\.4\)\)/);
  assert.match(source, /box\(scene,0,-0\.025,177,13\.5,0\.12,44,districtRoadMat\)/);
  assert.match(source, /box\(scene,10\.5,-0\.012,188\.5,8\.2,0\.1,19,districtRoadMat\)/);
});
check('Harborfront Marina extends the connected map with a drivable approach, car park, pier and visible motorboat', () => {
  assert.match(source, /districtSign\(25,5\.2,194\.3,'HARBORFRONT MARINA'/);
  assert.match(source, /const marinaWater = new THREE\.Mesh\(new THREE\.PlaneGeometry\(88,42\)/);
  assert.match(source, /const marinaBoat = group\(scene,32,0\.18,216\)/);
  assert.match(source, /const marinaWaterLights = \[\-4,0,4\]/);
  assert.match(source, /function updateMarina\(dt\)/);
  assert.match(source, /updateMarina\(dt\)/);
  assert.match(source, /marinaWaterLights\.forEach\(light => \{ light\.intensity = nightMix \* 0\.7; \}\)/);
  assert.match(source, /marinaDriveway: !vehicleCollides\(25,188\.5\)/);
  assert.match(source, /marina: !collides\(25,201\.8\)/);
  assert.match(source, /id:'harborfront-marina', x:25, y:0\.2, z:201\.8/);
  assert.match(source, /colliders\.push\([\s\S]*?minX:21\.55,maxX:22\.25,minZ:195\.5,maxZ:211\.2/);
  assert.match(source, /The pier is pedestrian-only for both land vehicles; the motorcycle has a smaller collision footprint/);
});
check('Marina exploration advances the scenic-travel task, grants a one-time discovery reward and persists', () => {
  assert.match(source, /function visitHarborfrontMarina\(\)/);
  assert.match(source, /const firstVisit = !townVisited\.marina/);
  assert.match(source, /wallet \+= 120; recordTransaction\('Harborfront Marina discovery reward',120\)/);
  assert.match(source, /needs\.social = clamp\(needs\.social \+ 14, 0, 100\)/);
  assert.match(source, /advanceGameTime\(30\)/);
  assert.match(source, /recordDailyTaskProgress\('destination'\)/);
  assert.match(source, /playerArea: Math\.hypot\(player\.position\.x-44,player\.position\.z-218\)<7\.0 \? 'north-shoal-island' : player\.position\.z > 183 && player\.position\.x > 10 && player\.position\.x < 45 \? 'marina'/);
});

check('Destination discovery grants rewards and advances the rotating travel objective', () => {
  assert.match(source, /destination: \{ title: 'Take the Scenic Route'/);
  assert.match(source, /event: 'destination', goal: 1, reward: 180/);
  assert.match(source, /recordDailyTaskProgress\('destination'\)/);
  assert.match(source, /Riverside discovery reward/);
  assert.match(source, /townVisited\.riverside = true/);
});

check('Paved-road classification covers the estate, gate boulevard, town streets, fuel forecourt and riverside approach', () => {
  for (const point of [[0,30],[6.5,34],[30,64],[0,90],[0,140],[-14,143],[0,185],[10.5,188.5],[25,188.5],[25,196],[-43,150],[43,150]]) assert.equal(isPavedRoadSurface(...point), true, `expected paved at ${point}`);
  for (const point of [[-22,25],[16,114],[49,145],[-35,150]]) assert.equal(isPavedRoadSurface(...point), false, `expected dirt/grass at ${point}`);
});
check('A pooled, low-cost tyre dust effect only emits off paved roads and reports live particles', () => {
  assert.match(source, /const vehicleDustParticles = Array\.from\(\{ length: 12 \}/);
  assert.match(source, /function updateVehicleDust\(dt\)/);
  assert.match(source, /Math\.abs\(vehicleSpeed\) < 2\.8 \|\| isPavedRoadSurface\(vehicle\.position\.x, vehicle\.position\.z\)/);
  assert.match(source, /updateVehicleDust\(dt\)/);
  assert.match(source, /dustActive: vehicleDustParticles\.filter\(particle => particle\.life > 0\)\.length/);
  assert.match(source, /new THREE\.PlaneGeometry\(220, 460\)/);
  assert.match(source, /new THREE\.Fog\(0x9bc4d0, 70, 270\)/);
});

check('Northside Auto Spa is a real drive-in service destination with a complete wash canopy and brush tunnel', () => {
  assert.match(source, /id:'car-wash', x:-30, y:0, z:138\.5/);
  assert.match(source, /NORTHSIDE AUTO SPA/);
  assert.match(source, /const vehicleWashBrushes = \[\]/);
  assert.match(source, /const vehicleWashLights = \[-33,-30,-27\]/);
  assert.match(source, /enabled:\(\)=>inVehicle && Math\.abs\(vehicleSpeed\)<0\.45 && vehicleDirt>=1/);
  assert.match(source, /currentTarget = serviceTarget \|\| vehicleTarget/);
  assert.match(source, /function washVehicle\(\)/);
  assert.ok(source.includes("recordTransaction(`Northside Auto Spa wash · ${currentVehicleName()}`, -cost)"));
  assert.match(source, /vehicleWashTimer = 4\.4/);
});
check('SUV cleanliness declines only when actually driven off paved areas and can be restored by a paid wash', () => {
  assert.ok(source.includes("if (selectedVehicleType==='suv'&&(!isPavedRoadSurface(startX,startZ) || !isPavedRoadSurface(vehicle.position.x,vehicle.position.z))) vehicleDirt = clamp"));
  assert.ok(source.includes("if(selectedVehicleType==='motorcycle'&&(!isPavedRoadSurface(startX,startZ)||!isPavedRoadSurface(vehicle.position.x,vehicle.position.z)))vehicleDirt=clamp"));
  assert.match(source, /const cost = Math\.max\(8, Math\.ceil\(vehicleDirt \* 0\.55\)\)/);
  assert.match(source, /vehicleDirt = 0/);
  assert.match(source, /vehicleCare: \{ title: 'Fresh Off the Road'/);
  assert.match(source, /recordDailyTaskProgress\('vehicleCare'\)/);
  assert.match(html, /id="vehicle-cleanliness"/);
  assert.match(source, /setTextIfChanged\(vehicleCleanlinessLabel, `\$\{Math\.round\(100 - vehicleDirt\)\}%`/);
});
check('Wash-bay apron is classified as paved so the car does not get dirty while being serviced', () => {
  assert.equal(isPavedRoadSurface(-30,138.5), true);
  assert.equal(isPavedRoadSurface(-37,138.5), false);
  assert.match(physicsSource, /autoSpaApron = Math\.abs\(x \+ 30\) <= 6/);
});
check('A steering rotation is rolled back when the new vehicle orientation would overlap a collider', () => {
  assert.match(source, /const previousYaw = vehicle\.rotation\.y/);
  assert.match(source, /if \(vehicleCollides\(vehicle\.position\.x, vehicle\.position\.z\)\) \{\s*vehicle\.rotation\.y = previousYaw/);
});
check('V18 stores fuel, dirt and town discovery while older saves receive safe defaults', () => {
  assert.match(source, /version: 18/);
  assert.match(source, /vehicleSettings: \{ lightsMode: vehicleLightsMode, tripDistance: vehicleTripDistance, fuel: vehicleFuel, dirt: vehicleDirt \}/);
  assert.match(source, /vehicleDirt = clamp\(Number\(data\.vehicleSettings\?\.dirt \?\? 0\), 0, 100\)/);
  assert.match(source, /vehicleFuel = clamp\(Number\(data\.vehicleSettings\?\.fuel \?\? 100\), 0, 100\)/);
  assert.match(source, /fuelStop:false, riverside:false/);
  assert.ok(source.includes('![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)'));
  assert.match(readme, /V3–V17 saves receive safe defaults/);
});
check('Project still labels this as the Prototype 37 follow-up, not a new prototype number', () => {
  assert.match(readme, /Prototype 37 follow-up — Vehicle Reliability & North Shore Travel/);
  assert.match(readme, /does not introduce a new prototype number/);
  assert.equal(pkg.version, '0.40.10');
  assert.match(pkg.scripts['test:game'], /test:driving-exploration/);
});

console.log(`\n${passed} driving and exploration checks passed.`);

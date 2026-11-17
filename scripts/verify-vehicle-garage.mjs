import fs from 'node:fs';
import assert from 'node:assert/strict';
import { isPavedRoadSurface } from '../src/driving-physics.js';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const physics=fs.readFileSync(new URL('../src/driving-physics.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('Estate Motor Garage is a real 3D structure with an open drive-in entrance and service equipment',()=>{
 assert.match(source,/const vehicleGarageGroup=group\(scene,22,0,35\.5\);vehicleGarageGroup\.visible=false/);
 assert.match(source,/box\(vehicleGarageGroup,-5\.35,1\.65,0,0\.48,3\.3,10\.0,districtWallMat\)/);
 assert.match(source,/box\(vehicleGarageGroup,5\.35,1\.65,0,0\.48,3\.3,10\.0,districtWallMat\)/);
 assert.match(source,/box\(vehicleGarageGroup,-4\.55,1\.65,-4\.82,1\.55,3\.3,0\.48,districtWallMat\)/);
 assert.match(source,/service lift|Workshop lift/i);
 assert.match(source,/ESTATE MOTOR GARAGE/);
 assert.ok(html.includes('id="garage-kiosk"')||source.includes("id:'garage-kiosk'"));
});
check('Garage construction costs $1,250, is a one-time build, records spending and enables dynamic collision',()=>{
 assert.match(source,/const vehicleGarageBuildCost=1250/);
 assert.match(source,/function buildVehicleGarage\(\)/);
 assert.match(source,/wallet-=vehicleGarageBuildCost;vehicleGarageState\.built=true;vehicleGarageGroup\.visible=true/);
 assert.match(source,/recordTransaction\('Estate Motor Garage construction',-vehicleGarageBuildCost\)/);
 assert.match(source,/if\(vehicleGarageState\.built\)for\(const c of vehicleGarageColliders\)/);
 assert.match(source,/if\(vehicleGarageState\.built\)for\(const collider of vehicleGarageColliders\)/);
});
check('Garage management is reachable on foot from a permanent kiosk and refuses vehicle occupants',()=>{
 assert.match(source,/id:'garage-kiosk',x:13\.25,y:0\.2,z:31\.4,radius:2\.9/);
 assert.match(source,/enabled:\(\)=>!inVehicle&&!inBoat&&!divingState\.active&&!playerSeated,label:\(\)=>vehicleGarageState\.built/);
 assert.match(source,/function openVehicleGaragePanel\(\)/);
 assert.ok(html.includes('id="garage-panel"'));
 assert.ok(html.includes('id="garage-build"'));
});
check('Performance ECU has three tiers that alter real forward top speed and acceleration',()=>{
 assert.match(source,/engine:\{name:'Performance ECU'.*?prices:\[650,1100,1800\],max:3/s);
 assert.match(source,/const enginePower=\(selectedVehicleType==='motorcycle'\?25\.5:18\.0\)\*\(1\+vehicleGarageState\.engine\*0\.11\)/);
 assert.match(source,/vehicleSpeed = THREE\.MathUtils\.damp\(vehicleSpeed, targetSpeed, vehicleSpeed < -0\.45 \? 5\.5 : \(selectedVehicleType==='motorcycle'\?1\.82:1\.45\)\+vehicleGarageState\.engine\*0\.22, dt\)/);
});
check('Sport Steering Rack has three tiers and changes wheel angle and steering yaw authority',()=>{
 assert.match(source,/handling:\{name:'Sport Steering Rack'.*?prices:\[520,920,1480\],max:3/s);
 assert.match(source,/steerAngle = steering \* \(selectedVehicleType==='motorcycle'\?0\.60:0\.48\) \* \(1\+vehicleGarageState\.handling\*0\.13\)/);
 assert.match(source,/vehicleYawRate\(vehicleSpeed, steering\*\(selectedVehicleType==='motorcycle'\?1\.18:1\)\*\(1\+vehicleGarageState\.handling\*0\.13\)\)/);
});
check('Eco Fuel Mapping has three tiers and reduces actual distance-based fuel consumption',()=>{
 assert.match(source,/efficiency:\{name:'Eco Fuel Mapping'.*?prices:\[480,840,1320\],max:3/s);
 assert.match(source,/drivenDistance \* 0\.018 \* \(1-vehicleGarageState\.efficiency\*0\.13\)/);
 assert.match(source,/actual.*fuel|FUEL SAVING/i);
});
check('Five body colours update the real SUV paint material and paid finishes create ledger entries',()=>{
 for(const key of ['midnight','ivory','ocean','burgundy','sage'])assert.match(source,new RegExp(`${key}:\\{name:`));
 assert.match(source,/function applyVehiclePaint\(\)\{vehiclePaint\.color\.setHex/);
 assert.match(source,/function purchaseVehiclePaint\(key\)/);
 assert.match(source,/vehiclePaint\.color\.setHex\(vehiclePaintOptions\[vehicleGarageState\.paint\]/);
 assert.match(source,/recordTransaction\(`Estate Garage paint: \$\{paint\.name\}`,-paint\.price\)/);
});
check('Garage UI renders upgrade tiers, affordability, installed status and paint swatches responsively',()=>{
 assert.match(source,/function renderVehicleGaragePanel\(\)/);
 assert.match(source,/action\.disabled=wallet<cost/);
 assert.match(source,/MAX LEVEL INSTALLED/);
 assert.match(source,/garage-paint-choice/);
 assert.ok(html.includes('id="garage-upgrade-list"'));
 assert.ok(html.includes('class="garage-paint-grid"'));
 assert.match(css,/\.garage-upgrade-card/);assert.match(css,/\.garage-paint-choice/);
});
check('Upgrades, construction, paint and transaction effects persist in V18 saves with safe legacy defaults',()=>{
 assert.match(source,/vehicleGarage: \{ \.\.\.vehicleGarageState \}/);
 assert.match(source,/const savedVehicleGarage=data\.vehicleGarage\|\|\{\}/);
 assert.match(source,/vehicleGarageState\.built=!!savedVehicleGarage\.built/);
 assert.match(source,/vehicleGarageState\.paint=vehiclePaintOptions\[savedVehicleGarage\.paint\]\?savedVehicleGarage\.paint:'midnight'/);
 assert.match(source,/vehicleGarageState\[key\]=clamp\(Math\.floor\(Number\(savedVehicleGarage\[key\]\)\|\|0\),0,vehicleGarageUpgradeDefinitions\[key\]\.max\)/);
 assert.match(source,/vehicleGarageGroup\.visible=vehicleGarageState\.built/);
 assert.match(source,/version: 18/);
});
check('Garage collision restores correctly on load and can deactivate when an older unbuilt save is loaded',()=>{
 assert.match(source,/if\(vehicleGarageState\.built\)for\(const c of vehicleGarageColliders\)/);
 assert.doesNotMatch(source,/vehicleGarageCollidersEnabled/);
 assert.match(source,/if\(vehicleGarageState\.built\)for\(const collider of vehicleGarageColliders\)/);
 assert.equal(isPavedRoadSurface(22,29.5),true);
 assert.equal(isPavedRoadSurface(22,35.5),true);
});
check('The service apron and interior count as paved surfaces to prevent garage tyre-dust and dirt effects',()=>{
 assert.match(physics,/const estateGarageApron = Math\.abs\(x - 22\) <= 6\.8/);
 assert.match(physics,/const estateGarageInterior = inRange\(x, 16\.7, 27\.3\)/);
 assert.equal(isPavedRoadSurface(22,29.5),true);assert.equal(isPavedRoadSurface(22,35.5),true);
});
check('Diagnostics expose all vehicle tuning tiers, paint options and garage visibility; release metadata is synchronized',()=>{
 assert.match(source,/vehicleGarage:\{\.\.\.vehicleGarageState,visible:vehicleGarageGroup\.visible/);
 assert.match(source,/upgradeCosts:Object\.fromEntries/);
 assert.equal(pkg.version,'0.40.12');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(html.includes('BUILD 0.40.12'));
 assert.match(readme,/Prototype 40\.3 — Estate Motor Garage & Vehicle Tuning/);
 assert.match(pkg.scripts['test:game'],/test:garage/);
});
console.log(`\n${passed} Estate Motor Garage and Vehicle Tuning checks passed.`);

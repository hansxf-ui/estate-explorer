import fs from 'node:fs';
import assert from 'node:assert/strict';
import { obbIntersectsAabb2D, vehicleYawRate } from '../src/driving-physics.js';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('A permanent motor showroom with display plinth, showroom motorcycle, signage, kiosk and delivery bay exists in the world',()=>{
 assert.match(source,/const vehicleDealerGroup=group\(scene,26,0,66\)/);
 assert.match(source,/const motorcycleShowroomPreview=vehicleMotorcycleModel\.clone\(true\)/);
 assert.match(source,/ESTATE MOTOR SHOWROOM/);
 assert.match(source,/const dealerKiosk=group\(scene,12\.25,0,60\.2\)/);
 assert.match(source,/const dealerVehicleBay=\{x:14\.2,z:57\.5,yaw:0\}/);
});
check('The motorcycle is a one-time $2,850 purchase, adds an economy transaction and is delivered after purchase',()=>{
 assert.match(source,/const motorcyclePurchasePrice=2850/);
 assert.match(source,/function purchaseMotorcycle\(\)/);
 assert.match(source,/wallet-=motorcyclePurchasePrice;motorcycleOwned=true/);
 assert.match(source,/recordTransaction\('Estate Motor Showroom · Sport Motorcycle',-motorcyclePurchasePrice\)/);
 assert.match(source,/applyVehicleSelection\('motorcycle',\{deliver:true,save:false\}\)/);
});
check('Ownership and active ride selection are available at the physical dealer kiosk, with the bike locked until purchased',()=>{
 assert.match(source,/id:'vehicle-dealer-kiosk',x:12\.25,y:0\.2,z:60\.2/);
 assert.match(source,/function openVehicleDealerPanel\(\)/);
 assert.match(source,/if\(type==='motorcycle'&&!motorcycleOwned\)/);
 assert.match(source,/function renderVehicleDealerPanel\(\)/);
 assert.ok(html.includes('id="vehicle-dealer-panel"'));
 assert.ok(html.includes('id="dealer-buy-bike"'));
});
check('The motorcycle is a separate 3D model with working wheels, forks, tank, seat, engine, exhaust, steering, mirrors and lights',()=>{
 assert.match(source,/const vehicleMotorcycleModel=group\(vehicle\);vehicleMotorcycleModel\.visible=false/);
 assert.match(source,/const motorcycleChassis=group\(vehicleMotorcycleModel\)/);
 assert.match(source,/const bikeFrontWheel=cylinder/);assert.match(source,/const bikeRearWheel=cylinder/);
 assert.match(source,/const bikeFuelTank=sphere\(motorcycleChassis/);
 assert.match(source,/const bikeEngine=cylinder/);assert.match(source,/const bikeExhaust=cylinder/);
 assert.match(source,/const motorcycleSteering=group/);
 assert.match(source,/const motorcycleHeadlight=createManagedPointLight/);
 assert.match(source,/const motorcycleBrakeLight=createManagedPointLight/);
 assert.match(source,/const motorcycleRider=group\(motorcycleChassis\);motorcycleRider\.visible=false/);
 assert.match(source,/const riderTorso=box\(motorcycleRider/);assert.match(source,/riderHelmetMat/);
 assert.match(source,/motorcycleRider\.visible=selectedVehicleType==='motorcycle'/);
 assert.match(source,/player\.visible = true;motorcycleRider\.visible=false/);
});
check('The SUV and motorcycle switch visual models without changing the existing vehicle controller or enter/exit interaction',()=>{
 assert.match(source,/const vehicleCarModel=group\(vehicle\)/);
 assert.match(source,/vehicleCarModel\.visible=type==='suv';vehicleMotorcycleModel\.visible=type==='motorcycle'/);
 assert.match(source,/id: 'vehicle', get x\(\)/);
 assert.match(source,/label: \(\) => inVehicle \? `Keluar dari \$\{currentVehicleName\(\)\}` : `Kendarai \$\{currentVehicleName\(\)\}`/);
 assert.match(source,/vehicle\.position\.set\(dealerVehicleBay\.x,0,dealerVehicleBay\.z\)/);
 const kiosk={x:12.25,z:60.2},delivery={x:14.2,z:57.5};
 assert.ok(Math.hypot(kiosk.x-delivery.x,kiosk.z-delivery.z)<3.7,'delivery bay must be within mounting range for the SUV');
});
check('Motorcycle collision footprint is narrower and shorter than the SUV and still uses rotated-body collision checks',()=>{
 assert.match(source,/halfWidth: bike\?0\.58:1\.25, halfLength: bike\?1\.55:2\.36/);
 const car={x:0,z:0,yaw:0,halfWidth:1.25,halfLength:2.36};const bike={x:0,z:0,yaw:0,halfWidth:0.58,halfLength:1.55};
 const wall={minX:0.8,maxX:1.0,minZ:-0.1,maxZ:0.1};
 assert.equal(obbIntersectsAabb2D(car,wall),true);assert.equal(obbIntersectsAabb2D(bike,wall),false);
});
check('Motorcycle has higher acceleration and top speed, distinct reverse, tighter steering and chassis lean',()=>{
 assert.match(source,/selectedVehicleType==='motorcycle'\?25\.5:18\.0/);
 assert.match(source,/selectedVehicleType==='motorcycle'\?1\.82:1\.45/);
 assert.match(source,/selectedVehicleType==='motorcycle'\?4\.4:6\.8/);
 assert.match(source,/selectedVehicleType==='motorcycle'\?0\.60:0\.48/);
 assert.match(source,/vehicleYawRate\(vehicleSpeed, steering\*\(selectedVehicleType==='motorcycle'\?1\.18:1\)/);
 assert.match(source,/motorcycleChassis\.rotation\.z=THREE\.MathUtils\.damp/);
 assert.ok(vehicleYawRate(16,0.4)>0);
});
check('Motorcycle controls animate both wheels, fork steering, lean, headlight and brake light',()=>{
 assert.match(source,/bikeFrontWheel\.rotation\.x\+=selectedVehicleType==='motorcycle'/);
 assert.match(source,/bikeRearWheel\.rotation\.x\+=selectedVehicleType==='motorcycle'/);
 assert.match(source,/motorcycleSteering\.rotation\.y=THREE\.MathUtils\.damp/);
 assert.match(source,/motorcycleHeadlight\.intensity=headlightsOn&&selectedVehicleType==='motorcycle'/);
 assert.match(source,/motorcycleBrakeLight\.intensity=THREE\.MathUtils\.damp/);
});
check('Each vehicle has separate fuel, cleanliness and trip distance; switching restores each telemetry profile',()=>{
 assert.match(source,/const vehicleFleetTelemetry=\{suv:\{fuel:100,dirt:0,tripDistance:0\},motorcycle:\{fuel:100,dirt:0,tripDistance:0\}\}/);
 assert.match(source,/vehicleFleetTelemetry\[selectedVehicleType\]=\{fuel:vehicleFuel,dirt:vehicleDirt,tripDistance:vehicleTripDistance\}/);
 assert.match(source,/const telemetry=vehicleFleetTelemetry\[type\]/);
 assert.match(source,/vehicleFuel=clamp\(Number\(telemetry\.fuel/);
 assert.match(source,/vehicleTripDistance=clamp\(Number\(telemetry\.tripDistance/);
});
check('Fuel purchase, Auto Spa, dashboard labels and empty-fuel feedback report the currently selected vehicle',()=>{
 assert.match(source,/selectedVehicleType==='motorcycle'\?0\.58:0\.72/);
 assert.match(source,/Northside Fuel refill · \$\{currentVehicleName\(\)\}/);
 assert.match(source,/label:\(\)=>`Cuci \$\{currentVehicleName\(\)\} · \$\$\{Math\.max\(8,Math\.ceil\(vehicleDirt\*0\.55\)\)\}`/);
 assert.match(source,/Northside Auto Spa wash · \$\{currentVehicleName\(\)\}/);
 assert.match(source,/BAHAN BAKAR HABIS · \$\{currentVehicleName\(\)\.toUpperCase\(\)\}/);
});
check('The showroom panel has purchase and fleet selection states, mobile styling and is part of managed panel locking',()=>{
 assert.match(source,/function renderVehicleDealerPanel\(\)/);
 assert.match(source,/dealer-fleet-choice/);
 assert.match(source,/vehicle-dealer-panel/);
 assert.match(css,/\.dealer-feature-card/);assert.match(css,/\.dealer-fleet-choice/);
 assert.match(source,/const panelElements = panelIds\.map/);
 assert.match(source,/new MutationObserver/);
 assert.match(source,/function isUiOpen\(\)\s*\{ return !!placementMode \|\| hasOpenPanel; \}/);
});
check('V18 saves preserve selected vehicle, ownership and separate telemetry; older saves retain SUV and locked-bike defaults',()=>{
 assert.match(source,/vehicleFleet: \{ selected:selectedVehicleType, motorcycleOwned, telemetry:/);
 assert.match(source,/const savedFleet=data\.vehicleFleet\|\|\{\}/);
 assert.match(source,/motorcycleOwned=!!savedFleet\.motorcycleOwned/);
 assert.match(source,/savedFleet\.selected==='motorcycle'&&motorcycleOwned\?'motorcycle':'suv'/);
 assert.match(source,/savedFleet\.telemetry\?\.\[selectedVehicleType\]/);
 assert.match(source,/version: 18/);
});
check('Diagnostics expose ownership, active model and per-vehicle telemetry; release metadata is synchronized',()=>{
 assert.match(source,/vehicleFleet:\{selected:selectedVehicleType,motorcycleOwned,telemetry:/);
 assert.match(source,/models:\{suv:vehicleCarModel\.visible,motorcycle:vehicleMotorcycleModel\.visible,rider:motorcycleRider\.visible\}/);
 assert.match(source,/dealer: \{kioskPosition:\[12\.25,60\.2\],deliveryBay:\[dealerVehicleBay\.x,dealerVehicleBay\.z\],bikePrice:motorcyclePurchasePrice\}/);
 assert.equal(pkg.version,'0.40.13');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(html.includes('BUILD 0.40.13'));assert.match(readme,/Prototype 40\.4 — Estate Motor Showroom & Sport Motorcycle Ownership/);
 assert.match(pkg.scripts['test:game'],/test:dealer/);
});
console.log(`\\n${passed} Estate Motor Showroom and Sport Motorcycle checks passed.`);

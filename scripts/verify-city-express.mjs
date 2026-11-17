import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log('✓ '+name)}
check('Five real neighborhood destinations have distinct rewards, delivery windows and coordinates',()=>{
 assert.match(source,/const courierNetworkRoutes = \[/);
 for(const id of ['cafe','market','fuel','riverside','marina']) assert.ok(source.includes("id:'"+id+"'"));
 for(const name of ['Corner Cafe','Town Market','Northside Fuel','Riverside Lookout','Harborfront Marina']) assert.ok(source.includes("name:'"+name+"'"));
});
check('A reusable illuminated 3D loading-bay marker is created and hidden until a route is accepted',()=>{
 assert.match(source,/const courierNetworkMarker = \(\(\) => \{/);
 assert.match(source,/new THREE\.TorusGeometry\(1\.55,0\.085/);
 assert.match(source,/courierNetworkMarker\.group\.visible=true/);
 assert.match(source,/courierNetworkMarker\.group\.visible=false/);
});
check('City Express is integrated as a vehicle-based Work & Finance contract with a two-dispatch daily limit',()=>{
 assert.match(source,/id:'express', title:'City Express Dispatch'/);
 assert.match(source,/courierNetworkState\.acceptedToday >= 2/);
 assert.match(source,/acceptedToday\+\+/);
 assert.match(source,/EXPRESS \$\{courierNetworkState\.acceptedToday\}\/2/);
 assert.ok(html.includes('id="work-contract-list"'));
});
check('Dispatch acceptance blocks conflicting field contracts, selects the next route and closes the work panel for driving',()=>{
 assert.match(source,/function startCourierNetworkJob\(\)/);
 assert.match(source,/courierNetworkState\.completedTotal%courierNetworkRoutes\.length/);
 assert.match(source,/jobPhase === 'collect' \|\| jobPhase === 'deliver' \|\| gardenJobPhase === 'active'/);
 assert.match(source,/renderCourierNetworkHud\(true\);renderWorkFinancePanel\(\);saveGame\(false\);closePanels\(\)/);
 assert.match(source,/if \(courierNetworkState\.phase === 'enroute'\) \{ showToast\('SELESAIKAN CITY EXPRESS TERLEBIH DAHULU'\)/);
});
check('The live route HUD exposes destination, countdown, driving instructions and unloading status',()=>{
 for(const id of ['delivery-network-hud','delivery-network-status','delivery-network-title','delivery-network-timer','delivery-network-progress','delivery-network-copy']) assert.ok(html.includes('id="'+id+'"'));
 assert.match(source,/function renderCourierNetworkHud\(force = false\)/);
 assert.match(source,/STOP · UNLOAD/);
 assert.match(source,/ENTER VEHICLE/);
 assert.match(css,/\.delivery-network-hud/);
});
check('Dispatch countdown pauses on the title screen and clamps frame delta before progressing',()=>{
 assert.match(source,/function updateCourierNetwork\(dt\) \{\s*if \(!isStarted \|\| courierNetworkState\.phase !== 'enroute'\) return;\s*const step = Math\.max\(0,Math\.min\(dt,0\.035\)\)/);
 assert.match(source,/courierNetworkState\.elapsed \+= step/);
});
check('A delivery only completes inside the loading radius while driving slowly, with a reduced late payout',()=>{
 assert.match(source,/Math\.hypot\(vehicle\.position\.x-route\.x,vehicle\.position\.z-route\.z\)<6\.3/);
 assert.match(source,/Math\.abs\(vehicleSpeed\)<2\.2/);
 assert.match(source,/const onTime = courierNetworkState\.elapsed <= route\.deadline/);
 assert.match(source,/(onTime\?65:0)/);
 assert.match(source,/function completeCourierNetworkDelivery\(\)/);
});
check('The Sport Motorcycle earns an additional courier bonus and Delivery skill improves all route payouts',()=>{
 assert.match(source,/selectedVehicleType === 'motorcycle' \? 45 : 0/);
 assert.match(source,/skillProgress\('delivery'\)\.level-1\)\*18/);
 assert.match(source,/addSkillXp\('delivery',26\)/);
});
check('Delivery payouts enter the finance ledger, improve Delivery skill and progress daily paid-work tasks',()=>{
 assert.match(source,/recordTransaction\('City Express · '\+route\.name,reward\)/);
 assert.match(source,/recordDailyTaskProgress\('paidWork'\)/);
 assert.match(source,/wallet\+=reward/);
});
check('Active dispatches can be cancelled and the route marker and HUD are cleared',()=>{
 assert.match(source,/function cancelCourierNetworkJob\(\)/);
 assert.match(source,/courierNetworkState\.routeIndex=-1/);
 assert.match(source,/courierNetworkMarker\.group\.visible=false;renderCourierNetworkHud\(true\)/);
});
check('Daily dispatch quota resets on game-day rollover while preserving active route state',()=>{
 assert.match(source,/resetDailyWorkLimits\(\);\s*resetCourierNetworkDay\(\);/);
 assert.match(source,/function resetCourierNetworkDay\(\) \{\s*if \(courierNetworkState\.day === gameDay\) return;\s*courierNetworkState\.day = gameDay;\s*courierNetworkState\.acceptedToday = 0;/);
});
check('V18 saves persist active route state, timer, dispatch count and completed-delivery history',()=>{
 assert.match(source,/cityExpress: \{day:courierNetworkState\.day,phase:courierNetworkState\.phase,routeIndex:courierNetworkState\.routeIndex,elapsed:courierNetworkState\.elapsed,acceptedToday:courierNetworkState\.acceptedToday,completedTotal:courierNetworkState\.completedTotal/);
 assert.match(source,/const savedExpress=data\.cityExpress\|\|\{\}/);
 assert.match(source,/courierNetworkState\.phase=savedExpress\.phase==='enroute'/);
 assert.match(source,/courierNetworkMarker\.group\.visible=courierNetworkState\.phase==='enroute'/);
 assert.match(source,/renderCourierNetworkHud\(true\);\s*closePanels\(\)/);
 assert.match(source,/version: 18/);
});
check('Diagnostics expose active route, destination, timing, history and vehicle position',()=>{
 assert.match(source,/cityExpress: \{day:courierNetworkState\.day,phase:courierNetworkState\.phase,routeIndex:courierNetworkState\.routeIndex,route:currentCourierNetworkRoute\(\)/);
 assert.match(source,/markerVisible:courierNetworkMarker\.group\.visible/);
});
check('Release metadata and aggregate test runner are synchronized at Prototype 40.5',()=>{
 assert.equal(pkg.version,'0.40.16');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(html.includes('BUILD 0.40.16'));
 assert.match(readme,/Prototype 40\.5 — City Express Delivery Network/);
 assert.match(pkg.scripts['test:game'],/test:express/);
});
console.log('\n'+passed+' City Express Delivery Network checks passed.');

import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const physics=fs.readFileSync(new URL('../src/driving-physics.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log('✓ '+name)}
check('Two new paved side streets connect the existing North Shore and Harborfront cross streets into a closed loop',()=>{
 assert.match(source,/for \(const x of \[-43,43\]\) \{\s*box\(scene,x,-0\.025,151\.5,8\.4,0\.12,49,districtRoadMat\)/);
 assert.match(source,/districtMarkingMat/);assert.match(source,/districtSidewalkMat/);
 assert.match(physics,/rallySideRoads = \(inRange\(x,-47\.5,-38\.5\) \|\| inRange\(x,38\.5,47\.5\)\) && inRange\(z,127,176\)/);
 assert.match(physics,/harborCrossStreet \|\| rallySideRoads/);
});
check('A five-gate Motor District Rally course follows the new roads and existing intersections',()=>{
 assert.match(source,/const roadRallyCourse=\{\s*start:\{x:0,z:127\.0,yaw:Math\.PI\/2\}/);
 assert.match(source,/\{x:-43,z:127\.0,label:'WESTERN TURN'/);
 assert.match(source,/\{x:-43,z:176\.0,label:'NORTH-WEST BEND'/);
 assert.match(source,/\{x:43,z:176\.0,label:'EASTERN STRAIGHT'/);
 assert.match(source,/\{x:43,z:127\.0,label:'SOUTH-EAST TURN'/);
 assert.match(source,/function buildRoadRallyGate\(/);
 assert.match(source,/roadRallyCourse\.checkpoints\.forEach\(/);
});
check('The rally is vehicle-only and can be started from the line using R or the contextual touch button',()=>{
 assert.match(source,/function startRoadRally\(\)/);
 assert.match(source,/if\(!inVehicle\).*MASUK KE SUV \/ MOTORCYCLE/);
 assert.match(source,/if \(e\.code === 'KeyR' && !e\.repeat && inVehicle && isAtRoadRallyStart\(\)\)/);
 assert.match(source,/roadRallyStartButton\?\.addEventListener\('pointerdown'/);
 assert.ok(html.includes('id="road-rally-start-btn"'));
 assert.ok(html.includes('<kbd>R</kbd> Start rally'));
});
check('The rally HUD shows the lap timer, current stage, next checkpoint, progress and medal result',()=>{
 for(const id of ['road-rally-hud','road-rally-stage','road-rally-time','road-rally-next','road-rally-progress-fill','road-rally-result']) assert.ok(html.includes('id="'+id+'"'));
 assert.match(source,/function renderRoadRallyHud\(\)/);
 assert.ok(source.includes('setWidthIfChanged(roadRallyProgressFill,'));
 assert.match(css,/\.road-rally-hud/);
});
check('All four checkpoints must be passed in sequence before the start/finish line completes the lap',()=>{
 assert.match(source,/const next=roadRallyCourse\.checkpoints\[roadRallyState\.checkpoint\]/);
 assert.match(source,/roadRallyState\.checkpoint\+\+/);
 assert.match(source,/else if\(Math\.hypot\(vehicle\.position\.x-roadRallyCourse\.start\.x/);
 assert.match(source,/Math\.abs\(vehicleSpeed\)>1\.2/);
});
check('Medal tiers calculate distinct cash payouts and only award once per in-game day',()=>{
 assert.match(source,/roadRallyState\.lastTime<=26\?'GOLD':roadRallyState\.lastTime<=35\?'SILVER':roadRallyState\.lastTime<=48\?'BRONZE':'FINISH'/);
 assert.match(source,/tier==='GOLD'\?210:tier==='SILVER'\?155:tier==='BRONZE'\?105:65/);
 assert.match(source,/roadRallyState\.rewardDay!==gameDay/);
 assert.match(source,/recordTransaction\(`Motor District Rally · \$\{tier\}`/);
});
check('Best time, completed laps, last tier and reward cooldown persist while interrupted runs reset safely',()=>{
 assert.match(source,/roadRally: \{bestTime:roadRallyState\.bestTime,rewardDay:roadRallyState\.rewardDay,completed:roadRallyState\.completed,lastTier:roadRallyState\.lastTier\}/);
 assert.match(source,/const savedRoadRally=data\.roadRally\|\|\{\}/);
 assert.match(source,/roadRallyState\.phase='idle';roadRallyState\.elapsed=0;roadRallyState\.checkpoint=0/);
});
check('The race pauses while a menu is open, aborts cleanly when leaving the vehicle and updates during gameplay',()=>{
 assert.match(source,/if\(!isStarted\|\|isUiOpen\(\)\)return/);
 assert.match(source,/ROAD RALLY DIBATALKAN · KAMU KELUAR DARI KENDARAAN/);
 assert.match(source,/updateRoadRally\(dt\)/);
});
check('Runtime diagnostics expose race progress, times, course geometry and paved-loop status',()=>{
 assert.match(source,/roadRally: \{phase:roadRallyState\.phase,elapsed:roadRallyState\.elapsed,checkpoint:roadRallyState\.checkpoint/);
 assert.match(source,/pavedLoop:roadRallyCourse\.checkpoints\.every/);
});
check('Version 0.40.14, release notes, package lock and aggregate tests are synchronized',()=>{
 assert.equal(pkg.version,'0.40.14');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(html.includes('BUILD 0.40.14'));
 assert.match(readme,/Prototype 40\.6 — Motor District Road Rally/);
 assert.match(pkg.scripts['test:game'],/test:rally/);
});
console.log('\n'+passed+' Motor District Road Rally checks passed.');

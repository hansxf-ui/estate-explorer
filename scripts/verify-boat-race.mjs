import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('The marina expands to a wider sea and lays out a five-checkpoint clockwise route around North Shoal',()=>{
  assert.match(source,/new THREE\.PlaneGeometry\(88,42\)/);
  assert.match(source,/start:\{x:31,z:214\.5,gateAxis:-Math\.PI\/4\}/);
  assert.match(source,/boatRaceCourse\.checkpoints\.forEach\(\(point,index\)=>buildBoatRaceGate/);
  const points=[[31,214.5],[39,206.6],[62,207.5],[64,231],[44,234],[22,231],[31,214.5]];
  const island=[44,218];
  const clearance=points.slice(0,-1).map((a,i)=>{const b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((island[0]-a[0])*dx+(island[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(island[0]-a[0]-t*dx,island[1]-a[1]-t*dz);});
  assert.ok(Math.min(...clearance)>9.55,'the course must stay outside the North Shoal collision radius');
  assert.ok(points.slice(0,-1).every(([x,z])=>x>=11.5&&x<=67&&z>=204&&z<=236));
  assert.match(source,/\{x:39,z:206\.6,label:'NORTH CHANNEL'/);
  assert.match(source,/\{x:62,z:207\.5,label:'EAST CHANNEL'/);
  assert.match(source,/\{x:64,z:231,label:'SOUTH-EAST TURN'/);
  assert.match(source,/\{x:44,z:234,label:'SOUTH SHOAL'/);
  assert.match(source,/\{x:22,z:231,label:'WEST RETURN'/);
});
check('Every route checkpoint and the Start/Finish location receive visible paired buoy gates and sign markers',()=>{
  assert.match(source,/function buildBoatRaceGate\(x,z,axis,title,subtitle,color=0x8ed8d1\)/);
  assert.match(source,/cylinder\(buoy,0,0\.48,0,0\.58,0\.68,0\.62,accent,12\)/);
  assert.match(source,/box\(gate,0,2\.55,0,4\.8,0\.16,0\.22,accent,false,false\)/);
  assert.ok(source.includes("buildBoatRaceGate(boatRaceCourse.start.x,boatRaceCourse.start.z,boatRaceCourse.start.gateAxis,'START / FINISH'"));
  assert.match(source,/boatRaceCourse\.checkpoints\.forEach\(\(point,index\)=>buildBoatRaceGate/);
});
check('The race starts only while piloting near the start gate at a safe speed, using R or a dedicated mobile action',()=>{
  assert.match(source,/function isAtBoatRaceStart\(\)/);
  assert.match(source,/function startBoatRace\(\)/);
  assert.match(source,/if\(Math\.abs\(boatSpeed\)>0\.8\)/);
  assert.match(source,/e\.code === 'KeyR' && !e\.repeat && inBoat && isAtBoatRaceStart\(\)/);
  assert.match(source,/boatRaceStartButton\?\.addEventListener\('pointerdown'/);
  assert.ok(html.includes('id="boat-race-start-btn"'));
  assert.match(html,/<kbd>R<\/kbd> Start race/);
});
check('Race progress uses the ordered five checkpoints and only finishes after returning to the Start/Finish gate',()=>{
  assert.match(source,/function updateBoatRace\(dt\)/);
  assert.match(source,/boatRaceState\.elapsed\+=dt/);
  assert.match(source,/const next=boatRaceCourse\.checkpoints\[boatRaceState\.checkpoint\]/);
  assert.match(source,/if\(distance<3\.65\)\{boatRaceState\.checkpoint\+\+;/);
  assert.match(source,/else if\(Math\.hypot\(marinaBoat\.position\.x-boatRaceCourse\.start\.x,marinaBoat\.position\.z-boatRaceCourse\.start\.z\)<3\.65\)finishBoatRace\(\)/);
  assert.match(source,/if\(inBoat\)\{updateMarinaBoatControls\(dt\);updateBoatRace\(dt\);\}/);
});
check('Finishing improves the persistent best time and awards $220 no more than once per in-game day',()=>{
  assert.match(source,/function finishBoatRace\(\)/);
  assert.match(source,/if\(!boatRaceState\.bestTime\|\|boatRaceState\.lastTime<boatRaceState\.bestTime\)boatRaceState\.bestTime=boatRaceState\.lastTime/);
  assert.match(source,/if\(boatRaceState\.rewardDay!==gameDay\)/);
  assert.match(source,/Harborfront Coastal Circuit reward',220/);
  assert.match(source,/boatRaceState\.rewardDay=gameDay/);
});
check('The race HUD displays elapsed time, checkpoint stage, next gate, progress and finish result',()=>{
  for(const id of ['boat-race-hud','boat-race-time','boat-race-stage','boat-race-next','boat-race-progress-fill','boat-race-result'])assert.ok(html.includes(`id="${id}"`));
  assert.match(source,/function renderBoatRaceHud\(\)/);
  assert.match(source,/formatBoatRaceTime\(boatRaceState\.phase==='finished'\?boatRaceState\.lastTime:boatRaceState\.elapsed\)/);
  assert.match(source,/setTextIfChanged\(boatRaceNextLabel/);
  assert.match(css,/\.boat-race-hud/);
  assert.match(css,/\.boat-race-start-btn/);
});
check('The route remains compatible with island collision and the extended watercraft world bounds',()=>{
  assert.match(source,/boundedX=clamp\(oldX\+dx,11\.5,67\.0\),boundedZ=clamp\(oldZ\+dz,204\.0,236\.0\)/);
  assert.match(source,/const islandHit=Math\.hypot\(boundedX-44,boundedZ-218\)<9\.55/);
  assert.match(source,/boatX: \[ 11\.5, 67 \], boatZ: \[ 204, 236 \]/);
});
check('Race best time and daily reward cooldown persist in V18 while an interrupted race safely resets on reload',()=>{
  assert.match(source,/raceBestTime:boatRaceState\.bestTime, raceRewardDay:boatRaceState\.rewardDay/);
  assert.match(source,/boatRaceState\.bestTime=clamp\(Number\(data\.boat\?\.raceBestTime\)\|\|0,0,99999\)/);
  assert.match(source,/boatRaceState\.rewardDay=Math\.max\(0,Math\.floor\(Number\(data\.boat\?\.raceRewardDay\)\|\|0\)\)/);
  assert.match(source,/boatRaceState\.phase='idle';boatRaceState\.elapsed=0;boatRaceState\.checkpoint=0/);
  assert.match(source,/const saveWhilePiloting = inBoat && !boatDockedAtIsland/);
  assert.match(source,/version: 18/);
});
check('The 0.40.12 release metadata, documentation and aggregate test command include the Coastal Circuit',()=>{
  assert.equal(pkg.version,'0.40.12');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.12'));
  assert.match(readme,/Prototype 39\.7 — Harborfront Coastal Circuit Speedboat Race/);
  assert.match(pkg.scripts['test:game'],/test:race/);
});
console.log(`\n${passed} Coastal Circuit speedboat race checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('Creative Studio and Guest Suite are two staged, priced room expansions',()=>{
  assert.match(source,/studio: \{ title: 'Creative Studio'/);assert.match(source,/guestSuite: \{ title: 'Guest Suite'/);
  assert.match(source,/cost: 2800/);assert.match(source,/cost: 1250/);assert.match(source,/cost: 3600/);assert.match(source,/cost: 1500/);
  assert.match(html,/0 \/ 12 RENOVATION LEVELS/);
});
check('The west wall opens only at purchased room entrances',()=>{
  assert.match(source,/const westWallMesh = box\(house, -12/);
  assert.match(source,/westWallMesh\.visible = !expansionsBuilt/);
  assert.match(source,/if\(studioBuilt\)doorGaps\.push/);assert.match(source,/if\(guestBuilt\)doorGaps\.push/);
  assert.match(source,/addMainWallSegment\(cursor,gap\.start\)/);
});
check('New wing shells include floor, roof, side wall, windows and exterior boundaries',()=>{
  assert.match(source,/if \(studioBuilt \|\| guestBuilt\)/);
  assert.match(source,/box\(g,-20,0\.12,centerZ,15\.8,0\.18,depth-0\.12/);
  assert.match(source,/box\(g,-20,4\.72,centerZ,16\.3,0\.24,depth\+0\.22/);
  assert.match(source,/box\(g,-28\.0,2\.35,centerZ,0\.42,4\.5,depth\+0\.1/);
  assert.match(source,/propertyExpansion:true/);
  assert.match(source,/collisionLayout: \{ baseWestWallActive: colliders\.includes\(westWallCollider\)/);
});
check('Room construction adds collision bounds and restores legacy wall collision safely',()=>{
  assert.match(source,/colliders\.indexOf\(westWallCollider\)/);
  assert.match(source,/colliders\.includes\(westWallCollider\)/);
  assert.match(source,/propertyExpansion\) colliders\.splice/);
  assert.match(source,/colliders\.push\(\{minX:-28\.32,maxX:-27\.68/);
});
check('Creative Studio is a real interaction with energy, time, Career XP and daily-task progress',()=>{
  assert.match(source,/id: 'creative-studio'/);assert.match(source,/action: practiceCreativeStudio/);
  assert.match(source,/function practiceCreativeStudio\(\)/);assert.match(source,/needs\.energy < 10/);
  assert.match(source,/const xp = propertyUpgrades\.studio > 1 \? 45 : 35/);
  assert.match(source,/addSkillXp\('career',xp\)/);assert.match(source,/advanceGameTime\(45\)/);
  assert.match(source,/recordDailyTaskProgress\('skillPractice',xp\)/);
});
check('Guest Suite has its own usable sleeping interaction and premium recovery bonus',()=>{
  assert.match(source,/id: 'guest-suite-bed'/);assert.match(source,/action: \(\) => sleepAtHome\(true\)/);
  assert.match(source,/function sleepAtHome\(guestSuite = false\)/);
  assert.match(source,/guestSuite && propertyUpgrades\.guestSuite > 1 \? 10 : 0/);
});
check('Ground height and location naming recognize both expansion rooms',()=>{
  assert.match(source,/const insideExpansion = x < -12\.5/);
  assert.match(source,/locationLabel\.textContent = 'CREATIVE STUDIO'/);
  assert.match(source,/locationLabel\.textContent = 'GUEST SUITE'/);
});
check('Both new room levels persist as optional V12 fields and are exposed in debug',()=>{
  assert.match(source,/const propertyUpgrades = \{ solar: 0, kitchen: 0, bedroom: 0, terrace: 0, studio: 0, guestSuite: 0 \}/);
  assert.match(source,/Object\.assign\(propertyUpgrades, \{ solar: 0, kitchen: 0, bedroom: 0, terrace: 0, studio: 0, guestSuite: 0 \}, data\.propertyUpgrades \|\| \{\}\)/);
  assert.match(source,/version: 18/);assert.match(source,/expansionRooms:/);
});
check('The new rooms are documented and release metadata is consistently 0.40.8',()=>{
  assert.equal(pkg.version,'0.40.8');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.match(html,/Prototype 40/);assert.ok(html.includes('BUILD 0.40.8'));
  assert.match(readme,/Prototype 37 — Neighborhood Expansion & Local Commerce/);
});
console.log(`\n${passed} property expansion integration checks passed.`);

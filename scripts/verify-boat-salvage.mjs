import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('Three floating cargo pods occupy distinct coastal lanes with three reward and XP tiers',()=>{
  assert.match(source,/const boatSalvagePods = \[/);
  assert.match(source,/x:17\.5,z:221\.5,reward:65,xp:16/);
  assert.match(source,/x:56\.0,z:215\.7,reward:95,xp:22/);
  assert.match(source,/x:57\.5,z:230\.0,reward:140,xp:28/);
  assert.match(source,/new THREE\.TorusGeometry\(1\.62,0\.075,7,28\)/);
  assert.match(source,/pod\.group\.position\.y=0\.045\+Math\.sin/);
});
check('The Sailing skill appears in character progression and remains backward compatible with V18 saves',()=>{
  assert.match(source,/sailing: 0/);
  assert.match(source,/sailing: \{ label: 'Sailing', icon: '⛵'/);
  assert.match(source,/Hadiah coastal salvage meningkat 4% setiap level/);
  assert.match(source,/Object\.assign\(skills, \{ cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 \}, data\.skills \|\| \{\}\)/);
});
check('The player can recover cargo only while piloting, close to a pod, below the speed threshold and outside an active race',()=>{
  assert.match(source,/function nearestBoatSalvage\(maxDistance=6\.4\)/);
  assert.match(source,/function collectNearbyBoatSalvage\(\)/);
  assert.match(source,/if\(boatRaceState\.phase==='running'\)/);
  assert.match(source,/nearestBoatSalvage\(5\.0\)/);
  assert.match(source,/Math\.abs\(boatSpeed\)>2\.5/);
});
check('F and a dedicated mobile SALVAGE button trigger collection without taking the E dock/exit control',()=>{
  assert.match(source,/e\.code === 'KeyF' && !e\.repeat && inBoat/);
  assert.match(source,/boatSalvageButton\?\.addEventListener\('pointerdown'/);
  assert.ok(html.includes('id="boat-salvage-btn"'));
  assert.match(html,/<kbd>F<\/kbd> Salvage/);
  assert.ok(html.includes('id="boat-salvage-prompt"'));
  assert.ok(html.includes('id="boat-salvage-count"'));
});
check('Each recovery records income, awards Sailing XP and advances destination progress; collecting all three grants the daily bonus',()=>{
  assert.match(source,/const sailingLevel=skillProgress\('sailing'\)\.level/);
  assert.match(source,/const payout=Math\.round\(pod\.reward\*\(1\+\(sailingLevel-1\)\*0\.04\)\)/);
  assert.match(source,/recordTransaction\(`Coastal salvage: \$\{pod\.name\}`,payout\)/);
  assert.match(source,/addSkillXp\('sailing',pod\.xp\)/);
  assert.match(source,/recordDailyTaskProgress\('destination'\)/);
  assert.match(source,/recovered===boatSalvagePods\.length&&!boatSalvageState\.bonusClaimed/);
  assert.match(source,/bonus=180/);
});
check('Uncollected pods refresh at the next in-game day and collected pods hide for the rest of that day',()=>{
  assert.match(source,/function resetBoatSalvageForDay\(\)/);
  assert.match(source,/boatSalvageState\.day=gameDay;boatSalvageState\.collected=\[false,false,false\]/);
  assert.match(source,/boatSalvagePods\.forEach\(pod=>\{pod\.group\.visible=true;\}\)/);
  assert.match(source,/gameDay = nextDay; gameMinutes = nextMinute; lastClockMinute = -1;\n  resetBoatSalvageForDay\(\)/);
});
check('Salvage day, three collected flags, completion bonus and lifetime recovery count persist in the existing V18 save',()=>{
  assert.match(source,/salvageDay:boatSalvageState\.day/);
  assert.match(source,/salvageCollected:\[\.\.\.boatSalvageState\.collected\]/);
  assert.match(source,/salvageBonusClaimed:boatSalvageState\.bonusClaimed/);
  assert.match(source,/salvageTotal:boatSalvageState\.total/);
  assert.match(source,/boatSalvageState\.collected=Array\.isArray\(data\.boat\?\.salvageCollected\)/);
  assert.match(source,/boatSalvageState\.total=Math\.max\(0,Math\.floor\(Number\(data\.boat\?\.salvageTotal\)\|\|0\)\)/);
});
check('The boat HUD surfaces nearby cargo, slow-down guidance and daily recovery progress',()=>{
  assert.match(source,/function updateBoatSalvage\(dt\)/);
  assert.match(source,/SLOW DOWN/);
  assert.match(source,/CARGO NEARBY · F \/ SALVAGE/);
  assert.match(source,/boatSalvageCountLabel\.textContent=`\$\{count\}\/3`/);
  assert.match(css,/\.boat-salvage-prompt/);
  assert.match(css,/\.boat-salvage-btn/);
});
check('The 0.40.9 release metadata and aggregate game test include Coastal Salvage',()=>{
  assert.equal(pkg.version,'0.40.9');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.9'));
  assert.match(readme,/Prototype 39\.8 — Coastal Salvage & Sailing Progression/);
  assert.match(pkg.scripts['test:game'],/test:salvage/);
});
console.log(`\n${passed} Coastal Salvage and Sailing progression checks passed.`);

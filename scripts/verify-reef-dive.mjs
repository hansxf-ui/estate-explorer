import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('The underwater reef is a real 3D environment with seafloor, coral, kelp, animated fish and bubbles',()=>{
  assert.match(source,/const underwaterFloor=new THREE\.Mesh/);
  assert.match(source,/const reefBase=group\(scene,47,-5\.72,228\)/);
  assert.match(source,/const reefFish=\[\]/);
  assert.match(source,/const diveBubbles=Array\.from\(\{length:22\}/);
  assert.match(source,/diveTargets\.forEach\(\(target,index\)=>/);
});
check('North Shoal has a shore dive station gated by mooring the boat and leaving vehicles or seats',()=>{
  assert.match(source,/const diveStation=group\(scene,40\.65,0\.35,222\.2\)/);
  assert.match(source,/id:'north-shoal-dive'/);
  assert.match(source,/enabled:\(\)=>boatDockedAtIsland&&!divingState\.active&&!inBoat&&!inVehicle&&!playerSeated/);
  assert.match(source,/function startDive\(\)/);
  assert.match(source,/needs\.energy<8/);
  assert.match(source,/divingState\.oxygen=divingState\.maxOxygen/);
});
check('The three reef discoveries have different reward and Diving XP tiers',()=>{
  assert.match(source,/id:'sunkenCache',name:'SUNKEN SUPPLY CACHE'.*?reward:85,xp:18/s);
  assert.match(source,/id:'giantClam',name:'GIANT PEARL CLAM'.*?reward:125,xp:26/s);
  assert.match(source,/id:'rareSeahorse',name:'GOLDEN SEAHORSE'.*?reward:180,xp:34/s);
});
check('Underwater movement has bounded horizontal swimming and separate up/down depth controls',()=>{
  assert.match(source,/else if\(divingState\.active\)/);
  assert.match(source,/player\.position\.x=clamp\(player\.position\.x\+velocity\.x\*dt,34\.0,59\.0\)/);
  assert.match(source,/player\.position\.z=clamp\(player\.position\.z\+velocity\.z\*dt,217\.0,236\.0\)/);
  assert.match(source,/verticalInput=\(keys\.has\('Space'\)\?1:0\)-\(\(keys\.has\('ShiftLeft'\)\|\|keys\.has\('ShiftRight'\)\)\?1:0\)/);
  assert.match(source,/function endDive\(emergency=false\)/);
});
check('Oxygen drains in real time, updates the HUD and forces a safe emergency ascent at zero',()=>{
  assert.match(source,/maxOxygen:90/);
  assert.match(source,/divingState\.oxygen=Math\.max\(0,divingState\.oxygen-dt\)/);
  assert.match(source,/if\(divingState\.oxygen<=0\.001\)endDive\(true\)/);
  assert.match(source,/OKSIGEN HABIS/);
  assert.ok(html.includes('id="dive-oxygen"'));
  assert.ok(html.includes('id="dive-oxygen-fill"'));
});
check('E collects a nearby discovery and otherwise surfaces safely; diver gear appears during dives',()=>{
  assert.match(source,/if\(divingState\.active\)\{if\(nearestDiveTarget\(2\.75\)\)collectDiveTarget\(\);else endDive\(false\);return;\}/);
  assert.match(source,/diveGear=group\(avatar\)/);
  assert.match(source,/diveGear\.visible=false/);
  assert.match(source,/diveGear\.visible=true/);
  assert.match(html,/<kbd>E<\/kbd> Collect \/ Surface/);
});
check('Discoveries record income, award Diving and Fishing XP, advance destination tasks and grant a full-clear bonus',()=>{
  assert.match(source,/function collectDiveTarget\(\)/);
  assert.match(source,/const level=skillProgress\('diving'\)\.level,payout=Math\.round\(target\.reward\*\(1\+\(level-1\)\*0\.03\)\)/);
  assert.match(source,/addSkillXp\('diving',target\.xp\);addSkillXp\('fishing',8\)/);
  assert.match(source,/recordDailyTaskProgress\('destination'\)/);
  assert.match(source,/count===diveTargets\.length&&!divingState\.bonusClaimed/);
  assert.match(source,/bonus=220/);
});
check('Diving is a new character skill with a 3% exploration reward bonus per level and legacy-save defaults',()=>{
  assert.match(source,/diving: 0/);
  assert.match(source,/diving: \{ label: 'Diving', icon: '🤿'/);
  assert.match(source,/Hadiah penemuan bawah laut meningkat 3% setiap level/);
  assert.match(source,/Object\.assign\(skills, \{ cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 \}, data\.skills \|\| \{\}\)/);
});
check('Daily discoveries refresh at the next in-game day and persist in the V18 save payload',()=>{
  assert.match(source,/function resetDiveSiteForDay\(\)/);
  assert.match(source,/divingState\.day=gameDay;divingState\.collected=\[false,false,false\]/);
  assert.match(source,/dive: \{ day:divingState\.day, collected:\[\.\.\.divingState\.collected\], bonusClaimed:divingState\.bonusClaimed, total:divingState\.total \}/);
  assert.match(source,/divingState\.collected=Array\.isArray\(data\.dive\?\.collected\)/);
  assert.match(source,/resetDiveSiteForDay\(\);diveTargets\.forEach\(\(target,index\)=>\{target\.group\.visible=!divingState\.collected\[index\];\}\)/);
});
check('Saving during a dive returns the next session to the island shore without losing the discovery progress',()=>{
  assert.match(source,/const saveWhileDiving = divingState\.active/);
  assert.match(source,/savePlayerX = saveWhilePiloting \? 23\.0 : saveWhileDiving \? 40\.0/);
  assert.match(source,/savePlayerZ = saveWhilePiloting \? 204\.9 : saveWhileDiving \? 218\.0/);
  assert.match(source,/savePlayerY = saveWhilePiloting \? 0 : saveWhileDiving \|\| playerSeated && activeSeat \? getGroundHeight\(savePlayerX, savePlayerZ\)/);
  assert.match(source,/divingState\.active=false;divingState\.oxygen=divingState\.maxOxygen/);
});
check('The underwater view, HUD, keyboard/touch hints, diagnostics, docs and 0.40.15 test command are included',()=>{
  assert.match(source,/scene\.background\.setHex\(0x082e3e\)/);
  assert.match(source,/scene\.fog\.near=4;scene\.fog\.far=37/);
  assert.ok(html.includes('id="underwater-overlay"'));
  assert.ok(html.includes('id="dive-hud"'));
  assert.ok(html.includes('id="dive-desktop-hint"'));
  assert.match(css,/\.dive-hud/);assert.match(css,/\.underwater-overlay\.active/);
  assert.match(source,/diving: \{ active:divingState\.active, oxygen:divingState\.oxygen/);
  assert.match(readme,/Prototype 39\.9 — North Shoal Reef Diving & Marine Discoveries/);
  assert.equal(pkg.version,'0.40.15');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.15'));assert.match(pkg.scripts['test:game'],/test:dive/);
});
console.log(`\n${passed} Reef Diving and Marine Discovery checks passed.`);

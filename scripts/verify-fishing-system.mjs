import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}
check('The pier registers a dedicated contextual fishing interaction rather than relying on a menu shortcut',()=>{
  assert.match(source,/id:'marina-fishing',[^\n]*action:openFishingPanel/);
  assert.match(source,/x:25, y:0\.2, z:207\.2, radius:3\.2/);
  assert.ok(html.includes('id="fishing-panel"'));
});
check('A temporary character-held fishing rod and animated water bobber are created as scene props',()=>{
  assert.match(source,/const heldFishingRod = group\(wristR/);
  assert.match(source,/heldFishingRod\.visible = false/);
  assert.match(source,/const marinaFishingFloat = group\(scene/);
  assert.match(source,/const marinaFishingRipple = new THREE\.Mesh\(new THREE\.TorusGeometry/);
  assert.match(source,/fishingState\.phase==='bite'\?0\.11:0\.035/);
});
check('The fishing panel exposes a live timing meter, status, cast action and sell action',()=>{
  for(const id of ['fishing-status','fishing-meter-fill','fishing-action-btn','fishing-sell-btn','fishing-catch-summary'])assert.ok(html.includes(`id="${id}"`));
  assert.match(source,/function renderFishingPanel\(\)/);
  assert.match(source,/action\.disabled=fishingState\.phase==='waiting'\|\|fishingState\.phase==='bite'/);
  assert.match(css,/\.fishing-meter i\.bite/);
  assert.match(css,/@media\(max-width:700px\)\{\.fishing-panel/);
});
check('Casting requires energy and cash, charges $8 plus 2 Energy and advances five game minutes',()=>{
  assert.match(source,/function startFishingCast\(\)/);
  assert.match(source,/if\(needs\.energy<4\)/);
  assert.match(source,/if\(wallet<8\)/);
  assert.match(source,/recordTransaction\('Harborfront fishing bait',-8\)/);
  assert.match(source,/needs\.energy=clamp\(needs\.energy-2,0,100\);advanceGameTime\(5\)/);
});
check('The bobber creates a bite window and a missed bite resets the session without granting a fish',()=>{
  assert.match(source,/fishingState\.totalWait=2\.3\+Math\.random\(\)\*3\.1/);
  assert.match(source,/biteDuration: 1\.12/);
  assert.match(source,/fishingState\.phase='bite';fishingState\.timer=fishingState\.biteDuration/);
  assert.match(source,/function missFishingCatch\(\)/);
  assert.match(source,/fishingState\.phase='missed'/);
});
check('Successful reels choose among three catch tiers with rarity improved by Fishing skill',()=>{
  assert.match(source,/fishSardine: \{ name: 'Silver Sardine'.*price: 28/);
  assert.match(source,/fishBass: \{ name: 'Harbor Bass'.*price: 62/);
  assert.match(source,/fishGolden: \{ name: 'Golden Tuna'.*price: 150/);
  assert.match(source,/const treasureChance=Math\.min\(0\.12,0\.035\+\(level-1\)\*0\.008\)/);
  assert.match(source,/,rareChance=Math\.min\(0\.38,0\.16\+\(level-1\)\*0\.03\)/);
  assert.match(source,/function reelFishingLine\(\)/);
  assert.match(source,/addSkillXp\('fishing',18\+level\*2\)/);
});
check('Fishing is a persistent character skill and contributes XP to the daily skill-practice task',()=>{
  assert.match(source,/fishing: \{ label: 'Fishing', icon: '🎣', perk: 'Peluang mendapatkan ikan langka meningkat setiap level\.' \}/);
  assert.match(source,/const skills = \{ cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 \}/);
  assert.match(source,/Object\.assign\(skills, \{ cooking: 0, gardening: 0, social: 0, delivery: 0, career: 0, fishing: 0, sailing: 0, diving: 0 \}, data\.skills \|\| \{\}\)/);
  assert.match(source,/recordDailyTaskProgress\('skillPractice', amount\)/);
});
check('Caught fish appear in BAG and remain compatible with the current V18 save structure',()=>{
  for(const id of ['fishSardine','fishBass','fishGolden'])assert.ok(source.includes(id));
  assert.match(source,/\.\.\.Object\.entries\(fishCatalog\)\.map\(\(\[key,fish\]\)=>\[key,fish\.name,fish\.description\]\)/);
  assert.match(source,/inventory, decorPlaced, decorPositions/);
  assert.match(source,/version: 18/);
  assert.match(source,/Object\.assign\(inventory, \{[\s\S]*?fishSardine: 0, fishBass: 0, fishGolden: 0/);
});
check('The fish market sells the full stored catch, records income in the ledger and clears fish stock',()=>{
  assert.match(source,/function fishStockValue\(\)/);
  assert.match(source,/function sellFishingCatch\(\)/);
  assert.match(source,/recordTransaction\('Harborfront fish market sale',total\)/);
  assert.match(source,/for\(const id of Object\.keys\(fishCatalog\)\)inventory\[id\]=0/);
});
check('Fishing closes cleanly from the panel or global UI close and stops the rod/bobber state',()=>{
  assert.match(source,/function cancelFishingSession\(\)/);
  assert.match(source,/heldFishingRod\.visible=false;marinaFishingFloat\.visible=false/);
  assert.match(source,/if\(button\.dataset\.close==='fishing-panel'\)cancelFishingSession\(\)/);
  assert.match(source,/if \(fishingPanel && !fishingPanel\.classList\.contains\('hidden'\)\) cancelFishingSession\(\)/);
});
check('Fishing timer updates on the main frame loop and runtime debug exposes fishing progression',()=>{
  assert.match(source,/function updateFishing\(dt\)/);
  assert.match(source,/function update\(dt\) \{[\s\S]*?environmentSimulationAccumulator >= 1 \/ 15[\s\S]*?updateFishing\(dt\);/);
  assert.match(source,/fishing: \{ phase: fishingState\.phase, catches: fishingState\.catches, lastCatch: fishingState\.lastCatch, storedFish: fishStockValue\(\) \}/);
});
check('The release metadata and notes identify the 0.40.15 fishing milestone',()=>{
  assert.equal(pkg.version,'0.40.15');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.15'));assert.match(readme,/Prototype 39\.4 — Harborfront Fishing & Fish Market/);
  assert.match(pkg.scripts['test:game'],/test:fishing/);
});
console.log(`\n${passed} Harborfront fishing and fish market checks passed.`);

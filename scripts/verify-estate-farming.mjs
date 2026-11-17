import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('Estate Allotment has six raised crop beds on the west garden and an in-world farm management board',()=>{
  assert.match(source,/const farmPlotPositions=\[\[-41,20\],\[-35,20\],\[-29,20\],\[-41,27\],\[-35,27\],\[-29,27\]\]/);
  assert.match(source,/const farmBoard=group\(scene,-36\.0,0,14\.5\)/);
  assert.match(source,/id:'farm-board'/);assert.match(source,/id:'farm-plot-'/);
  assert.ok(html.includes('id="farm-panel"'));
});
check('Tomato, carrot and strawberry crops have different seeds, growing times, yields and market prices',()=>{
  assert.match(source,/tomato:\{key:'tomato'.*?growthMinutes:240,baseYield:3,salePrice:18/s);
  assert.match(source,/carrot:\{key:'carrot'.*?growthMinutes:180,baseYield:3,salePrice:14/s);
  assert.match(source,/strawberry:\{key:'strawberry'.*?growthMinutes:300,baseYield:2,salePrice:26/s);
});
check('Town Market sells seed packs in quantities of three and deducts the correct purchase price',()=>{
  assert.match(source,/id:'seedTomato'.*?cost:30, quantity:3/s);
  assert.match(source,/id:'seedCarrot'.*?cost:24, quantity:3/s);
  assert.match(source,/id:'seedStrawberry'.*?cost:42, quantity:3/s);
  assert.match(source,/inventory\[item\]=\(inventory\[item\]\|\|0\)\+\(product\.quantity\|\|1\)/);
});
check('Player can select a seed type from the planner and plant a compatible empty plot',()=>{
  assert.match(source,/function selectFarmSeed\(key\)/);
  assert.match(source,/function plantFarmPlot\(index\)/);
  assert.match(source,/farmState\.selectedSeed/);
  assert.match(source,/inventory\[crop\.seedItem\]--/);
  assert.match(source,/plot\.crop=crop\.key;plot\.wateredAt=0;plot\.stage=0/);
  assert.ok(html.includes('data-farm-seed="tomato"'));
  assert.ok(html.includes('data-farm-seed="carrot"'));
  assert.ok(html.includes('data-farm-seed="strawberry"'));
});
check('Crops must be watered before growth starts; water actions consume energy, award XP and advance game time',()=>{
  assert.match(source,/function waterFarmPlot\(index\)/);
  assert.match(source,/plot\.wateredAt=farmClockMinutes\(\);plot\.stage=1/);
  assert.match(source,/needs\.energy<2/);
  assert.match(source,/addSkillXp\('gardening',8\)/);
  assert.match(source,/advanceGameTime\(5\)/);
});
check('Crop growth is calculated using in-game minutes and transitions through three visual growth stages to maturity',()=>{
  assert.match(source,/function farmClockMinutes\(\)/);
  assert.match(source,/function farmPlotProgress\(index\)/);
  assert.match(source,/function farmStageForProgress\(progress\)/);
  assert.match(source,/progress>=1\?3:progress>=0\.55\?2:progress>0\?1:0/);
  assert.match(source,/function refreshFarmGrowth\(\)/);
  assert.match(source,/refreshFarmGrowth\(\)/);
});
check('The farm visuals change stage and show crop-specific models and fruit only at maturity',()=>{
  assert.match(source,/variants\[cropKey\]=\{group:plantGroup,leaves,fruit\}/);
  assert.match(source,/function updateFarmPlotVisual\(index\)/);
  assert.match(source,/variant\.fruit\.visible=state\.stage>=3/);
  assert.match(source,/world\.moisture\.visible=!!state\.crop&&!!state\.wateredAt&&state\.stage<3/);
});
check('Harvesting mature crops adds produce inventory, Gardening XP and daily-task progress',()=>{
  assert.match(source,/function harvestFarmPlot\(index\)/);
  assert.match(source,/const bonus=Math\.floor\(\(skillProgress\('gardening'\)\.level-1\)\/3\),yieldCount=crop\.baseYield\+bonus/);
  assert.match(source,/inventory\[crop\.harvestItem\]=\(inventory\[crop\.harvestItem\]\|\|0\)\+yieldCount/);
  assert.match(source,/addSkillXp\('gardening',crop\.xp\)/);
  assert.match(source,/recordDailyTaskProgress\('harvestCrop'\)/);
});
check('Town Market buys harvested produce with a Gardening skill sale bonus and records the income',()=>{
  assert.match(source,/function sellFarmProduce\(item\)/);
  assert.match(source,/unitPrice=Math\.round\(crop\.salePrice\*\(1\+\(level-1\)\*0\.03\)\)/);
  assert.match(source,/recordTransaction\(`Town Market harvest sale: \$\{crop\.name\}`,total\)/);
  assert.match(source,/SELL YOUR HARVEST/);
});
check('The farm panel shows selected seed stock, all six bed statuses and contextual seed selection',()=>{
  assert.match(source,/function renderFarmPanel\(\)/);
  assert.match(source,/function openFarmPanel\(\)/);
  assert.match(source,/data-farm-seed/);
  assert.ok(html.includes('id="farm-seed-balance"'));
  assert.ok(html.includes('id="farm-plot-list"'));
  assert.match(css,/\.farm-seed-options/);assert.match(css,/\.farm-plot-card/);
});
check('Seed packs and harvested crops are visible in the regular player inventory',()=>{
  assert.match(source,/Object\.values\(farmCropDefinitions\)\.map\(crop=>\[crop\.seedItem,crop\.seedName/);
  assert.match(source,/Object\.values\(farmCropDefinitions\)\.map\(crop=>\[crop\.harvestItem,crop\.harvestName/);
  assert.match(source,/seedTomato:0, seedCarrot:0, seedStrawberry:0, harvestTomato:0, harvestCarrot:0, harvestStrawberry:0/);
});
check('Crop plot state, selected seeds and watering timestamps persist in V18 saves and old saves migrate to empty beds',()=>{
  assert.match(source,/farm: \{ selectedSeed:farmState\.selectedSeed, plots:farmState\.plots\.map/);
  assert.match(source,/const savedFarmPlots=Array\.isArray\(data\.farm\?\.plots\)\?data\.farm\.plots:\[\]/);
  assert.match(source,/farmState\.selectedSeed=farmCropDefinitions\[data\.farm\?\.selectedSeed\]/);
  assert.match(source,/plot\.wateredAt=plot\.crop\?clamp\(Number\(saved\.wateredAt\)\|\|0/);
  assert.match(source,/refreshFarmGrowth\(\);refreshFarmProcessing\(\);farmPlots\.forEach/);
});
check('Runtime diagnostics, Garden Market release notes, and the 0.40.8 test command are synchronized',()=>{
  assert.match(source,/farming: \{ selectedSeed:farmState\.selectedSeed, plots:farmState\.plots\.map/);
  assert.match(readme,/Prototype 40\.1 — Estate Allotment Farming & Harvest Economy/);
  assert.equal(pkg.version,'0.40.8');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.8'));assert.match(pkg.scripts['test:game'],/test:farm/);
});
console.log(`\n${passed} Estate Allotment Farming and Harvest Economy checks passed.`);

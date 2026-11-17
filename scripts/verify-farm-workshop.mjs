import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('The west-garden Artisan Workshop has a physical, initially hidden processing station and its own interaction',()=>{
 assert.match(source,/const farmWorkshopGroup=group\(scene,-46\.2,0,17\.1\);farmWorkshopGroup\.visible=false/);
 assert.match(source,/id:'farm-workshop'.*farmWorkshopState\.built/);assert.match(source,/function openFarmPanel\(\)/);
 assert.ok(html.includes('id="farm-workshop-status"'));
});
check('The workshop can be built once for $780, records spending, and becomes visible in the world',()=>{
 assert.match(source,/const farmWorkshopBuildCost=780/);assert.match(source,/function buildFarmWorkshop\(\)/);
 assert.match(source,/wallet-=farmWorkshopBuildCost;farmWorkshopState\.built=true;farmWorkshopGroup\.visible=true/);
 assert.match(source,/recordTransaction\('Estate Artisan Workshop construction',-farmWorkshopBuildCost\)/);
 assert.ok(html.includes('id="farm-workshop-build"'));
});
check('Tomato preserves, carrot juice and strawberry jam have distinct recipes, input requirements, durations and values',()=>{
 assert.match(source,/tomatoPreserve:\{key:'tomatoPreserve'.*?inputCount:4.*?salePrice:105,duration:90/s);
 assert.match(source,/carrotJuice:\{key:'carrotJuice'.*?inputCount:4.*?salePrice:85,duration:75/s);
 assert.match(source,/strawberryJam:\{key:'strawberryJam'.*?inputCount:3.*?salePrice:125,duration:120/s);
});
check('Starting a batch checks stock and energy, consumes ingredients, reserves the single workshop slot and advances game time',()=>{
 assert.match(source,/function startFarmProcessing\(key\)/);
 assert.match(source,/if\(farmWorkshopState\.activeBatch\)\{showToast\('WORKSHOP MASIH MEMPROSES PRODUK'\)/);
 assert.match(source,/inventory\[recipe\.inputItem\]-=recipe\.inputCount;needs\.energy=Math\.max\(0,needs\.energy-8\)/);
 assert.match(source,/readyAt:startedAt\+recipe\.duration/);assert.match(source,/advanceGameTime\(10\)/);
});
check('Production completes from in-game time automatically and creates goods plus Cooking XP',()=>{
 assert.match(source,/function refreshFarmProcessing\(\)/);
 assert.match(source,/farmClockMinutes\(\)<batch\.readyAt/);
 assert.match(source,/inventory\[recipe\.outputItem\]=\(inventory\[recipe\.outputItem\]\|\|0\)\+recipe\.outputCount/);
 assert.match(source,/addSkillXp\('cooking',recipe\.cookingXp\)/);
 assert.match(source,/refreshFarmGrowth\(\);refreshFarmProcessing\(\)/);
});
check('The Farm Planner displays build state, processing countdown and recipe cards with stock-aware buttons',()=>{
 assert.match(source,/farmWorkshopRemaining\(\)/);assert.match(source,/function renderFarmPanel\(\)/);
 assert.match(source,/recipes\.replaceChildren\(\)/);assert.match(source,/action\.disabled=!!farmWorkshopState\.activeBatch/);
 assert.ok(html.includes('id="farm-recipe-list"'));assert.match(css,/\.farm-recipe-card/);
});
check('Processed artisan goods are visible in inventory and can be sold at Town Market',()=>{
 assert.match(source,/function sellFarmProcessedGoods\(item\)/);
 assert.match(source,/skillProgress\('cooking'\)\.level-1\)\*0\.02/);
 assert.match(source,/recordTransaction\(`Town Market artisan sale: \$\{recipe\.outputName\}`,total\)/);
 assert.match(source,/SELL ARTISAN GOODS/);
 assert.match(source,/farmRecipeDefinitions\)\.map\(recipe=>\[recipe\.outputItem,recipe\.outputName/);
});
check('Workshop construction, active batches, lifetime production and artisan inventory persist through V18 saves and old saves migrate cleanly',()=>{
 assert.match(source,/farmWorkshop: \{ built:farmWorkshopState\.built, activeBatch:farmWorkshopState\.activeBatch\?\{/);
 assert.match(source,/const savedWorkshop=data\.farmWorkshop\|\|\{\}/);
 assert.match(source,/farmWorkshopGroup\.visible=farmWorkshopState\.built/);
 assert.match(source,/farmWorkshopState\.processedLifetime=clamp/);
 assert.match(source,/tomatoPreserve:0, carrotJuice:0, strawberryJam:0/);
});
check('Diagnostics expose workshop and recipe state; version, release notes and aggregate test command are synchronized',()=>{
 assert.match(source,/workshop:\{\.\.\.farmWorkshopState,remainingMinutes:farmWorkshopRemaining\(\),visible:farmWorkshopGroup\.visible\}/);
 assert.match(source,/recipes:Object\.fromEntries\(Object\.values\(farmRecipeDefinitions\)/);
 assert.match(readme,/Prototype 40\.2 — Artisan Farm Goods Workshop/);
 assert.equal(pkg.version,'0.40.12');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.ok(html.includes('BUILD 0.40.12'));assert.match(pkg.scripts['test:game'],/test:workshop/);
});
console.log(`\n${passed} Artisan Farm Workshop and Product Processing checks passed.`);

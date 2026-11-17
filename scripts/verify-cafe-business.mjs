import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;
function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}

check('Startup retries WebGL with a low-power no-antialias renderer if the primary context fails',()=>{
  assert.match(source,/let rendererFallbackActive = false/);
  assert.match(source,/new THREE\.WebGLRenderer\(\{ antialias: !isTouchDevice, powerPreference: 'high-performance' \}\)/);
  assert.match(source,/new THREE\.WebGLRenderer\(\{ antialias: false, powerPreference: 'low-power' \}\)/);
  assert.match(source,/rendererFallbackActive = true/);
  assert.match(source,/rendererFallbackActive,/);
});
check('Work & Finance contains a dedicated Corner Cafe business management section',()=>{
  for(const id of ['cafe-business-section','cafe-business-status','cafe-business-copy','cafe-business-stats','cafe-business-license','cafe-business-restock','cafe-business-toggle','cafe-business-upgrades','cafe-local-supply-list','cafe-local-supply-stock'])assert.ok(html.includes(`id="${id}"`));
  assert.match(source,/renderCafeBusinessPanel\(\)/);
  assert.match(source,/renderCafeBusinessPanel\(\);\n  const cap = document\.querySelector\('#work-shift-summary'\)/);
});
check('Espresso and patio upgrades add actual visible 3D equipment and seating inside the cafe',()=>{
  assert.match(source,/const cafeUpgradeVisuals = \{/);
  assert.match(source,/espressoMachine: group\(neighborhoodCafe\.shell/);
  assert.match(source,/patioTables: \[/);
  assert.match(source,/function syncCafeBusinessVisuals\(\)/);
  assert.match(source,/cafeUpgradeVisuals\.espressoMachine\.visible=cafeBusinessState\.espresso>0/);
  assert.match(source,/cafeBusinessState\.patio>index/);
});
check('The cafe storefront sign changes to show player ownership and current open or closed state',()=>{
  assert.match(source,/sprite\.userData\.repaint = \(nextTitle, nextSubtitle/);
  assert.match(source,/function syncCafeBusinessSign\(\)/);
  assert.match(source,/PLAYER OWNED · CLOSED/);
  assert.match(source,/OWNER OPERATED · OPEN/);
});
check('Players can buy the Corner Cafe license once for $3,600 and the purchase enters the finance ledger',()=>{
  assert.match(source,/licenseCost:3600/);
  assert.match(source,/function buyCafeBusiness\(\)/);
  assert.match(source,/wallet-=cafeBusinessConfig\.licenseCost;cafeBusinessState\.owned=true/);
  assert.match(source,/recordTransaction\('Corner Cafe · business license',-cafeBusinessConfig\.licenseCost\)/);
});
check('Wholesale restocking adds 12 servings, costs $180 and cannot exceed 48 servings',()=>{
  assert.match(source,/restockCost:180, restockUnits:12, stockCapacity:48, localStockCapacity:24, dailyStockUse:3/);
  assert.match(source,/function restockCafeBusiness\(\)/);
  assert.match(source,/cafeBusinessState\.stock\+cafeBusinessConfig\.restockUnits>cafeBusinessConfig\.stockCapacity/);
  assert.match(source,/recordTransaction\('Corner Cafe · wholesale supplies ×12',-cafeBusinessConfig\.restockCost\)/);
});
check('The owner dashboard shows lifetime revenue, operating costs, current stock, reputation and customer counts',()=>{
  assert.match(source,/LIFETIME SALES/);
  assert.match(source,/LIFETIME OPERATING COSTS/);
  assert.match(source,/LAST CUSTOMERS/);
  assert.match(source,/LAST OPERATING MARGIN/);
});
check('Opening requires enough stock, closing is immediate, and all actions save',()=>{
  assert.match(source,/function toggleCafeBusiness\(\)/);
  assert.match(source,/const totalStock=cafeBusinessState\.stock\+cafeBusinessState\.localStock/);
  assert.match(source,/if\(cafeBusinessState\.open\)\{cafeBusinessState\.open=false/);
  assert.match(source,/cafeBusinessState\.stock\+cafeBusinessState\.localStock<cafeBusinessConfig\.dailyStockUse/);
  assert.match(source,/OPEN BUSINESS/);
  assert.match(source,/CLOSE BUSINESS/);
});
check('The cafe processes once at the 07:00 daily rollover and guards against duplicate payouts',()=>{
  assert.match(source,/function processCafeBusinessDay\(day\)/);
  assert.match(source,/cafeBusinessState\.lastOperatedDay===day/);
  assert.match(source,/processCafeBusinessDay\(day\)/);
  assert.match(source,/processCafeBusinessDay\(day\) \|\| cafeBusinessChanged/);
});
check('Daily operations consume stock, increase reputation and compute sales from upgrades',()=>{
  assert.match(source,/consumeCafeBusinessStock\(\{wholesaleStock:cafeBusinessState\.stock,localStock:cafeBusinessState\.localStock,dailyStockUse:cafeBusinessConfig\.dailyStockUse\}\)/);
  assert.match(source,/const customers=20\+cafeBusinessState\.reputation\*2/);
  assert.match(source,/const gross=185\+cafeBusinessState\.reputation\*12/);
  assert.match(source,/cafeBusinessState\.reputation=clamp\(cafeBusinessState\.reputation\+1,0,10\)/);
});
check('Daily revenue and staff/utilities costs are separate finance transactions recorded at 07:00',()=>{
  assert.match(source,/recordTransaction\('Corner Cafe · daily sales',gross,day,'07:00'\)/);
  assert.match(source,/recordTransaction\('Corner Cafe · staff & utilities',-operatingCost,day,'07:00'\)/);
  assert.match(source,/cafeBusinessState\.lastProfit=profit/);
  assert.match(source,/const localMenuBonus=stockUse\.localUsed\*cafeBusinessConfig\.localSalesBonusPerServing/);
  assert.match(source,/cafeBusinessState\.lifetimeLocalServings\+=stockUse\.localUsed/);
});
check('Running out of stock automatically closes the cafe without creating a false sales payout',()=>{
  assert.match(source,/if\(!stockUse\.ok\)\{\n    cafeBusinessState\.open=false/);
  assert.match(source,/CORNER CAFE KEHABISAN STOK/);
});
check('Espresso machine and patio seating have three priced upgrade tiers with real daily revenue bonuses',()=>{
  assert.match(source,/upgradeCosts:\{espresso:\[750,1150,1650\],patio:\[950,1450,2050\]\}/);
  assert.match(source,/upgradeBonuses:\{espresso:\[28,42,58\],patio:\[22,36,52\]\}/);
  assert.match(source,/function upgradeCafeBusiness\(type\)/);
  assert.match(source,/data-cafe-upgrade/);
});
check('The physical cafe store offers an entry point into the business management board',()=>{
  assert.match(source,/cafe-store-business-card/);
  assert.match(source,/OPEN BUSINESS BOARD/);
  assert.match(source,/manage\.addEventListener\('click',openWorkFinancePanel\)/);
});
check('Cafe ownership, stock, upgrades, reputation and operating history persist in V18 saves',()=>{
  assert.match(source,/cafeBusiness: \{ \.\.\.cafeBusinessState \}/);
  assert.match(source,/const savedCafeBusiness=data\.cafeBusiness\|\|\{\}/);
  assert.match(source,/cafeBusinessState\.lifetimeSales=clamp/);
  assert.match(source,/cafeBusinessState\.lastOperatedDay=clamp/);
  assert.match(source,/if\(!cafeBusinessState\.owned\)Object\.assign\(cafeBusinessState/);
  assert.match(source,/version: 18/);
});
check('Older saves without a cafeBusiness field default to an unowned closed business',()=>{
  assert.match(source,/const savedCafeBusiness=data\.cafeBusiness\|\|\{\}/);
  assert.match(source,/cafeBusinessState\.owned=!!savedCafeBusiness\.owned/);
  assert.match(source,/cafeBusinessState\.localStock=cafeBusinessState\.owned\?clamp/);
  assert.match(source,/cafeBusinessState\.open=cafeBusinessState\.owned&&!!savedCafeBusiness\.open/);
  assert.match(source,/stock:0,localStock:0,localDeliveries:0,lifetimeLocalServings:0,lastLocalServings:0,reputation:0,espresso:0,patio:0/);
});
check('Runtime diagnostics expose the cafe business, next upgrade prices and sign status',()=>{
  assert.match(source,/cafeBusiness: \{\.\.\.cafeBusinessState,config:\{\.\.\.cafeBusinessConfig\}/);
  assert.match(source,/localSupply:\{capacity:cafeBusinessConfig\.localStockCapacity,options:cafeLocalSupplyCatalog/);
  assert.match(source,/nextUpgrade:\{espresso:cafeBusinessUpgradeCost\('espresso'\),patio:cafeBusinessUpgradeCost\('patio'\)\}/);
});
check('The business dashboard has responsive stock, reputation, profit and upgrade styling',()=>{
  assert.match(css,/\.cafe-business-stats/);
  assert.match(css,/\.cafe-business-actions/);
  assert.match(css,/\.cafe-upgrade-card/);
  assert.match(css,/\.cafe-local-supply-card/);
  assert.match(css,/@media\(max-width:700px\)\{\.cafe-business-section/);
});
check('The 40.9 release notes, package, lockfile and aggregate test runner include the cafe business system',()=>{
  assert.equal(pkg.version,'0.40.9');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('<title>Estate Explorer — Prototype 40.9</title>'));
  assert.ok(html.includes('BUILD 0.40.9'));
  assert.match(readme,/Prototype 40\.7 — Corner Cafe Ownership & Business Management/);
  assert.match(pkg.scripts['test:game'],/test:cafe-business/);
});
console.log(`\n${passed} Corner Cafe business integration checks passed.`);

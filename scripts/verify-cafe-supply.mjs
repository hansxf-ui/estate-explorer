import fs from 'node:fs';
import assert from 'node:assert/strict';
import { cafeLocalSupplyCatalog, planCafeLocalSupplyDelivery, consumeCafeBusinessStock } from '../src/cafe-supply.js';

const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;
function check(name,fn){fn();passed++;console.log(`✓ ${name}`);}

check('The local supplier catalogue contains six unique farm and artisan products',()=>{
  assert.equal(cafeLocalSupplyCatalog.length,6);
  assert.equal(new Set(cafeLocalSupplyCatalog.map(item=>item.key)).size,6);
  assert.deepEqual(cafeLocalSupplyCatalog.map(item=>item.key),['tomato','carrot','strawberry','tomatoPreserve','carrotJuice','strawberryJam']);
  assert.ok(cafeLocalSupplyCatalog.every(item=>item.quantity>0&&item.servings>0&&item.marketUnitValue>0));
});
check('A valid delivery consumes only the required player inventory and increases local servings',()=>{
  const inventory={harvestTomato:8};
  const result=planCafeLocalSupplyDelivery({supplyKey:'tomato',inventory,localStock:2,capacity:24});
  assert.equal(result.ok,true);
  assert.equal(result.consumed,3);
  assert.equal(result.remainingInventory,5);
  assert.equal(result.deliveredServings,5);
  assert.equal(result.nextLocalStock,7);
  assert.equal(inventory.harvestTomato,8,'planning must not mutate the source inventory');
});
check('All six garden and workshop goods map to valid, positive delivery batches',()=>{
  for(const item of cafeLocalSupplyCatalog){
    const result=planCafeLocalSupplyDelivery({supplyKey:item.key,inventory:{[item.item]:item.quantity},localStock:0,capacity:24});
    assert.equal(result.ok,true,item.key);
    assert.equal(result.remainingInventory,0,item.key);
    assert.equal(result.deliveredServings,item.servings,item.key);
  }
});
check('Insufficient goods are rejected without inventing inventory or servings',()=>{
  const result=planCafeLocalSupplyDelivery({supplyKey:'carrot',inventory:{harvestCarrot:3},localStock:4});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'insufficient-inventory');
  assert.equal(result.required,4);
  assert.equal(result.owned,3);
});
check('Unknown supply keys are rejected cleanly',()=>{
  assert.deepEqual(planCafeLocalSupplyDelivery({supplyKey:'goldenTruffle',inventory:{}}),{ok:false,reason:'unknown-supply'});
});
check('Delivery cannot overfill local storage and an exact-capacity delivery is allowed',()=>{
  const blocked=planCafeLocalSupplyDelivery({supplyKey:'tomatoPreserve',inventory:{tomatoPreserve:2},localStock:17,capacity:24});
  assert.equal(blocked.ok,false);
  assert.equal(blocked.reason,'capacity-exceeded');
  assert.equal(blocked.freeSpace,7);
  const exact=planCafeLocalSupplyDelivery({supplyKey:'tomatoPreserve',inventory:{tomatoPreserve:1},localStock:16,capacity:24});
  assert.equal(exact.ok,true);
  assert.equal(exact.nextLocalStock,24);
});
check('Local servings are consumed before wholesale stock at the daily operating checkpoint',()=>{
  const result=consumeCafeBusinessStock({localStock:5,wholesaleStock:12,dailyStockUse:3});
  assert.deepEqual(result,{ok:true,available:17,requested:3,localUsed:3,wholesaleUsed:0,nextLocalStock:2,nextWholesaleStock:12});
});
check('Wholesale stock fills the daily demand after available local servings are exhausted',()=>{
  const result=consumeCafeBusinessStock({localStock:2,wholesaleStock:12,dailyStockUse:3});
  assert.deepEqual(result,{ok:true,available:14,requested:3,localUsed:2,wholesaleUsed:1,nextLocalStock:0,nextWholesaleStock:11});
});
check('A stockout does not consume either stock pool or create a partial operating day',()=>{
  const result=consumeCafeBusinessStock({localStock:1,wholesaleStock:1,dailyStockUse:3});
  assert.deepEqual(result,{ok:false,available:2,requested:3,localUsed:0,wholesaleUsed:0,nextLocalStock:1,nextWholesaleStock:1});
});
check('Stock rules normalize invalid, negative and fractional inputs safely',()=>{
  const result=consumeCafeBusinessStock({localStock:-2.9,wholesaleStock:3.8,dailyStockUse:3.7});
  assert.equal(result.ok,true);
  assert.equal(result.localUsed,0);
  assert.equal(result.wholesaleUsed,3);
  assert.equal(result.nextWholesaleStock,0);
});
check('The game imports the tested supply rules and configures separate local and wholesale capacities',()=>{
  assert.match(source,/from '\.\/cafe-supply\.js'/);
  assert.match(source,/localStockCapacity:24/);
  assert.match(source,/localSalesBonusPerServing:5/);
  assert.match(source,/localStock:0,localDeliveries:0,lifetimeLocalServings:0,lastLocalServings:0/);
  assert.match(source,/dailyStockUse:3/);
});
check('The Work & Finance panel exposes local sourcing, storage and all six delivery choices',()=>{
  for(const id of ['cafe-local-supply-section','cafe-local-supply-stock','cafe-local-supply-list'])assert.ok(html.includes(id));
  assert.match(source,/for\(const supply of cafeLocalSupplyCatalog\)/);
  assert.match(source,/button\.dataset\.cafeSupply=supply\.key/);
  assert.match(source,/addEventListener\('click',event=>\{const button=event\.target\.closest\('\[data-cafe-supply\]'\)/);
});
check('Delivery consumes goods, adds local stock, refreshes the live world and saves progress',()=>{
  assert.match(source,/function deliverCafeLocalSupply\(supplyKey\)/);
  assert.match(source,/inventory\[delivery\.supply\.item\]=delivery\.remainingInventory/);
  assert.match(source,/cafeBusinessState\.localStock=delivery\.nextLocalStock/);
  assert.match(source,/cafeBusinessState\.localDeliveries\+\+/);
  assert.match(source,/renderInventory\(\);renderCafeBusinessPanel\(\);renderWorkFinancePanel\(\)/);
  assert.match(source,/saveGame\(false\)/);
});
check('Daily cafe operations use local stock first, apply local sales bonus and record local usage',()=>{
  assert.match(source,/consumeCafeBusinessStock\(\{wholesaleStock:cafeBusinessState\.stock,localStock:cafeBusinessState\.localStock,dailyStockUse:cafeBusinessConfig\.dailyStockUse\}\)/);
  assert.match(source,/const localMenuBonus=stockUse\.localUsed\*cafeBusinessConfig\.localSalesBonusPerServing/);
  assert.match(source,/const customers=20\+cafeBusinessState\.reputation\*2[^;]*\(stockUse\.localUsed>0\?4:0\)/);
  assert.match(source,/cafeBusinessState\.lifetimeLocalServings\+=stockUse\.localUsed/);
  assert.match(source,/cafeBusinessState\.lastLocalServings=stockUse\.localUsed/);
});
check('Three 3D supply crates appear in the cafe as local servings are delivered',()=>{
  assert.match(source,/const cafeLocalSupplyCrates = Array\.from\(\{length:3\}/);
  assert.match(source,/cafeLocalSupplyCrates\.forEach\(\(crate,index\)=>\{crate\.visible=cafeBusinessState\.owned&&cafeBusinessState\.localStock>index\*8;\}\)/);
  assert.match(source,/cratesVisible:cafeLocalSupplyCrates\.map\(crate=>crate\.visible\)/);
});
check('Optional local supply fields persist and old unowned saves initialize them to zero without changing V18',()=>{
  assert.match(source,/cafeBusiness: \{ \.\.\.cafeBusinessState \}/);
  assert.match(source,/cafeBusinessState\.localStock=cafeBusinessState\.owned\?clamp/);
  assert.match(source,/cafeBusinessState\.localDeliveries=clamp/);
  assert.match(source,/cafeBusinessState\.lifetimeLocalServings=clamp/);
  assert.match(source,/lastLocalServings:0/);
  assert.match(source,/version: 18/);
});
check('The live business diagnostics expose the local supply catalogue, stock capacity and crate states',()=>{
  assert.match(source,/localSupply:\{capacity:cafeBusinessConfig\.localStockCapacity,options:cafeLocalSupplyCatalog/);
  assert.match(source,/cafeBusiness: \{\.\.\.cafeBusinessState,config:\{\.\.\.cafeBusinessConfig\}/);
});
check('The new dashboard remains responsive and describes the farm-to-table workflow in release notes',()=>{
  assert.match(css,/\.cafe-local-supply-card/);
  assert.match(css,/@media\(max-width:700px\)\{\.cafe-local-supply-card/);
  assert.match(readme,/Prototype 40\.8 — Corner Cafe Farm-to-Table Supply Chain/);
  assert.match(readme,/save schema remains V18/i);
});
check('The Prototype 40.14 app, package, lockfile and aggregate test runner stay synchronized',()=>{
  assert.equal(pkg.version,'0.40.14');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('<title>Estate Explorer — Prototype 40.14</title>'));
  assert.ok(html.includes('EXPLORER · PROTOTYPE 40.14'));
  assert.ok(html.includes('BUILD 0.40.14'));
  assert.match(pkg.scripts['test:game'],/test:cafe-supply/);
});
console.log(`\n${passed} Corner Cafe farm-to-table integration checks passed.`);

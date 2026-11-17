import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('Property management is reachable from the mailbox bills panel',()=>{
  assert.match(html,/id="property-manage-btn"/);assert.match(html,/id="property-panel"/);
  assert.match(source,/document\.querySelector\('#property-manage-btn'\)\.addEventListener\('click', openPropertyPanel\)/);
  assert.match(source,/'property-panel'/);
});
check('Four renovation paths provide two permanent upgrade levels each',()=>{
  for(const key of ['solar','kitchen','bedroom','terrace'])assert.match(source,new RegExp(`${key}: \\{ title:`));
  assert.match(source,/totalAvailable = Object\.values\(propertyUpgradeDefinitions\)\.reduce/);
  assert.match(source,/cost: 1100/);assert.match(source,/cost: 700/);assert.match(source,/cost: 850/);assert.match(source,/cost: 550/);
});
check('Purchases check wallet, charge the player, record a transaction and save immediately',()=>{
  assert.match(source,/if \(wallet < next\.cost\)/);
  assert.match(source,/wallet -= next\.cost/);
  assert.match(source,/recordTransaction\(`Property upgrade:/);
  assert.match(source,/applyPropertyUpgradeVisuals\(\);\n  updateHouseholdPanel\(\);\n  renderPropertyPanel\(\);\n  saveGame\(false\)/);
});
check('Solar roof renovation lowers the actual recurring bill',()=>{
  assert.match(source,/function propertyDailyBill\(\) \{ return Math\.max\(35, 85 - propertyUpgrades\.solar \* 15\); \}/);
  assert.match(source,/unpaidBills \+= propertyDailyBill\(\)/);
  assert.match(html,/id="bill-daily-rate"/);
});
check('Kitchen upgrades improve both cooking and fridge meal restoration',()=>{
  assert.match(source,/propertyUpgrades\.kitchen \* 8/);
  assert.match(source,/propertyUpgrades\.kitchen \* 4/);
});
check('Bedroom renovation improves actual sleep recovery',()=>{
  assert.match(source,/const recovery = 65 \+ propertyUpgrades\.bedroom \* 10/);
  assert.match(source,/needs\.energy = Math\.min\(100, needs\.energy \+ recovery\)/);
});
check('Garden Terrace builds visible outdoor furniture and unlocks a usable seating activity',()=>{
  assert.match(source,/if \(propertyUpgrades\.terrace > 0\)/);
  assert.match(source,/box\(g,-0\.5,0\.12,-15\.0,11\.2,0\.22,8\.0,deck\)/);
  assert.match(source,/requiresUpgrade: 'terrace'/);
  assert.match(source,/style === 'terrace'/);
  assert.match(source,/const socialGain = 12 \+ propertyUpgrades\.terrace \* 4/);
  assert.match(source,/const energyGain = 5 \+ propertyUpgrades\.terrace \* 4/);
});
check('Renovation visuals are rebuilt on save load and never duplicate',()=>{
  assert.match(source,/function applyPropertyUpgradeVisuals\(\)/);
  assert.match(source,/for \(const object of Object\.values\(propertyUpgradeObjects\)\)/);
  assert.match(source,/applyPropertyUpgradeVisuals\(\);\n    lifetimeIncome/);
});
check('Renovation tiers persist as optional V12 fields and legacy saves remain supported',()=>{
  assert.match(source,/wallet, propertyUpgrades, lifetimeIncome/);
  assert.match(source,/Object\.assign\(propertyUpgrades, \{ solar: 0, kitchen: 0, bedroom: 0, terrace: 0, studio: 0, guestSuite: 0 \}, data\.propertyUpgrades \|\| \{\}\)/);
  assert.match(source,/version: 18/);assert.match(source,/\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.ok(source.includes('property: { upgrades: { ...propertyUpgrades }, dailyBill: propertyDailyBill(),'));
  assert.match(source,/visibleRenovations: Object\.keys\(propertyUpgradeObjects\)/);
  assert.match(source,/terraceSeatsUnlocked: propertyUpgrades\.terrace > 0/);
});
check('Property renovation cards are responsive and show level and affordability states',()=>{
  assert.match(css,/\.property-upgrade-card/);assert.match(css,/\.property-upgrade-buy:disabled/);
  assert.match(css,/@media\(max-width:700px\)[\s\S]*?\.property-panel/);
});
check('Version 0.40.13 metadata and release notes are aligned',()=>{
  assert.equal(pkg.version,'0.40.13');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.match(html,/Prototype 40/);assert.ok(html.includes('BUILD 0.40.13'));
  assert.match(readme,/Prototype 37 — Neighborhood Expansion & Local Commerce/);
});
console.log(`\n${passed} property progression integration checks passed.`);

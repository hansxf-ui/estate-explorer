import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Work & Finance is accessible from the primary HUD and included in panel management', () => {
  assert.match(html, /id="work-btn"/);
  assert.match(html, /id="work-finance-panel"/);
  assert.match(html, /id="work-contract-list"/);
  assert.match(source, /document\.querySelector\('#work-btn'\)\.addEventListener\('click', openWorkFinancePanel\)/);
  assert.match(source, /'work-finance-panel'/);
});
check('Board exposes the established work paths and the new City Express vehicle contract', () => {
  for (const id of ['courier','garden','freelance','express']) assert.match(source, new RegExp(`id:'${id}'|id: '${id}'`));
  assert.match(source, /City Express Dispatch/);
  assert.match(source, /Vehicle required · 2 dispatches\/day/);
  assert.match(source, /−14 Energy · 45 min start/);
  assert.match(source, /−10 Energy · 30 min start/);
  assert.match(source, /−22 Energy · 90 min · Career Lv\. 2/);
  assert.match(source, /const courierReward = 450/);
  assert.match(source, /const gardenReward = 220/);
});
check('Courier and Garden contracts have one persisted daily slot and enforce energy checks', () => {
  assert.match(source, /let courierShiftsToday = 0/);
  assert.match(source, /let gardenShiftsToday = 0/);
  assert.match(source, /courierShiftsToday >= 1/);
  assert.match(source, /gardenShiftsToday >= 1/);
  assert.match(source, /needs\.energy < 14/);
  assert.match(source, /needs\.energy < 10/);
  assert.match(source, /courierShiftsToday\+\+/);
  assert.match(source, /gardenShiftsToday\+\+/);
  assert.match(source, /advanceGameTime\(45\)/);
  assert.match(source, /advanceGameTime\(30\)/);
});
check('Freelance is locked until Career level 2 and remains capped at two shifts daily', () => {
  assert.match(source, /careerLevel < 2 \? 'LOCKED · CAREER LEVEL 2'/);
  assert.match(source, /careerShiftsToday >= 2/);
  assert.match(source, /CAPAI CAREER LEVEL 2 UNTUK FREELANCE/);
  assert.match(source, /careerShiftsToday\+\+/);
  assert.match(source, /const fieldContractActive = courierActive \|\| gardenActive \|\| expressActive/);
  assert.match(source, /FINISH GARDEN CARE FIRST/);
  assert.match(source, /FINISH COURIER ROUTE FIRST/);
  assert.match(source, /FINISH CITY EXPRESS FIRST/);
  assert.match(source, /SELESAIKAN KONTRAK YANG SEDANG BERJALAN TERLEBIH DAHULU/);
});
check('Work contract limits reset on day rollover and safely migrate old saves', () => {
  assert.match(source, /function resetDailyWorkLimits\(\)/);
  assert.match(source, /courierShiftsToday = jobPhase === 'collect' \|\| jobPhase === 'deliver' \? 1 : 0/);
  assert.match(source, /gardenShiftsToday = gardenJobPhase === 'active' \? 1 : 0/);
  assert.match(source, /gameDay = nextDay; gameMinutes = nextMinute; lastClockMinute = -1;[\s\S]*?resetDailyWorkLimits\(\)/);
  assert.match(source, /workLimitDay, courierShiftsToday, gardenShiftsToday/);
  assert.match(source, /workLimitDay === gameDay \? clamp\(Math\.floor\(data\.courierShiftsToday/);
  assert.match(source, /workLimitDay === gameDay \? clamp\(Math\.floor\(data\.gardenShiftsToday/);
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
});
check('Starting, advancing and completing contracts persist the changed state immediately', () => {
  assert.match(source, /updateNeedsHud\(true\); updateJobHud\(\); renderWorkFinancePanel\(\); saveGame\(false\);/);
  assert.match(source, /updateJobHud\(\); saveGame\(false\);/);
  assert.match(source, /setWallet\(wallet\); renderInventory\(\); updateJobHud\(\); saveGame\(false\);/);
  assert.match(source, /setWallet\(wallet\); updateHouseholdPanel\(\); saveGame\(false\);/);
  assert.match(source, /renderShop\(\);saveGame\(false\);showToast/);
});
check('Economy transactions track all core income and spending paths', () => {
  assert.match(source, /function recordTransaction\(label, amount, dayOverride = null, timeOverride = null\)/);
  for (const label of ['Daily task:', 'Freelance project completed', 'Household bills', 'Garden care contract', 'Courier delivery contract', 'Purchase:']) assert.ok(source.includes(label), `${label} transaction missing`);
  assert.match(source, /if \(value > 0\) lifetimeIncome \+= value/);
  assert.match(source, /else lifetimeSpending \+= Math\.abs\(value\)/);
});
check('Transaction history is newest-first and capped at twelve entries', () => {
  assert.match(source, /transactionHistory\.unshift\(/);
  assert.match(source, /if \(transactionHistory\.length > 12\) transactionHistory\.length = 12/);
  assert.match(source, /transactionHistory\.slice\(0,12\)/);
});
check('Finance totals and transaction ledger persist as optional V12 fields', () => {
  assert.match(source, /lifetimeIncome, lifetimeSpending, transactionHistory/);
  assert.match(source, /lifetimeIncome = Math\.max\(0, Math\.floor\(Number\(data\.lifetimeIncome\) \|\| 0\)\)/);
  assert.match(source, /Array\.isArray\(data\.transactionHistory\)/);
  assert.match(source, /economy: \{ lifetimeIncome, lifetimeSpending, recentTransactions:/);
});
check('Work board and finance ledger have responsive cards and readable states', () => {
  assert.match(css, /\.work-contract-card/);
  assert.match(css, /\.work-contract-start:disabled/);
  assert.match(css, /\.finance-entry/);
  assert.match(css, /\.finance-totals/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*?\.work-finance-panel/);
});
check('Version 0.40.14 and Prototype 39 metadata are consistent', () => {
  assert.equal(pkg.version, '0.40.14');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(html, /Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.14'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} work & finance integration checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
let passed=0;function check(name,fn){fn();passed++;console.log(`✓ ${name}`)}
check('Rental management is a dedicated, persistent Guest Suite income system unlocked at renovation level 2',()=>{
  assert.match(source,/const guestSuiteRental = \{ listing:false, tenantActive:false/);
  assert.match(source,/const guestSuiteRentPerDay = 180/);assert.match(source,/const guestSuiteManagementFee = 25/);
  assert.match(source,/propertyUpgrades\.guestSuite>=2/);assert.ok(html.includes('id="guest-rental-status"'));
});
check('The listing workflow books a named tenant for tomorrow and creates a seven-day fixed lease',()=>{
  assert.match(source,/function listGuestSuiteForRent\(\)/);
  assert.match(source,/tenantName:'Maya Santoso',moveInDay:gameDay\+1,leaseEndDay:gameDay\+7/);
  assert.match(source,/GUEST SUITE TERDAFTAR/);assert.match(source,/MOVE-IN/);
});
check('Tenants move in at the daily billing checkpoint and rent is paid once per day at 07:00',()=>{
  assert.match(source,/function processGuestSuiteRentalDay\(day\)/);
  assert.match(source,/day<guestSuiteRental\.moveInDay/);
  assert.match(source,/guestSuiteRental\.lastPaidDay!==day/);
  assert.match(source,/recordTransaction\('Guest Suite rent · gross',guestSuiteRentPerDay,day,'07:00'\)/);
  assert.match(source,/if \(dueCrossed\) \{[\s\S]*?if \(day > lastBilledDay\) \{[\s\S]*?processGuestSuiteRentalDay\(day\)/);
});
check('Rental gross income, management fees and net daily cash flow are calculated and recorded separately',()=>{
  assert.match(source,/wallet\+=guestSuiteRentPerDay;recordTransaction\('Guest Suite rent · gross'/);
  assert.match(source,/wallet-=guestSuiteManagementFee;recordTransaction\('Guest Suite management fee'/);
  assert.match(source,/grossEarned\+=guestSuiteRentPerDay;guestSuiteRental\.feesPaid\+=guestSuiteManagementFee;guestSuiteRental\.lifetimePaidDays\+\+/);
  assert.match(source,/lifetimeGrossEarned\+=guestSuiteRentPerDay;guestSuiteRental\.lifetimeFeesPaid\+=guestSuiteManagementFee/);
  assert.match(source,/netPerDay:guestSuiteRentPerDay-guestSuiteManagementFee/);
  assert.ok(html.includes('$180/day · −$25 fee · +$155 net'));
});
check('The tenant pays for seven days and the unit automatically returns to vacancy after the final payment',()=>{
  assert.match(source,/leaseEndDay:gameDay\+7/);
  assert.match(source,/if\(day>=guestSuiteRental\.leaseEndDay\)/);
  assert.match(source,/listing:false,tenantActive:false,tenantName:''/);
  assert.match(source,/KONTRAK SEWA SELESAI/);
});
check('The lease can be extended by seven days, cancelled before move-in or ended early by the owner',()=>{
  assert.match(source,/function handleGuestSuiteRentalPrimary\(\)/);
  assert.match(source,/guestSuiteRental\.leaseEndDay\+=7/);
  assert.match(source,/function endGuestSuiteTenancy\(\)/);
  assert.match(source,/PENCARIAN PENYEWA DIBATALKAN/);
  assert.ok(html.includes('id="guest-rental-primary"'));assert.ok(html.includes('id="guest-rental-secondary"'));
});
check('A tenant cannot be displaced into the existing sleep interaction or share the occupied Guest Suite',()=>{
  assert.match(source,/enabled: \(\) => propertyUpgrades\.guestSuite > 0 && !guestSuiteRental\.tenantActive/);
  assert.match(source,/if\(guestSuite&&guestSuiteRental\.tenantActive\)/);
  assert.match(source,/GUEST SUITE SEDANG DISEWA/);
});
check('The rental contract, occupancy, lease dates and cumulative income survive V18 save/load and older saves default to vacant',()=>{
  assert.match(source,/rental: \{ \.\.\.guestSuiteRental \}/);
  assert.match(source,/const savedRental=data\.rental\|\|\{\}/);
  assert.match(source,/listing:!!savedRental\.listing&&propertyUpgrades\.guestSuite>=2/);
  assert.match(source,/daysPaid:clamp\(Math\.floor\(Number\(savedRental\.daysPaid\)/);
  assert.match(source,/if\(!guestSuiteRental\.listing\)\{guestSuiteRental\.tenantActive=false/);
  assert.match(source,/version: 18/);
});
check('Multi-day time advances process every due rent payment without duplicating the same in-game day',()=>{
  assert.match(source,/let rentalChanged = false/);
  assert.match(source,/guestSuiteRental\.lastPaidDay!==day/);
  assert.match(source,/rentalChanged = processGuestSuiteRentalDay\(day\) \|\| rentalChanged/);
  assert.match(source,/if\(rentalChanged\)[\s\S]*?saveGame\(false\)/);
});
check('The rental overview shows tenant, contract, cash flow and lifetime earnings inside property management',()=>{
  for(const id of ['guest-rental-status','guest-rental-tenant','guest-rental-term','guest-rental-income','guest-rental-earned','guest-rental-note'])assert.ok(html.includes(`id="${id}"`));
  assert.match(source,/function renderGuestSuiteRentalPanel\(\)/);
  assert.match(source,/renderGuestSuiteRentalPanel\(\);\n  for \(const \[key, definition\]/);
  assert.match(css,/\.guest-rental-card/);assert.match(css,/\.guest-rental-status\.occupied/);
});
check('Runtime diagnostics and the work-finance ledger expose rental status and cash-flow history',()=>{
  assert.match(source,/rental: \{ \.\.\.guestSuiteRental, rentPerDay:guestSuiteRentPerDay/);
  assert.match(source,/function recordTransaction\(label, amount, dayOverride = null, timeOverride = null\)/);
  assert.match(source,/Number\.isFinite\(dayOverride\)[\s\S]*?timeOverride/);
});
check('Version 0.40.16, release notes, package lock and aggregate integration-test command are synchronized',()=>{
  assert.equal(pkg.version,'0.40.16');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(html.includes('BUILD 0.40.16'));assert.match(pkg.scripts['test:game'],/test:rent/);
  assert.match(readme,/Prototype 40\.0 — Guest Suite Rental & Property Income/);
});
console.log(`\n${passed} Guest Suite Rental and Property Income checks passed.`);

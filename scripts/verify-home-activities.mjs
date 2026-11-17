import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('Placed Bookshelves expose a contextual interaction only when the player is nearby', () => {
  assert.match(source, /function nearestPlacedBookshelf\(maxDistance = Infinity\)/);
  assert.match(source, /id: 'bookshelf-reading'[\s\S]*?enabled: \(\) => !playerSeated && !inVehicle && !!nearestPlacedBookshelf\(2\.7\)/);
  assert.match(source, /get x\(\)\{ return nearestPlacedBookshelf\(\)\?\.x \?\? 100000; \}/);
  assert.match(source, /label: \(\) => `Baca buku · \+\$\{22 \+ \(skillProgress\('career'\)\.level - 1\) \* 2\} Career XP`/);
});
check('Reading checks Energy, grants Career XP scaled by level, advances time and saves progress', () => {
  const start = source.indexOf('function readAtBookshelf()');
  const end = source.indexOf('\nconst seatingSpots', start);
  const body = source.slice(start, end);
  assert.match(body, /nearestPlacedBookshelf\(2\.7\)/);
  assert.match(body, /needs\.energy < 6/);
  assert.match(body, /const xp = 22 \+ \(careerLevel - 1\) \* 2/);
  assert.match(body, /needs\.energy - 6/);
  assert.match(body, /advanceGameTime\(30\)/);
  assert.match(body, /addSkillXp\('career', xp\)/);
  assert.match(body, /saveGame\(false\)/);
});
check('Bookshelf reading uses existing skill progression and daily skill-practice rewards', () => {
  assert.match(source, /function addSkillXp\(key, amount\)[\s\S]*?recordDailyTaskProgress\('skillPractice', amount\)/);
  assert.match(source, /renderCareerPanel\(\);[\s\S]*?saveGame\(false\);[\s\S]*?READING SESSION COMPLETE/);
  assert.match(source, /homeActivities: \{ readingAvailable: !!nearestPlacedBookshelf\(2\.7\), bookshelfCount: decorPositions\.filter\(item => item\.item === 'bookshelf'\)\.length/);
});
check('Seated activities have a real cooldown so the player cannot spam rewards', () => {
  assert.match(source, /function doSeatedActivity\(\)[\s\S]*?if \(seatedActivityTimer > 0\) \{ showToast\('AKTIVITAS MASIH BERLANGSUNG'\); return; \}/);
  assert.match(source, /seatedActivityTimer = 5\.5/);
});
check('TV, coffee, pool, garden and terrace sessions advance the in-game clock', () => {
  const start = source.indexOf('function doSeatedActivity()');
  const end = source.indexOf('\nfunction standFromSeat', start);
  const body = source.slice(start, end);
  for (const duration of ['15','20','25','30']) assert.ok(body.includes(`duration = ${duration}`), `missing duration ${duration}`);
  assert.match(body, /if \(duration > 0\) advanceGameTime\(duration\)/);
  assert.match(body, /addSkillXp\('social', socialXp\)/);
  for (const style of ['stool','sofa','lounger','bench','terrace']) assert.ok(body.includes(`style === '${style}'`));
});
check('Coffee is only consumed after confirming inventory availability', () => {
  const start = source.indexOf('function doSeatedActivity()');
  const end = source.indexOf('\nfunction standFromSeat', start);
  const body = source.slice(start, end);
  assert.ok(body.indexOf("if ((inventory.coffee || 0) < 1)") < body.indexOf('inventory.coffee -= 1'));
  assert.match(body, /renderInventory\(\)/);
  assert.match(body, /saveGame\(false\)/);
});
check('Home activity progress remains compatible with V18 saves and legacy migration range', () => {
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.match(source, /skills, careerWorkDay/);
  assert.match(source, /decorPositions, worldDrops: worldDrops.map/);
});
check('Shop copy explains that the bookshelf is now usable, and controls describe it', () => {
  assert.match(html, /Rak buku kayu · Bisa dipakai membaca · \$340/);
  assert.match(source, /bookshelf: \{ name: 'Bookshelf', description: 'Rak buku kayu · membaca untuk Career XP'/);
  assert.match(readme, /placed Bookshelf reading/);
  assert.match(readme, /Functional Home Activities & Reading/);
});
check('Prototype 39 metadata is consistent across the app and npm package', () => {
  assert.equal(pkg.version, '0.40.14');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:home/);
  assert.match(html, /Prototype 40/);
  assert.match(html, /PROTOTYPE 40/);
  assert.ok(html.includes('BUILD 0.40.14'));
  assert.match(css, /@media\(max-width:700px\)/);
});

console.log(`\n${passed} home activity integration checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

const cyclesMatch = source.match(/const dailyTaskCycles = (\[[\s\S]*?\]);/);
const definitionsMatch = source.match(/const dailyTaskDefinitions = (\{[\s\S]*?\n\});/);
assert.ok(cyclesMatch && definitionsMatch, 'daily task data definitions missing');
const model = vm.runInNewContext(`({ cycles: ${cyclesMatch[1]}, definitions: ${definitionsMatch[1]} })`);

check('Daily Planner is exposed in the main HUD and registered as a closable panel', () => {
  assert.match(html, /id="tasks-btn"/);
  assert.match(html, /id="daily-tasks-panel"/);
  assert.match(html, /id="daily-tasks-list"/);
  assert.match(source, /document\.querySelector\('#tasks-btn'\)\.addEventListener\('click', openDailyTasks\)/);
  assert.match(source, /'daily-tasks-panel'/);
});
check('Six deterministic day rotations each provide three distinct objectives', () => {
  assert.equal(model.cycles.length, 6);
  for (const cycle of model.cycles) {
    assert.equal(cycle.length, 3);
    assert.equal(new Set(cycle).size, 3);
    for (const id of cycle) assert.ok(model.definitions[id], `missing ${id}`);
  }
  assert.match(source, /function activeDailyTaskIds\(\)/);
  assert.match(source, /\(Math\.max\(1, gameDay\) - 1\) % dailyTaskCycles\.length/);
});
check('Task types cover wellbeing, cooking, skill growth, paid work, decorating, vehicle care and farming', () => {
  assert.deepEqual(Object.keys(model.definitions).sort(), ['decorate','destination','harvestCrop','homeCare','mealPrep','paidWork','skillPractice','vehicleCare'].sort());
  for (const task of Object.values(model.definitions)) {
    assert.ok(task.goal > 0);
    assert.ok(task.reward > 0);
    assert.ok(task.event);
    assert.ok(task.title && task.description);
  }
});
check('Progress is clamped to the task goal and claimed tasks cannot progress again', () => {
  assert.match(source, /dailyTaskProgress\[id\] = Math\.min\(task\.goal, before \+ Math\.max\(0, amount\)\)/);
  assert.match(source, /if \(task\.event !== event \|\| dailyTaskClaimed\[id\]\) continue/);
  assert.match(source, /function claimDailyTask\(id\)/);
  assert.match(source, /dailyTaskClaimed\[id\] = true/);
  assert.match(source, /wallet \+= task\.reward/);
});
check('Successful home, work, travel and vehicle-service actions feed their progression events', () => {
  for (const event of ['homeCare','mealPrep','skillPractice','paidWork','decorate','destination','vehicleCare']) assert.ok(source.includes(`recordDailyTaskProgress('${event}'`), `${event} hook missing`);
  assert.match(source, /recordDailyTaskProgress\('paidWork'\);[\s\S]*?PENGIRIMAN SELESAI/);
  assert.match(source, /recordDailyTaskProgress\('decorate'\);/);
});
check('Daily tasks rotate when game day changes and restore after save loading', () => {
  assert.match(source, /gameDay = nextDay; gameMinutes = nextMinute; lastClockMinute = -1;[\s\S]*?resetDailyTasks\(\)/);
  assert.match(source, /dailyTaskDay, dailyTaskProgress, dailyTaskClaimed/);
  assert.match(source, /Object\.assign\(dailyTaskProgress, data\.dailyTaskProgress \|\| \{\}\)/);
  assert.match(source, /Object\.assign\(dailyTaskClaimed, data\.dailyTaskClaimed \|\| \{\}\)/);
  assert.match(source, /version: 18/);
  assert.match(source, /\[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18\]/);
  assert.match(source, /dailyTasks: \{ day: dailyTaskDay, active: activeDailyTaskIds\(\)\.map/);
});
check('Daily Planner has responsive progress cards and claim states', () => {
  assert.match(css, /\.daily-task-card/);
  assert.match(css, /\.daily-task-track/);
  assert.match(css, /\.daily-task-claim:not\(:disabled\)/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*?\.daily-tasks-panel/);
});
check('Version 0.40.8 and Prototype 39 release metadata is consistent', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, '0.40.8');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(html, /Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.8'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
});

console.log(`\n${passed} progression integration checks passed.`);

import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, test) { test(); passed += 1; console.log(`✓ ${name}`); }

check('Relationship tiers use clear, centralized thresholds', () => {
  assert.match(source, /const relationshipThresholds = \{ friend: 25, closeFriend: 50, bestFriend: 80 \}/);
  assert.match(source, /if \(value >= relationshipThresholds\.bestFriend\) return 'BEST FRIEND'/);
  assert.match(source, /if \(value >= relationshipThresholds\.closeFriend\) return 'CLOSE FRIEND'/);
  assert.match(source, /if \(value >= relationshipThresholds\.friend\) return 'FRIEND'/);
  assert.match(source, /return 'ACQUAINTANCE'/);
});

check('Hangout invitations require Friend, Close Friend and Best Friend tiers', () => {
  assert.match(source, /const hangoutUnlocks = \{[\s\S]*garden: relationshipThresholds\.friend,[\s\S]*pool: relationshipThresholds\.closeFriend,[\s\S]*coffee: relationshipThresholds\.closeFriend,[\s\S]*picnic: relationshipThresholds\.bestFriend/);
  assert.match(source, /unlock: hangoutUnlocks\.garden/);
  assert.match(source, /unlock: hangoutUnlocks\.pool/);
  assert.match(source, /unlock: hangoutUnlocks\.coffee/);
  assert.match(source, /unlock: hangoutUnlocks\.picnic/);
  assert.match(source, /Friend · \$\{hangoutUnlocks\.garden\} relationship/);
  assert.match(source, /Close Friend · \$\{hangoutUnlocks\.pool\} relationship/);
  assert.match(source, /Best Friend · \$\{hangoutUnlocks\.picnic\} relationship/);
  assert.match(source, /const hasCoffee = !option\.coffee \|\| inventory\.coffee > 0 \|\| carryingCoffee/);
});

check('Four hangout activities have distinct time, energy and reward plans', () => {
  assert.match(source, /garden: \{ label: 'Garden stroll', unlock: hangoutUnlocks\.garden, energy: 8, social: 16, relationship: 10, xp: 12, minutes: 30/);
  assert.match(source, /pool: \{ label: 'Poolside chill', unlock: hangoutUnlocks\.pool, energy: 13, social: 22, relationship: 14, xp: 15, minutes: 45/);
  assert.match(source, /coffee: \{ label: 'Coffee break', unlock: hangoutUnlocks\.coffee, energy: -6, social: 20, relationship: 17, xp: 18, minutes: 60, coffee: true/);
  assert.match(source, /picnic: \{ label: 'Park picnic', unlock: hangoutUnlocks\.picnic, energy: 10, social: 28, hunger: 20, relationship: 22, xp: 24, minutes: 90, sandwich: true/);
});

check('Hangout costs and daily limits are checked before consuming provisions', () => {
  const block = source.match(/function startHangout\(npcId, activity\) \{[\s\S]*?\n\}\nfunction giveGift/);
  assert.ok(block, 'startHangout block missing');
  assert.ok(block[0].indexOf('rejectHangoutInvitation(npc,') < block[0].indexOf('inventory.coffee--'));
  assert.ok(block[0].indexOf('rejectHangoutInvitation(npc,') < block[0].indexOf('inventory.sandwich--'));
  assert.match(block[0], /hangoutsToday\[npcId\].*>= 1/);
  assert.match(block[0], /needs\.energy = clamp\(needs\.energy - plan\.energy/);
  assert.match(block[0], /advanceGameTime\(plan\.minutes\)/);
});

check('NPC refusals explain busy, sleepy and focused states before costs apply', () => {
  assert.match(source, /function rejectHangoutInvitation\(npc, reason\)/);
  assert.match(source, /Aku mulai mengantuk/);
  assert.match(source, /Aku sedang fokus menyelesaikan sesuatu/);
  assert.match(source, /masih menghabiskan waktu dengan yang lain/);
});

check('Relationship points and Social XP are deferred until a completed hangout', () => {
  const start = source.match(/function startHangout\(npcId, activity\) \{[\s\S]*?\n\}\nfunction giveGift/);
  const update = source.match(/function updateNpc\(npcData, dt\) \{[\s\S]*?\n\}\nfunction paintNpcReaction/);
  assert.ok(start && update, 'hangout lifecycle blocks missing');
  assert.match(start[0], /relationshipReward = plan\.relationship \+ affinityBonus \+ moodBonus/);
  assert.match(start[0], /relationshipReward, socialXp: plan\.xp/);
  assert.doesNotMatch(start[0], /changeRelationship\(npcId/);
  assert.doesNotMatch(start[0], /addSkillXp\('social'/);
  assert.match(update[0], /changeRelationship\(npcData\.id, session\.relationshipReward/);
  assert.match(update[0], /addSkillXp\('social', session\.socialXp/);
  assert.match(update[0], /saveGame\(false\)/);
});

check('NPC waits for the player and the hangout timer pauses outside interaction range', () => {
  const update = source.match(/function updateNpc\(npcData, dt\) \{[\s\S]*?\n\}\nfunction paintNpcReaction/);
  assert.ok(update);
  assert.match(update[0], /playerDistance <= 4\.4/);
  assert.match(update[0], /session\.playerArrived = !inVehicle && !inBoat && !playerSeated/);
  assert.match(update[0], /if \(session\.playerArrived\) \{\s*session\.elapsed \+= dt;/);
  assert.match(update[0], /SUDAH TIBA · DEKATI UNTUK MEMULAI HANGOUT/);
  assert.match(update[0], /if \(session\.elapsed >= 12\)/);
});

check('Active hangouts persist their route and pending reward in V18 saves', () => {
  assert.match(source, /hangoutSession: hangoutSession \? \{ npcId: hangoutSession\.npcId, activity: hangoutSession\.activity, elapsed: hangoutSession\.elapsed, target:/);
  assert.match(source, /const savedHangout = data\.version >= 16 \? data\.hangoutSession : null/);
  assert.match(source, /person\.npc\.position\.copy\(person\.spawnPosition\)/);
  assert.match(source, /relationshipReward: clamp\(Math\.floor\(Number\(savedHangout\.relationshipReward\)/);
  assert.match(source, /hangoutFollowEnabled = true/);
});

check('Legacy V3–V17 saves and V18 imports remain accepted', () => {
  assert.match(source, /version: 18/);
  assert.ok(source.includes('![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)'));
  assert.match(source, /data\.version >= 16 \? data\.hangoutSession : null/);
});

check('Alex and Mia keep distinct personality preferences and full-day schedules', () => {
  assert.match(source, /The Steady Caretaker[\s\S]*?preferredHangouts: \['garden','coffee'\]/);
  assert.match(source, /The Curious Resident[\s\S]*?preferredHangouts: \['pool','coffee','picnic'\]/);
  assert.match(source, /earlyBird: true, nightOwl: false/);
  assert.match(source, /earlyBird: false, nightOwl: true/);
  for (const id of ['alex','mia']) {
    const match = source.match(new RegExp(`id: '${id}'[\\s\\S]*?schedule: \\[([\\s\\S]*?)\\], activeRoutine`));
    assert.ok(match, `${id} schedule missing`);
    const slots = [...match[1].matchAll(/from: ([0-9.]+), to: ([0-9.]+)/g)].map(m => [+m[1], +m[2]]);
    for (let hour = 0; hour < 24; hour++) assert.ok(slots.some(([from,to]) => from < to ? hour >= from && hour < to : hour >= from || hour < to), `${id} missing ${hour}:00`);
  }
});

check('Conversation dialogue adapts to all relationship tiers, mood and activity', () => {
  assert.match(source, /function npcConversationLine\(npcData\)/);
  for (const tier of ['ACQUAINTANCE','FRIEND','CLOSE FRIEND','BEST FRIEND']) assert.match(source, new RegExp(`'${tier}': \\[`));
  assert.match(source, /npcData\.mood === 'sleepy'/);
  assert.match(source, /npcData\.activity === 'coffee'/);
  assert.match(source, /npcData\.activity === 'picnic'/);
  assert.match(source, /relationshipDialogue\(npcId\)/);
});

check('Mood, body language, greetings and favorite hangout bonuses remain connected', () => {
  assert.match(source, /function updateNpcMood\(npcData, dt\)/);
  assert.match(source, /function updateNpcBodyLanguage\(npcData, dt\)/);
  assert.match(source, /function updateNpcPlayerSocial\(dt\)/);
  assert.match(source, /const affinityBonus = npc\.personality\.preferredHangouts\.includes\(activity\) \? 3 : 0/);
  assert.match(source, /const moodBonus = npc\.mood === 'sleepy' \? 0 : 1/);
});

check('NPC gifts and daily conversation limits still improve relationships', () => {
  assert.match(source, /preferredGifts: \['bouquet'\]/);
  assert.match(source, /preferredGifts: \['coffee'\]/);
  assert.match(source, /const giftBonus = npc\.personality\.preferredGifts\.includes\(item\) \? 4 : 0/);
  assert.match(source, /function resetDailySocialTalks\(\)/);
  assert.match(source, /talks < 2/);
  assert.match(source, /socialTalkLimitDay, socialTalksToday/);
});

check('Debug snapshot exposes relationship gates and hangout progress', () => {
  assert.match(source, /relationshipThresholds: \{ \.\.\.relationshipThresholds \}/);
  assert.match(source, /hangoutUnlocks: \{ \.\.\.hangoutUnlocks \}/);
  assert.match(source, /playerArrived: hangoutSession\.playerArrived/);
});

check('Prototype 39 app, npm package, lockfile and release notes are synchronized', () => {
  assert.equal(pkg.version, '0.40.13');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(html, /Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.13'));
  assert.match(readme, /Prototype 39 — Relationship-Driven Hangout Sessions/);
  assert.match(pkg.scripts['test:game'], /test:npc/);
});

console.log(`\n${passed} NPC and hangout integration checks passed.`);

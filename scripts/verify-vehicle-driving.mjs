import fs from 'node:fs';
import assert from 'node:assert/strict';
import { obbIntersectsAabb2D, obbIntersectsCircle2D, vehicleYawRate } from '../src/driving-physics.js';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

check('SUV has a separate animated body pivot, four spinning wheels and steerable front wheel pivots', () => {
  assert.match(source, /const vehicleCarModel=group\(vehicle\);\s*const vehicleBody = group\(vehicleCarModel\)/);
  assert.match(source, /const vehicleWheels = \[\], vehicleFrontWheelPivots = \[\]/);
  assert.match(source, /if \(z < 0\) vehicleFrontWheelPivots\.push\(pivot\)/);
  assert.match(source, /vehicleFrontWheelPivots\.forEach\(pivot => \{ pivot\.rotation\.y/);
  assert.match(source, /vehicleWheels\.forEach\(wheel => \{ wheel\.rotation\.x/);
});
check('Vehicle acceleration, coasting, reverse and braking have distinct speed profiles', () => {
  assert.match(source, /const braking = !controlsLocked && \(vehicleBrakeHeld \|\| keys\.has\('Space'\)\)/);
  assert.match(source, /Math\.sign\(vehicleSpeed\) \* Math\.max\(0, Math\.abs\(vehicleSpeed\) - 14\.5 \* dt\)/);
  assert.match(source, /const enginePower=\(selectedVehicleType==='motorcycle'\?25\.5:18\.0\)\*\(1\+vehicleGarageState\.engine\*0\.11\);[\s\S]*?const targetSpeed = vehicleSpeed < -0\.45 \? 0 : enginePower \* throttle/);
  assert.match(source, /const reversePower=selectedVehicleType==='motorcycle'\?4\.4:6\.8;[\s\S]*?const targetSpeed = vehicleSpeed > 0\.45 \? 0 : -reversePower \* Math\.abs\(throttle\)/);
  assert.match(source, /vehicleSpeed, 0, 0\.82, dt/);
});
check('Progressive steering, body pitch/roll and brake lights respond to driving inputs', () => {
  assert.match(source, /const steerAngle = steering \* \(selectedVehicleType==='motorcycle'\?0\.60:0\.48\) \* \(1\+vehicleGarageState\.handling\*0\.13\) \* clamp\(Math\.abs\(vehicleSpeed\) \/ 3\.5, 0, 1\)/);
  assert.match(source, /const yawRate = vehicleYawRate\(vehicleSpeed, steering\*\(selectedVehicleType==='motorcycle'\?1\.18:1\)\*\(1\+vehicleGarageState\.handling\*0\.13\)\)/);
  assert.equal(vehicleYawRate(0, 1), 0);
  assert.ok(vehicleYawRate(4, 1) > 0);
  assert.ok(vehicleYawRate(-4, 1) < 0);
  assert.match(source, /clamp\(-vehicleAcceleration \* 0\.007, -0\.12, 0\.14\)/);
  assert.match(source, /clamp\(-steering \* speedRatio \* 0\.075, -0\.075, 0\.075\)/);
  assert.match(source, /vehicleBrakeMat\.emissiveIntensity = THREE\.MathUtils\.damp/);
  assert.match(source, /vehicleBrakeLights\.forEach\(light/);
});
check('Estate collisions interrupt the vehicle and trigger an impact response', () => {
  assert.match(source, /function moveVehicleSafely\(deltaX, deltaZ\)/);
  assert.match(source, /if \(hitObstacle\) \{ vehicleSpeed \*= 0\.38; vehicleImpact = 0\.24; \}/);
  assert.match(source, /obbIntersectsAabb2D\(body, collider\)/);
  assert.match(source, /obbIntersectsCircle2D\(body, resident\.npc\.position\.x, resident\.npc\.position\.z, 0\.72\)/);
  assert.ok(source.includes('setTextIfChanged(vehicleStatusLabel,'));
});
check('Headlight mode cycles AUTO, ON and OFF, with AUTO tied to day/night rather than car entry', () => {
  assert.match(source, /function currentVehicleLightsOn\(\) \{ return vehicleLightsMode === 'on' \|\| \(vehicleLightsMode === 'auto' && vehicleNightMix > 0\.45\); \}/);
  assert.match(source, /vehicleLightsMode = vehicleLightsMode === 'auto' \? 'on' : vehicleLightsMode === 'on' \? 'off' : 'auto'/);
  assert.match(source, /vehicleNightMix = nightMix/);
  assert.match(source, /vehicleHeadlights\.forEach\(light => \{ light\.intensity = headlightsOn && selectedVehicleType==='suv' \? 2\.65 : 0; \}\)/);
  assert.match(source,/motorcycleHeadlight\.intensity=headlightsOn&&selectedVehicleType==='motorcycle'/);
});
check('Horn uses a short dual-tone Web Audio signal and has a cooldown', () => {
  assert.match(source, /function playVehicleHorn\(\)/);
  assert.match(source, /vehicleHornCooldown = 0\.42/);
  assert.match(source, /for \(const frequency of \[392, 494\]\)/);
  assert.match(source, /oscillator\.stop\(startAt \+ 0\.29\)/);
  assert.match(source, /vehicleHornAudio\.resume\(\)/);
});
check('Vehicle dashboard reports speed, gear, lighting mode, trip distance and driving state', () => {
  assert.match(source, /const speedKmh = Math\.round\(Math\.abs\(vehicleSpeed\) \* 3\.6\)/);
  assert.match(source, /vehicleSpeed < -0\.35 \? 'R' : vehicleSpeed > 0\.35 \? 'D' : 'N'/);
  assert.match(source, /vehicleTripDistance\.toFixed\(2\) \+ ' KM'/);
  for (const id of ['vehicle-hud','vehicle-speed','vehicle-gear','vehicle-light-state','vehicle-trip','vehicle-status']) assert.ok(html.includes(`id="${id}"`));
});
check('Trip distance accumulates from driven movement, not elapsed idle time', () => {
  assert.match(source, /vehicleTripDistance \+= drivenDistance \/ 1000/);
  assert.match(source, /vehicleFuel = Math\.max\(0, vehicleFuel - drivenDistance \* 0\.018 \* \(1-vehicleGarageState\.efficiency\*0\.13\)\)/);
  assert.match(source, /vehicleTripDistance = clamp\(Number\(data\.vehicleSettings\?\.tripDistance\) \|\| 0, 0, 99999\)/);
});
check('PC controls bind horn V, lighting L and a held Space brake without breaking E exit', () => {
  assert.match(source, /e\.code === 'KeyV'[\s\S]*?playVehicleHorn\(\)/);
  assert.match(source, /e\.code === 'KeyL'[\s\S]*?toggleVehicleLights\(\)/);
  assert.match(source, /if \(inVehicle && e\.code === 'Space'\) \{ e\.preventDefault\(\); \}/);
  assert.match(source, /e\.code === 'KeyE'[\s\S]*?interact\(\)/);
  assert.match(html, /vehicle-desktop-hint[\s\S]*?<kbd>V<\/kbd> Klakson[\s\S]*?<kbd>L<\/kbd> Lampu/);
});
check('Mobile joystick is labelled for driving and contextual BRAKE/HORN/LIGHT controls are available', () => {
  assert.ok(source.includes('setTextIfChanged(stickLabel,'));
  assert.match(source, /mobileActions\.classList\.toggle\('driving-controls', inVehicle \|\| inBoat \|\| divingState\.active\)/);
  assert.match(source, /brakeButton\.classList\.toggle\('hidden', !canDrive\)/);
  assert.match(source, /hornButton\.classList\.toggle\('hidden', !canDrive\)/);
  assert.match(source, /lightsButton\.classList\.toggle\('hidden', !canDrive\)/);
  assert.match(source, /brakeButton\.addEventListener\('pointerdown'/);
  assert.match(source, /brakeButton\.addEventListener\('pointerup'/);
  assert.match(source, /hornButton\.addEventListener\('pointerdown'/);
  assert.match(source, /lightsButton\.addEventListener\('pointerdown'/);
  for (const id of ['vehicle-brake-btn','vehicle-horn-btn','vehicle-lights-btn']) assert.ok(html.includes(`id="${id}"`));
  assert.match(css, /\.vehicle-btn/);
  assert.match(css, /\.mobile-actions\.driving-controls \.action-btn/);
  assert.match(css, /@media\(max-width:700px\)\{\.vehicle-hud\{bottom:calc\(6vh \+ 134px\)\}\}/);
  assert.match(css, /@media\(max-width:370px\)\{\.vehicle-hud\{bottom:calc\(6vh \+ 145px\)\}\}/);
});
check('Driving mode hides character-only jump/run buttons and swaps the desktop control hint', () => {
  assert.match(source, /jumpButton\.classList\.toggle\('hidden', inVehicle \|\| inBoat\)/);
  assert.match(source, /sprintButton\.classList\.toggle\('hidden', inVehicle \|\| inBoat\)/);
  assert.match(source, /vehicle-desktop-hint[\s\S]*?classList\.toggle\('hidden', !inVehicle\)/);
  assert.match(source, /desktop-hint[\s\S]*?classList\.toggle\('hidden', inVehicle \|\| inBoat\)/);
});
check('Player cannot enter the SUV while carrying an object and exits beside the vehicle where possible', () => {
  assert.match(source, /if \(!inVehicle && handheldState\.item\) \{ showToast\('SIMPAN BARANG YANG SEDANG DIBAWA SEBELUM MENYETIR'\)/);
  assert.match(source, /const exitOffset=selectedVehicleType==='motorcycle'\?1\.65:2\.45;[\s\S]*?const sideX = Math\.cos\(vehicle\.rotation\.y\) \* exitOffset/);
  assert.match(source, /if \(collides\(exitX, exitZ\)\)/);
  assert.match(source, /vehicleSpeed = 0; vehicleBrakeHeld = false/);
});
check('V18 saves preserve the SUV position, lights, trip counter, fuel and body dirt', () => {
  assert.match(source, /version: 18,[\s\S]*?vehicleSettings: \{ lightsMode: vehicleLightsMode, tripDistance: vehicleTripDistance, fuel: vehicleFuel, dirt: vehicleDirt \}/);
  assert.match(source, /vehicleLightsMode = \['auto','on','off'\]\.includes\(data\.vehicleSettings\?\.lightsMode\) \? data\.vehicleSettings\.lightsMode : 'auto'/);
  assert.match(source, /vehicleTripDistance = clamp\(Number\(data\.vehicleSettings\?\.tripDistance\) \|\| 0, 0, 99999\)/);
  assert.ok(source.includes('![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)'));
});
check('V3–V17 legacy saves and imported backups remain compatible with V18 migration defaults', () => {
  assert.ok(source.includes('![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version) || !data.player'));
  assert.match(source, /vehicleLightsMode = \['auto','on','off'\]\.includes\(data\.vehicleSettings\?\.lightsMode\) \? data\.vehicleSettings\.lightsMode : 'auto'/);
  assert.match(source, /vehicleTripDistance = clamp\(Number\(data\.vehicleSettings\?\.tripDistance\) \|\| 0, 0, 99999\)/);
});
check('Blur, exit and pointer release clear temporary brake state', () => {
  assert.match(source, /window\.addEventListener\('blur', \(\) => \{ keys\.clear\(\); isRunning = false; vehicleBrakeHeld = false; boatBrakeHeld = false; vehicleSpeed = 0; boatSpeed = 0; \}\)/);
  assert.match(source, /brakeButton\.addEventListener\('pointercancel', \(\) => setVehicleBrake\(false\)\)/);
  assert.match(source, /brakeButton\.addEventListener\('lostpointercapture', \(\) => setVehicleBrake\(false\)\)/);
});
check('Runtime diagnostics expose vehicle speed, lights, mileage, steering, braking and chassis response', () => {
  assert.match(source, /vehicle: \{ riderVisible:motorcycleRider\.visible, dustActive: vehicleDustParticles\.filter\(particle => particle\.life > 0\)\.length, dirt: vehicleDirt, washActive: vehicleWashTimer > 0, fuel: vehicleFuel, lightsMode: vehicleLightsMode, headlightsOn: currentVehicleLightsOn\(\), tripDistance: vehicleTripDistance, acceleration: vehicleAcceleration, yawRate: vehicleYawRate/);
  assert.match(source, /brakeLightIntensity: vehicleBrakeMat\.emissiveIntensity, bodyPitch: vehicleBody\.rotation\.x, bodyRoll: vehicleBody\.rotation\.z/);
});
check('Prototype 39 release metadata, package lock, UI and V18 migration are synchronized', () => {
  assert.equal(pkg.version, '0.40.12');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(pkg.scripts['test:game'], /test:vehicle/);
  assert.match(html, /Prototype 40/);
  assert.ok(html.includes('BUILD 0.40.12'));
  assert.match(readme, /Prototype 37 — Neighborhood Expansion & Local Commerce/);
  assert.match(readme, /AUTO \/ ON \/ OFF/);
});

console.log(`\n${passed} vehicle handling and driving checks passed.`);

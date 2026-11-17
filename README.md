## Prototype 40.7 — Corner Cafe Ownership & Business Management
- Added a player-owned Corner Cafe business that can be purchased from the Work & Finance board for $3,600. The physical storefront sign now reflects ownership and operating status.
- Added wholesale inventory management: each restock costs $180 for 12 servings, with 48 servings maximum. An open cafe consumes three servings per operating day.
- Added automatic 07:00 daily business operations with customer growth, reputation progression, sales revenue, and separate staff/utilities expenses recorded in the finance ledger. The business closes automatically if supplies run out.
- Added three upgrade tiers each for a Commercial Espresso Machine and Expanded Patio Seating. Both upgrades improve daily sales and customer count, with higher operating expenses.
- Business ownership, stock, reputation, equipment levels, lifetime sales/costs, and daily payout guards are persisted as optional fields in the existing V18 save. Older saves default to an unowned cafe.
- Added responsive business management controls inside Work & Finance and a direct entry from the physical Corner Cafe storefront, plus runtime diagnostics and a dedicated integration test.
- Improved renderer startup resilience: if a high-performance WebGL context is unavailable, the game retries with a lower-power, no-antialias configuration and records the fallback mode in diagnostics.

## Prototype 40.6 — Motor District Road Rally
- Added two connected paved side streets between North Shore and Harborfront, completing a four-sided driving loop with lane markings, sidewalks, street lighting and five illuminated 3D race gates.
- Added the Motor District Road Rally for the Luxury SUV and Sport Motorcycle. Start at the central North Shore gate, pass all four checkpoints in order, then return to the start/finish line.
- Added a live race HUD with lap timer, next checkpoint, gate progress, medal tier and personal best. Desktop players press **R** at the start line; touch players get a contextual **RALLY** button.
- Race results award a daily cash prize: $210 Gold (26 seconds or faster), $155 Silver (35 seconds or faster), $105 Bronze (48 seconds or faster), or $65 for completing the lap. The best time remains available for replay attempts; the daily prize can only be claimed once per in-game day.
- Best time, completed laps, last medal and daily reward status persist in the existing V18 save format. An interrupted race safely resets on reload, while older saves receive clean Rally defaults.
- Added rally diagnostics and paved-surface recognition for the new streets so vehicles do not accumulate off-road dirt while using the course.

## Prototype 40.5 — City Express Delivery Network
- Added a new vehicle-based logistics contract to Work & Finance. Accept a city dispatch, mount the SUV or Sport Motorcycle, follow the illuminated loading-bay marker and stop within the drop zone to unload.
- Added five destinations across the expanded neighborhood: Corner Cafe, Town Market, Northside Fuel, Riverside Lookout and Harborfront Marina. Each route has its own base reward and delivery deadline.
- On-time deliveries earn a completion bonus, Delivery skill improves contract pay, and using the Sport Motorcycle grants an additional rider bonus. Late drop-offs still pay a reduced base reward.
- Players can accept up to two dispatches per in-game day. Active routes can be cancelled, resume after loading, and persist in the existing V18 save payload. Older saves default to an idle dispatch board.
- Added a live route HUD with destination, timer, delivery status and progress, plus a 3D illuminated cargo drop zone. The new vehicle contract shares the existing wallet, finance ledger, Delivery skill and daily task systems.

## Prototype 40.4 — Estate Motor Showroom & Sport Motorcycle Ownership
- Added a permanent 3D Motor Showroom with a display plinth, sport motorcycle preview, branded sign, sales kiosk and a dedicated delivery bay near the estate entrance.
- Added a purchasable **Sport Motorcycle** for $2,850. After purchase, the player can switch between the existing Luxury SUV and the motorcycle from the showroom; the selected vehicle is delivered to the bay, close enough to the sales kiosk for immediate mounting.
- Built a distinct low-poly motorcycle with twin wheels, tank, engine block, exhaust, fork, handlebar, mirrors, headlight, brake light and chassis lean. A low-poly rider appears in a seated riding pose while the motorcycle is active. It shares the existing enter/exit interaction and driving camera, but has a smaller collision footprint, faster acceleration, higher top speed and more responsive steering.
- Each vehicle now keeps separate fuel, cleanliness and odometer values. Ownership, selected vehicle, and individual vehicle telemetry persist in the existing V18 save payload; V3–V18 saves migrate to the original SUV with the motorcycle still locked.
- Existing SUV garage tuning, paint finishes, fuel service, Auto Spa, lights, horn, mobile driving controls and vehicle collision remain integrated with the active fleet.

## Prototype 40.3 — Estate Motor Garage & Vehicle Tuning
- Added a buildable physical motor garage on the east side of the estate, with an open drive-in bay, service lift, tool bench, overhead work lights and a management kiosk. Construction costs $1,250.
- Added three functional upgrade paths, each with three purchase tiers: Performance ECU raises SUV top speed and acceleration, Sport Steering Rack improves steering authority, and Eco Fuel Mapping reduces fuel consumption.
- Added five SUV body finishes: Midnight Teal (default), Pearl Ivory, Ocean Blue, Deep Burgundy and Sage Green. Alternative finishes cost $220 and update the live 3D vehicle material.
- Garage upgrades, paint, construction state and associated cash transactions persist in the existing V18 save payload. Older saves safely load with an unbuilt garage and stock vehicle setup.
- Garage walls use dynamic collision only while the garage is built; the broad front opening remains driveable, and loading an older unbuilt save removes the garage collision state.

## Prototype 40.2 — Artisan Farm Goods Workshop
- Added a buildable physical Artisan Workshop beside Estate Garden. Construction costs $780 and unlocks a single-batch production station.
- Three value-added recipes: Tomato Preserve (4 tomatoes, 90 game minutes, $105 base sale), Carrot Juice (4 carrots, 75 minutes, $85) and Strawberry Jam (3 strawberries, 120 minutes, $125).
- Production consumes ingredients and 8 Energy at the start. A batch completes automatically as in-game time advances, grants Cooking XP and returns one processed product to inventory.
- Town Market now has a dedicated Artisan Goods sales section. Cooking levels improve processed-goods sale prices by 2% per level.
- Workshop construction, active recipe, production timestamps, lifetime output and crafted inventory persist in V18 saves. The existing farm plots and previous save files remain compatible.

## Prototype 40.1 — Estate Allotment Farming & Harvest Economy
- Added six raised planting beds and an Estate Garden planner on the west side of the property, away from the main driveway and existing garden paths.
- Town Market now sells Tomato, Carrot and Strawberry seed packs (three seeds per pack). Select a seed in the planner, plant an empty bed, then water it to begin growth.
- Crop maturation is tied to in-game time: carrots mature in 3 hours, tomatoes in 4 hours and strawberries in 5 hours. Each plant has three visible growth stages and can only be harvested once mature.
- Harvests enter the player's inventory. Sell fresh produce at Town Market; Gardening levels improve sale prices by 3% per level and add one extra crop to each harvest at levels 3, 6 and 9.
- Planting, watering, harvest yield, XP, daily-task progress and crop sale income all use existing energy, Gardening skill, inventory and finance systems. Plot contents, selected seed and watering timestamps persist in the existing V18 save structure.

## Prototype 40.0 — Guest Suite Rental & Property Income
- Upgraded Guest Suite to level 2 to unlock a real rental business workflow from the existing Property Management panel.
- List the premium suite, schedule a tenant for the next in-game day, then collect automatic rent every morning at 07:00. Each lease runs for seven paid days and can be renewed for another seven days, cancelled before move-in, or ended early.
- Rent pays **$180/day**, less a **$25 management fee**, for **$155 net daily cash flow** before the property's normal household utilities. Gross rent and management costs are separate ledger transactions.
- The suite bedroom is reserved while occupied, and becomes available again after the lease ends or the owner closes the tenancy.
- Tenant, move-in day, lease end, current-contract performance and lifetime rent/fee totals persist in the existing V18 save payload. Older saves default to a vacant rental unit.

## Prototype 39.9 — North Shoal Reef Diving & Marine Discoveries
- Added a dedicated reef-dive station on North Shoal. The player must moor the speedboat, reach the shore station and spend 8 Energy to begin a 90-second underwater expedition.
- Built a shallow underwater reef shelf with coral formations, kelp, animated fish, drifting bubbles and three collectible discoveries: a sunken supply cache, a giant pearl clam and a rare golden seahorse.
- Added underwater swimming controls, depth movement, scuba gear, an oxygen timer and a dedicated dive HUD. Use **WASD** to swim, **SPACE** to rise, **SHIFT** to descend and **E** to collect a nearby find or surface.
- Discoveries pay $85, $125 and $180, with a $220 same-day completion bonus. The new persistent **Diving** skill awards XP and improves exploration payouts by 3% per level.
- Discovery progress and the daily bonus persist in the existing V18 save structure. Interrupted dives safely resume at the island shore; daily discoveries refresh on the next in-game day.

## Prototype 39.8 — Coastal Salvage & Sailing Progression
- Added three animated floating cargo pods in separate coastal lanes. Approach by speedboat, slow below 9 km/h, then recover cargo with **F** (or the mobile **SALVAGE** button).
- Each pod pays $65, $95 or $140, with an additional $180 bonus for recovering all three in one in-game day. The reward ledger records every recovery.
- Added a persistent **Sailing** skill. Salvage runs award Sailing XP, and each level increases cargo payouts by 4%.
- Daily cargo availability resets on the next in-game day. Recovered pods, daily completion bonus, total recoveries and Sailing XP are saved using the existing V18 save structure.

## Prototype 39.7 — Harborfront Coastal Circuit Speedboat Race
- Expanded the marina sea into a wider navigable course and added six highly visible race gates around North Shoal: Start/Finish plus five ordered checkpoints.
- Added a timed speedboat challenge. Use **R** near the Start/Finish gate (or the mobile **RACE** button), steer through all five checkpoints in order, then return to the finish gate.
- Added a live race HUD with elapsed time, next checkpoint, stage progress and personal best. Completing the circuit earns $220 once per in-game day; a faster finish updates the saved best time.
- Extended watercraft navigation bounds to fit the eastern and southern legs. Race best time and daily reward cooldown persist in the existing V18 save structure; an interrupted run safely resets to the marina on reload.

## Prototype 39.6 — North Shoal Island & Coastal Exploration
- Expanded Harborfront's navigable water into **North Shoal Island**, a small offshore destination with a sandy shore, timber landing, palm grove, beach shelter and illuminated beacon.
- Added a proper landing approach: the boat is kept off the island rocks, but can enter a marked dock lane and moor beside the shore. Press E to disembark, explore on foot, then walk back to the boat and reboard without paying another rental fee.
- Added a one-time island discovery reward ($180, Social +16) and a separate hidden treasure chest ($250). Both rewards and island discovery persist.
- Boat docking position, island discovery and treasure state are stored in the established V18 save structure. Saving mid-voyage safely returns the next loaded session to the marina rather than stranding the player; a boat moored at the island remains there. Earlier saves receive safe defaults; fishing and speedboat rental remain available at Harborfront.

## Prototype 39.5 — Harborfront Speedboat Rental & Driving
- The marina's motorboat is now rentable for $45. Board at the end of the public pier and take direct control of the speedboat.
- W/S or the mobile joystick controls throttle and reverse; A/D steers with a speed-sensitive turning response; SPACE or the mobile BRAKE button slows the boat.
- Added a dedicated water-speed HUD, trip odometer, steering helm, chase camera and bounded navigable water area.
- Exiting returns the player to the pier and re-mooring the boat. Boat route distance, rental count, position and heading persist in the established V18 save structure; earlier saves keep the default marina mooring.

## Prototype 39.4 — Harborfront Fishing & Fish Market
- Turned the public pier into a playable fishing activity with a timed bite/reel window, animated bobber and a visible fishing rod prop.
- Each cast costs $8 and 2 Energy and advances the in-game clock. Reeling successfully awards one of three fish tiers: Silver Sardine, Harbor Bass or rare Golden Tuna.
- Added a persistent Fishing skill. Higher levels improve the chance of rare catches; catches grant Fishing XP and count toward daily skill-practice progress.
- Added a fish-market sell-all action with proper cash ledger entries. Fish counts and Fishing XP persist in the existing V18 save structure; older saves receive zero-fish and level-one defaults.

## Prototype 37 follow-up — Harborfront Marina & North Shore Road Network
- Extended the playable world and northbound road beyond Northside Fuel and Riverside Lookout, with a new connected cross street, marina access lane and marked public car park.
- Built **Harborfront Marina** with a timber public pier, guard rails, water, a low-poly motorboat that gently bobs, benches, planters, navigation signage and night lighting.
- Added a walk-up pier exploration activity. The first visit grants $120 and Social +14, costs 3 Energy, advances 30 in-game minutes, records the transaction and advances the scenic-travel daily task.
- Marina discovery is saved in the existing V18 town-discovery field; older saves default to an undiscovered marina. Expanded player, vehicle and world-drop limits safely include the new shoreline.

## Prototype 37 follow-up — Vehicle Reliability & North Shore Travel
- Vehicle collision checks now use the rotated SUV footprint against world walls, shop walls, pumps and residents. Steering rotation is rolled back if the new heading would overlap an obstacle; movement advances in short substeps and slides along a wall when one axis remains clear.
- Steering no longer rotates the SUV while stationary. The odometer advances from actual movement, not wheel speed while blocked.
- Opened the north district gate and extended the drivable road into **North Shore** with **Northside Fuel** and **Riverside Lookout** as functional destinations.
- Added a fuel gauge, distance-based fuel use, low-fuel/out-of-fuel feedback and a refuelling interaction. V18 stores fuel and body cleanliness; V3–V17 saves receive safe defaults (full fuel tank, clean body).
- Riverside discovery provides a one-time cash reward and Social boost. Town destinations contribute to the rotating **Take the Scenic Route** daily task. A small pooled tyre-dust effect appears on dirt/grass and stays off paved roads. Added the functional **Northside Auto Spa** with a rotating brush tunnel, overhead wash jets, cleanliness tracking, variable wash pricing and a new vehicle-care daily task.
- Extended the ground plane and fog range so the new north area has continuous terrain. This is a continuation of the unfinished Prototype 37 vehicle/exploration work; it does not introduce a new prototype number.

## Prototype 39 — Relationship-Driven Hangout Sessions
- Hangout invitations now follow the relationship tiers: Garden Stroll requires Friend (25), Poolside Chill and Coffee Break require Close Friend (50), and Park Picnic requires Best Friend (80).
- Relationship points and Social XP are awarded only after the player reaches the destination and stays with the NPC for the hangout interaction; the timer pauses if the player walks away or remains in a vehicle.
- NPCs wait at the destination for the player instead of silently completing a hangout off-screen. Auto-follow remains available, with manual movement still supported.
- In-progress hangouts are saved and restored, including destination, remaining interaction progress and pending rewards. The save schema advances to V16; V3–V15 saves remain compatible.
- Project release metadata is synchronized at 0.39.3.

## Prototype 38 — Best Friend Hangouts & Town Park Picnic
- Added a fourth, late-game hangout: **Park Picnic** at Town Park, unlocked at Best Friend (80 relationship) and requiring one Fresh Sandwich from Town Market.
- The picnic advances 90 in-game minutes, costs 10 Energy, restores 20 Hunger and 28 Social, grants 24 Social XP, and rewards 22 relationship points plus the resident's usual affinity/mood bonuses.
- Mia now lists picnics among her favorite activities. NPCs walk to the park, show picnic reactions and a small eating gesture, then return a closing line in the dialogue panel.
- Relationship tier thresholds are centralized and the relationship labels expose numeric progress in their tooltip. Existing V15 save data remains unchanged; V3–V15 saves remain compatible.

## Prototype 37 — Neighborhood Expansion & Local Commerce
- Opened the estate's front gate into a new walkable and drivable neighbourhood. The boulevard, cross street, parking bays and extended world bounds let the player and SUV leave the original property without leaving the playable map.
- Built two explorable storefronts with interiors: **Corner Cafe** and **Town Market**. Their doorway openings are traversable, their walls have player/vehicle collision, and both have contextual interaction prompts.
- Added a public **Town Park** with a fountain and a new bench seat. A short park stroll costs 5 Energy, grants 9 Social, and advances 20 in-game minutes.
- Local commerce introduces four usable provisions: Sandwich, Apple, Bottled Water and Butter Pastry. Buy them from the correct store, carry them in BAG, and consume them to restore Hunger, Energy or Hygiene. All purchases appear in the finance ledger.
- Added night streetlights, shopfront signs, storefront furniture, and new location labels. Discovery flags and all provision counts are saved in V15; V3–V14 saves migrate with an empty neighbourhood inventory and compatible progress.

## Prototype 36 — Vehicle Handling & Driving HUD
- Reworked the SUV into a more responsive drive model: gradual acceleration, coasting, controlled reverse, progressive steering, front-wheel steering animation, chassis pitch/roll, brake lamps and collision response.
- Added a live dashboard with speed in km/h, automatic Drive/Reverse/Neutral/Park indication, headlight mode and saved trip distance.
- Headlights now have **AUTO / ON / OFF** modes. AUTO follows the in-game day/night cycle; PC **L** or the mobile LIGHT button cycles modes.
- PC controls: **W** accelerate, **S** reverse/brake, **A/D** steer, **SPACE** handbrake, **V** horn, **L** headlights, **E** exit. On mobile, the left joystick controls steering and throttle; contextual BRAKE, HORN and LIGHT buttons appear while driving.
- Vehicle position, lighting preference and trip distance persist in the V14 save. V3–V13 saves remain compatible and default to AUTO headlights with a zero trip counter.
- Carried objects must be put away before entering the SUV; exiting places the player beside the vehicle where space permits.

## Prototype 35 — Interactive World & Object Physics
- Handheld items can now be thrown into the world with **G** or the mobile DROP button. Gravity, bounce, friction, light tumble and estate collision boundaries turn the prop into a real world object instead of making it disappear.
- Use **H** or PLACE near a kitchen island, dining table, Garden Terrace table or upgraded studio surfaces to set an item down neatly. Walk back to a dropped object and press **E** to pick it up again.
- World objects keep their type, stack count, position and surface placement in the new V13 save field. Older V3–V12 saves remain compatible and simply start with no dropped objects.
- Courier parcel stacks are physical too: dropping a carried delivery removes it from the carried inventory, and the route cannot be completed until every package has been recovered and handed over.
- Added touch-friendly DROP and PLACE buttons that appear only while carrying an item. Picking an item up preserves it in hand across the pickup animation and reloads.

## Prototype 34 — Object Handling & Action Animations
- Added lightweight in-world handheld props for courier parcels, coffee, flower bouquets, books, a watering can and a cooking pan. Props follow the character rather than appearing as detached UI icons.
- Courier pickups now create a visible carried package stack that stays in the character's arms while travelling. The stack updates from 1 to 3 packages, restores from V12 saves, and disappears when the route is delivered.
- Added matching action poses for picking up and handing over parcels, watering plants, cooking, drinking coffee, offering gifts and reading. Two-handed actions use both arms; single-hand actions adjust wrist rotation.
- Drinking coffee and gifting now show the actual held item during the animation. Reading uses the same book prop system, while Garden Care and stove actions have their own tools.
- Object props are transient visuals except courier parcels, which are derived from the already-persisted parcel inventory. No new save fields or schema migration are required.

## Prototype 33 — Expressive Character Interaction & Gestures
- Added contextual one-shot player gestures for greetings, conversations, object interaction, reading, offering gifts, inspections and hands-on work. Gestures blend into the current movement pose rather than snapping the rig into place.
- Added wrist pivots and wrist/hand motion so greetings include a readable hand wave and object interactions feel less like a static arm swing.
- Added an animated reading book prop that appears only during a bookshelf reading gesture, then disappears cleanly when the motion ends.
- Added occasional natural blinking, subtle facial expressions and eyebrow/mouth adjustments to make the player feel less like a frozen mannequin.
- NPC-initiated greetings now receive a player wave when the player is nearby and not busy. NPC conversation and gift actions trigger matching gestures as well.
- Kept camera controls, touch controls and the established V12 save schema intact.

## Prototype 32 — Smooth Third-Person Camera & Controls
- Reworked the follow camera with a damped orbit, smoothed look target and adaptive field of view while sprinting or driving. Camera follow now anticipates a little movement instead of feeling rigidly attached to the character.
- Added collision-aware camera placement: when a house wall or interior object blocks the view, the camera pulls forward rather than clipping through the building.
- Added desktop mouse-wheel zoom and mobile two-finger pinch zoom, plus one-finger drag orbit. Camera distance is smoothly eased and clamped to a playable range.
- Added camera sensitivity presets, optional inverted vertical look and a quick recenter control (C on desktop, reset button on mobile). Preferences are stored separately from game progress.
- Corrected the player-facing yaw so the character turns toward the direction of travel instead of mirroring left/right movement. Existing V12 saves remain compatible.

## Prototype 31 — Character Movement & Articulated Animation
- Rebuilt the player avatar as a lightweight articulated rig with shoulder, elbow, hip, knee, ankle and head pivots. The existing character proportions and outfit palette are retained.
- Added blended idle, walk, sprint, jump, fall and landing poses. Arms counter-swing against the legs, knees and feet animate independently, and the torso/head respond to acceleration and turns.
- Improved movement response with quicker acceleration and braking, while keeping camera-relative controls, collision checks, stairs, touch joystick and the existing jump/sprint controls.
- Added a visible landing compression and a shadow that tightens as the character rises, giving jumps clearer height and impact feedback.
- All motion is procedural and asset-light. It requires no external animation files and keeps the V12 save format unchanged.

## Prototype 30 — Functional Home Activities & Reading
- Turned the placed Bookshelf into a usable furniture interaction. Walk up to any bookshelf and press E to start a reading session; it costs 6 Energy and 30 in-game minutes, grants Career XP (increased by Career level), and improves Social slightly.
- Expanded seated routines so the living-room sofa/TV, coffee nook, garden bench, pool lounger and Garden Terrace are all meaningful activities rather than one-off animations. Sessions now advance the in-game clock, improve Social skill, restore needs and save the resulting progress.
- Added a short activity lockout while the seated animation is playing, preventing rapid repeat inputs. Coffee is only consumed when a valid coffee break starts.
- Kept the existing V12 save format. Reading progress is stored through the existing Career skill, needs and placed-furniture records; older V3–V12 saves remain compatible.

## Prototype 29 — Walk-in West Wing & Functional Room Expansion
- Added two buildable rooms to a new west wing: Creative Studio and Guest Suite. Each room has a construction phase and a premium fit-out phase, bringing property progression to 12 renovation levels.
- Building a room changes the actual floorplan: the old west wall is replaced by a framed doorway, exterior wing walls and roof/floor sections appear, and new collision boundaries prevent walking through the outside walls. The garden bed was relocated to make room for the extension.
- Creative Studio adds a workstation and hands-on workbench. Practicing there costs 10 Energy and 45 minutes, grants 35 Career XP (45 after premium fit-out), and contributes to daily skill-practice objectives.
- Guest Suite adds a furnished bedroom with a usable bed. Sleeping there restores Energy; premium fit-out adds another 10 Energy to the recovery.
- The new rooms are optional fields in the existing V12 save. Old V3–V12 saves continue to load with both new rooms unbuilt; purchased rooms and collision layouts reconstruct after reload.

## Prototype 28 — Home Renovations & Property Progression
- Added a Home Renovations panel linked from the mailbox's property-management screen. Eight permanent upgrade levels span Solar Roof, Kitchen Renovation, Bedroom Suite and Garden Terrace.
- Solar panels visibly appear on the roof and reduce daily utility bills by $15 per level. Kitchen renovation adds visible cabinetry and improves hunger restoration from home-cooked meals. Bedroom upgrades add a premium headboard, rug and lighting while improving sleep recovery.
- Garden Terrace builds a backyard timber deck and pergola with usable outdoor seating. Sitting there restores Social and Energy; the second level adds pergola detailing and stronger comfort bonuses.
- Upgrade purchases are recorded in the personal finance ledger and persist through V12 saves. Existing V3–V12 saves initialize all renovation levels to zero without losing prior progress.

## Prototype 27 — Work Contracts & Personal Finance
- Added a Work & Finance board reachable from the main HUD. It presents Courier Route, Garden Care and Freelance Project contracts with payouts, energy/time costs, skill gates and live availability states.
- Courier and Garden Care now have one contract slot per in-game day, meaningful energy/time entry costs and persisted shift counters. Freelance remains capped at two projects per day and unlocks at Career level 2.
- Added a personal finance ledger with wallet balance, lifetime income/spending totals and the latest 12 transactions. Contract income, daily rewards, purchases and bill payments are recorded.
- New work limits and financial history are optional save fields, so existing V3–V12 saves load with safe defaults while the save schema remains version 12.

## Prototype 26 — Daily Progression & Activity Rewards
- Added a Daily Planner with three rotating objectives that encourage the main life-simulation loop instead of centering one character or one interaction.
- Objectives cover household care, cooking, skill practice, paid work and home decoration. Actions only add progress after successful completion.
- Each objective has a visible progress bar and a claimable cash reward. Claimed rewards and daily progress persist across reloads.
- Objectives rotate on in-game day changes. Older V3–V12 saves safely initialize a fresh daily task set; the established save schema remains version 12.

## Prototype 25 — NPC Social Intelligence & Startup Diagnostics
- Alex and Mia now notice the player as they approach, turn toward them, and show a short greeting reaction. The interaction prompt changes to a contextual greeting while nearby.
- Conversation openers vary by relationship tier, current mood, daily activity and time. Repeated conversations are capped at two relationship-rewarding talks per NPC per in-game day; daily counts persist in saves.
- Gifts now respect each resident's preferences: Alex appreciates bouquets and Mia prefers coffee. Preferred gifts add a small relationship bonus and get a distinct reaction.
- Hangout invitations receive clear acceptance or refusal responses. Sleepy residents defer outdoor activities, focused residents decline pool time, and refusals consume no time, energy, coffee or daily hangout slot.
- Save payload stays at version 12. New optional social counters default safely for existing V3–V12 saves.
- Startup now replaces an endless loading spinner with a readable error screen when WebGL initialization fails or the browser loses its graphics context.

## Prototype 24 — Furniture Placement & Home Customization
- Replaced fixed-position decor placement with a live placement mode: preview an item in the house, aim at a floor tile, rotate it in 45-degree steps, then confirm or cancel.
- Expanded the store with Bookshelf, Side Table and Area Rug alongside Indoor Plant and Floor Lamp. Decor purchases can be repeated and stacked in inventory.
- Furniture can be arranged on either floor; the placement system keeps items inside the interior bounds and blocks the stairwell and bathroom zones.
- Placed furniture coordinates and rotation are saved. Existing V12 saves are migrated from the earlier fixed plant/lamp positions without losing progress.
- Added touch-friendly placement controls plus desktop Q / Enter / Escape shortcuts.

## Prototype 23 — Expressive NPC Body Language
- NPCs now have independent head pivots and mood-driven body language: curious characters tilt forward, sleepy characters droop, focused characters hold a steadier pose, and cheerful characters move more lightly.
- Alex uses slower, restrained gestures while Mia has a more animated idle style, reinforcing their different personalities.
- Mood icons now pulse gently instead of remaining visually static; the existing dialogue, relationship rewards and daily schedules remain intact.
- The update is transient and keeps save data at version 12 for compatibility.

## Prototype 22 — NPC Personality & Mood
- Alex and Mia now have distinct personalities, traits, favorite hangouts and daily energy rhythms.
- Added a live mood system with visible mood icons: Happy, Relaxed, Focused, Curious, Quiet and Sleepy. Mood responds to schedules, favorite activities, time of day and social moments.
- Dialogue now reflects each resident's personality and current mood alongside the existing relationship tier dialogue.
- Favorite hangouts earn a small relationship bonus; a resident's current mood also influences the reward. Their preferred options are called out in the dialogue panel.
- Mood is transient and derived from the current world state, so the save schema stays at version 12 and older saves remain compatible.

## Prototype 21 — NPC Daily Life
- Expanded Alex and Mia's daily schedules with morning routines, garden patrols, shared coffee breaks, dinner, evening downtime and overnight rest.
- Added context animations for drinking coffee, eating, sunbathing, watching TV and resting on seats. Mia automatically turns on the living-room TV for movie night.
- Alex and Mia can now sit together for coffee or dinner, face each other, exchange animated reactions and gestures, and slowly build their relationship through autonomous social time.
- NPCs respect seats occupied by the player, and autonomous conversations pause cleanly when a player-led hangout begins.
- Save data remains version 12; existing progress from versions 3–12 remains compatible.

## Prototype 20
- Added seated activities: watch TV from the living-room sofa, take a coffee break from a coffee stool, relax on the pool lounger, and enjoy a garden moment from the bench.
- Desktop: press R while seated. Touch devices: use the ACT button. E / UP still stands the player up.
- Activities provide small Energy or Social boosts, coffee is consumed from inventory, and short contextual character gestures play.
- Existing save format remains unchanged.

# Estate Explorer — Prototype 27

A browser-playable third-person 3D life simulation built with Three.js and Vite. The game is a static web app: it does not need a backend server, API key, or account login to play.

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

For a production-like build and all gameplay integration checks:
```bash
npm run build
npm run test:game
npm run preview
```

## Deploy to Vercel
1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Keep the detected Vite framework settings, or use:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Click **Deploy**. No environment variables are required.

The included `vercel.json` and `vite.config.js` configure the static output, long-lived caching for hashed assets, and a separate Three.js vendor chunk. The deployed site opens directly into the game's start screen; players do not need the development server or Box preview.

## Controls
- WASD / Arrow keys: move (camera-relative)
- Shift: sprint; Space: jump
- Mouse drag: orbit the camera
- E: interact with residents, mailbox, appliances, bathroom fixtures, parcels, garden tasks, furniture kiosk, placed Bookshelf reading, property terrace and SUV
- Touchscreens: virtual joystick, RUN, JUMP and context-sensitive interact button
- BAG: inventory; STYLE: outfit colors; SKILL: character progression; TASKS: rotating daily objectives and cash rewards; WORK: contracts and personal finance ledger; mailbox: utility bills and home renovations; upstairs desk: study and freelance work; ⚙: graphics, fullscreen and auto-save settings
- SAVE / LOAD or F6 / F9: manual save and restore

## Gameplay in Prototype 12
- Two-storey modern mansion, landscaped garden, pool, driveway and drivable SUV
- Responsive third-person movement and accelerated day/night lighting
- Five daily needs: hunger, energy, social, hygiene and bladder
- Cooking, fridge meals, shower, toilet and sleep interactions
- Alex and Mia with daily routines and relationship meters
- Courier job: collect three parcels and deliver to Mia for a base $450 reward, increased by Courier skill
- Garden Care job: water three marked garden areas for a base $220 reward, increased by Gardening skill
- Household mailbox, daily utility bills ($85 per in-game day) and bill payment panel
- Furniture kiosk, decor placement, flower bouquets and coffee purchases, plus four outfit colors
- Social gifting: give Alex or Mia one gift per day to build relationships; coffee can also restore 22 Energy
- Graphics presets (Low / Balanced / High), fullscreen and automatic save every 45 seconds
- Character skill progression: Cooking, Gardening, Social, Courier and Career XP, levels and gameplay bonuses
- Home Office: study Career XP at the upstairs desk and unlock up to two paid freelance projects per game day at Career level 2
- Automatically restores the most recent local save when the game is reopened
- Import/export save backups to transfer progress between browsers or devices

## Save data
Progress and preferences are saved in the browser's `localStorage`. They remain on that browser/device and are not synced between devices or browsers. Clearing browser site data also clears local progress. The save format is version 12 and remains compatible with game saves from versions 3–12.

## Prototype 12 — NPC relationships and hangouts
- Four relationship tiers: Acquaintance, Friend, Close Friend and Best Friend, with dialogue that changes as trust grows.
- Daily hangouts with Alex or Mia: Garden stroll, Poolside chill and a Coffee break unlocked by relationship progress.
- Each hangout uses in-game time, energy and social needs; Coffee break consumes one coffee and restores energy.
- Daily hangout limits are saved and reset when a new in-game day begins. Save versions 3–11 remain supported.

## Prototype 13 — physical NPC hangouts
- Starting a hangout now sends the selected NPC walking to the matching garden, poolside or lounge spot.
- NPCs use a faster walk cycle while travelling, then settle into an idle pose at the destination before the hangout completes.
- The player can follow the NPC during the walk; the hangout dialogue returns when the NPC arrives and the shared activity finishes.
- Importing save backups now accepts V12 saves as well as earlier supported versions.

 
## Prototype 14 — hangout scenes and gestures
- Garden stroll and poolside hangouts now transition into a relaxed seated pose with subtle body movement.
- NPCs use alternating hand gestures during shared conversation instead of freezing in a static idle pose.
- Coffee breaks show a small held cup, with a repeated lift-and-sip animation and a relaxed arm movement between sips.
- Hangout scenes last 12 seconds before the closing dialogue; all temporary poses and props are reset cleanly afterward.
- These are visual-only scene upgrades; the existing V12 save format and daily hangout progress remain unchanged.

 
## Prototype 15 — companion auto-follow
- Starting a hangout enables automatic player follow, keeping the player a short distance behind the selected NPC while they walk to the activity spot.
- Manual movement always takes priority; when the player releases movement controls, auto-follow resumes.
- Press **F** on desktop to toggle auto-follow. Touch devices get a contextual FOLLOW button during a hangout.
- The follow state is temporary and does not change the V12 save format.


## Prototype 16 — hangout reactions
- Added lightweight floating reaction bubbles above NPCs during hangouts.
- Reactions change by activity: garden stroll, poolside chill, and coffee break each have their own expressive sequence.
- Bubble animation follows the NPC and hides when the hangout ends or normal routines resume.
- No save-data format changes.


## Prototype 19
- Added contextual seating interactions for the living-room sofa, lounge chairs, garden bench, pool lounger and coffee stools.
- Player can stand with interact or move away; seated idle animation and a closer camera frame are applied. Sitting gradually restores energy.
- Alex and Mia now use the garden bench and pool lounger during their matching daily routines.
- Seating is temporary and does not change the existing save-data format.

## Prototype 18
- Face-to-face hangout interaction: nearby characters turn toward each other and use a subtle player conversation gesture.
- Hangout camera briefly widens and centers both characters while they are close and stationary.
- Manual movement and the existing follow toggle remain available.

## Prototype 17 — outdoor hangout destinations
- Added a timber garden bench near the Garden Stroll destination.
- Added a poolside sun lounger with a tilted backrest.
- Added a small coffee table and two stools beside the Coffee Break area.
- Decorative props are static scene geometry; no save-data format changes.

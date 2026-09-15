# Step 5 — cinematic UX

Implementation date: September 12, 2026. Scope: page 7 of the six-part plan, JavaScript/JSX throughout.

## Delivered

- Original lazy React Three Fiber/Drei floating arena: instanced runes/pillars/crystals, stars, subtle fog/light variation and bounded parallax. Static artwork stays available while loading, with Low/reduced-motion settings, after WebGL failure and without optional assets.
- Skippable GSAP portal and player crests during readiness, mouse card tilt, tap/keyboard full-card reveal sheet, accepted-event summon/impact sparks, and Motion victory/guidance transitions. No cinematic gates a move or changes a deadline.
- First-match energy/target/End Turn guidance with nonblocking dismissal and re-opening. Working mute controls with original local synthesized tones. Settings and obsolete card/lobby copy now describe implemented behavior.
- Event-ID deduplication, adjacent-version checks, stale-effect rejection and no animation queue. Effects occupy the divider, not hero health, energy, targets or the turn bar. Card selection survives unrelated opponent events.
- Optional scene failure handling, hidden-tab pause, offscreen unmount, geometry reuse, capped rendering resolution, and an enforced compressed bundle budget.
- Connection-module failure recovery and result-list isolation when the signed-in account changes.

The renderer declares React >=19 <19.3, so React/ReactDOM were aligned to 19.2.8. A clean lockfile install and `npm ls` confirmed compatible installed peers. Rendering and animation dependencies belong only to the frontend workspace.

## Verification

| Check                      | Observed result                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run check`            | Lint, formatting, 94 unit/component tests, production build and server/package validation passed        |
| `npm run test:integration` | 38 passed, including real-service multiplayer concurrency and process crash recovery                    |
| `npm run test:e2e`         | 43 passed; 2 intentionally skipped duplicate account journeys; maximum-board visual fixture also passed |
| Optional payload gate      | Arena plus GSAP: 270,602 gzip bytes, below the 5,000,000-byte budget                                    |

Targeted testing exercised complete online matches with Low graphics (desktop), a scene request held pending (laptop), and simulated unavailable WebGL (phone). The graphics journeys exercise context loss, restoration via settings/navigation, reduced motion, hidden-tab pause and keyboard dialog dismissal. No automated accessibility violations were found in the tested shell, deck editor, battle board or card sheet.

Screenshot review found that the stylesheet reset left native dialogs aligned at the top-left. Step 5 explicitly centers them within the viewport, limits their height and adds card-sheet position checks. Readiness and results panels received proper spacing. Final regression totals and local-stack checks are recorded below after those checks finish.

The first scene used many repeated mesh draws and measured about 32 fps under SwiftShader. It was simplified with instancing and software-renderer resolution reduction. No claim of hardware-GPU or physical-phone profiling is made. The available host is Windows, AMD Ryzen 5 5500U, 12 logical processors, approximately 15 GiB RAM; Chromium uses ANGLE SwiftShader. Samples count actual React Three Fiber frames after warm-up, with Playwright tracing disabled to avoid capture overhead.

Final samples were approximately 60 fps at all three viewports, using a 0.65 internal pixel ratio on SwiftShader. Raw samples include frame counts, duration, viewport, browser and renderer: [desktop](evidence/part-5-performance-desktop.json), [laptop](evidence/part-5-performance-laptop.json), [phone](evidence/part-5-performance-phone.json). These are short rendering samples, not long-running load-test results. Low mode uses static artwork and no active 3D render loop.

## Screen-state coverage

| Journey                     | Evidence                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login/register/decks        | Real separate-account persistence; invalid credentials; editor filters, inspection, failed-save recovery and confirmed deletion                                             |
| Lobby/queue/readiness       | Service loading/failure/retry; queued cancel control; atomic join/cancel integration checks; skippable portal and immediate readiness                                       |
| Battle                      | Full keyboard practice outcome; two-browser turn/reload/surrender/persisted outcome; maximum hand/boards; guidance dismissal/reopening; card-sheet Escape/focus restoration |
| Results/history/leaderboard | Saved result visible to both players; loss/win in their respective histories; one leaderboard win; pending persistence and duplicate-credit prevention in service tests     |
| Settings/3D                 | Preferences survive navigation/reload; system reduced motion wins; hidden canvas pauses; no canvas in Low; lost/unavailable WebGL falls back while gameplay remains usable  |

Reference captures: [desktop lobby](evidence/part-5-lobby-desktop.png), [phone lobby](evidence/part-5-lobby-phone.png), [portal](evidence/part-5-portal-laptop.png), [desktop card sheet](evidence/part-5-card-desktop.png), [phone card sheet](evidence/part-5-card-phone.png), [phone battle](evidence/part-5-battle-phone.png), and [victory](evidence/part-5-victory-desktop.png). These are rendered reference images with layout/accessibility assertions, not a claim of cross-device pixel-identical rendering.

## Boundaries

The game remains usable without 3D. Low is intentionally static, so no 3D frame-rate target applies to that mode. The 60 fps desktop target is a measured-device target, not a promise for every device. Mobile checks emulate 390×844 in Chromium; they are not physical-phone measurements.

No new gameplay effects, ultimate command or legendary definitions were added to the immutable catalog. Stronger summon styling applies to supported presentation fixtures and existing high-cost units. Screen shake is omitted to protect tactical clarity and motion comfort. No external bitmap assets are needed.

Production provisioning, staging/load testing and release operations remain Step 6. No production deployment or remote CI execution is claimed.

See [animation map](part-5-animation-map.md), [asset licenses](assets.md), [architecture](ARCHITECTURE.md), and [setup](../README.md).

# Step 3 delivery report

Implemented September 11, 2026 in JavaScript/JSX, preserving the requested frontend/backend layout. Scope is Part 3 of the six-part implementation PDF: deterministic engine, safe player views, a legal-action bot and a complete 2D practice match.

## Delivered

1. Pure `createMatch`, `validateAction`, `applyAction`, `advanceTurn`, `advanceTime`, `resolveDeaths`, `determineOutcome` and `projectForPlayer`. Seeded shuffling, detached frozen definitions, strict command validation, version checks and ordered deadline catch-up have no database, socket or ambient clock dependencies.
2. Units, simultaneous combat, summoning delay, Guard, Shield, damage/heal/shield spells, energy caps, hand overflow, escalating fatigue, surrender, simultaneous defeat and the turn-100 draw boundary. Every supported effect is tested.
3. Explicit player-safe serialization. Snapshots expose the player's hand and public character data/counts, without opponent hand IDs, either deck order, private discard contents or seed.
4. Local practice through a replaceable adapter. Its bot uses the same validation and action application as the human. Guest practice uses a starter deck; signed-in users can practice with a saved deck from the lobby. Practice never writes account results or wins.
5. A responsive 2D board with five slots per side, horizontally scrollable hand, health/energy/counts, turn owner, countdown, legal target controls, card details, keyboard controls, surrender confirmation and victory/defeat/draw dialogs. Pending/rejected/resync states avoid optimistic health or energy changes. Only accepted events trigger a brief status pulse, disabled by reduced motion.

## Observed verification

| Command/check                   | Result                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run test:integration`      | 19 passed, real MongoDB and Redis                                                        |
| `npm run test:e2e`              | 34 passed; 2 intentionally skipped duplicate two-account journeys                        |
| Keyboard-only complete practice | Passed at 1440×900, 1280×720 and 390×844                                                 |
| Automated accessibility         | No violations in tested shell pages, deck editor and practice board                      |
| Maximum board/hand              | Both five-unit boards and ten-card hand rendered and checked at all three viewport sizes |
| Production frontend build       | Passed; initial JS 485.95 kB / 151.46 kB gzip; lazy practice JS 21.19 kB / 7.66 kB gzip  |
| Clean Linux image build         | `npm ci` and production build passed                                                     |

The final Step 3 unit/component run passed 87 tests. Full-stack smoke and the real Redis stop/restart recovery check passed. Captured evidence: [desktop](evidence/part-3-desktop.png), [phone](evidence/part-3-phone.png), [maximum desktop](evidence/part-3-maximum-desktop.png), and [maximum phone](evidence/part-3-maximum-phone.png).

The browser suite also exercised a saved owned deck, catalog failure followed by retry, card inspection, confirmed/cancelled surrender and practice restart. Keyboard journeys use Tab/Enter and advance an injected browser clock to avoid waiting real minutes; they summon a unit, end turns and reach a natural terminal result through the bot/engine. They do not call hidden engine hooks or surrender to manufacture completion.

Maximum-capacity layout evidence uses server-rendered real React components with a deterministic fixture inside the actual application layout. This separate visual fixture is not a production route and is not evidence of interactive gameplay; the live practice journeys provide that evidence.

One phone accessibility failure found empty scrollable unit rows lacked keyboard focus. Adding `tabIndex=0` to the labeled board sections fixed it, and the complete browser suite passed afterward. jsdom lacks native dialog methods, so component tests simulate only open/closed state; real Playwright checks cover actual dialog behavior.

## Run and boundaries

Open **http://localhost:5173/practice**, choose Start practice, and use a card/unit then its legal action or target. Alternatively, select a saved deck in the lobby and choose Practice with deck. Reloading/leaving ends local practice; this is stated in the interface.

Online matchmaking, readiness/disconnect scheduling, atomic Redis commits/deduplication, persisted results, rankings and interactive 3D remain later milestones. No remote CI run or production deployment is claimed. Local practice is inspectable browser code and is not an online authority.

See the [rules checklist](part-3-rules-tests.md), [transport contract](part-3-transport.md), [engine API](../backend/src/services/gameEngine/README.md), and [setup instructions](../README.md).

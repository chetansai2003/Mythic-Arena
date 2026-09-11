# Step 3 rules-to-test checklist

Engine scenarios live in `backend/tests/engine.test.js`; fixtures use the real catalog. Adapter and board tests are alongside their frontend implementations. Browser journeys are in `tests/e2e/practice.spec.js`.

| Rules   | Automated coverage                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| R01–R02 | Complete decks, copy validation, duplicate instance rejection, detached definitions, deterministic shuffle/first player, opening values       |
| R03–R04 | First draw skip, per-player refill capped at 10, attack reset, exact deadline precedence, multiple missed deadlines, backwards time rejection |
| R05     | Entry delay, one attack, full five-slot board, energy spending and rejection                                                                  |
| R06     | Enemy target validation, Guard priority, spell bypass                                                                                         |
| R07     | Simultaneous unit damage/deaths, both discards, hero non-retaliation                                                                          |
| R08     | Positive damage consumes Shield; zero damage preserves it; retaliation still resolves; repeated Shield does not stack                         |
| R09–R10 | Every finite effect, target faction, dead/missing target rejection, healing cap, unit keywords, spell discard                                 |
| R11     | Full-hand burn, independent fatigue counters, shielded fatigue, fatigue defeat                                                                |
| R12     | Lethal spell, surrender, simultaneous defeat, defeat precedence at turn 100, draw without turn 101, terminal immutability                     |
| R13–R14 | Online readiness/disconnect orchestration is Step 4; not claimed as implemented here                                                          |
| R15     | Practice explicitly labeled, no account win writes                                                                                            |
| R16     | Frozen definitions, allowlisted snapshots, no hidden instance IDs or seed, detached view objects                                              |

Complete bot games additionally check conservation of all 30 instances per player, hand/board limits, nonnegative energy, legal actions, wire-schema validity and identical seed/action replay. Frontend tests cover pending, rejected and resync states, no optimistic spending, terminal dialogs and maximum board/hand rendering. Browser tests cover keyboard completion, starter and saved-deck starts, catalog failure recovery, surrender confirmation, accessibility and desktop/laptop/phone layouts.

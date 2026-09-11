# Step 3 implementation plan

Scope follows Part 3 of the six-part PDF: deterministic rules, finite effects, private projections, a legal-action bot, and a complete 2D practice screen behind a replaceable transport.

1. Implement pure match creation, validation, action application, turn advancement, simultaneous damage/death handling, outcomes and safe projection. Inject seed and time; preserve inputs on rejection. Process due turn deadlines before player inputs.
2. Implement DAMAGE, HEAL, SHIELD and GUARD; validate frozen deck snapshots. Exercise every rule with deterministic fixtures, full hands/boards, fatigue, turn limit and terminal immutability. Add legal action enumeration for the practice bot.
3. Add a local practice adapter owning private state, emitting only snapshots and public accepted events. Model pending/rejected/resync explicitly. Use the public catalog and optionally a saved deck; no practice result earns account wins.
4. Build the responsive board, hand, legal targets, inspection, timer, surrender and outcome dialogs. Support keyboard selection/targeting and explicit practice labels.
5. Run engine/component/API/browser checks, complete a keyboard practice game, inspect desktop and phone screenshots, verify maximum hand/board layouts, and record evidence.

Readiness reservations, durable disconnect timers, Redis action deduplication/commit, sockets and persisted results remain Step 4. Pure practice creation starts an active match immediately; its local clock is replaceable by server time in the future transport.

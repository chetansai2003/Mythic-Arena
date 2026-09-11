# Game engine boundary

Part 3 will implement createMatch, validateAction, applyAction, advanceTurn,
resolveDeaths, determineOutcome, and projectForPlayer. They accept time and seeded
randomness as inputs; no database, socket, browser, or process access belongs here.
Part 1 exports the rules contract. Part 2 adds a finite effect/keyword registry
with explicit `implemented: false` flags for catalog validation. There is no
playable engine yet, and battle availability remains false for every seeded card.

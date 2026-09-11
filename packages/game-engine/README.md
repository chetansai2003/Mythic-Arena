# Game engine boundary

Part 3 will implement createMatch, validateAction, applyAction, advanceTurn,
resolveDeaths, determineOutcome, and projectForPlayer. They accept time and seeded
randomness as inputs; no database, socket, browser, or process access belongs here.
Part 1 exports only the rules contract. There is no playable engine yet.

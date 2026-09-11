// Deterministic contract fixtures, never a production catalog or live match.
export const unitFixture = {
  id: 'fixture_guard',
  version: 1,
  rulesVersion: '1',
  name: 'Fixture Guardian',
  faction: 'NORSE',
  rarity: 'COMMON',
  cost: 2,
  artRef: null,
  kind: 'UNIT',
  attack: 2,
  health: 3,
  keywords: ['GUARD'],
};
export function snapshotFixture() {
  const player = {
    displayName: 'Test player',
    health: 20,
    maxHealth: 20,
    energy: 1,
    maxEnergy: 1,
    shield: false,
    connected: true,
    deckCount: 25,
    board: [],
  };
  return {
    gameId: 'fixture_game',
    rulesVersion: '1',
    version: 0,
    status: 'ACTIVE',
    serverNow: 1000,
    readyEndsAt: null,
    turn: { number: 1, playerId: 'p1', endsAt: 31000 },
    self: {
      ...player,
      id: 'p1',
      hand: [{ instanceId: 'ci1', definition: structuredClone(unitFixture) }],
    },
    opponent: { ...player, id: 'p2', handCount: 5 },
    outcome: null,
    resultStatus: 'NONE',
  };
}

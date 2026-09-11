import { describe, expect, it } from 'vitest';
import { acceptedEventSchema, snapshotSchema } from '@mythic/shared';
import {
  createMatch,
  applyAction,
  advanceTime,
  advanceTurn,
  chooseBotAction,
  determineOutcome,
  legalActions,
  projectForPlayer,
  resolveDeaths,
  validateAction,
} from '@mythic/game-engine';
import {
  activeFixture,
  command,
  definitions,
  fixture,
  hero,
  instance,
  targetUnit,
  unit,
} from './engine-fixtures.js';

const play = (state, id, target) =>
  applyAction(
    state,
    'alpha',
    command(state, 'PLAY_CARD', {
      cardInstanceId: id,
      ...(target ? { target } : {}),
    }),
    1001,
  );
const attack = (state, target, attackerId = 'wolf') =>
  applyAction(
    state,
    'alpha',
    command(state, 'ATTACK', { attackerId, target }),
    1001,
  );

describe('creation and deterministic boundaries', () => {
  it('freezes input copies, shuffles deterministically and initializes rule values', () => {
    const state = fixture();
    expect(state).toEqual(fixture());
    expect(state.players.map((p) => p.hand)).not.toEqual(
      fixture('different').players.map((p) => p.hand),
    );
    for (const player of state.players) {
      expect(player.health).toBe(20);
      expect(player.hand).toHaveLength(5);
      expect(player.deck).toHaveLength(25);
      expect(player.board).toEqual([]);
      expect(player.energy).toBe(player.id === state.turn.playerId ? 1 : 0);
    }
    const all = state.players.flatMap((p) => [...p.hand, ...p.deck]);
    all[0].definition.name = 'Edited snapshot';
    expect(
      Object.values(definitions).some((d) => d.name === 'Edited snapshot'),
    ).toBe(false);
  });
  it('rejects illegal decks and duplicate instance IDs', () => {
    const players = fixture().players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      cards: [...p.hand, ...p.deck],
    }));
    players[1].cards[0].instanceId = players[0].cards[0].instanceId;
    expect(() =>
      createMatch({ gameId: 'test', seed: 'a', now: 0, players }),
    ).toThrow(/unique/);
    players[1].cards.pop();
    expect(() =>
      createMatch({ gameId: 'test', seed: 'a', now: 0, players }),
    ).toThrow();
  });
  it.each([
    ['wrong actor', (s) => command(s, 'END_TURN'), 'intruder'],
    [
      'stale version',
      (s) => ({ ...command(s, 'END_TURN'), expectedVersion: 99 }),
      'alpha',
    ],
    [
      'unknown fields',
      (s) => ({ ...command(s, 'END_TURN'), playerId: 'alpha' }),
      'alpha',
    ],
    [
      'wrong game',
      (s) => ({ ...command(s, 'END_TURN'), gameId: 'other' }),
      'alpha',
    ],
    [
      'unknown hand card',
      (s) => command(s, 'PLAY_CARD', { cardInstanceId: 'missing' }),
      'alpha',
    ],
    ['wrong turn', (s) => command(s, 'END_TURN'), 'beta'],
  ])('rejects %s without mutating any state', (_name, build, actor) => {
    const state = activeFixture();
    const before = structuredClone(state);
    const result = applyAction(state, actor, build(state), 1001);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state).toEqual(before);
    expect(result.events).toEqual([]);
  });
  it('resolves a deadline before accepting a command at the exact boundary', () => {
    const state = activeFixture();
    const result = applyAction(
      state,
      'alpha',
      command(state, 'END_TURN'),
      state.turn.endsAt,
    );
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('STALE_VERSION');
    expect(result.state.turn.number).toBe(2);
    expect(result.state.turn.playerId).toBe('beta');
    expect(result.events).toHaveLength(1);
    expect(state.turn.number).toBe(1);
  });
  it('catches up missed deadlines with scheduled times and rejects backwards clocks', () => {
    const state = fixture();
    const result = advanceTime(state, 91000);
    expect(result.state.turn.number).toBe(4);
    expect(result.state.turn.endsAt).toBe(121000);
    expect(result.events.map((e) => e.occurredAt)).toEqual([
      31000, 61000, 91000,
    ]);
    expect(() => advanceTime(state, 999)).toThrow(/backwards/);
  });
});

describe('units, targets and combat', () => {
  it('summons with entry keywords, spends once and enforces entry delay', () => {
    const state = activeFixture();
    state.players[0].hand = [instance('obsidian_scarab', 'scarab')];
    const result = play(state, 'scarab');
    expect(result.state.players[0].energy).toBe(7);
    expect(result.state.players[0].board[0]).toMatchObject({
      shield: true,
      canAttack: false,
    });
    expect(attack(result.state, hero('beta'), 'scarab').ok).toBe(false);
    let next = advanceTurn(result.state, 1002).state;
    next = advanceTurn(next, 1003).state;
    expect(next.players[0].board[0].canAttack).toBe(true);
  });
  it('rejects full boards, unaffordable cards and unit targets', () => {
    const state = activeFixture();
    state.players[0].hand = [instance('aurora_wolf')];
    state.players[0].board = Array.from({ length: 5 }, (_, n) =>
      unit('aurora_wolf', `slot_${n}`),
    );
    expect(play(state, 'aurora_wolf').error.message).toMatch(/full/);
    state.players[0].board = [];
    state.players[0].energy = 0;
    expect(play(state, 'aurora_wolf').error.message).toMatch(/energy/);
    state.players[0].energy = 10;
    expect(play(state, 'aurora_wolf', hero('beta')).ok).toBe(false);
  });
  it('resolves simultaneous unit deaths, conserves both discarded cards and prevents retaliation from heroes', () => {
    const state = activeFixture();
    state.players[0].board = [unit('aurora_wolf', 'wolf')];
    state.players[1].board = [unit('aurora_wolf', 'enemy')];
    const result = attack(state, targetUnit('enemy'));
    expect(result.state.players.map((p) => p.board.length)).toEqual([0, 0]);
    expect(
      result.state.players.map((p) => p.discard.at(-1).instanceId),
    ).toEqual(['wolf', 'enemy']);
    const hitHero = attack(state, hero('beta'));
    expect(hitHero.state.players[1].health).toBe(18);
    expect(hitHero.state.players[0].board[0].health).toBe(1);
    expect(attack(hitHero.state, hero('beta')).ok).toBe(false);
  });
  it('requires a Guard target for attacks but permits damage spells to bypass it', () => {
    const state = activeFixture();
    state.players[0].board = [unit('aurora_wolf', 'wolf')];
    state.players[1].board = [unit('frostwatch_sentinel', 'guard')];
    expect(attack(state, hero('beta')).error.message).toMatch(/Guard/);
    expect(attack(state, targetUnit('guard')).ok).toBe(true);
    state.players[0].hand = [instance('winter_spark')];
    expect(
      play(state, 'winter_spark', hero('beta')).state.players[1].health,
    ).toBe(17);
  });
  it('consumes shield on positive damage only and applies retaliation despite shield', () => {
    const state = activeFixture();
    state.players[0].board = [
      unit('aurora_wolf', 'wolf', { attack: 0, shield: true }),
    ];
    state.players[1].board = [unit('obsidian_scarab', 'enemy')];
    const result = attack(state, targetUnit('enemy'));
    expect(result.state.players[1].board[0].shield).toBe(true);
    expect(result.state.players[0].board[0]).toMatchObject({
      health: 1,
      shield: false,
    });
  });
  it('rejects friendly attacks, missing targets and another player’s attacker', () => {
    const state = activeFixture();
    state.players[0].board = [unit('aurora_wolf', 'wolf')];
    expect(attack(state, hero('alpha')).ok).toBe(false);
    expect(attack(state, targetUnit('missing')).ok).toBe(false);
    expect(attack(state, hero('beta'), 'enemy').ok).toBe(false);
  });
});

describe('finite effects and draw rules', () => {
  it.each(['winter_spark', 'hearthsong', 'aegis_of_echoes'])(
    'resolves %s with correct target, cost and discard',
    (id) => {
      const state = activeFixture();
      state.players[0].health = 18;
      state.players[0].hand = [instance(id)];
      const enemy = definitions[id].effect.key === 'DAMAGE';
      expect(play(state, id, hero(enemy ? 'alpha' : 'beta')).ok).toBe(false);
      expect(play(state, id, targetUnit('dead')).ok).toBe(false);
      const result = play(state, id, hero(enemy ? 'beta' : 'alpha'));
      expect(result.ok).toBe(true);
      expect(result.state.players[0].energy).toBe(10 - definitions[id].cost);
      expect(result.state.players[0].discard.at(-1).instanceId).toBe(id);
      if (enemy) expect(result.state.players[1].health).toBe(17);
      else if (id === 'hearthsong')
        expect(result.state.players[0].health).toBe(20);
      else expect(result.state.players[0].shield).toBe(true);
    },
  );
  it('heals a unit only to initial max health and shield never stacks', () => {
    const state = activeFixture();
    state.players[0].board = [
      unit('frostwatch_sentinel', 'hurt', { health: 1 }),
    ];
    state.players[0].hand = [
      instance('hearthsong'),
      instance('aegis_of_echoes'),
      instance('lantern_ward'),
    ];
    let next = play(state, 'hearthsong', targetUnit('hurt')).state;
    expect(next.players[0].board[0].health).toBe(4);
    next = play(next, 'aegis_of_echoes', targetUnit('hurt')).state;
    next = play(next, 'lantern_ward', targetUnit('hurt')).state;
    expect(next.players[0].board[0].shield).toBe(true);
  });
  it('burns overflow without fatigue and ramps energy only for the new turn owner', () => {
    const state = activeFixture();
    state.players[1].hand = Array.from({ length: 10 }, (_, n) =>
      instance('aurora_wolf', `hand_${n}`),
    );
    const burned = state.players[1].deck[0];
    const result = advanceTurn(state, 1001).state;
    expect(result.players[1].hand).toHaveLength(10);
    expect(result.players[1].discard.at(-1)).toEqual(burned);
    expect(result.players[1].fatigue).toBe(0);
    expect(result.players[1].energy).toBe(1);
    expect(result.players[0].energy).toBe(10);
  });
  it('fatigues independently, consumes hero shield and does not exceed ten energy', () => {
    let state = activeFixture();
    state.players[1].deck = [];
    state.players[1].shield = true;
    state = advanceTurn(state, 1001).state;
    expect(state.players[1]).toMatchObject({
      fatigue: 1,
      health: 20,
      shield: false,
    });
    state = advanceTurn(state, 1002).state;
    expect(state.players[0].energy).toBe(10);
    state = advanceTurn(state, 1003).state;
    expect(state.players[1]).toMatchObject({ fatigue: 2, health: 18 });
    expect(state.players[0].fatigue).toBe(0);
  });
});

describe('outcomes, privacy and full games', () => {
  it('ends on spell lethal and rejects all subsequent actions', () => {
    const state = activeFixture();
    state.players[1].health = 3;
    state.players[0].hand = [instance('winter_spark')];
    const result = play(state, 'winter_spark', hero('beta'));
    expect(result.state.outcome).toEqual({
      kind: 'WIN',
      winnerId: 'alpha',
      reason: 'DEFEAT',
    });
    expect(result.state.turn).toBe(null);
    expect(result.events[0].type).toBe('MATCH_ENDED');
    const rejected = applyAction(
      result.state,
      'alpha',
      command(result.state, 'END_TURN'),
      1002,
    );
    expect(rejected.state).toBe(result.state);
    expect(rejected.ok).toBe(false);
  });
  it('allows out-of-turn surrender but never an outsider surrender', () => {
    const state = activeFixture();
    expect(
      applyAction(state, 'beta', command(state, 'SURRENDER'), 1001).state
        .outcome.winnerId,
    ).toBe('alpha');
    expect(
      applyAction(state, 'intruder', command(state, 'SURRENDER'), 1001).ok,
    ).toBe(false);
  });
  it('resolves fatigue defeat, simultaneous hero defeat and turn 100 without starting 101', () => {
    const state = activeFixture();
    state.players[1].deck = [];
    state.players[1].health = 1;
    expect(advanceTurn(state, 1001).state.outcome.winnerId).toBe('alpha');
    state.players.forEach((p) => {
      p.health = 0;
    });
    expect(determineOutcome(state)).toEqual({
      kind: 'DRAW',
      reason: 'SIMULTANEOUS_DEFEAT',
    });
    state.players.forEach((p) => {
      p.health = 20;
    });
    state.turn.number = 100;
    expect(advanceTurn(state, 1001).state.outcome).toEqual({
      kind: 'DRAW',
      reason: 'TURN_LIMIT',
    });
    state.players[1].health = 0;
    expect(advanceTurn(state, 1001).state.outcome.kind).toBe('WIN');
  });
  it('removes every dead unit without mutating the supplied state', () => {
    const state = fixture();
    state.players[0].board = [
      unit('aurora_wolf', 'dead', { health: 0 }),
      unit('aurora_wolf', 'alive'),
    ];
    const next = resolveDeaths(state);
    expect(next.players[0].board.map((u) => u.instanceId)).toEqual(['alive']);
    expect(state.players[0].board).toHaveLength(2);
  });
  it('serializes only allowlisted public data and detached own hand', () => {
    const state = fixture('secret_seed');
    state.internalToken = 'secret_internal';
    const view = projectForPlayer(state, 'alpha', 1000);
    expect(snapshotSchema.safeParse(view).success).toBe(true);
    const wire = JSON.stringify(view);
    for (const hidden of [
      ...state.players[1].hand,
      ...state.players[0].deck,
      ...state.players[1].deck,
    ])
      expect(wire).not.toContain(hidden.instanceId);
    expect(wire).not.toMatch(/secret_seed|secret_internal|discard|fatigue/);
    view.self.hand[0].definition.name = 'Changed';
    expect(state.players[0].hand[0].definition.name).not.toBe('Changed');
    expect(() => projectForPlayer(state, 'observer', 1000)).toThrow(
      /participants/,
    );
  });
  it('runs deterministic legal bot games with conservation and nonnegative energy after every transition', () => {
    function run() {
      let state = fixture();
      const log = [];
      for (let n = 0; n < 1500 && state.status === 'ACTIVE'; n++) {
        const actor = state.turn.playerId;
        const action = chooseBotAction(state, actor);
        expect(legalActions(state, actor)).toContainEqual(action);
        expect(validateAction(state, actor, action).ok).toBe(true);
        const result = applyAction(state, actor, action, 1000 + n);
        expect(result.ok).toBe(true);
        state = result.state;
        for (const player of state.players) {
          expect(player.energy).toBeGreaterThanOrEqual(0);
          expect(player.energy).toBeLessThanOrEqual(player.maxEnergy);
          expect(player.hand.length).toBeLessThanOrEqual(10);
          expect(player.board.length).toBeLessThanOrEqual(5);
          expect(
            player.deck.length +
              player.hand.length +
              player.board.length +
              player.discard.length,
          ).toBe(30);
          snapshotSchema.parse(projectForPlayer(state, player.id, 1000 + n));
        }
        result.events.forEach((e) => acceptedEventSchema.parse(e));
        log.push(action);
      }
      expect(state.status).toBe('TERMINAL');
      return { state, log };
    }
    expect(run()).toEqual(run());
  });
});

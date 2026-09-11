import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMatch, projectForPlayer } from '@mythic/game-engine';
import BattleBoard from './BattleBoard.jsx';

const definition = (n) => ({
  id: `card_${n}`,
  name: `Frost warrior ${n}`,
  faction: 'NORSE',
  rarity: 'COMMON',
  cost: 1,
  kind: 'UNIT',
  attack: 2,
  health: 3,
  keywords: [],
  version: 1,
  rulesVersion: '1',
  artRef: null,
});
const catalog = Array.from({ length: 15 }, (_, n) => definition(n));
function fixture() {
  const state = createMatch({
    gameId: 'board',
    seed: 'board',
    now: Date.now(),
    players: ['self', 'opponent'].map((id) => ({
      id,
      displayName: id,
      cards: catalog.flatMap((definition, n) =>
        [0, 1].map((copy) => ({
          instanceId: `${id}_${n}_${copy}`,
          definition,
        })),
      ),
    })),
  });
  state.turn.playerId = 'self';
  state.players[0].energy = state.players[0].maxEnergy = 10;
  const transport = {
    getSnapshot: () => feed,
    subscribe: (listener) => {
      transport.listener = listener;
      return () => {};
    },
    send: vi.fn(),
    resync: vi.fn(),
    tick: vi.fn(),
  };
  let feed = {
    snapshot: projectForPlayer(state, 'self', Date.now()),
    connection: 'ready',
    events: [],
  };
  return {
    state,
    transport,
    setFeed: (next) => {
      feed = next;
    },
    feed,
  };
}
function show(transport) {
  render(
    <MemoryRouter>
      <BattleBoard
        transport={transport}
        catalog={catalog}
        onRestart={() => {}}
      />
    </MemoryRouter>,
  );
}

it('selects and submits with keyboard without optimistic energy or hand changes', async () => {
  const { transport, feed } = fixture();
  const user = userEvent.setup();
  show(transport);
  const card = feed.snapshot.self.hand[0];
  const button = screen.getByRole('button', {
    name: new RegExp(card.definition.name),
  });
  button.focus();
  await user.keyboard('{Enter}');
  const summon = screen.getByRole('button', {
    name: `Summon ${card.definition.name}`,
  });
  summon.focus();
  await user.keyboard('{Enter}');
  expect(transport.send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'PLAY_CARD',
      expectedVersion: 0,
      payload: { cardInstanceId: card.instanceId },
    }),
  );
  expect(screen.getByText('10 / 10 energy')).toBeVisible();
  expect(button).toBeVisible();
});

it('renders the maximum ten-card hand and both five-unit boards with readable values', () => {
  const { state, transport, setFeed } = fixture();
  state.players[0].hand.push(...state.players[0].deck.splice(0, 5));
  for (const player of state.players)
    player.board = player.deck.splice(0, 5).map((card) => ({
      instanceId: card.instanceId,
      definitionId: card.definition.id,
      definition: card.definition,
      attack: 2,
      health: 3,
      maxHealth: 3,
      guard: true,
      shield: true,
      canAttack: true,
    }));
  setFeed({
    snapshot: projectForPlayer(state, 'self', Date.now()),
    connection: 'ready',
    events: [],
  });
  show(transport);
  expect(
    screen
      .getByRole('region', { name: 'Your hand' })
      .querySelectorAll('button'),
  ).toHaveLength(10);
  expect(screen.getAllByText('2 ATK · 3/3 HP')).toHaveLength(10);
  expect(screen.getByLabelText('Your health 20 of 20')).toBeVisible();
  expect(screen.getByRole('button', { name: 'End turn' })).toBeEnabled();
});

it('submits a spell only through its legal target control', async () => {
  const { state, transport, setFeed } = fixture();
  state.players[0].hand = [
    {
      instanceId: 'spell',
      definition: {
        id: 'spark',
        name: 'Winter Spark',
        faction: 'NORSE',
        rarity: 'COMMON',
        version: 1,
        rulesVersion: '1',
        artRef: null,
        cost: 2,
        kind: 'SPELL',
        effect: { key: 'DAMAGE', amount: 3, target: 'ENEMY_CHARACTER' },
      },
    },
  ];
  setFeed({
    snapshot: projectForPlayer(state, 'self', Date.now()),
    connection: 'ready',
    events: [],
  });
  show(transport);
  await userEvent.click(screen.getByRole('button', { name: /Winter Spark/ }));
  expect(
    screen.getByRole('button', { name: 'Target your hero' }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Target enemy hero' }),
  );
  expect(transport.send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'PLAY_CARD',
      payload: {
        cardInstanceId: 'spell',
        target: { kind: 'HERO', playerId: 'opponent' },
      },
    }),
  );
  expect(screen.getByLabelText('Opponent health 20 of 20')).toBeVisible();
});

it('exposes Guard as the legal attack target and disables the guarded hero', async () => {
  const { state, transport, setFeed } = fixture();
  for (const [index, player] of state.players.entries())
    player.board = [
      {
        instanceId: `unit_${index}`,
        definitionId: `card_${index}`,
        definition: catalog[index],
        attack: 2,
        health: 3,
        maxHealth: 3,
        guard: index === 1,
        shield: false,
        canAttack: true,
      },
    ];
  setFeed({
    snapshot: projectForPlayer(state, 'self', Date.now()),
    connection: 'ready',
    events: [],
  });
  show(transport);
  await userEvent.click(
    screen.getByRole('button', { name: 'Select Frost warrior 0' }),
  );
  expect(
    screen.getByRole('button', { name: 'Target enemy hero' }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Target Frost warrior 1' }),
  );
  expect(transport.send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'ATTACK',
      payload: {
        attackerId: 'unit_0',
        target: { kind: 'UNIT', instanceId: 'unit_1' },
      },
    }),
  );
});

it('disables moves while pending and offers recovery for rejection', async () => {
  const { feed, transport, setFeed } = fixture();
  setFeed({ ...feed, connection: 'pending' });
  show(transport);
  expect(screen.getByRole('button', { name: 'End turn' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Waiting');
});

it('offers snapshot restoration after a rejected move', async () => {
  const { state, feed, transport, setFeed } = fixture();
  setFeed({
    ...feed,
    connection: 'rejected',
    error: { message: 'The board changed.' },
  });
  show(transport);
  await userEvent.click(screen.getByRole('button', { name: 'Restore board' }));
  expect(transport.resync).toHaveBeenCalledOnce();
  expect(state.status).toBe('ACTIVE');
});

it.each([
  [{ kind: 'WIN', winnerId: 'self', reason: 'DEFEAT' }, 'Victory'],
  [{ kind: 'WIN', winnerId: 'opponent', reason: 'DEFEAT' }, 'Defeat'],
  [{ kind: 'DRAW', reason: 'TURN_LIMIT' }, 'A worthy draw'],
])('shows the terminal outcome %s', (outcome, title) => {
  const { state, transport, setFeed } = fixture();
  state.status = 'TERMINAL';
  state.outcome = outcome;
  state.turn = null;
  state.resultStatus = 'PENDING';
  setFeed({
    snapshot: projectForPlayer(state, 'self', Date.now()),
    connection: 'ready',
    events: [],
  });
  show(transport);
  expect(screen.getByRole('dialog', { name: title })).toBeVisible();
  expect(screen.getByRole('button', { name: 'End turn' })).toBeDisabled();
});

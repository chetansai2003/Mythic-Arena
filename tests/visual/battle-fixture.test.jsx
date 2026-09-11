import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { expect, it } from 'vitest';
import { projectForPlayer } from '@mythic/game-engine';
import { activeFixture } from '../../backend/tests/engine-fixtures.js';
import { CATALOG } from '../../backend/src/models/cards.js';
import BattleBoard from '../../frontend/src/features/game/BattleBoard.jsx';
import { Layout } from '../../frontend/src/App.jsx';
import { createAppStore } from '../../frontend/src/store/index.js';

it('prepares a real component render of the maximum board for browser layout inspection', () => {
  const state = activeFixture();
  state.players[0].hand.push(...state.players[0].deck.splice(0, 5));
  for (const player of state.players) {
    const units = player.deck
      .filter((card) => card.definition.kind === 'UNIT')
      .slice(0, 5);
    player.deck = player.deck.filter((card) => !units.includes(card));
    player.board = units.map(({ instanceId, definition }) => ({
      instanceId,
      definitionId: definition.id,
      definition,
      attack: definition.attack,
      health: definition.health,
      maxHealth: definition.health,
      guard: definition.keywords.includes('GUARD'),
      shield: true,
      canAttack: true,
    }));
  }
  const view = projectForPlayer(state, 'alpha', 1000);
  expect(view.self.hand).toHaveLength(10);
  expect(view.self.board).toHaveLength(5);
  expect(view.opponent.board).toHaveLength(5);
  const transport = {
    getSnapshot: () => ({ snapshot: view, connection: 'ready', events: [] }),
  };
  const html = renderToStaticMarkup(
    <Provider store={createAppStore(undefined)}>
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <div className="page practice-page">
                  <BattleBoard
                    transport={transport}
                    catalog={CATALOG}
                    onRestart={() => {}}
                  />
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  mkdirSync('.local', { recursive: true });
  writeFileSync('.local/battle-max.html', html);
});

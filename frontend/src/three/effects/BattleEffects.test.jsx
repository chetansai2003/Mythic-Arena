import { act, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { createAppStore, setReducedMotion } from '../../store/index.js';
import { snapshotFixture } from '../../../../packages/shared/src/fixtures.js';
import BattleEffects from './BattleEffects.jsx';

it('renders an accepted summon in its confined region and discards it when motion is disabled', () => {
  const store = createAppStore();
  const snapshot = snapshotFixture();
  const catalog = [{ id: 'legend', rarity: 'LEGENDARY', cost: 4 }];
  const view = (feed) => (
    <Provider store={store}>
      <BattleEffects feed={feed} catalog={catalog} />
    </Provider>
  );
  const { container, rerender } = render(view({ snapshot, events: [] }));
  const next = structuredClone(snapshot);
  next.version = 1;
  next.self.board = [{ instanceId: 'new-unit', definitionId: 'legend' }];
  const event = {
    eventId: 'summon',
    gameId: snapshot.gameId,
    version: 1,
    occurredAt: 1000,
    type: 'CARD_PLAYED',
  };
  rerender(view({ snapshot: next, events: [event] }));
  expect(container.querySelector('[data-effect="SUMMON"]')).toHaveClass(
    'legendary-effect',
  );
  expect(container.querySelectorAll('.effect-spark')).toHaveLength(12);
  act(() => store.dispatch(setReducedMotion(true)));
  expect(container.querySelector('[data-effect="none"]')).not.toBeNull();
  act(() => store.dispatch(setReducedMotion(false)));
  rerender(view({ snapshot: next, events: [event] }));
  expect(container.querySelectorAll('.effect-spark')).toHaveLength(0);
});

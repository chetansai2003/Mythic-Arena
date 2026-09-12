import { expect, it } from 'vitest';
import { snapshotFixture } from '../../../../packages/shared/src/fixtures.js';
import { createEffectDirector } from './director.js';
const event = (version, occurredAt = 1000) => ({
  eventId: `event_${version}`,
  gameId: 'fixture_game',
  type: 'ATTACK_RESOLVED',
  version,
  occurredAt,
});
it('plays only fresh accepted transitions once and never restores', () => {
  const director = createEffectDirector();
  const snapshot = snapshotFixture();
  expect(director.consume({ snapshot, events: [] })).toBeNull();
  const next = { ...snapshot, version: 1 };
  expect(director.consume({ snapshot: next, events: [] })).toBeNull();
  expect(director.consume({ snapshot: next, events: [event(1)] })).toEqual({
    id: 'event_1',
    kind: 'IMPACT',
  });
  expect(director.consume({ snapshot: next, events: [event(1)] })).toBeNull();
  expect(
    director.consume({ snapshot: { ...next, version: 5 }, events: [event(5)] }),
  ).toBeNull();
  expect(
    director.consume({
      snapshot: { ...next, version: 6, serverNow: 5000 },
      events: [event(6)],
    }),
  ).toBeNull();
});
it('derives summons only from public board additions', () => {
  const director = createEffectDirector();
  const snapshot = snapshotFixture();
  director.consume({ snapshot, events: [] });
  const next = structuredClone(snapshot);
  next.version = 1;
  next.self.board = [{ instanceId: 'unit', definitionId: 'fixture_guard' }];
  expect(
    director.consume({
      snapshot: next,
      events: [{ ...event(1), type: 'CARD_PLAYED' }],
    }),
  ).toMatchObject({ kind: 'SUMMON', definitionId: 'fixture_guard' });
});

it('skips a delayed event even when its snapshot timestamp is also stale', () => {
  let time = 0;
  const director = createEffectDirector({ now: () => time });
  const snapshot = snapshotFixture();
  director.consume({ snapshot, events: [] });
  time = 5000;
  expect(
    director.consume({
      snapshot: { ...snapshot, version: 1 },
      events: [event(1)],
    }),
  ).toBeNull();
});

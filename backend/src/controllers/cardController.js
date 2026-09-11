import { ENGINE_READY } from '@mythic/game-engine';

export function createCardController(decks) {
  return async (_req, res) =>
    res.json({
      rulesVersion: '1',
      catalogVersion: 1,
      cards: (await decks.catalog()).map((definition) => ({
        definition,
        playable: ENGINE_READY,
        unavailableReason: ENGINE_READY
          ? null
          : 'Battles will be available when the game engine launches.',
      })),
    });
}

import {
  deckCreateSchema,
  deckUpdateSchema,
  deckDeleteSchema,
  idSchema,
} from '@mythic/shared';
import { parseInput } from '../utils/errors.js';

export function createDeckController(decks) {
  return {
    list: async (req, res) =>
      res.json({ decks: await decks.list(req.auth.user.id) }),
    create: async (req, res) =>
      res.status(201).json({
        deck: await decks.create(
          req.auth.user.id,
          parseInput(deckCreateSchema, req.body),
        ),
      }),
    update: async (req, res) =>
      res.json({
        deck: await decks.update(
          req.auth.user.id,
          parseInput(idSchema, req.params.id),
          parseInput(deckUpdateSchema, req.body),
        ),
      }),
    remove: async (req, res) => {
      await decks.remove(
        req.auth.user.id,
        parseInput(idSchema, req.params.id),
        parseInput(deckDeleteSchema, req.body).expectedRevision,
      );
      res.sendStatus(204);
    },
  };
}

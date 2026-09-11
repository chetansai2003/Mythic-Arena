import { randomUUID } from 'node:crypto';
import { playableDeckSchema, RULES_VERSION, savedDeckSchema, cardDefinitionSchema } from '@mythic/shared';
import { ENGINE_READY, assertDeclaredBehavior } from '@mythic/game-engine';
import { HttpError, parseInput } from '../errors.js';

export function createDeckService(db, now = Date.now) {
  const decks = db.collection('decks');
  const view = (deck) => savedDeckSchema.parse({ id: deck._id, name: deck.name, cardIds: deck.cardIds, revision: deck.revision, rulesVersion: deck.rulesVersion, catalogVersion: deck.catalogVersion, valid: true, playable: ENGINE_READY, createdAt: deck.createdAt.toISOString(), updatedAt: deck.updatedAt.toISOString() });
  async function catalog() {
    const docs = await db.collection('cards').find({ catalogVersion: 1 }).sort({ 'definition.faction': 1, 'definition.cost': 1, 'definition.name': 1 }).toArray();
    return docs.map((doc) => { const definition = cardDefinitionSchema.parse(doc.definition); assertDeclaredBehavior(definition); return definition; });
  }
  async function validate(input) {
    const data = parseInput(playableDeckSchema, input); const definitions = await catalog(); const ids = new Set(definitions.map((card) => card.id));
    if (data.cardIds.some((id) => !ids.has(id))) throw new HttpError(400, 'INVALID_DECK', 'This deck contains a card that is not in the catalog.');
    return data;
  }
  async function owned(userId, id) { const deck = await decks.findOne({ _id: id, userId }); if (!deck) throw new HttpError(404, 'NOT_FOUND', 'Deck not found.'); return deck; }
  return {
    catalog,
    async list(userId) { return (await decks.find({ userId }).sort({ updatedAt: -1, _id: 1 }).toArray()).map(view); },
    async create(userId, input) {
      const data = await validate(input); const date = new Date(now());
      const deck = { _id: randomUUID(), userId, ...data, revision: 1, rulesVersion: RULES_VERSION, catalogVersion: 1, createdAt: date, updatedAt: date };
      await decks.insertOne(deck); return view(deck);
    },
    async update(userId, id, input) {
      const old = await owned(userId, id); const data = await validate({ name: input.name ?? old.name, cardIds: input.cardIds ?? old.cardIds });
      const next = await decks.findOneAndUpdate({ _id: id, userId, revision: input.expectedRevision }, { $set: { ...data, updatedAt: new Date(now()) }, $inc: { revision: 1 } }, { returnDocument: 'after' });
      if (!next) throw new HttpError(409, 'DECK_CONFLICT', 'This deck changed in another tab. Your edits are preserved; reload the saved version or save a copy.');
      return view(next);
    },
    async remove(userId, id, expectedRevision) {
      await owned(userId, id); const result = await decks.deleteOne({ _id: id, userId, revision: expectedRevision });
      if (!result.deletedCount) throw new HttpError(409, 'DECK_CONFLICT', 'This deck changed. Reload it before deleting.');
    },
    async snapshotForMatch(userId, id) {
      const deck = await owned(userId, id); const definitions = await catalog(); const byId = new Map(definitions.map((card) => [card.id, card]));
      await validate({ name: deck.name, cardIds: deck.cardIds });
      // Snapshot creation is transport-independent. Part 3/4 must enforce engine readiness before a match starts.
      return structuredClone({ deckId: id, revision: deck.revision, rulesVersion: deck.rulesVersion, catalogVersion: deck.catalogVersion, cards: deck.cardIds.map((definitionId) => ({ instanceId: randomUUID(), definition: byId.get(definitionId) })) });
    },
  };
}

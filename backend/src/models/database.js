import { CATALOG } from './cards.js';

export async function setupDatabase(db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db
      .collection('refresh_tokens')
      .createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('refresh_tokens').createIndex({ familyId: 1 }),
    db
      .collection('refresh_tokens')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 }),
    db.collection('session_families').createIndex({ userId: 1 }),
    db
      .collection('session_families')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 }),
    db.collection('decks').createIndex({ userId: 1, updatedAt: -1 }),
    db
      .collection('cards')
      .createIndex(
        { 'definition.id': 1, 'definition.version': 1 },
        { unique: true },
      ),
  ]);
  for (const definition of CATALOG) {
    const _id = `${definition.id}:1`;
    const existing = await db.collection('cards').findOne({ _id });
    if (
      existing &&
      JSON.stringify(existing.definition) !== JSON.stringify(definition)
    )
      throw new Error(
        `Immutable card definition differs: ${definition.id}; publish a new catalog version`,
      );
    await db
      .collection('cards')
      .updateOne(
        { _id },
        { $setOnInsert: { definition, catalogVersion: 1 } },
        { upsert: true },
      );
  }
  await db
    .collection('metadata')
    .updateOne(
      { _id: 'schema' },
      { $set: { version: 2, catalogVersion: 1 } },
      { upsert: true },
    );
}

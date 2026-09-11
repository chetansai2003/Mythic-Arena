import { z } from 'zod';

export const RULES_VERSION = '1';
export const LIMITS = Object.freeze({
  deck: 30,
  copies: 2,
  openingHand: 5,
  hand: 10,
  board: 5,
  health: 20,
  energy: 10,
  turns: 100,
  turnMs: 30_000,
  reconnectMs: 30_000,
  readyMs: 10_000,
});
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const count = z.number().int().nonnegative();
const timestamp = z.number().int().nonnegative();
const empty = z.strictObject({});
export const factionSchema = z.enum([
  'NORSE',
  'GREEK',
  'EGYPTIAN',
  'JAPANESE',
  'CELTIC',
]);
export const effectSchema = z.discriminatedUnion('key', [
  z.strictObject({
    key: z.literal('DAMAGE'),
    amount: z.number().int().positive(),
    target: z.literal('ENEMY_CHARACTER'),
  }),
  z.strictObject({
    key: z.literal('HEAL'),
    amount: z.number().int().positive(),
    target: z.literal('FRIENDLY_CHARACTER'),
  }),
  z.strictObject({
    key: z.literal('SHIELD'),
    target: z.literal('FRIENDLY_CHARACTER'),
  }),
]);
const cardBase = {
  id: idSchema,
  version: z.number().int().positive(),
  rulesVersion: z.literal(RULES_VERSION),
  name: z.string().trim().min(1).max(80),
  faction: factionSchema,
  rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  cost: count.max(LIMITS.energy),
  artRef: z
    .string()
    .regex(/^\/art\/[a-zA-Z0-9/_-]+\.(webp|png|svg)$/)
    .nullable(),
};
export const cardDefinitionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...cardBase,
    kind: z.literal('UNIT'),
    attack: count,
    health: z.number().int().positive(),
    keywords: z
      .array(z.enum(['GUARD', 'SHIELD']))
      .max(2)
      .refine(
        (items) => new Set(items).size === items.length,
        'Keywords must be unique',
      ),
  }),
  z.strictObject({
    ...cardBase,
    kind: z.literal('SPELL'),
    effect: effectSchema,
  }),
]);
export const draftDeckSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  cardIds: z.array(idSchema).max(LIMITS.deck),
});
export const playableDeckSchema = draftDeckSchema.superRefine((deck, ctx) => {
  if (deck.cardIds.length !== LIMITS.deck)
    ctx.addIssue({
      code: 'custom',
      path: ['cardIds'],
      message: 'A playable deck requires 30 cards',
    });
  const counts = new Map();
  for (const id of deck.cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  if ([...counts.values()].some((n) => n > LIMITS.copies))
    ctx.addIssue({
      code: 'custom',
      path: ['cardIds'],
      message: 'At most two copies of each card are allowed',
    });
});
export const targetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('HERO'), playerId: idSchema }),
  z.strictObject({ kind: z.literal('UNIT'), instanceId: idSchema }),
]);
const envelope = {
  gameId: idSchema,
  actionId: z.uuid(),
  expectedVersion: count,
};
export const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...envelope,
    type: z.literal('PLAY_CARD'),
    payload: z.strictObject({
      cardInstanceId: idSchema,
      target: targetSchema.optional(),
    }),
  }),
  z.strictObject({
    ...envelope,
    type: z.literal('ATTACK'),
    payload: z.strictObject({ attackerId: idSchema, target: targetSchema }),
  }),
  z.strictObject({ ...envelope, type: z.literal('END_TURN'), payload: empty }),
  z.strictObject({ ...envelope, type: z.literal('SURRENDER'), payload: empty }),
]);
export const CLIENT_EVENTS = Object.freeze({
  QUEUE_JOIN: 'queue:join',
  QUEUE_LEAVE: 'queue:leave',
  MATCH_READY: 'match:ready',
  COMMAND: 'game:command',
  STATE_REQUEST: 'state:request',
});
export const SERVER_EVENTS = Object.freeze({
  QUEUE_STATE: 'queue:state',
  MATCH_FOUND: 'match:found',
  GAME_STATE: 'game:state',
  GAME_EVENT: 'game:event',
  GAME_ENDED: 'game:ended',
  GAME_ERROR: 'game:error',
});
export const clientEventSchemas = Object.freeze({
  [CLIENT_EVENTS.QUEUE_JOIN]: z.strictObject({
    deckId: idSchema,
    mode: z.literal('CASUAL'),
  }),
  [CLIENT_EVENTS.QUEUE_LEAVE]: empty,
  [CLIENT_EVENTS.MATCH_READY]: z.strictObject({ gameId: idSchema }),
  [CLIENT_EVENTS.COMMAND]: commandSchema,
  [CLIENT_EVENTS.STATE_REQUEST]: z.strictObject({
    gameId: idSchema,
    knownVersion: count.optional(),
  }),
});
export const errorSchema = z.strictObject({
  code: z.enum([
    'INVALID_PAYLOAD',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
    'NOT_READY',
    'STALE_VERSION',
    'ACTION_ID_REUSED',
    'ILLEGAL_ACTION',
    'RATE_LIMITED',
    'DEPENDENCY_UNAVAILABLE',
    'INTERNAL_ERROR',
  ]),
  message: z.string().max(200),
  requestId: idSchema.optional(),
  latestVersion: count.optional(),
});
export const acknowledgementSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    ok: z.literal(true),
    actionId: z.uuid().optional(),
    version: count.optional(),
    eventId: idSchema.optional(),
  }),
  z.strictObject({ ok: z.literal(false), error: errorSchema }),
]);
export const cardInstanceSchema = z.strictObject({
  instanceId: idSchema,
  definition: cardDefinitionSchema,
});
export const boardUnitSchema = z
  .strictObject({
    instanceId: idSchema,
    definitionId: idSchema,
    attack: count,
    health: z.number().int().positive(),
    maxHealth: z.number().int().positive(),
    guard: z.boolean(),
    shield: z.boolean(),
    canAttack: z.boolean(),
  })
  .refine((unit) => unit.health <= unit.maxHealth, 'Health exceeds maximum');
const publicPlayer = {
  id: idSchema,
  displayName: z.string().min(1).max(40),
  health: z.number().int().min(-10000).max(LIMITS.health),
  maxHealth: z.literal(LIMITS.health),
  energy: count.max(LIMITS.energy),
  maxEnergy: count.max(LIMITS.energy),
  shield: z.boolean(),
  connected: z.boolean(),
  deckCount: count.max(LIMITS.deck),
  board: z.array(boardUnitSchema).max(LIMITS.board),
};
const validEnergy = (p) => p.energy <= p.maxEnergy;
export const selfPlayerSchema = z
  .strictObject({
    ...publicPlayer,
    hand: z.array(cardInstanceSchema).max(LIMITS.hand),
  })
  .refine(validEnergy, 'Energy exceeds maximum');
export const opponentPlayerSchema = z
  .strictObject({ ...publicPlayer, handCount: count.max(LIMITS.hand) })
  .refine(validEnergy, 'Energy exceeds maximum');
export const outcomeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('WIN'),
    winnerId: idSchema,
    reason: z.enum(['DEFEAT', 'SURRENDER', 'DISCONNECT']),
  }),
  z.strictObject({
    kind: z.literal('DRAW'),
    reason: z.enum(['SIMULTANEOUS_DEFEAT', 'TURN_LIMIT']),
  }),
  z.strictObject({
    kind: z.literal('ABORT'),
    reason: z.enum(['NOT_READY', 'BOTH_OFFLINE', 'STATE_LOST']),
  }),
]);
export const snapshotSchema = z
  .strictObject({
    gameId: idSchema,
    rulesVersion: z.literal(RULES_VERSION),
    version: count,
    status: z.enum(['INITIALIZING', 'ACTIVE', 'TERMINAL']),
    serverNow: timestamp,
    readyEndsAt: timestamp.nullable(),
    turn: z
      .strictObject({
        number: z.number().int().min(1).max(LIMITS.turns),
        playerId: idSchema,
        endsAt: timestamp,
      })
      .nullable(),
    self: selfPlayerSchema,
    opponent: opponentPlayerSchema,
    outcome: outcomeSchema.nullable(),
    resultStatus: z.enum(['NONE', 'PENDING', 'PERSISTED']),
  })
  .superRefine((s, ctx) => {
    const issue = (message) => ctx.addIssue({ code: 'custom', message });
    if (s.self.id === s.opponent.id) issue('Players must be distinct');
    if (s.turn && ![s.self.id, s.opponent.id].includes(s.turn.playerId))
      issue('Turn owner must be a participant');
    if (
      s.status === 'ACTIVE' &&
      (!s.turn || s.outcome || s.readyEndsAt !== null)
    )
      issue('Invalid active lifecycle');
    if (
      s.status === 'INITIALIZING' &&
      (s.turn || s.outcome || s.readyEndsAt === null)
    )
      issue('Invalid initializing lifecycle');
    if (
      s.status === 'TERMINAL' &&
      (!s.outcome ||
        s.turn ||
        s.readyEndsAt !== null ||
        s.resultStatus === 'NONE')
    )
      issue('Invalid terminal lifecycle');
    if (s.status !== 'TERMINAL' && s.resultStatus !== 'NONE')
      issue('Only terminal matches have results');
    if (
      s.outcome?.kind === 'WIN' &&
      ![s.self.id, s.opponent.id].includes(s.outcome.winnerId)
    )
      issue('Winner must be a participant');
  });
export const acceptedEventSchema = z.strictObject({
  eventId: idSchema,
  gameId: idSchema,
  version: count,
  actionId: z.uuid().nullable(),
  type: z.enum([
    'CARD_PLAYED',
    'ATTACK_RESOLVED',
    'TURN_STARTED',
    'MATCH_ENDED',
  ]),
  occurredAt: timestamp,
});
export const serverEventSchemas = Object.freeze({
  [SERVER_EVENTS.QUEUE_STATE]: z.strictObject({
    status: z.enum(['IDLE', 'QUEUED']),
    queuedAt: timestamp.nullable(),
  }),
  [SERVER_EVENTS.MATCH_FOUND]: z.strictObject({
    gameId: idSchema,
    opponent: z.strictObject({
      id: idSchema,
      displayName: z.string().min(1).max(40),
    }),
    readyEndsAt: timestamp,
  }),
  [SERVER_EVENTS.GAME_STATE]: snapshotSchema,
  [SERVER_EVENTS.GAME_EVENT]: acceptedEventSchema,
  [SERVER_EVENTS.GAME_ENDED]: z.strictObject({
    gameId: idSchema,
    outcome: outcomeSchema,
    resultStatus: z.enum(['PENDING', 'PERSISTED']),
  }),
  [SERVER_EVENTS.GAME_ERROR]: errorSchema,
});

// Part 2 identity and content boundaries.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Use at most 128 characters');
export const registerSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(40),
});
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const profileSchema = z.strictObject({
  id: idSchema,
  email: emailSchema,
  displayName: z.string().min(2).max(40),
  createdAt: z.iso.datetime(),
});
export const authResponseSchema = z.strictObject({
  user: profileSchema,
  accessToken: z.string().min(1),
  expiresAt: timestamp,
});
export const deckCreateSchema = playableDeckSchema;
export const deckUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(60).optional(),
    cardIds: z.array(idSchema).max(LIMITS.deck).optional(),
    expectedRevision: z.number().int().positive(),
  })
  .refine(
    (data) => data.name !== undefined || data.cardIds !== undefined,
    'Provide a name or card list',
  );
export const deckDeleteSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
});
export const savedDeckSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1).max(60),
  cardIds: z.array(idSchema).length(LIMITS.deck),
  revision: z.number().int().positive(),
  rulesVersion: z.literal(RULES_VERSION),
  catalogVersion: z.literal(1),
  valid: z.literal(true),
  playable: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const deckListSchema = z.strictObject({
  decks: z.array(savedDeckSchema),
});
export const catalogResponseSchema = z.strictObject({
  rulesVersion: z.literal(RULES_VERSION),
  catalogVersion: z.literal(1),
  cards: z.array(
    z.strictObject({
      definition: cardDefinitionSchema,
      playable: z.boolean(),
      unavailableReason: z.string().nullable(),
    }),
  ),
});

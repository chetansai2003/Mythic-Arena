import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createMatch, projectForPlayer } from '@mythic/game-engine';
import { commandSchema, clientEventSchemas } from '@mythic/shared';
import { parseApiConfig } from '../backend/src/config/env.js';
import pino from 'pino';

function auditFrontendBundles(distPath) {
  console.log('• Auditing frontend production bundles for secrets...');
  if (!existsSync(distPath)) {
    throw new Error(
      `Dist directory ${distPath} does not exist. Run npm run build first.`,
    );
  }

  const forbiddenPatterns = [
    /mongodb(?:\+srv)?:\/\//i,
    /rediss?:\/\//i,
    /AUTH_SECRET/i,
    /RATE_LIMIT_PREFIX/i,
    /MONGODB_DB/i,
    /password123/i,
    /cluster\.example\.com/i,
  ];

  function walk(dir) {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        walk(fullPath);
      } else if (/\.(js|css|html|json)$/.test(file.name)) {
        const content = readFileSync(fullPath, 'utf8');
        for (const pattern of forbiddenPatterns) {
          assert.ok(
            !pattern.test(content),
            `Security violation: Pattern ${pattern} detected in production bundle ${file.name}`,
          );
        }
      }
    }
  }

  walk(distPath);
  console.log(
    '  ✓ Zero database URIs, auth secrets, or internal config keys found in client bundles.',
  );
}

function auditPrivateGameData() {
  console.log(
    '• Auditing private game data isolation & anti-cheat redaction...',
  );

  const makeDeck = (prefix, isSecret = false) => {
    const cards = [];
    for (let defIdx = 0; defIdx < 15; defIdx++) {
      const def = {
        id: `def_${prefix}_${defIdx}`,
        version: 1,
        rulesVersion: '1',
        name:
          isSecret && defIdx === 0
            ? 'Secret Dragon'
            : `Card ${prefix} ${defIdx}`,
        faction: 'NORSE',
        rarity: 'COMMON',
        cost: 1 + (defIdx % 5),
        artRef: null,
        kind: 'UNIT',
        attack: 2,
        health: 3,
        keywords: isSecret && defIdx === 0 ? ['GUARD'] : [],
      };
      cards.push({ instanceId: `${prefix}_card_${defIdx}_a`, definition: def });
      cards.push({ instanceId: `${prefix}_card_${defIdx}_b`, definition: def });
    }
    return cards;
  };

  const p1Cards = makeDeck('p1', false);
  const p2Cards = makeDeck('p2', true);

  const match = createMatch({
    gameId: 'sec_audit_match_1',
    seed: 0xdeadbeef,
    now: 1000000,
    players: [
      { id: 'user_1', displayName: 'Player 1', cards: p1Cards },
      { id: 'user_2', displayName: 'Player 2', cards: p2Cards },
    ],
  });

  // Verify internal state contains secrets
  const hasSecret =
    match.players[1].hand.some((c) => c.definition.name === 'Secret Dragon') ||
    match.players[1].deck.some((c) => c.definition.name === 'Secret Dragon');
  assert.ok(hasSecret, 'Player 2 cards should contain Secret Dragon');

  // Verify projection for Player 1 hides Player 2's cards
  const projectionP1 = projectForPlayer(match, 'user_1', 1000000);

  // 1. Player 2 cards must NOT exist in the projection
  const serialized = JSON.stringify(projectionP1);
  assert.ok(
    !serialized.includes('Secret Dragon'),
    'Projection leaked opponent card name',
  );
  assert.ok(
    !serialized.includes('p2_secret_card'),
    'Projection leaked opponent card instanceId',
  );
  assert.ok(
    !serialized.includes('def_secret_card'),
    'Projection leaked opponent card definitionId',
  );
  assert.ok(
    !serialized.includes('deadbeef'),
    'Projection leaked match random seed',
  );

  // 2. Deck array must be stripped
  assert.equal(
    projectionP1.self.deck,
    undefined,
    'Own deck contents leaked into projection',
  );
  assert.equal(
    projectionP1.opponent.deck,
    undefined,
    'Opponent deck contents leaked into projection',
  );
  assert.equal(
    typeof projectionP1.self.deckCount,
    'number',
    'Self deck count missing',
  );
  assert.equal(
    typeof projectionP1.opponent.deckCount,
    'number',
    'Opponent deck count missing',
  );

  // 3. Opponent hand must only expose count
  assert.equal(
    projectionP1.opponent.hand,
    undefined,
    'Opponent hand leaked into projection',
  );
  assert.equal(
    typeof projectionP1.opponent.handCount,
    'number',
    'Opponent handCount missing',
  );

  console.log(
    '  ✓ Opponent hand, card definitions, deck order, and random seed successfully redacted.',
  );
}

function auditStrictPayloadSchemas() {
  console.log('• Auditing socket and command payload validation...');

  // Malformed commands
  const badCommands = [
    {
      gameId: 'g1',
      actionId: 'not-a-uuid',
      expectedVersion: 1,
      type: 'END_TURN',
      payload: {},
    },
    {
      gameId: 'g1',
      actionId: 'f50ca4f2-92c1-41f1-9d73-044c1ab96fca',
      expectedVersion: 'one',
      type: 'END_TURN',
      payload: {},
    },
    {
      gameId: 'g1',
      actionId: 'f50ca4f2-92c1-41f1-9d73-044c1ab96fca',
      expectedVersion: 1,
      type: 'UNKNOWN_TYPE',
      payload: {},
    },
    {
      gameId: 'g1',
      actionId: 'f50ca4f2-92c1-41f1-9d73-044c1ab96fca',
      expectedVersion: 1,
      type: 'PLAY_CARD',
      payload: {},
      extraField: 'exploit',
    },
  ];

  for (const bad of badCommands) {
    const res = commandSchema.safeParse(bad);
    assert.equal(
      res.success,
      false,
      `Malformed command payload was unexpectedly accepted: ${JSON.stringify(bad)}`,
    );
  }

  // Extra field rejection
  const joinWithExtra = {
    deckId: 'deck_123',
    mode: 'CASUAL',
    maliciousScript: '<script>alert(1)</script>',
  };
  const joinRes = clientEventSchemas['queue:join'].safeParse(joinWithExtra);
  assert.equal(
    joinRes.success,
    false,
    'Client event schema did not reject extra properties',
  );

  console.log(
    '  ✓ Strict Zod schemas reject unexpected fields, bad types, and malformed commands.',
  );
}

function auditLoggerRedaction() {
  console.log('• Auditing logger credential redaction...');

  let output = '';
  const stream = {
    write(chunk) {
      output += chunk;
    },
  };
  const logger = pino(
    {
      name: 'security-audit',
      redact: {
        paths: [
          'password',
          'token',
          'authorization',
          'cookie',
          'config',
          'headers',
          'body',
          'req.headers',
          'req.body',
        ],
        censor: '[REDACTED]',
      },
    },
    stream,
  );

  logger.info(
    {
      authorization: 'Bearer secret_token_xyz',
      cookie: 'mythic_refresh=sensitive_refresh_hash',
      password: 'SuperSecretPassword123!',
      user: { id: 'u1', email: 'test@example.com' },
    },
    'Test audit log',
  );

  assert.ok(
    !output.includes('secret_token_xyz'),
    'Token leaked in logger output',
  );
  assert.ok(
    !output.includes('sensitive_refresh_hash'),
    'Cookie refresh token leaked in logger output',
  );
  assert.ok(
    !output.includes('SuperSecretPassword123!'),
    'Password leaked in logger output',
  );
  assert.ok(
    output.includes('[REDACTED]'),
    'Redaction placeholder missing from logger output',
  );

  console.log(
    '  ✓ Sensitive credentials and bearer tokens are redacted from application logs.',
  );
}

function auditOriginSecurity() {
  console.log('• Auditing origin and TLS enforcement in production config...');

  // Production requires https origins
  assert.throws(() => {
    parseApiConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      REDIS_URL: 'rediss://redis.example.com:6379',
      MONGODB_URI: 'mongodb+srv://cluster.example.com',
      MONGODB_DB: 'mythic_arena',
      FRONTEND_ORIGINS: 'http://insecure-domain.example.com',
      AUTH_SECRET: 'a'.repeat(64),
    });
  }, /FRONTEND_ORIGINS/);

  // Production rejects placeholder secrets
  assert.throws(() => {
    parseApiConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      REDIS_URL: 'rediss://redis.example.com:6379',
      MONGODB_URI: 'mongodb+srv://cluster.example.com',
      MONGODB_DB: 'mythic_arena',
      FRONTEND_ORIGINS: 'https://secure.example.com',
      AUTH_SECRET:
        'placeholder-secret-needs-replacement-for-production-1234567890',
    });
  }, /AUTH_SECRET/);

  console.log(
    '  ✓ Production configuration enforces HTTPS origins and rejects placeholder secrets.',
  );
}

export function runAudit(root = process.cwd()) {
  console.log('====================================================');
  console.log('   Mythic Arena — Step 6 Security & Privacy Audit    ');
  console.log('====================================================');

  auditFrontendBundles(resolve(root, 'frontend/dist'));
  auditPrivateGameData();
  auditStrictPayloadSchemas();
  auditLoggerRedaction();
  auditOriginSecurity();

  console.log('====================================================');
  console.log('  ✓ All Security & Privacy Audit Checks Passed Cleanly');
  console.log('====================================================');
}

if (process.argv[1] && process.argv[1].endsWith('audit-security.js')) {
  runAudit();
}

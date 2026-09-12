import { randomBytes, randomUUID } from 'node:crypto';
import { HttpError } from '../../utils/errors.js';

const CLAIM = `
local old = redis.call('GET', KEYS[1])
if old and string.sub(old,1,36) ~= ARGV[1] and ARGV[3] ~= '1' then return 0 end
redis.call('SET',KEYS[1],ARGV[2],'PX',45000)
return 1`;
const JOIN = `
if redis.call('GET',KEYS[7]) ~= ARGV[4] then return {'CONTROL'} end
local existing = redis.call('HGET',KEYS[3],ARGV[1])
if existing then return {'MATCH',existing} end
if redis.call('HEXISTS',KEYS[2],ARGV[1]) == 1 then return {'QUEUED'} end
local candidate
while true do
  local head=redis.call('ZRANGE',KEYS[1],0,0)
  if #head==0 then break end
  local raw=redis.call('HGET',KEYS[2],head[1])
  redis.call('ZREM',KEYS[1],head[1])
  redis.call('HDEL',KEYS[2],head[1])
  if raw then
    local entry=cjson.decode(raw)
    if entry.expiresAt > tonumber(ARGV[3]) and not redis.call('HGET',KEYS[3],head[1]) then candidate=entry; break end
  end
end
local entrant=cjson.decode(ARGV[2])
if not candidate then
  redis.call('ZADD',KEYS[1],ARGV[3],ARGV[1]); redis.call('HSET',KEYS[2],ARGV[1],ARGV[2]); return {'QUEUED'}
end
local record={kind='RESERVED',gameId=ARGV[5],entrants={candidate,entrant},createdAt=tonumber(ARGV[3]),readyEndsAt=tonumber(ARGV[3])+10000,seed=ARGV[6]}
redis.call('SET',KEYS[6],cjson.encode(record))
redis.call('HSET',KEYS[3],candidate.id,ARGV[5],entrant.id,ARGV[5])
redis.call('SADD',KEYS[4],ARGV[5]); redis.call('ZADD',KEYS[5],ARGV[3],ARGV[5])
return {'MATCH',ARGV[5]}`;
const CAS = `
if ARGV[6] ~= '' and redis.call('GET',KEYS[6]) ~= ARGV[6] then return -1 end
local old=redis.call('GET',KEYS[1])
if (old or '') ~= ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
if ARGV[3] ~= '' then redis.call('ZADD',KEYS[2],ARGV[3],ARGV[4]) else redis.call('ZREM',KEYS[2],ARGV[4]) end
redis.call('SADD',KEYS[4],ARGV[4])
if ARGV[5] == 'PENDING' then redis.call('SADD',KEYS[3],ARGV[4]) end
if ARGV[5] ~= 'NONE' then
  local ids=cjson.decode(ARGV[7])
  for _,id in ipairs(ids) do if redis.call('HGET',KEYS[5],id)==ARGV[4] then redis.call('HDEL',KEYS[5],id) end end
end
if ARGV[5]=='PERSISTED' then
  redis.call('SREM',KEYS[3],ARGV[4]); redis.call('SREM',KEYS[4],ARGV[4]); redis.call('EXPIRE',KEYS[1],604800)
end
return 1`;

export function createRedisGameStore(redis, prefix) {
  const key = (name) => `${prefix}${name}`;
  const controlKey = (id) => key(`control:${id}`);
  async function run(script, keys, args) {
    return redis.eval(script, { keys, arguments: args.map(String) });
  }
  return {
    redis,
    key,
    controlKey,
    async claim(userId, clientId, token, takeover = false) {
      const ok = await run(
        CLAIM,
        [controlKey(userId)],
        [clientId, token, takeover ? 1 : 0],
      );
      if (!ok)
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'Another tab controls this account. Take control explicitly to continue.',
        );
    },
    async owns(userId, token) {
      return (await redis.get(controlKey(userId))) === token;
    },
    async renew(userId, token) {
      return Boolean(
        await run(
          `if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end redis.call('PEXPIRE',KEYS[1],45000) return 1`,
          [controlKey(userId)],
          [token],
        ),
      );
    },
    async release(userId, token) {
      return run(
        `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`,
        [controlKey(userId)],
        [token],
      );
    },
    async join(user, cards, token, now) {
      const gameId = randomUUID();
      const entry = {
        id: user.id,
        displayName: user.displayName,
        // Keep nested arrays opaque to Redis Lua cjson (which encodes [] as {}).
        cardsJson: JSON.stringify(cards),
        token,
        queuedAt: now,
        expiresAt: now + 6000,
      };
      const result = await run(
        JOIN,
        [
          key('queue'),
          key('queued'),
          key('users'),
          key('games'),
          key('due'),
          key(`game:${gameId}`),
          controlKey(user.id),
        ],
        [
          user.id,
          JSON.stringify(entry),
          now,
          token,
          gameId,
          randomBytes(32).toString('hex'),
        ],
      );
      if (result[0] === 'CONTROL')
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'This connection no longer controls the account.',
        );
      return result[0] === 'MATCH' ? { gameId: result[1] } : { queued: true };
    },
    async leave(userId, token) {
      const result = await run(
        `if redis.call('GET',KEYS[3])~=ARGV[2] then return -1 end redis.call('ZREM',KEYS[1],ARGV[1]); redis.call('HDEL',KEYS[2],ARGV[1]); return 1`,
        [key('queue'), key('queued'), controlKey(userId)],
        [userId, token],
      );
      if (result === -1)
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'This connection no longer controls the account.',
        );
    },
    async touchQueue(userId, token, now) {
      await run(
        `local raw=redis.call('HGET',KEYS[1],ARGV[1]); if not raw then return 0 end local e=cjson.decode(raw); if e.token~=ARGV[2] then return 0 end e.expiresAt=tonumber(ARGV[3])+6000; redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(e)); return 1`,
        [key('queued')],
        [userId, token, now],
      );
    },
    async pruneQueue(now) {
      await run(
        `local entries=redis.call('HGETALL',KEYS[1]); for i=1,#entries,2 do local e=cjson.decode(entries[i+1]); if e.expiresAt<=tonumber(ARGV[1]) then redis.call('HDEL',KEYS[1],entries[i]); redis.call('ZREM',KEYS[2],entries[i]); end end return 1`,
        [key('queued'), key('queue')],
        [now],
      );
    },
    async userStatus(userId) {
      const gameId = await redis.hGet(key('users'), userId);
      if (gameId) return { gameId };
      const raw = await redis.hGet(key('queued'), userId);
      return raw
        ? { queued: true, queuedAt: JSON.parse(raw).queuedAt }
        : { queued: false };
    },
    async read(gameId) {
      const raw = await redis.get(key(`game:${gameId}`));
      return { raw, record: raw ? JSON.parse(raw) : null };
    },
    async commit(gameId, raw, record, deadline, actor) {
      const status = record.state?.resultStatus ?? 'NONE';
      const result = await run(
        CAS,
        [
          key(`game:${gameId}`),
          key('due'),
          key('outbox'),
          key('games'),
          key('users'),
          actor ? controlKey(actor.userId) : key('unused'),
        ],
        [
          raw ?? '',
          JSON.stringify(record),
          deadline ?? '',
          gameId,
          status,
          actor?.token ?? '',
          JSON.stringify(record.state?.players.map((p) => p.id) ?? []),
        ],
      );
      if (result === -1)
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'This connection no longer controls the account.',
        );
      return result === 1;
    },
    async due(now) {
      return redis.zRangeByScore(key('due'), 0, now, {
        LIMIT: { offset: 0, count: 100 },
      });
    },
    async games() {
      return redis.sMembers(key('games'));
    },
    async outbox() {
      return redis.sMembers(key('outbox'));
    },
  };
}

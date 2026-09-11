import { randomBytes, randomUUID, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from '../errors.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export function publicUser(user) { return { id: user._id, email: user.email, displayName: user.displayName, createdAt: user.createdAt.toISOString() }; }
const invalidSession = () => new HttpError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
export async function createAuthService({ db, mongo, config, now = Date.now, onSessionRevoked = async () => {} }) {
  const users = db.collection('users'); const families = db.collection('session_families'); const tokens = db.collection('refresh_tokens');
  const key = new TextEncoder().encode(config.AUTH_SECRET);
  const passwordOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  const dummyHash = await argon2.hash(randomBytes(32).toString('hex'), passwordOptions);
  async function transaction(work) { const session = mongo.startSession(); try { return await session.withTransaction(() => work(session)); } finally { await session.endSession(); } }
  async function access(user, familyId) {
    const issuedAt = Math.floor(now() / 1000); const expiry = issuedAt + config.ACCESS_TOKEN_SECONDS;
    const accessToken = await new SignJWT({ sid: familyId }).setProtectedHeader({ alg: 'HS256' }).setSubject(user._id).setIssuer('mythic-arena').setAudience('mythic-web').setIssuedAt(issuedAt).setExpirationTime(expiry).sign(key);
    return { user: publicUser(user), accessToken, expiresAt: expiry * 1000 };
  }
  async function newSession(user, session) {
    const familyId = randomUUID(); const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(now() + config.REFRESH_DAYS * 86400000);
    await families.insertOne({ _id: familyId, userId: user._id, createdAt: new Date(now()), expiresAt, revokedAt: null }, { session });
    await tokens.insertOne({ _id: randomUUID(), familyId, tokenHash: hashToken(refreshToken), createdAt: new Date(now()), expiresAt, usedAt: null }, { session });
    return { ...(await access(user, familyId)), refreshToken, refreshExpiresAt: expiresAt };
  }
  async function notifyRevoked(familyId) { try { await onSessionRevoked(familyId); } catch { /* Revocation is already durable; transport notification must not undo it. */ } }
  return {
    async register(input) {
      const passwordHash = await argon2.hash(input.password, passwordOptions);
      const user = { _id: randomUUID(), email: input.email, displayName: input.displayName, passwordHash, createdAt: new Date(now()) };
      try { return await transaction(async (session) => { await users.insertOne(user, { session }); return newSession(user, session); }); }
      catch (error) { if (error.code === 11000) throw new HttpError(409, 'ACCOUNT_UNAVAILABLE', 'An account could not be created with those details. Try signing in.'); throw error; }
    },
    async login(input) {
      const user = await users.findOne({ email: input.email });
      const matches = await argon2.verify(user?.passwordHash ?? dummyHash, input.password);
      if (!user || !matches) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      return transaction((session) => newSession(user, session));
    },
    async refresh(rawToken) {
      if (typeof rawToken !== 'string' || !/^[a-zA-Z0-9_-]{64}$/.test(rawToken)) throw invalidSession();
      const result = await transaction(async (session) => {
        const record = await tokens.findOne({ tokenHash: hashToken(rawToken) }, { session });
        if (!record) throw invalidSession();
        const family = await families.findOne({ _id: record.familyId, revokedAt: null, expiresAt: { $gt: new Date(now()) } }, { session });
        if (!family) throw invalidSession();
        if (record.usedAt) { await families.updateOne({ _id: family._id }, { $set: { revokedAt: new Date(now()), reason: 'TOKEN_REUSE' } }, { session }); return { reused: family._id }; }
        if (record.expiresAt.getTime() <= now()) throw invalidSession();
        const user = await users.findOne({ _id: family.userId }, { session });
        if (!user) throw invalidSession();
        await tokens.updateOne({ _id: record._id, usedAt: null }, { $set: { usedAt: new Date(now()) } }, { session });
        const refreshToken = randomBytes(48).toString('base64url');
        await tokens.insertOne({ _id: randomUUID(), familyId: family._id, tokenHash: hashToken(refreshToken), createdAt: new Date(now()), expiresAt: family.expiresAt, usedAt: null }, { session });
        return { ...(await access(user, family._id)), refreshToken, refreshExpiresAt: family.expiresAt };
      });
      if (result.reused) { await notifyRevoked(result.reused); throw invalidSession(); }
      return result;
    },
    async authenticate(authorization) {
      if (typeof authorization !== 'string' || authorization.length > 4096 || !authorization.startsWith('Bearer ')) throw invalidSession();
      let payload;
      try { ({ payload } = await jwtVerify(authorization.slice(7), key, { issuer: 'mythic-arena', audience: 'mythic-web', algorithms: ['HS256'], currentDate: new Date(now()) })); }
      catch { throw invalidSession(); }
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw invalidSession();
      const family = await families.findOne({ _id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { $gt: new Date(now()) } });
      if (!family) throw invalidSession();
      const user = await users.findOne({ _id: payload.sub });
      if (!user) throw invalidSession();
      return { user: publicUser(user), familyId: family._id };
    },
    async logout(rawToken) {
      if (typeof rawToken !== 'string') return;
      const record = await tokens.findOne({ tokenHash: hashToken(rawToken) });
      if (record) { await families.updateOne({ _id: record.familyId, revokedAt: null }, { $set: { revokedAt: new Date(now()), reason: 'LOGOUT' } }); await notifyRevoked(record.familyId); }
    },
  };
}

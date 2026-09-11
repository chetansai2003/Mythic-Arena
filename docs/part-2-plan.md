# Part 2 — accounts, catalog, and persistent decks

JavaScript only. Preserve the Part 1 shell and verification gates. Do not implement the battle engine or online matchmaking in this milestone.

1. Extend runtime contracts with normalized identity inputs, safe profiles, complete deck mutations, revision checks, and catalog responses. Keep schema legality distinct from the unimplemented game engine.
2. Add Argon2id hashes, 10-minute signed access tokens kept only in browser memory, seven-day absolute refresh-session families, hashed opaque refresh tokens, transactional rotation, reuse revocation, immediate logout revocation, and CSRF/origin defenses. Throttle account endpoints through Redis and fail safely on dependency loss.
3. Add an explicit database setup/seed command, unique email/session/deck indexes, and 20 immutable version-1 original cards from five factions. Validate metadata against the declared engine effect registry; mark online play unavailable until Part 3 implements the engine.
4. Add authenticated card/deck endpoints with complete 30-card validation, catalog checks, two-copy limits, ownership, optimistic revisions, and immutable snapshot preparation for later match creation. Persist complete decks; incomplete edits remain browser drafts until valid.
5. Replace account/deck previews with working forms and a responsive card browser/editor. Include search/filter/detail, create/rename/duplicate/delete, legal starter list, save status, error recovery, unsaved-change protection, and a real lobby deck selector. Preserve the existing visual language and accessibility.
6. Test account duplication, credentials, expiry, rotation/reuse, logout, CSRF, throttling, ownership, invalid decks, revision conflicts, persistence, failed saves, and confirmed deletion. Verify two independent accounts in real browsers using isolated database fixtures. Record exact results in part-2-report.md.

Local HTTP development uses SameSite Strict httpOnly cookies. Production requires secure host-only cookies and HTTPS origins. No production resources are created. Seeds/migrations run explicitly, not on every application startup. Authentication and data access fail closed when their dependencies are unavailable.

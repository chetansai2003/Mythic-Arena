# Step 4 — online reliability

Implement Part 4 of the six-part specification in JavaScript. Preserve the pure engine, practice mode and accounts/decks.

1. Attach authenticated Socket.IO to the existing HTTP service. Strict payloads, exact origins, session expiry/revocation, participant checks, throttling and atomic control ownership protect every operation. Taking control from another tab is explicit.
2. Use one Redis casual queue and atomic reservations. Freeze validated owned decks, exclude duplicate users and existing matches, repair interrupted reservations and require both players ready within ten seconds.
3. Store private game state, action fingerprints/acknowledgements and terminal outbox atomically. Compare-and-set the full record; reject stale versions and altered duplicate IDs. Commit timer advances even when an arriving action is rejected.
4. Emit only per-player snapshots after commit. Restore after reconnect/version gaps; retry acknowledgement timeouts with the original action ID. No in-browser online state fallback.
5. Run durable turn/disconnect/readiness schedules in the independent worker. Recheck current state/deadline, resolve disconnect before equal-time turn expiry, rebuild schedule entries and repair abandoned reservations. API crashes are detected through expiring presence leases.
6. Persist terminal results/wins transactionally with a unique game receipt, retry safely, expose pending results and keep terminal Redis records until MongoDB confirms persistence.
7. Wire queue, cancellation, readiness, online board, reconnect/control takeover and result status. Verify two browsers, concurrent commands, duplicate/lost acknowledgements, timers, 29-second reconnect, forfeit, outages and worker/API restart boundaries.

This milestone targets one API process and one or more idempotent workers. No horizontal Socket.IO adapter or scale claim is made. Production deployment and interactive 3D remain later milestones.

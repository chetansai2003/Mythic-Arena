# Practice and future server transport

The tactical board consumes a replaceable adapter, not raw engine state:

- `getSnapshot()` returns `{ snapshot, connection, events, error }`.
- `subscribe(listener)` emits that shape and returns an unsubscribe function.
- `send(command)` submits the shared command envelope. It resolves to an acknowledgement, while accepted state arrives through the subscription.
- `resync()` restores an authoritative snapshot without replaying historical events.
- `tick()` is optional and used only by local practice to advance its clock/bot.
- `dispose()` stops future publication and local work.

Connection values are `ready`, `pending`, `rejected`, and `resyncing`. Pending moves disable turn/surrender/submission controls. Health, energy and cards change only after a published accepted state. Rejected inputs show a safe reason and a Restore board action. Public accepted events drive the status announcement; snapshot restores emit no historical events.

The local adapter owns both private decks/hands inside its closure and exposes only the human projection. It receives catalog definitions from the API and optionally resolves a saved owned deck through `/decks`. Its public entry point is `/practice`, with optional `?deck=<owned deck ID>`; the lobby constructs this link. Reloading/leaving abandons local practice. No practice result or win is written to the API.

Browser code is inspectable, so local practice is not a security boundary against the person running it. Step 4 will replace this adapter with authenticated server state, server-owned clocks, deduplicated acknowledgements and durable results. The engine's private serializer and strict command envelope are ready for that integration. Engine readiness now permits practice catalog/deck metadata; online matchmaking stays disabled.

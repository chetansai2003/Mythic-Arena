# API and events

The implemented HTTP API is documented in [Part 2 REST and security contract](part-2-api.md): account creation, login, refresh, logout, current profile, card catalog, and owned deck CRUD.

The browser uses the `/api` proxy prefix. Direct API requests use paths such as `/auth/login` and `/decks`.

[Shared contracts](contracts.md) define runtime payload validation and the planned authoritative multiplayer event envelope. Socket event handlers are not implemented in Step 2. They will be connected after the pure game engine is available.

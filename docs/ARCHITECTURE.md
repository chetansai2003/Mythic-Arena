# Mythic Arena architecture

All application sources use JavaScript ES modules; React components use JSX. Install dependencies from the repository root with npm workspaces.

```text
frontend/
  public/{models,textures,audio}/
  src/
    components/                 Reusable controls, dialogs and page headings
    pages/                      Home, Login, Register, Lobby, DeckBuilder,
                                Game, MatchHistory, Leaderboard, Settings
    features/{auth,decks}/      Shared account and deck UI
    features/{game,matchmaking}/ Practice/online board, results and queue UI
    three/                      Optional R3F arena, GSAP moments, SVG fallback
    services/api.js             Fetch client, CSRF and session coordination
    services/socket.js          Online connection, acknowledgements and resync
    store/                      Redux session and device preferences
    hooks/                      API and authenticated online contexts
    utils/
    styles/
    App.jsx                     Shared application layout and error pages
    main.jsx
  vite.config.js
  package.json
backend/
  src/
    config/                     Validated environment settings
    models/                     MongoDB indexes, seed setup and original cards
    controllers/                Auth, card and deck HTTP handlers
    routes/                     Endpoint registration and service assembly
    middleware/                 Authentication, cookie/CSRF security, throttles
    services/                   Auth and deck business rules
      gameEngine/               Isolated pure engine workspace
      realtime/                 Redis CAS, lifecycle, queue and result service
    sockets/                    Authenticated Socket.IO server
    workers/                    Separate worker process workspace
    utils/                      Safe errors and input parsing
    app.js
    server.js
    setup.js
  tests/
  package.json
packages/shared/                Browser-safe runtime Zod schemas;
                                separate server infrastructure entry point
tests/{integration,e2e}/         Cross-service and real browser verification
docs/
infra/                          Dockerfile and replica-set initialization
docker-compose.yml
```

The API owns identity and deck persistence. Controllers validate requests and delegate to services; MongoDB transactions rotate refresh sessions, and Redis enforces shared rate limits. The database layer uses the native MongoDB driver rather than adding Mongoose wrappers. Card definitions and complete deck inputs have shared runtime schemas instead of TypeScript interfaces.

The worker remains a separate process even though its workspace is under `backend/src/workers`. The engine has its own package boundary under `backend/src/services/gameEngine` so database and network code cannot enter the pure rules layer. Shared contracts remain a small root package to avoid making the browser import backend code.

Tailwind 4 is configured through the Vite plugin and CSS theme declarations; a redundant Tailwind JavaScript config is unnecessary. No TypeScript configs or `.ts`/`.tsx` application files are needed.

Parts 1–4 provide the shell, accounts, decks, practice and online matches. Redis holds private live state, controller leases, queue reservations, durable deadline scores, action receipts and the terminal outbox. MongoDB stores active membership and transactionally persists unique match receipts with winner increments. API and worker use the same compare-and-set transitions. Only the API projects private per-player snapshots. Step 5 adds optional lazy 3D and cinematic UI above these existing contracts. Step 6 hardens verification, audits security and confidentiality, benchmarks load targets, provides production staging deployment manifests, and delivers operational runbooks.

See [rules](RULES.md), [API and events](API_EVENTS.md), [deployment](DEPLOYMENT.md), [runbook](RUNBOOK.md), and [decisions](DECISIONS.md).

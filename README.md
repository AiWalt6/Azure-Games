# Cloud & Cornbread

**The Great Azure Thanksgiving Bingo**  
Giving thanks. Deploying knowledge. Calling BINGO.

A real multiplayer holiday game for a Teams meeting: React 19, TypeScript,
Tailwind CSS 4, Express, Socket.IO, and persistent SQLite. No Supabase account,
Microsoft sign-in, Teams integration, API keys, or third-party assets are needed.
The host shares a public presentation window while controlling a private dashboard.

**Running the event? Read the [complete host and player instruction guide](HOST-AND-PLAYER-GUIDE.md).**
It includes where to find host questions, exact button sequences, winning-pattern
diagrams, scoring, scripts to read aloud, and troubleshooting.

## Save it and use it again

The GitHub repository is the reusable **source package**, not a running game
server. Download its ZIP or clone it, then use Node.js 22.18+:

```sh
cd Azure-Games
npm ci
npm run build
npm start
```

Open http://localhost:3001 for a local session. Create a fresh room for each
event. Remote players still need the public HTTPS hosting described below;
GitHub Pages alone cannot run this application's multiplayer backend.

For a portable container image on a machine with Docker:

```sh
docker build -t azure-games:1.0.0 .
docker save -o azure-games-1.0.0.tar azure-games:1.0.0
```

On another Docker machine, restore the image with:

```sh
docker load -i azure-games-1.0.0.tar
```

Run it using the production HTTPS origin and persistent-volume configuration
in the deployment section. The image contains the application, not existing
rooms. GitHub source uploads also exclude local rooms, player names, host/player
access tokens, dependencies, and `.env` configuration.

If you need to preserve an event, export its CSV results from the host dashboard.
Migrating active rooms requires a separate private, SQLite-consistent backup
of the data directory. Never upload that backup to the public repository.

## Run locally

Requires **Node.js 22.18+** and npm. Node 22 may print an experimental SQLite
warning; the application uses the built-in `node:sqlite` module.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Click **Host a game**, copy the player link, and
open **Presentation** in a separate window. Development proxies HTTP and
WebSockets from Vite to the backend on port 3001.

For phone testing on the same trusted Wi-Fi, open
`http://YOUR-COMPUTER-LAN-IP:5173` on the host computer **before creating the
room**. Links and QR codes use the browser's current origin; a localhost link
will not work on another device. A LAN preview is not a public deployment.
QR images are clickable links to player registration. Localhost QR codes show
a prominent local-preview warning: they are not usable by remote Teams players.
Open the deployed public HTTPS address on the host computer before sharing its
player link or QR. The host roster updates automatically when each player
registers and connects; no dashboard refresh is needed.

To run the built application without Vite:

```sh
npm run build
npm start
```

Open http://localhost:3001. These local commands use development mode.
Production mode deliberately refuses to start without an HTTPS `PUBLIC_ORIGIN`.
Do not expose an unencrypted development server to the internet.

## Host the event in Microsoft Teams

1. Rehearse in a **separate room**. Add **15 rehearsal players** from Behind the
   scenes. Bots automatically mark only revealed answers; you control questions.
   They are clearly labeled and included in that rehearsal's scores.
2. Create a fresh real-event room. Save **Copy private host link** somewhere
   private. The host credential is an unguessable capability, not a password.
   The fragment is removed from the address bar after being saved in local
   browser storage. Anyone with this private link can control the room.
3. Paste **Copy player link** into Teams chat. Players enter names. Names must
   be unique within the room. All participants need to reach the same server.
4. Open **Presentation**, then share **only that browser window** in Teams.
   Never share the host dashboard, its private queue, or the private host link.
   The public view has no host token, future questions, or hidden answer fields.
5. Explain the current pattern and start the feast. The 15-second timer starts
   with each question. Read the question, reveal, give players at least 5 seconds
   to mark, then click Next. Countdown expiry does **not** reveal or advance.
6. Scores and BINGOs are server-validated automatically. A celebration holds
   advancement until you dismiss it. Players can keep marking while it is on
   screen. You may present the leaderboard or pause gameplay.
7. End round, introduce the next pattern, and start the next round. Cards are
   regenerated only between rounds; points carry over. After round 3, announce
   champions and export CSV results.
8. If the highest score is tied, start a final trivia tiebreaker. Only tied
   players may submit one typed answer. The first correct answer received by the
   server wins one deciding point when the host reveals. Exact answers and
   listed aliases are accepted, ignoring punctuation and case. A remaining tie
   can use another unused question.

The in-app How to Play and Host Guide include player-facing instructions.
Sound is opt-in and saved per browser. Reduced-motion preferences are respected.
The public presentation scales for 1080p and includes a fullscreen button.

### Pacing and fairness

| Round | Pattern | Intended slot | First BINGO bonus |
|---|---|---|---|
| The Warm-Up Feast | Row, column, or diagonal | 6–8 min | 100 |
| The Turkey Trot | All four corners | 6–8 min | 150 |
| The Grand Thanksgiving Showdown | Both diagonals (full X) | 8–10 min | 200 |

Each round samples **24 distinct answers** into a callable pool. Every player's
card has those 24 answers in a unique random arrangement and one free center.
This intentionally bounds the draw count: all cards can finish within 24 calls.
At 15 seconds per question + 5 seconds to reveal/mark, a full draw is 8 minutes.
You may close a round after its first winners to maintain the schedule. Budget
about 3 minutes for introductions and 3 minutes for transitions and awards:
roughly 30 minutes at the default pacing. Human discussion, long timer settings,
and pauses can extend this; the application never forces the host onward.

All three pools are disjoint (72 questions); 8 bank questions are initially
reserved for tiebreakers. The first round has 15 easy/9 medium questions, the
second 10 easy/12 medium/2 hard, and the third 7 easy/9 medium/8 hard.

- A correct mark earns **10 points** exactly once.
- Finishers verified while the **same question is revealed** as the first
  winner share the full first-place bonus and a round victory. This avoids
  deciding simultaneous wins by network latency.
- Finishers verified on later questions get **50 bonus points**, once per round.
- Claim BINGO also checks the authoritative card; it cannot create marks.
- A tiebreak is an explicit speed round, ordered by server receipt time; a
  same-millisecond tie uses a stable player-ID ordering.
- Grand Champion and Cloud & Cornbread Champion are the top total scorer.
  Bingo Legend goes to the most first-place round victories (shared if tied).

## Deploy for a remote event

### Temporary public rehearsal

A Cloudflare Quick Tunnel can expose the **built game server** for a short
remote test without a Cloudflare account. Get approval before publishing:
anyone with its URL can access the game, and player traffic passes through
Cloudflare. Do not tunnel Vite or share the private host credential.

1. Install the official `cloudflared` client (`brew install cloudflared` on
   macOS with Homebrew) and run `npm run build`.
2. Start `cloudflared tunnel --url http://127.0.0.1:3218 --no-autoupdate`.
   Keep it running and note the generated HTTPS origin.
3. In a second terminal, start the built game using that exact origin:

   ```sh
   NODE_ENV=production HOST=127.0.0.1 PORT=3218 TRUST_PROXY=1 \
   PUBLIC_ORIGIN=https://YOUR-GENERATED-NAME.trycloudflare.com npm start
   ```

4. Open the **public HTTPS site** to host. Its QR and player links now use that
   public address. Share only the player registration URL with participants.
   The host roster and scores update live over Socket.IO.

Only run one game-server process against the data directory. If transferring
an existing room from localhost, preserve its private host-link fragment and
change only the hostname to the public hostname. Credentials are stored per
browser origin, so the bare public host URL will not automatically recover a
localhost credential.

Quick Tunnels have **no uptime guarantee**. The computer must remain awake,
online, and running both processes. The URL changes when the tunnel restarts.
This is not permanent hosting for a scheduled event. Stop both processes after
the rehearsal; use the persistent HTTPS deployment below for a stable event.

### Permanent hosting requirements

Use **one persistent Node instance**, one durable local SQLite volume, HTTPS,
and WebSocket support. A static-site-only host or ephemeral/serverless function
is **not** sufficient. This design comfortably targets a 15-player event, not
horizontal scaling. Multiple replicas require a shared transactional database
and Socket.IO adapter and are not supported by this configuration.

### Docker Compose with automatic HTTPS

On a Linux host with Docker Engine and the Compose plugin:

1. Point a DNS hostname's A record to the host's public IP.
2. Allow inbound TCP ports 80 and 443. Avoid a conflicting web server.
3. Copy this project to the host and run:

   ```sh
   DOMAIN=bingo.example.com docker compose up --build -d
   ```

4. Open `https://bingo.example.com`. Caddy obtains a certificate automatically,
   redirects HTTP to HTTPS, and proxies HTTP/WebSockets to the private backend.
5. Check readiness and logs:

   ```sh
   curl --fail https://bingo.example.com/api/health
   docker compose logs --tail=100 game https
   ```

   Include `DOMAIN=bingo.example.com` before subsequent Compose commands or
   store `DOMAIN=bingo.example.com` in an uncommitted `.env` file.

The named `game-data` volume preserves rooms across container restarts and
rebuilds. **Do not use `docker compose down -v`** unless you intend to delete
all rooms and saved host/player credentials. Stop normally with
`DOMAIN=bingo.example.com docker compose down`.

### Existing HTTPS reverse proxy or container platform

```sh
docker build -t cloud-cornbread .
docker run -d --name cloud-cornbread \
  -p 127.0.0.1:3001:3001 \
  -e PUBLIC_ORIGIN=https://bingo.example.com \
  -e TRUST_PROXY=1 \
  -v cornbread-data:/app/data \
  --restart unless-stopped cloud-cornbread
```

Forward your HTTPS hostname to port 3001 and enable WebSocket upgrade handling.
For managed container platforms, mount persistent storage at `/app/data`, set
the target port to 3001, disable scale-to-zero, and use exactly one replica.
Set the public origin to the exact browser origin, without a trailing slash.
If you change hostnames, existing browser-local credentials do not migrate:
use the saved private host link on the new hostname.

No Azure resources are provisioned by this project and no cloud deployment has
been performed. The Docker deployment is provider-neutral. Deploy only into an
approved environment; estimates, subscriptions, and resource approval are a
separate step.

### Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | HTTP/WebSocket server port |
| `HOST` | `0.0.0.0` | Listen address |
| `DATA_DIR` | project `data` directory | Persistent directory for `rooms.sqlite` |
| `NODE_ENV` | unset | Set to `production` on the internet |
| `PUBLIC_ORIGIN` | unset | Required HTTPS browser origin in production |
| `TRUST_PROXY` | `0` | Set `1` only behind exactly one trusted reverse proxy |
| `DOMAIN` | none | Compose/Caddy hostname; not used by the Node app |

For a non-Docker production process, build first, then use a process supervisor:

```sh
NODE_ENV=production PUBLIC_ORIGIN=https://bingo.example.com \
TRUST_PROXY=1 DATA_DIR=/absolute/persistent/path npm start
```

The `.env.example` file documents variables. Shell scripts do not automatically
load `.env`; export values or use Node's `--env-file=.env` option explicitly.

## Recovery, privacy, and operations

- Every successful mutation is committed to SQLite before acknowledgment.
  Refreshes and reconnects restore cards, scores, reveals, timers, and role.
- Player and host credentials live in local storage and the server's database.
  Clearing browser data loses that browser's identity. Preserve the private
  host link to recover host access; players cannot recover credentials from
  display names alone.
- The public six-character join code grants lobby access, **not** host control.
  A room allows up to 50 players. Joining is allowed in the lobby and between
  rounds, not mid-question. Names and scores are visible to room viewers.
- Host/player commands are capability-checked server-side. Snapshots are
  role-specific. Even winning-card presentations redact uncalled answers.
- Input bounds, payload limits, per-IP connection/creation limits, per-socket
  action limits, origin checking, CSP, and CSV formula neutralization are built in.
  Put an internet-facing rate-limiting proxy in front for an untrusted audience.
- The server cannot prevent someone from searching the web, discussing answers,
  or recognizing possibilities on their own card. This is friendly trivia,
  not a high-stakes proctored assessment.
- Keep the data volume private; it contains names and access tokens. Back it up
  with SQLite-aware tooling or stop the app before copying the whole directory
  (including its WAL files). There is no automatic expiration or cloud backup.
  After the event, export results and securely remove unneeded data under your
  organization's retention policy.
- Without a saved host link, there is deliberately no unauthenticated backdoor
  for recovering control. Restart/reset actions preserve connected identities
  and require confirmation. Removing a player immediately revokes their session.

## Verification

```sh
npm run build
npm test
npm run test:multiplayer
npm run verify:sources
```

- Unit tests cover bank counts, unique cards, pattern edge cases, authorization,
  unrevealed answers, idempotent scoring, simultaneous wins, pause/resume,
  snapshot redaction, full three-round rehearsal, tiebreakers, and persistence.
- The multiplayer test starts its own temporary server and 15 independent real
  Socket.IO clients, runs all 72 questions, verifies all scores, reconnects
  players, restarts the server, and resolves a final tie. It removes its temporary
  database and stops the server on completion. Run `npm run build` first because
  it also checks the built homepage.
- These automated tests accelerate time; the pacing assertion verifies the
  24 × (15 + 5) = 480-second per-round budget, not an actual 30-minute meeting.
- Rehearsal bots in the host UI are a separate optional feature, never a
  replacement for actual remote players.
- Browser checks exercised room creation, name-based joining, the separate
  public presentation, hidden-answer boundaries, reveal-to-mark behavior, and a
  live 10-point score update. Layout bounds were checked at 390px mobile,
  1440px desktop, and 1920 × 1080 presentation sizes without horizontal overflow.
- Docker was not available in the implementation environment, so container and
  HTTPS deployment instructions are provided but were not executed here.

### Trivia sourcing

The bank has **80 original questions**: Azure 40, American history 25, and
Thanksgiving & tech 15. Difficulty counts are exactly 36 easy / 32 medium /
12 hard (45% / 40% / 15%). Every entry carries an ID, exact answer, explanation,
and HTTPS supporting source. Most Azure references are Microsoft Learn; history
uses the National Archives, NASA, NPS, the FDR Library, and the Nobel Foundation.
Thanksgiving history includes Smithsonian Native Knowledge 360° and Plimoth
Patuxet Museums rather than treating a colonial origin story as the whole history.
Current branding uses **Microsoft Foundry**, with the former Azure AI Foundry
name explained. Azure Government uses its documented separate portal endpoint.

Source verification was performed on November 17, 2026. The link-check command
checks reachability, **not factual truth**. At the final check, 66 of 67 distinct
source URLs returned HTTP 200; Smithsonian's Native Knowledge 360° returned
HTTP 403 to Node's automated fetch, although its article was independently read
through the web retrieval tool. The checker deliberately reports that failure
instead of silently passing it. Recheck sources before reusing this game:
documentation, branding, and third-party access policies can change.

## Layout

- `src/server/engine.ts`: authoritative rules and redacted snapshots
- `src/server/index.ts`: HTTP, authenticated Socket.IO, persistence integration
- `src/server/store.ts`: durable SQLite room store
- `src/server/questions.ts`: complete sourced question bank
- `src/shared/types.ts`: shared contracts and pattern definitions
- `src/client/App.tsx`: welcome, host, player, presentation, and awards views
- `src/client/styles.css`: responsive harvest styling and reduced-motion support
- `scripts/multiplayer.ts`: independent-client end-to-end game test

The project intentionally does not include analytics, tracking, paid services,
third-party font requests, Teams APIs, or production secrets.

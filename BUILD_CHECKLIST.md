# WMS CLI — Build Checklist

## Phase 1: Project Setup
- [ ] Create `wms-cli/` directory structure (`src/commands/`, `src/lib/`)
- [ ] Write `package.json` with bin entries (`wms`, `revota`), ESM, Node >= 20
- [ ] Write `tsconfig.json` (ESM, strict, Node 20 types)
- [ ] Install dependencies: `commander`, `conf`, `cli-table3`, `kleur`
- [ ] Install dev dependencies: `typescript`, `tsup`, `tsx`, `@types/node`, `eslint`

## Phase 2: Core Library
- [ ] Implement `src/lib/config.ts` — conf wrapper, chmod 600, schema { apiUrl, token, user }
- [ ] Implement `src/lib/client.ts` — fetch wrapper, unwrap envelope, handle 401/429, verbose logging
- [ ] Implement `src/lib/output.ts` — table formatter, JSON formatter, error printer

## Phase 3: Auth Commands
- [ ] `wms login` — prompt email/password, POST /auth/login, store token
- [ ] `wms logout` — clear config
- [ ] `wms whoami` — POST /auth/token-validation, show user info

## Phase 4: Config Commands
- [ ] `wms config get <key>` — read config value
- [ ] `wms config set <key> <value>` — write config value

## Phase 5: Read Commands (v1)
- [ ] `wms stock list [--sku] [--location]` — GET /stock
- [ ] `wms sku list` — GET /products
- [ ] `wms sku get <code>` — GET /products/:code
- [ ] `wms inbound list` — GET /inbounds
- [ ] `wms inbound get <id>` — GET /inbounds/:id
- [ ] `wms outbound list` — GET /outbounds
- [ ] `wms outbound get <id>` — GET /outbounds/:id
- [ ] `wms location list` — GET /location

## Phase 6: CLI Entry Point
- [ ] `src/index.ts` — commander setup, global flags (--json, --api-url, --verbose), command registration

## Phase 7: Build & Verify
- [ ] Run `npm run build` (tsup → single-file bin)
- [ ] `npm link` or test with `node dist/index.js`
- [ ] Verify `wms login` against local backend (port 3030)
- [ ] Verify token persists in `~/.config/revota-wms/config.json` with mode 600
- [ ] Verify `wms stock list` returns table, `--json` returns raw data
- [ ] Verify invalid token → friendly "Session expired" message
- [ ] Verify 429 rate-limit handling (friendly message, no stack trace)

## Phase 8: Polish
- [ ] Add `.gitignore` (node_modules, dist, .env)
- [ ] Verify `npm run lint` and `npm run typecheck` pass
- [ ] Update root `AGENTS.md` with `wms-cli/` entry

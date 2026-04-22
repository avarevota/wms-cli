# wms-cli

Command-line client for the Revota WMS (Warehouse Management System). Thin HTTP wrapper over the `wms-be` NestJS API.

## Install

Requires Node.js >= 20.

```bash
git clone git@github.com:avarevota/wms-cli.git
cd wms-cli
npm install
npm run build
npm link        # exposes `wms` (and `revota`) globally
```

For local development without linking:

```bash
npm run dev -- <command>    # runs via tsx, no build step
# e.g.
npm run dev -- list inbounds
```

## Configure

The CLI stores config (API URL, auth token, user) in `~/.config/revota-wms/config.json` (chmod 600).

```bash
wms config set apiUrl https://wms.example.com   # default: http://localhost:3030
wms config get apiUrl
```

`api-url`, `apiurl`, and `apiUrl` are all accepted as key names.

## Authenticate

```bash
wms login                                   # prompts for email + password
wms login -e me@example.com -p secret       # non-interactive
wms whoami
wms logout                                  # clears token; apiUrl is preserved
```

## Commands

### `wms list <resource>`

Available resources: `inbounds`, `outbounds`, `stock`, `skus`, `locations`, `customers`, `movements`. Singular aliases (`inbound`, `sku`, `product`, …) also work.

```bash
wms list inbounds --status PENDING --limit 20
wms list outbounds --page 2
wms list stock                              # paginated; --json for full shape
wms list skus
wms list locations --zone A
wms list movements --from 2026-04-01 --to 2026-04-22
```

Flags (each applies where the backend supports it):

| Flag | Notes |
|---|---|
| `--limit <n>` | Page size, max 50 |
| `--page <n>` | Page number |
| `--status <v>` | Filter by status (inbounds / outbounds / movements) |
| `--sku <v>` | Filter by SKU (where supported) |
| `--location <v>` | Filter by location (where supported) |
| `--zone <v>` / `--area <v>` | Locations |
| `--from <date>` / `--to <date>` | Movements |
| `--json` | Raw JSON output (unwrapped `data`) |

### `wms get <resource> <id>`

```bash
wms get inbound <id>
wms get outbound <id>
wms get sku <id>
wms get location <id>
wms get customer <id>
wms get movement <id>
```

`wms get stock <id>` is not supported — the backend has no stock detail endpoint. Use `wms list stock` instead.

### Global flags

| Flag | Purpose |
|---|---|
| `--verbose` | Log request/response (password + token redacted) |
| `--json` | Raw JSON output (per-command) |
| `-h, --help` | Help on any command |

## Output modes

- **Default**: formatted table for lists, key/value block for details.
- **`--json`**: raw `data` from the API envelope. Pipe to `jq`:
  ```bash
  wms list inbounds --json | jq '.items[].reference'
  ```

## Error handling

The CLI exits with status `1` and a one-line error for:

- Network errors, non-JSON responses.
- `401` — prints `Session expired — run 'wms login'`.
- `429` — prints `Rate limit exceeded — slow down and retry.`
- Backend `{ success: false }` envelopes — prints `message` and `errors[]`.

## Development

```bash
npm run typecheck
npm run lint
npm run build       # tsup → dist/index.js
npm run dev -- list inbounds
```

Project layout:

```
src/
  index.ts              # commander entry, global flags, help footer
  commands/
    auth.ts             # login / logout / whoami
    config.ts           # config get/set
    list.ts             # `wms list <resource>` dispatcher
    get.ts              # `wms get <resource> <id>` dispatcher
  lib/
    client.ts           # fetch wrapper, envelope unwrap, 401/429 handling
    config.ts           # ~/.config/revota-wms store (chmod 600)
    resources.ts        # resource registry (add new resources here)
    output.ts           # table / JSON / colored output
    errors.ts           # shared error printer
```

Adding a new resource: append a `ResourceDef` entry in `src/lib/resources.ts` — no new command files needed.

## Operations Guide

For detailed status codes, workflows, and operational guidance, see [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md).

This guide is especially useful for:
- Understanding status code meanings (e.g., what does status "2" mean for inbounds?)
- Common operational workflows
- Data relationships between entities
- CLI tips for daily operations

## License

UNLICENSED — internal use only.

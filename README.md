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

Available resources: `inbounds`, `outbounds`, `stock`, `skus`, `locations`, `customers`, `movements`, `adjustments`, `opnames`, `picklists`. Singular and dashed aliases (`inbound`, `sku`, `product`, `adjustment`, `stock-opname`, `picklist`, …) also work.

```bash
wms list inbounds --status PENDING --limit 20
wms list outbounds --page 2
wms list stock                              # paginated; --json for full shape
wms list skus
wms list locations --zone A
wms list movements --from 2026-04-01 --to 2026-04-22
wms list adjustments --status 1 --warehouse-id <id> --from 2026-04-01
```

Flags (each applies where the backend supports it):

| Flag | Notes |
|---|---|
| `--limit <n>` | Page size, max 50 |
| `--page <n>` | Page number |
| `--status <v>` | Filter by status. Accepts numeric codes or enum labels for: `adjustments` / `opnames` (`PENDING`, `WAITING_FOR_APPROVAL`, `DONE`, `CANCELED`); `outbounds` (`HOLD`, `PROCESS`, `READY_TO_SHIP`, `COMPLETE`, `ERROR`, `CANCELED`); `picklists` (`PENDING`, `READY_TO_PICK`, `PICK`, `READY_TO_PACK`, `PACK`, `READY_TO_SHIP`, `SHIP`, `CANCELED`). |
| `--type <v>` | Adjustment type (1 = product) |
| `--sku <v>` | Filter by SKU (where supported) |
| `--location <v>` | Filter by location (where supported) |
| `--zone <v>` / `--area <v>` | Locations |
| `--from <date>` / `--to <date>` | Date ranges (movements, adjustments) |
| `--customer-id <id>` / `--brand-id <id>` / `--warehouse-id <id>` | Adjustments / scoped resources |
| `--assigned <id>` | Adjustments — filter by assignee |
| `--json` | Raw JSON output (unwrapped `data`) |

### `wms get <resource> <id>`

```bash
wms get inbound <id>
wms get outbound <id>
wms get sku <id>
wms get location <id>
wms get customer <id>
wms get movement <id>
wms get adjustment <id>
```

`wms get stock <id>` is not supported — the backend has no stock detail endpoint. Use `wms list stock` instead.

### `wms update <resource> <id>`

Updates products / variants via `PUT /products/:id` (the `id` is a **product variant id**). Pass any subset of flags, or hand it a full payload via `--data '<json>'`.

```bash
wms update sku <variantId> --name "New Name" --price 19900
wms update sku <variantId> --sku NEW-001 --sku-external EXT-001 --cogs 12000
wms update sku <variantId> --attributes '[{"name":"color","value":"red"}]'
wms update sku <variantId> --data '{"name":"…","sku":"…","skuExternal":"…","brandId":"…","categoryId":"…","method":1}'
```

Available fields: `--name`, `--sku`, `--sku-external`, `--msku`, `--brand-id`, `--category-id`, `--customer-id`, `--cogs`, `--price`, `--method`, `--note`, `--attributes` (JSON array), `--dimension` (JSON object). The backend marks `brandId`/`categoryId`/`name`/`sku`/`skuExternal` as required — for partial edits, fetch the record first or use `--data`.

### `wms adjustment <action>`

Stock-adjustment lifecycle. The flow is: **create** → **save-products** → (review/`update-item`/`cancel-item`) → **finish** → **approve**.

```bash
wms adjustment create \
  --warehouse-id <id> --assigned-to <userId> --due-date 2026-05-01 \
  [--customer-id <id>] [--brand-id <id>] [--note "monthly cycle count"]

wms adjustment save-products <adjustmentId> \
  --warehouse-id <id> \
  --items '[{"productVariantId":"…","originLocation":"BIN-A1","qty":12,"batchNumber":"…","expiredDate":"2026-12-31"}]'

# Convenience: add a single line without writing JSON
wms adjustment add-item <adjustmentId> \
  --warehouse-id <id> --product-variant-id <id> --origin-location BIN-A1 --qty 12 \
  [--batch-number B-001 --expired-date 2026-12-31 --inventory-status 1]

# Discover what's currently in stock for the adjustment's warehouse
wms adjustment products <adjustmentId>

wms adjustment items <adjustmentId> [--limit 50 --page 1]
wms adjustment update-item <itemId> --qty 10
wms adjustment cancel-item <itemId>
wms adjustment cancel <adjustmentId>           # cancel the whole adjustment
wms adjustment finish <adjustmentId>           # PENDING → WAITING_FOR_APPROVAL
wms adjustment approve <adjustmentId> --note "approved after spot check"
```

`finish` and `approve` return `{ succeed, failed, errors[] }` — the CLI prints both counts and any per-item errors. See [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md) for status codes.

### `wms inbound <action>`

Manage inbound work orders beyond list/get.

```bash
wms inbound orders <inboundId> [--limit 50 --page 1]
wms inbound update-order <orderId> --expected-quantity 12 --batch-number B-001 --expired-date 2026-12-31
wms inbound finish <inboundId>
wms inbound cancel <inboundId>
```

`update-order` is partial — pass any subset of `--expected-quantity`, `--batch-number`, `--expired-date`.

### `wms opname <action>`

Stock-opname / cycle-counting workflow. Mirrors adjustment in shape (PENDING → WAITING_FOR_APPROVAL → DONE / CANCELED) but the count source is "physical inventory at location", not a discrepancy ticket.

```bash
wms opname create --name "Q2 cycle count, zone A" \
  --warehouse-id <id> --assigned-to <userId> [--type 1] [--customer-id …] [--brand-id …] [--note …] [--due-date 2026-05-15]

# Discover product variants available to add (helper)
wms opname products <opnameId> --warehouse-id <id> [--zone-code Z1 --area-code A1 --search abc]

# Add counted items in batch (one storage list per group)
wms opname add-items \
  --data '[{"stockOpnameId":"<id>","productVariantIds":["<v1>","<v2>"],"storages":[{"warehouseId":"<id>","zoneCode":"Z1","areaCode":"A1","storageCode":"BIN-A1"}]}]'

# Or batch-update counted quantities by barcode after the count is done
wms opname batch-update-items <opnameId> \
  --items '[{"barcode":"123","storage":{"warehouseId":"<id>","zoneCode":"Z1","areaCode":"A1","storageCode":"BIN-A1"},"actualQuantity":12}]'

# Inspect & adjust per-item
wms opname items <opnameId> [--type 1 --group --limit 50 --page 1]
wms opname adjust-item <itemId> --quantity 11
wms opname cancel-item <itemId>

# Update header before finishing
wms opname update <opnameId> --name "…" --due-date 2026-05-30 --note "extended"

# Lifecycle
wms opname finish <opnameId>            # PENDING → WAITING_FOR_APPROVAL
wms opname approve <opnameId> --note    # → DONE (applies stock corrections)
wms opname cancel <opnameId>            # PATCH /cancel
wms opname delete <opnameId>            # soft delete
```

### `wms logs <kind>`

Read-only audit / activity surfaces. Bounded windows are enforced where the backend requires them.

```bash
wms logs activity   --module INBOUND --user-id <id> --from 2026-04-01 --to 2026-04-26
wms logs modules                                            # enum values for --module above
wms logs webhooks   --from 2026-04-01 --to 2026-04-26 --event 1 --keyword forstok
wms logs sync-stocks --from 2026-04-01 --type 1 --keyword "out of stock"
```

`logs webhooks` requires `--from` and `--to` (backend constraint). Use `--json` if you'd rather pipe the raw envelope into `jq`.

### `wms outbound <action>`

Outbound order management beyond list/get. Status flags accept labels (`PROCESS`, `READY_TO_SHIP`, `COMPLETE`, …) or numeric codes.

```bash
wms outbound update-status <orderId> --status READY_TO_SHIP --awb JNE1234
wms outbound update-status <orderId> --status CANCELED --cancel-reason "Customer canceled"
wms outbound cancel <orderId>
wms outbound bulk-update-status --ids <id1>,<id2> --status COMPLETE
wms outbound bulk-set-picker --ids <id1>,<id2> --picker <userId> --status PROCESS
wms outbound logs --outbound-number <code>
```

`bulk-*` commands accept `--is-selected-all` to apply to every record matching the supplied filters (`--filter-status`, `--customer-id`).

### `wms picklist <action>`

Picklist lifecycle from generation through shipping. The flow is: **generate** → **set picker** → **set mobile-storage** → **pick-away** (per scan) → **finish** → **set packing-area** → **update-to-shipped**.

```bash
# Generate a picklist for selected outbound orders
wms picklist generate --outbound-ids <id1>,<id2> --picker-count 2

# List items + see a single item
wms list picklists --status READY_TO_PICK
wms picklist items <picklistId>
wms picklist item <itemId>

# Assign and route
wms picklist set-picker <picklistId> --picker <userId>
wms picklist set-mobile-storage <picklistId> --area-code CART-1
wms picklist set-packing-area <picklistId> --area-code PACK-A

# Floor scans
wms picklist product-scan --sku <barcode>
wms picklist location-scan --location BIN-A1

# Per-item pick — one call per scan
wms picklist pick-away \
  --picklist-id <id> --pick-item-id <itemId> --item-barcode 12345 --qty 1 \
  --warehouse-id <id> --zone-code Z1 --area-code A1 --storage-code BIN-A1 \
  --mobile-storage-code CART-1

# Lifecycle
wms picklist finish <picklistId>
wms picklist update-to-shipped <picklistId> --awb JNE1234
```

### `wms put-away <action>`

Inbound **partial put-away** workflow on `/inbound-puts`. The flow is: **create session** → **add items** (per location) → **finish** (commits stock). Multiple sessions can run for one inbound.

```bash
# 1. Create a put-away session covering selected order line(s)
wms put-away create --inbound-id <inboundId> --order-ids <orderId1>,<orderId2>

# 2. Add a counted item, mapping it to a destination location
wms put-away add-item <putAwayId> \
  --inbound-order-id <orderId> --warehouse-id <id> \
  --zone-code Z1 --area-code A1 --storage-code BIN-A1 \
  --accepted 10 --rejected 0

# 3. Inspect / fix items
wms put-away detail <putAwayId>
wms put-away update-item <putAwayId> <itemId> \
  --warehouse-id <id> --zone-code Z1 --area-code A1 --storage-code BIN-A2 --accepted 8
wms put-away delete-item <putAwayId> <itemId>

# 4. List sessions for an inbound, finish or cancel
wms put-away list <inboundId>
wms put-away finish <putAwayId>          # commits stock to locations
wms put-away cancel <putAwayId>
```

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
    update.ts           # `wms update <resource> <id>` dispatcher
    adjustment.ts       # `wms adjustment <action>` workflow group
    inbound.ts          # `wms inbound <action>` (orders, update-order, finish, cancel)
    put-away.ts         # `wms put-away <action>` (partial put-away workflow)
    opname.ts           # `wms opname <action>` (cycle-count workflow)
    logs.ts             # `wms logs <kind>` (activity / webhooks / sync-stocks)
    outbound.ts         # `wms outbound <action>` (order status, picker, logs)
    picklist.ts         # `wms picklist <action>` (generate, pick, finish, ship)
  lib/
    client.ts           # fetch wrapper, envelope unwrap, 401/429 handling
    config.ts           # ~/.config/revota-wms store (chmod 600)
    resources.ts        # resource registry (add new resources here)
    output.ts           # table / JSON / colored output
    errors.ts           # shared error printer
```

Adding a new **read-only** resource: append a `ResourceDef` entry in `src/lib/resources.ts` — no new command files needed.

Adding **update support** to a resource: set the `update` block on its `ResourceDef` (method, fields, optional `pathFor`). The shared `wms update` dispatcher will pick up the flags automatically.

Adding a **new workflow** (multi-action lifecycle, e.g. adjustment / opname): create a dedicated command group in `src/commands/<name>.ts` and register it from `src/index.ts`. The resource registry handles list/get; the command file owns custom actions.

## Operations Guide

For detailed status codes, workflows, and operational guidance, see [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md).

This guide is especially useful for:
- Understanding status code meanings (e.g., what does status "2" mean for inbounds?)
- Common operational workflows
- Data relationships between entities
- CLI tips for daily operations

## License

UNLICENSED — internal use only.

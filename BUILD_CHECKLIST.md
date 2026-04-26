# WMS CLI — Roadmap

Status snapshot of the CLI: what's shipped, what's open, and what's next.
For user-facing docs see [README.md](README.md) and [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md).

## Shipped

### Foundations (v0.1.0)
- [x] Project scaffold (`commander`, `conf`, `cli-table3`, `kleur`, `tsup`, ESM, Node ≥ 20)
- [x] `src/lib/config.ts` — `~/.config/revota-wms/config.json` (chmod 600)
- [x] `src/lib/client.ts` — fetch wrapper, response-envelope unwrap, 401 / 429 handling, `--verbose` redacting
- [x] `src/lib/output.ts` — table / JSON / colored output
- [x] Auth: `wms login`, `wms logout`, `wms whoami`
- [x] Config: `wms config get / set`
- [x] Resource registry (`src/lib/resources.ts`) — adding a read-only resource is a single object literal

### Read commands (v0.1.0)
- [x] `wms list <resource>` for inbounds / outbounds / stock / skus / locations / customers / movements
- [x] `wms get <resource> <id>` for the same set (except `stock` — no detail endpoint)
- [x] Shared filter flags (`--status`, `--sku`, `--location`, `--zone`, `--area`, `--from`, `--to`, `--limit`, `--page`, plus `--type`, `--customer-id`, `--brand-id`, `--warehouse-id`, `--assigned`)

### Update support (v0.2.0)
- [x] `wms update sku <variantId>` — `PUT /products/:id` with per-field flags + `--data` JSON passthrough
- [x] `ResourceDef.update` block so other resources can opt in

### Stock adjustments (v0.3.0)
- [x] `adjustments` resource for `list` / `get`
- [x] `wms adjustment` group: `create`, `save-products`, `items`, `update-item`, `cancel-item`, `cancel`, `finish`, `approve`
- [x] Numeric-enum status label helper

### Inbound + put-away (v0.4.0)
- [x] `wms inbound` group: `orders`, `update-order`, `finish`, `cancel`
- [x] `wms put-away` group covering `/inbound-puts` partial flow:
      `list`, `detail`, `create`, `add-item`, `update-item`, `delete-item`,
      `finish`, `cancel` (`putaway` alias)
- [x] Status label helper for `InboundPutAwayStatusEnum`
- [x] CHANGELOG.md introduced (Keep a Changelog format)

### Distribution
- [x] Tarball build via `tsup` → `dist/index.js`
- [x] GitHub Packages publishing config (`.npmrc`, `publishConfig`)
- [ ] Migrate publish to public/private **npm registry** (in progress — outside CLI itself)

## Up next

Ranked by ops impact (highest first). Pick one before starting; don't queue work speculatively.

### 1. Stock opname (cycle counting)
**Why:** Pairs with adjustment; the read-only piece of the stock-control story.
**Backend surface to wrap:** `/stock-opname` controller — session create / add items / submit / approve.
**CLI shape (sketch):** mirror `wms adjustment` — `create / save-products / items / finish / approve / cancel`.

### 2. Outbound pick / pack / ship
**Why:** Customer-facing daily ops; the natural counterpart to the inbound flow we just shipped.
**Scope warning:** Larger surface than inbound — picklist generation, wave picks, pack confirmation, ship label, multiple status enums. Consider splitting into sub-phases (pick first, then pack/ship).

### 3. Polish

- [ ] `--status PENDING` (label) in addition to `--status 1` (numeric) on adjustments / movements / opname.
- [ ] `wms adjustment add-item <adjId>` convenience subcommand for single-line additions (no JSON).
- [ ] `wms list adjustments --customer-id` / `--brand-id` autocomplete from local cache (later).
- [ ] Restore `npm run lint` — `@typescript-eslint/*` deps were referenced by `eslint.config.js` but aren't installed.

## Out of scope (for now)

- Interactive UIs / TUIs.
- Bulk import wrappers (the backend already exposes XLSX endpoints for these; the CLI doesn't try to replicate the spreadsheets).
- Per-environment config profiles. Single active config is sufficient for current users.

## Versioning

Pre-1.0: minor for new commands/features (0.2 → 0.3 added `update`; 0.3 → 0.4 added `inbound` + `put-away`), patch for bug fixes. Bump in the same commit as the feature so it's traceable. Maintain `CHANGELOG.md` alongside the version bump.

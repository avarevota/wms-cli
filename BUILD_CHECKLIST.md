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

### Stock opname + logs (v0.5.0)
- [x] `opnames` resource for `list` / `get` (with aliases)
- [x] `wms opname` group: `create`, `update`, `products`, `add-items`,
      `batch-update-items`, `items`, `adjust-item`, `cancel-item`,
      `cancel`, `finish`, `approve`, `delete`
- [x] `wms logs` group: `activity`, `modules`, `webhooks`, `sync-stocks`
- [x] Status label helper for `OpnameStatusEnum`

### Adjustment polish (v0.5.1)
- [x] `wms adjustment add-item <adjId>` — single-line convenience wrapper.
- [x] `wms adjustment products <adjId>` — discoverability helper.
- [x] Label-aware `--status` on `list adjustments` / `list opnames`
      (case-insensitive `PENDING` / `WAITING_FOR_APPROVAL` / `DONE` /
      `CANCELED`); numeric values still pass through.
- [x] `ResourceDef.flagTransforms` extension point.

### Outbound + picklist (v0.6.0 — pick/pack/ship Phase 1)
- [x] `wms outbound` group: `update-status`, `cancel`,
      `bulk-update-status`, `bulk-set-picker`, `logs`.
- [x] `wms picklist` group: `items`, `item`, `generate`, `set-picker`,
      `bulk-set-picker`, `set-mobile-storage`, `set-packing-area`,
      `pick-away`, `update-to-shipped`, `finish`, `product-scan`,
      `location-scan`.
- [x] `picklists` resource for list (no detail endpoint yet).
- [x] Label-aware `--status` for `outbounds` (HOLD/PROCESS/READY_TO_SHIP/
      COMPLETE/ERROR/CANCELED) and `picklists` (PENDING/READY_TO_PICK/
      PICK/READY_TO_PACK/PACK/READY_TO_SHIP/SHIP/CANCELED).
- [x] `labelToCode` re-exported for downstream command files.

### Pack + ship (v0.7.0 — pick/pack/ship Phase 2)
- [x] `wms pack` group: `create`, `pack-away`, `finish`, `orders`,
      `items`, `pack-order`, `mobile-storages`, `adjust-item`.
- [x] `wms ship` group (alias `shipment`): `create`, `proof-of-delivery`,
      `completed`.
- [x] `packs` resource for list/get; `ships` resource for list/get
      (aliases `shipments`/`shipment`/`ship`).
- [x] Label-aware `--status` for `packs` (PENDING/INPROGRESS/DONE) and
      `ships` (READY_TO_SHIP/SHIPPED).

### Polish + bug fix (v0.7.1)
- [x] Label-aware `--status` for `movements`; aligned `listQuery` with
      the backend (`movementStatus`/`movementType`/`startDate`/`endDate`,
      plus `customerId`/`brandId`/`warehouseId`).
- [x] Restored `npm run lint` (installed `@typescript-eslint/*`).
- [x] Removed broken `wms picklist bulk-set-picker` (wrong endpoint).
      Will return as `wms wave-pick bulk-set-picker` when wave-pick lands.
- [x] Extracted `splitCsv` / `parseJsonArray` / `parseNumberFlag` into
      `src/lib/flags.ts`; collapsed ~5 duplicates.

### Distribution
- [x] Tarball build via `tsup` → `dist/index.js`
- [x] GitHub Packages publishing config (`.npmrc`, `publishConfig`)
- [ ] Migrate publish to public/private **npm registry** (in progress — outside CLI itself)

## Up next

Ranked by ops impact (highest first). Pick one before starting; don't queue work speculatively.

### 1. Wave-pick (optional Phase 3)
**Why:** Advanced batch picking; not required for basic operations. The full pick/pack/ship flow now works without it. Skip unless ops explicitly asks for batch-picking automation.
**Backend surface:** `/wave-pick/*` — params CRUD, picker assignment (single + bulk), wave create (single + background), status update, summary, picklist association/removal. ~14 routes — meaningful work.
**CLI shape (sketch):**
- `wms wave-pick params <list/get/create/update/delete>`
- `wms wave-pick create / set-picker / set-status / summary / picklists / remove-picklist`
- `wave-picks` resource for list/get.

### 2. Other follow-ups

- [ ] Reuse the status-label mapper in a single helper now that we have five
      similar maps (Adjustment / Opname / Movement / Outbound / Picklist /
      Pack / Ship). Worth doing before the eighth one lands.

## Out of scope (for now)

- Interactive UIs / TUIs.
- Bulk import wrappers (the backend already exposes XLSX endpoints for these; the CLI doesn't try to replicate the spreadsheets).
- Per-environment config profiles. Single active config is sufficient for current users.

## Versioning

Pre-1.0: minor for new commands/features (0.2 → 0.3 added `update`; 0.3 → 0.4 added `inbound` + `put-away`), patch for bug fixes. Bump in the same commit as the feature so it's traceable. Maintain `CHANGELOG.md` alongside the version bump.

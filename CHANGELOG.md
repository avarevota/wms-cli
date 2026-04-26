# Changelog

All notable changes to `@revota/wms-cli` are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [SemVer](https://semver.org/) (pre-1.0: minor = features, patch = fixes).

## [Unreleased]

## [0.7.1] — 2026-04-26

### Removed
- `wms picklist bulk-set-picker` — was POSTing a wave-pick-shaped payload
  to `/picklist/set-picker` (single-record endpoint). The actual bulk
  endpoint is `/wave-pick/bulk-set-picker` and will return as
  `wms wave-pick bulk-set-picker` when wave-pick lands.

### Changed
- `--status` on `list movements` now accepts enum labels (`PENDING`,
  `WAITING_FOR_APPROVAL`, `DONE`, `CANCELED`) in addition to numeric
  codes; default columns show the label.
- `movements` listQuery aligned with backend MovementQuery: `--status`
  → `movementStatus`, `--type` → `movementType`, `--from`/`--to` →
  `startDate`/`endDate`, plus `--customer-id`/`--brand-id`/
  `--warehouse-id`. Removes the bogus `--sku` filter the backend never
  honored.
- Extracted `splitCsv` / `parseJsonArray` / `parseNumberFlag` helpers
  into `src/lib/flags.ts`; collapses ~5 duplicates.

### Fixed
- `npm run lint` now works — installed missing `@typescript-eslint/*`
  dev-deps. Codebase is clean against `tseslint.configs.recommended`.

## [0.7.0] — 2026-04-26

### Added (Pack + Ship — Phase 2 of pick/pack/ship)
- `wms pack` command group:
  - `create --picklist-ids <csv>` — create pack from finished picklists.
  - `pack-away --pack-item-id <id> --qty <n> [--item-barcode]` — single
    pack scan.
  - `finish --pack-id <id> --pack-order-id <id>` — close a pack order.
  - `orders <packId>`, `items <packOrderId>`, `pack-order <packId> <orderId>`,
    `mobile-storages [--mobile-storage-code]` — read helpers.
  - `adjust-item <itemId> --quantity <n>` — fix packed quantity.
- `wms ship` command group (alias `shipment`):
  - `create --awb <code>` — create ship order from an AWB.
  - `proof-of-delivery <shipId> --proof <value>` — attach POD reference.
  - `completed <shipId>` — mark delivered.
- New resources: `packs` (list/get) and `ships` (list/get; aliases
  `shipments`/`shipment`/`ship`). Both with label-aware `--status`.
- Status enum maps:
  - `PackStatusEnum`: `PENDING`, `INPROGRESS`, `DONE`.
  - `ShipOrderStatusEnum`: `READY_TO_SHIP`, `SHIPPED`.

### Notes
- Wave-pick (Phase 3) remains optional; deferred until ops asks.

## [0.6.0] — 2026-04-26

### Added (Outbound + Picklist — Phase 1 of pick/pack/ship)
- `wms outbound` command group:
  - `update-status <orderId> --status <n|label> [--awb] [--cancel-reason]`
  - `cancel <orderId>`
  - `bulk-update-status --ids <csv> --status <n|label>`
  - `bulk-set-picker --ids <csv> --picker <id> --status <…>`
  - `logs [--outbound-number]`
- `wms picklist` command group covering the floor's picking flow:
  - `items <id>`, `item <itemId>`
  - `generate --outbound-ids <csv> [--picker-count] [--bulk]`
  - `set-picker <picklistId>`, `bulk-set-picker --ids <csv>`
  - `set-mobile-storage`, `set-packing-area`
  - `pick-away` (records a single pick scan)
  - `update-to-shipped <picklistId> --awb`
  - `finish <picklistId>`
  - `product-scan --sku`, `location-scan --location`
- `picklists` resource for `wms list picklists` (label-aware `--status`).
- Label-aware `--status` on `outbounds` + `picklists` (e.g. `--status PROCESS`,
  `--status READY_TO_PICK`).
- Outbound + picklist columns now show enum labels in default tables.
- Public re-export of `labelToCode` from `lib/resources.ts` so command
  files can build their own label-validated flags.

### Notes
- Pack and ship workflows planned for v0.7.0 (Phase 2).
- Wave-pick deferred (Phase 3, optional).

## [0.5.1] — 2026-04-26

### Added
- `wms adjustment add-item <id>` — single-line convenience wrapper around
  `save-products` (no JSON required).
- `wms adjustment products <id>` — list product variants currently
  available to adjust (wraps `GET /adjustments/:id/products`).
- `--status` on `list adjustments` and `list opnames` now accepts
  enum labels (case-insensitive: `PENDING`, `WAITING_FOR_APPROVAL`,
  `DONE`, `CANCELED`) in addition to numeric codes.

### Changed
- `ResourceDef` gains an optional `flagTransforms` map so resources can
  coerce CLI flag values before they're forwarded to the API.
- Roadmap polish queue trimmed to reflect what's now shipped.

## [0.5.0] — 2026-04-26

### Added
- `opnames` resource for `wms list` / `wms get` (aliases: `opname`,
  `stock-opnames`, `stock-opname`).
- `wms opname` command group covering the cycle-count lifecycle:
  `create`, `update`, `products`, `add-items`, `batch-update-items`,
  `items` (with `--group` for location grouping), `adjust-item`,
  `cancel-item`, `cancel`, `finish`, `approve`, `delete`.
- `wms logs` command group for read-only operational logs:
  `activity`, `modules`, `webhooks` (with required `--from` / `--to`),
  `sync-stocks`.
- README + KNOWLEDGE: opname workflow + logs surface documented; roadmap
  marks opname as shipped, outbound bumped to top of "next".

## [0.4.0] — 2026-04-26

### Added
- `wms inbound` command group: `orders`, `update-order`, `finish`, `cancel`
  for managing inbound work orders and their line items.
- `wms put-away` command group covering the partial put-away workflow on
  `/inbound-puts`: `list`, `detail`, `create`, `add-item`, `update-item`,
  `delete-item`, `finish`, `cancel`. `putaway` accepted as alias.
- Numeric-enum status label helper for `InboundPutAwayStatusEnum`
  (PENDING / COMPLETE / CANCELED).
- README + KNOWLEDGE: inbound and put-away workflows documented; roadmap
  shifts inbound from "next" to "shipped" and elevates outbound + opname.

## [0.3.0] — 2026-04-26

### Added
- `adjustments` resource with `wms list` / `wms get` support, including
  `--type`, `--customer-id`, `--brand-id`, `--warehouse-id`, `--assigned`,
  `--from`, `--to` filters.
- `wms adjustment` command group covering the full stock-adjustment
  lifecycle: `create`, `save-products`, `items`, `update-item`,
  `cancel-item`, `cancel`, `finish`, `approve`.
- Numeric-enum status label helper (PENDING / WAITING_FOR_APPROVAL /
  DONE / CANCELED) for adjustment list/detail output.
- README: `wms adjustment` section + adjustments resource entry.
- KNOWLEDGE: "Running a Stock Adjustment" workflow playbook.
- Roadmap doc replacing the stale build checklist.

## [0.2.0] — 2026-04-26

### Added
- `wms update <resource> <id>` command.
- `skus` resource gains an `update` block backed by `PUT /products/:id`,
  with per-field flags (`--name`, `--sku`, `--sku-external`, `--msku`,
  `--brand-id`, `--category-id`, `--customer-id`, `--cogs`, `--price`,
  `--method`, `--note`, `--attributes`, `--dimension`) and a
  `--data '<json>'` passthrough.
- `ResourceDef.update` extension point so additional resources can opt
  in to update support without touching the dispatcher.

## [0.1.0] — initial release

### Added
- Project scaffold (`commander`, `conf`, `cli-table3`, `kleur`,
  `tsup`, ESM, Node ≥ 20).
- Auth: `wms login`, `wms logout`, `wms whoami`.
- Config: `wms config get`, `wms config set` — stored in
  `~/.config/revota-wms/config.json` (chmod 600).
- Read commands: `wms list <resource>` and `wms get <resource> <id>`
  for `inbounds`, `outbounds`, `stock`, `skus`, `locations`,
  `customers`, `movements` (with shared filter flags and `--json`).
- Resource registry pattern in `src/lib/resources.ts`.
- Verbose mode (`--verbose`) with token / password redaction.
- Friendly handling for HTTP 401 (session expired) and 429 (rate limit).
- GitHub Packages publishing config (`.npmrc`, `publishConfig`),
  ESLint config, distribution & knowledge docs.

[Unreleased]: https://github.com/avarevota/wms-cli/compare/v0.7.1...HEAD
[0.7.1]: https://github.com/avarevota/wms-cli/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/avarevota/wms-cli/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/avarevota/wms-cli/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/avarevota/wms-cli/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/avarevota/wms-cli/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/avarevota/wms-cli/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/avarevota/wms-cli/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/avarevota/wms-cli/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/avarevota/wms-cli/releases/tag/v0.1.0

# WMS CLI Knowledge Base

This document provides essential context for LLM agents helping operations teams use the WMS CLI.

## Overview

The WMS CLI is a command-line interface for the Revota Warehouse Management System (WMS). It allows operations teams to query and manage warehouse data including inventory, orders, customers, and locations.

## Core Concepts

### Resources

The CLI operates on these main resources:

- **inbounds** - Incoming inventory shipments to the warehouse
- **outbounds** - Outgoing orders being shipped to customers  
- **stock** - Current inventory levels across all products
- **skus** - Product catalog (SKU = Stock Keeping Unit)
- **locations** - Warehouse locations (zones, areas, storage bins)
- **customers** - Customer accounts managed in the system
- **movements** - Internal stock transfers and adjustments
- **adjustments** - Stock-adjustment work orders (cycle-count corrections, damage/loss). Has its own lifecycle: PENDING → WAITING_FOR_APPROVAL → DONE (or CANCELED)
- **opnames** - Stock-opname (cycle counting) sessions. Same lifecycle as adjustments, but the inputs are physical counts at locations rather than discrepancy claims
- **picklists** - Pick work orders generated from outbound orders. Lifecycle: PENDING → READY_TO_PICK → PICK → READY_TO_PACK → PACK → READY_TO_SHIP → SHIP (or CANCELED)

### Authentication

Users must authenticate before using most commands:
- Config stored in `~/.config/revota-wms/config.json`
- Token obtained via `wms login`
- Default API URL: `http://localhost:3030`

## Status Code Reference

### Inbound Status Codes

When viewing inbound orders, the status field shows:

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Order received but not yet processed |
| 2 | Available | Items received and available in inventory |
| 3 | In Progress | Currently being processed/received |
| 99 | Canceled | Order has been canceled |

### Inbound Order Status (Line Items)

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Line item awaiting processing |
| 2 | Complete | All items received |
| 3 | Partial | Partially received |
| 99 | Canceled | Line item canceled |

### Inbound Put Status (Accept/Reject)

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Accepted | Items accepted into inventory |
| 2 | Rejected | Items rejected (quality/damage) |

### Inbound Put Away Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Awaiting put away |
| 2 | Complete | Items placed in locations |
| 99 | Canceled | Put away canceled |

### Outbound Status Codes

When viewing outbound orders, the status field shows:

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Hold | Order on hold, not yet released |
| 2 | Process | Order is being processed |
| 3 | Ready to Ship | Items picked and packed, ready for shipping |
| 4 | Complete | Order has been shipped |
| 5 | Error | Error occurred during processing |
| 99 | Canceled | Order has been canceled |

### Outbound Order Status (Line Items)

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Awaiting processing |
| 2 | Ready to Pick | Items ready for picking |
| 3 | Pick | Currently being picked |
| 4 | Ready to Pack | Picked, ready for packing |
| 5 | Pack | Currently being packed |
| 6 | Ready to Ship | Packed, ready for shipping |
| 7 | Ship | Shipped |
| 99 | Canceled | Canceled |

### Outbound Item Status (Detailed)

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Awaiting processing |
| 2 | Waiting for Picklist | Awaiting picklist generation |
| 3 | Waiting for Picker | Awaiting picker assignment |
| 4 | Ready to Pick | Ready for picking |
| 5 | Picking | Currently being picked |
| 6 | Handover to Packing | Moving to packing |
| 7 | Ready to Pack | Ready for packing |
| 8 | Packing | Currently being packed |
| 9 | Handover to Shipping | Moving to shipping |
| 10 | Ready to Ship | Ready for shipping |
| 11 | Shipped | Shipped |
| 99 | Canceled | Canceled |

### Movement Status Codes

When viewing stock movements:

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Movement request created, awaiting approval |
| 2 | Waiting for Approval | Awaiting manager approval |
| 3 | Done | Movement completed |
| 99 | Canceled | Movement canceled |

### Movement Item Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Item pending movement |
| 2 | Done | Item moved |
| 99 | Canceled | Item movement canceled |

### Stock Adjustment Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Adjustment request created |
| 2 | Waiting for Approval | Awaiting approval |
| 3 | Done | Adjustment applied |
| 99 | Canceled | Adjustment canceled |

### Stock Opname Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Count session created |
| 2 | Waiting for Approval | Count completed, awaiting approval |
| 3 | Done | Count approved and applied |
| 99 | Canceled | Count session canceled |

### Picklist Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Picklist created |
| 2 | Ready to Pick | Ready for picking |
| 3 | Pick | Currently picking |
| 4 | Ready to Pack | Ready for packing |
| 5 | Pack | Currently packing |
| 6 | Ready to Ship | Ready for shipping |
| 7 | Ship | Shipped |
| 99 | Canceled | Canceled |

### Pack Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Awaiting packing |
| 2 | In Progress | Currently packing |
| 3 | Done | Packing complete |

### Ship Order Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Ready to Ship | Ready for shipping |
| 2 | Shipped | Shipped |

### Wave Pick Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Open | Wave pick open |
| 2 | In Progress | Currently being processed |
| 3 | Completed | Wave pick completed |

### Warehouse Transfer Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Pending | Transfer request created |
| 2 | In Progress | Transfer in progress |
| 3 | Completed | Transfer completed |
| 99 | Canceled | Transfer canceled |

### Product Status

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Inactive | Product not active |
| 1 | Active | Product active |

### Product Variant Status

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Inactive | Variant not active |
| 1 | Active | Variant active |

### Customer Status

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Inactive | Customer inactive |
| 1 | Active | Customer active |
| 2 | Blocked | Customer blocked |

### Inventory Detail Status

| Code | Meaning | Description |
|------|---------|-------------|
| 1 | Put | Put away |
| 2 | Import Outbound | Imported outbound order |
| 3 | Pick | Picking |
| 4 | Complete | Completed |
| 5 | Stock Opname | Stock counting |
| 6 | Stock Movement | Movement |
| 7 | Stock Adjustment | Adjustment |
| 99 | Canceled | Canceled |

### Serial Number Status

| Status | Description |
|--------|-------------|
| received | Item received |
| in stock | Available in inventory |
| ready to pick | Locked for order |
| picking | Currently being picked |
| ready to pack | Picked, ready to pack |
| shipped | Shipped |
| expired | Expired |
| discontinued | Discontinued |
| in_transfer | In transfer |
| returned | Returned |
| rejected | Rejected |
| damaged | Damaged |
| canceled | Canceled |
| changed | Changed |

## Common Workflows

### Checking Inventory
```bash
# View all stock levels
wms list stock --limit 20

# View specific product
wms list skus --limit 10
```

### Receiving an Inbound (Partial Put-Away)

The inbound flow is two-phase: the **inbound** order is created (typically via XLSX import or integration), then receivers run one or more **put-away sessions** to commit physical stock to bin locations. The CLI wraps the partial put-away controller (`/inbound-puts`).

```bash
# 1. Find the inbound and inspect its line items
wms list inbounds --status 1 --limit 20
wms inbound orders <inboundId>

# 2. Open a put-away session for the lines you'll receive now
wms put-away create --inbound-id <inboundId> --order-ids <orderId1>,<orderId2>

# 3. For each counted box, record the destination + accepted/rejected qty
wms put-away add-item <putAwayId> \
  --inbound-order-id <orderId> --warehouse-id <id> \
  --zone-code Z1 --area-code A1 --storage-code BIN-A1 \
  --accepted 10 --rejected 0

# 4. Verify, then finish (commits stock; status PENDING → COMPLETE)
wms put-away detail <putAwayId>
wms put-away finish <putAwayId>

# 5. Once all session(s) for an inbound are committed, close the inbound
wms inbound finish <inboundId>
```

Use `wms put-away cancel <putAwayId>` to abort a session before finishing. `wms inbound cancel <inboundId>` cancels the whole inbound (only valid if no put-aways are committed).

`update-order` lets receivers correct line-item details (qty / batch / expiry) before put-away:

```bash
wms inbound update-order <orderId> --expected-quantity 12 --batch-number B-001 --expired-date 2026-12-31
```

### Processing Inbound Shipments (read-only)
```bash
# List pending inbounds
wms list inbounds --status 1 --limit 10

# Get details of specific inbound
wms get inbound <inbound-id>
```

### Monitoring Outbound Orders
```bash
# List orders ready to ship
wms list outbounds --status 3 --limit 20

# Check orders with errors
wms list outbounds --status 5 --limit 10
```

### Managing Stock Movements
```bash
# List pending movements
wms list movements --status 1 --limit 10

# View movement history
wms list movements --from 2026-01-01 --to 2026-04-22
```

### Running a Stock Opname (cycle count)

Opname is the structured way to count physical stock and reconcile it with the system. The lifecycle mirrors adjustment but the data flow is "count first, write deltas later".

```bash
# 1. Open a session — name is unique per warehouse
wms opname create --name "Q2-cycle-zoneA-2026" \
  --warehouse-id <id> --assigned-to <userId> --due-date 2026-05-15 \
  --note "Q2 cycle count, zone A"

# 2. Discover variants present in the targeted area (optional helper)
wms opname products <opnameId> --warehouse-id <id> --zone-code Z1 --area-code A1

# 3. Add the items to count, scoped by storage groups
wms opname add-items \
  --data '[{"stockOpnameId":"<opnameId>","productVariantIds":["<v1>","<v2>"],"storages":[{"warehouseId":"<id>","zoneCode":"Z1","areaCode":"A1","storageCode":"BIN-A1"}]}]'

# 4. After the floor count, push counted quantities by barcode
wms opname batch-update-items <opnameId> \
  --items '[{"barcode":"<sku>","storage":{"warehouseId":"<id>","zoneCode":"Z1","areaCode":"A1","storageCode":"BIN-A1"},"actualQuantity":12}]'

# Or correct a single line:
wms opname adjust-item <itemId> --quantity 11
wms opname cancel-item <itemId>

# 5. Submit for approval (PENDING → WAITING_FOR_APPROVAL)
wms opname finish <opnameId>

# 6. Approve — applies the deltas to inventory (→ DONE)
wms opname approve <opnameId> --note "verified by supervisor"
```

`opname` differs from `adjustment` in two practical ways:
- The count is location-driven (you walk a zone and record what's there), so the items list is grouped by location with `wms opname items <opnameId> --group`.
- The session has a `name` (unique) so it's easier to coordinate multiple counters working different zones at the same time.

### Picking and Shipping an Outbound Order (Phase 1)

The outbound flow is multi-stage: **outbound order** (HOLD → PROCESS → READY_TO_SHIP → COMPLETE) → **picklist** (generated from one or more orders) → **pick** (per-scan, into a mobile-storage cart) → **pack** → **ship**.

This release covers the order-management and pick portions; pack/ship will land in a follow-up.

```bash
# Find work and triage
wms list outbounds --status PROCESS --limit 20
wms outbound logs --outbound-number <code>

# Status corrections + cancellation
wms outbound update-status <orderId> --status READY_TO_SHIP --awb JNE1234
wms outbound update-status <orderId> --status CANCELED --cancel-reason "Customer canceled"
wms outbound cancel <orderId>

# Bulk operations (e.g. same-day-cutoff release)
wms outbound bulk-update-status --ids <id1>,<id2> --status COMPLETE
wms outbound bulk-set-picker --ids <id1>,<id2> --picker <userId> --status PROCESS

# Generate the pick work and assign it
wms picklist generate --outbound-ids <id1>,<id2> --picker-count 2
wms list picklists --status READY_TO_PICK
wms picklist set-picker <picklistId> --picker <userId>
wms picklist set-mobile-storage <picklistId> --area-code CART-1

# Floor scans (mostly used by mobile UIs, exposed here for tooling/scripting)
wms picklist product-scan --sku <barcode>
wms picklist location-scan --location BIN-A1

# Per-item pick — one call per scan/box
wms picklist pick-away \
  --picklist-id <id> --pick-item-id <itemId> --item-barcode 12345 --qty 1 \
  --warehouse-id <id> --zone-code Z1 --area-code A1 --storage-code BIN-A1 \
  --mobile-storage-code CART-1

# Hand off the cart and (eventually) record AWB
wms picklist set-packing-area <picklistId> --area-code PACK-A
wms picklist finish <picklistId>
wms picklist update-to-shipped <picklistId> --awb JNE1234
```

### Inspecting Logs (activity / webhooks / sync-stocks)

Three log surfaces are exposed read-only. Use them to debug "why didn't this happen?" questions:

```bash
# All user actions in a module / time range
wms logs activity --module INBOUND --from 2026-04-01 --to 2026-04-26

# Discover the module enum values usable above
wms logs modules

# External callbacks (Forstok / Ginee / Qianyi). Time window required.
wms logs webhooks --from 2026-04-01 --to 2026-04-26 --event 1 --keyword forstok

# Stock pushes back to channels (per-SKU)
wms logs sync-stocks --from 2026-04-01 --type 1 --keyword "out of stock"
```

`logs webhooks` requires `--from` and `--to` (backend rejects unbounded queries).

### Running a Stock Adjustment (cycle-count correction)

Adjustments are work orders that record discrepancies between system stock and physical stock. The lifecycle is enforced by the backend — items can only be edited while the adjustment is `PENDING`, and stock is only written to ledgers on `approve`.

```bash
# 1. Create the work order (status = 1 PENDING)
wms adjustment create \
  --warehouse-id <id> --assigned-to <userId> --due-date 2026-05-01 \
  --note "Q2 cycle count, zone A"

# 2. Add the counted items (one call, JSON array)
wms adjustment save-products <adjustmentId> \
  --warehouse-id <id> \
  --items '[{"productVariantId":"<id>","originLocation":"A1-01","qty":12}]'
# `qty` here is the COUNTED quantity. The backend computes
# adjustQuantity = newAvailableQuantity - availableQuantity.

# 3. Review what's queued (and fix lines if needed)
wms adjustment items <adjustmentId>
wms adjustment update-item <itemId> --qty 13
wms adjustment cancel-item <itemId>

# 4. Submit for approval (1 → 2 WAITING_FOR_APPROVAL)
wms adjustment finish <adjustmentId>

# 5. Approve — applies stock changes (2 → 3 DONE)
wms adjustment approve <adjustmentId> --note "verified by supervisor"

# Abort at any point before approve:
wms adjustment cancel <adjustmentId>
```

`finish` and `approve` return `{ succeed, failed, errors[] }`. A non-zero `failed` count means some items couldn't be applied (e.g. stock no longer in the origin location). Inspect the printed errors and resolve them before re-running.

## Data Relationships

### Inbound Flow
1. **Inbound** (header) contains multiple **orders** (line items)
2. Each order references a **product variant** (SKU)
3. Products are received into **locations**
4. Status progresses: 1 (Pending) → 3 (In Progress) → 2 (Available)

### Outbound Flow
1. **Outbound** (header) contains multiple **orders** (line items)
2. Orders go through picklist → pick → pack → ship stages
3. Status progresses: 1 (Hold) → 2 (Process) → 3 (Ready to Ship) → 4 (Complete)

### Stock Structure
- **Products** have multiple **variants** (SKUs)
- Each variant has stock in multiple **locations**
- **Stock movements** transfer inventory between locations

## CLI Tips for Operations

### Filtering Data
- Use `--limit` to control result size (max 50)
- Use `--status` to filter by status code
- Use `--page` for pagination
- Use `--json` for machine-readable output

### Understanding Output
- **Reference** field shows order numbers or codes
- **Date** shows local formatted date/time
- **Status** shows numeric codes (see reference above)
- **"-"** means field is empty/null

### Error Handling
- **401**: Session expired - run `wms login`
- **429**: Rate limit - wait and retry
- **Network errors**: Check backend is running on port 3030

### Useful Commands
```bash
# Check who you're logged in as
wms whoami

# View current configuration
wms config get apiUrl

# Enable verbose logging for debugging
wms --verbose list inbounds --limit 5

# Get raw JSON for processing
wms list inbounds --json | jq '.items[0].reference'
```

## Backend Context

The CLI connects to a NestJS backend with these characteristics:
- All responses wrapped in `{ success, data, errors, code }` envelope
- JWT Bearer token authentication
- PostgreSQL database with TypeORM
- Bull queues for background processing
- Default port: 3030

## Limitations

- `wms get stock <id>` is not supported (no detail endpoint)
- Stock list shows aggregated data by MSKU, not individual SKUs
- Some filters only work with specific resources
- Maximum page size is 50 items

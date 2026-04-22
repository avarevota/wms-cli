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

### Processing Inbound Shipments
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

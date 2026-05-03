# WMS CLI — AI Agent Guide

This file is the entry point for Claude Code (and other AI agents) working with `wms-cli`. Read it in full before running any commands. For status code tables and detailed workflow examples, see [`docs/KNOWLEDGE.md`](docs/KNOWLEDGE.md).

---

## What this repo is

`wms-cli` is a command-line client for the **Revota Warehouse Management System**. It wraps the `wms-be` REST API and exposes warehouse operations (inbound receiving, outbound picking/packing/shipping, stock opname, adjustments, logs) as shell commands. Both `wms` and `revota` are registered as binaries — they are identical.

---

## Installation

**Requirements**: Node.js ≥ 20

```bash
git clone git@github.com:avarevota/wms-cli.git
cd wms-cli
npm install
npm run build        # compiles TypeScript → dist/index.js via tsup
npm link             # registers `wms` (and `revota`) as global commands
```

Verify:
```bash
wms --help
```

**Development (no build step)**:
```bash
npm run dev -- list inbounds --limit 5
```

---

## First-time setup

```bash
# Point the CLI at the WMS API
wms config set apiUrl https://your-wms-api.example.com

# Log in (stores a Bearer token in ~/.config/revota-wms/config.json)
wms login -e you@example.com -p yourpassword

# Confirm identity
wms whoami
```

The config file is created at `~/.config/revota-wms/config.json` (mode 600). `wms logout` clears the token but preserves `apiUrl`.

---

## Using with Claude Code

### Recommended setup

After installing, point Claude Code at this repo and provide the knowledge base as context:

```
You are an assistant for warehouse operations. Use the `wms` CLI to answer questions and execute tasks.
Reference docs/KNOWLEDGE.md for status codes, workflows, and data relationships.
Always run `wms whoami` first to confirm the session is active.
```

Claude Code can read `docs/KNOWLEDGE.md` automatically when working inside this repo — no extra steps needed.

### Giving Claude the context it needs

If using Claude outside of this repo (e.g., a chat interface), paste the contents of `docs/KNOWLEDGE.md` into the system prompt or first message. This gives the model all status codes, workflow sequences, and CLI patterns it needs to operate correctly.

---

## Using with other AI agents (OpenAI, Gemini, custom)

Any agent that can run shell commands can use `wms-cli`. The recommended pattern:

1. **Install and authenticate** as above.
2. **Load context**: include `docs/KNOWLEDGE.md` in the agent's system prompt.
3. **Use `--json` for all reads** so the agent can parse structured output:
   ```bash
   wms list inbounds --status 1 --json | jq '.items[]'
   ```
4. **Use `--verbose` for debugging** when a command behaves unexpectedly.

### MCP / tool-calling integration

If you are building an MCP server or tool wrapper around this CLI, expose the commands as tools using `--json` output mode. The CLI returns the raw `data` payload from the API envelope — no extra parsing is needed.

---

## Command surface (quick reference)

| Group | Subcommands | Purpose |
|---|---|---|
| `wms login / logout / whoami` | — | Authentication |
| `wms config get/set` | — | API URL and session config |
| `wms list <resource>` | 12 resources | Paginated list with filters |
| `wms get <resource> <id>` | 11 resources | Single record |
| `wms update <resource> <id>` | `skus` | Patch a record |
| `wms inbound` | `orders`, `update-order`, `finish`, `cancel` | Inbound lifecycle |
| `wms put-away` | `list`, `detail`, `create`, `add-item`, `update-item`, `delete-item`, `finish`, `cancel` | Put-away sessions |
| `wms outbound` | `update-status`, `cancel`, `bulk-update-status`, `bulk-set-picker`, `logs` | Outbound lifecycle |
| `wms picklist` | `generate`, `items`, `item`, `set-picker`, `set-mobile-storage`, `set-packing-area`, `pick-away`, `finish`, `update-to-shipped`, `product-scan`, `location-scan` | Picking workflow |
| `wms pack` | `create`, `pack-away`, `finish`, `orders`, `items`, `pack-order`, `mobile-storages`, `adjust-item` | Packing workflow |
| `wms ship` | `create`, `proof-of-delivery`, `completed` | Shipping workflow |
| `wms adjustment` | `create`, `save-products`, `add-item`, `products`, `items`, `update-item`, `cancel-item`, `cancel`, `finish`, `approve` | Stock adjustments |
| `wms opname` | `create`, `update`, `products`, `add-items`, `batch-update-items`, `items`, `adjust-item`, `cancel-item`, `cancel`, `finish`, `approve`, `delete` | Stock opname (cycle count) |
| `wms logs` | `activity`, `modules`, `webhooks`, `sync-stocks` | Audit and webhook logs |

All commands accept `--help`. All commands accept `--json` for machine-readable output.

---

## Global flags

| Flag | Effect |
|---|---|
| `--json` | Print raw API `data` payload instead of formatted table |
| `--verbose` | Log HTTP request and response (token and password redacted) |
| `--help` / `-h` | Print command help |

---

## Pagination

Most list endpoints support `--limit` (max 50) and `--page`. Default limit is 10.

```bash
wms list outbounds --status 2 --limit 50 --page 2
```

---

## Agent task examples

Below are prompts a user can give to Claude (or another agent) after setup:

**Inventory queries**
> "Show me all pending inbound orders."
> "What's in stock for SKU ABC-123?"
> "List all locations in zone Z1."

**Inbound receiving**
> "Create a put-away session for inbound INB-001 covering all its orders, then add items received: 20 units of order ORD-A in bin Z1/A1/BIN-01."
> "Finish put-away session PA-007 and then close inbound INB-001."

**Outbound and picking**
> "Generate a picklist for outbound orders OUT-100, OUT-101 and OUT-102 with 1 picker."
> "Assign picker user ID abc123 to picklist PL-045."
> "Bulk-update outbounds OUT-200 and OUT-201 to status READY_TO_SHIP with AWB JNE9999."

**Packing and shipping**
> "Create a pack from picklist PL-050. Show me its pack orders and items."
> "Record a proof of delivery URL for shipment SHP-010."

**Stock opname**
> "Start a new opname session for warehouse WH-01 assigned to user USR-5, due 2026-05-30."
> "Approve opname session OP-023 with note 'supervisor verified'."

**Adjustments**
> "Create an adjustment for warehouse WH-01 assigned to USR-5, then save these items: [{productVariantId: 'PV-1', originLocation: 'A1-01', qty: 8}]. Finish and approve it."

**Logs and debugging**
> "Show me all webhook calls received in April 2026."
> "What activities happened in the INBOUND module this week?"

---

## Error reference

| HTTP code | CLI message | Action |
|---|---|---|
| 401 | Session expired — run `wms login` | Re-authenticate |
| 429 | Rate limit exceeded | Wait and retry |
| Network error | Connection refused / timeout | Check `wms config get apiUrl` and backend status |

---

## Development

```bash
npm run typecheck    # TypeScript validation (no emit)
npm run lint         # ESLint with auto-fix
npm run build        # Rebuild dist/index.js
npm run dev -- <cmd> # Run without building (tsx)
```

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) and [`BUILD_CHECKLIST.md`](BUILD_CHECKLIST.md) before cutting a release.

---

## Agent skills

### Issue tracker

GitHub Issues at `avarevota/wms-cli` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

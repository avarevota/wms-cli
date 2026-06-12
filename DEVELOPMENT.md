# Development

This guide is for contributors working on the CLI itself. If you only want to use the CLI, see [README.md](README.md).

## Requirements

- Node.js >= 20
- npm

## Setup

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

## Scripts

```bash
npm run typecheck
npm run lint
npm run build       # tsup → dist/index.js
npm run dev -- list inbounds
```

## Project layout

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
    pack.ts             # `wms pack <action>` (create, pack-away, finish, items)
    ship.ts             # `wms ship <action>` (create, proof-of-delivery, completed)
  lib/
    client.ts           # fetch wrapper, envelope unwrap, 401/429 handling
    config.ts           # ~/.config/revota-wms store (chmod 600)
    resources.ts        # resource registry (add new resources here)
    output.ts           # table / JSON / colored output
    errors.ts           # shared error printer
```

## Extending the CLI

Adding a new **read-only** resource: append a `ResourceDef` entry in `src/lib/resources.ts` — no new command files needed.

Adding **update support** to a resource: set the `update` block on its `ResourceDef` (method, fields, optional `pathFor`). The shared `wms update` dispatcher will pick up the flags automatically.

Adding a **new workflow** (multi-action lifecycle, e.g. adjustment / opname): create a dedicated command group in `src/commands/<name>.ts` and register it from `src/index.ts`. The resource registry handles list/get; the command file owns custom actions.

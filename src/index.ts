#!/usr/bin/env node
import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerConfigCommands } from './commands/config.js';
import { registerListCommand } from './commands/list.js';
import { registerGetCommand } from './commands/get.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerAdjustmentCommands } from './commands/adjustment.js';
import { resourceNames } from './lib/resources.js';

const program = new Command();

program
  .name('wms')
  .description('Revota WMS CLI')
  .version('0.1.0')
  .option('--verbose', 'Log request/response details (tokens redacted)')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().verbose) {
      process.env.WMS_VERBOSE = 'true';
    }
  });

registerAuthCommands(program);
registerConfigCommands(program);
registerListCommand(program);
registerGetCommand(program);
registerUpdateCommand(program);
registerAdjustmentCommands(program);

program.addHelpText(
  'after',
  `
Resources for 'wms list' / 'wms get':
  ${resourceNames().join(', ')}

Examples:
  wms login
  wms list inbounds --status PENDING
  wms list stock --sku ABC123
  wms get sku <id>
  wms update sku <variantId> --name "New Name" --price 19900
  wms update sku <variantId> --data '{"name":"N","sku":"S","skuExternal":"X","brandId":"...","categoryId":"...","method":1}'
  wms list adjustments --status 1 --warehouse-id <id>
  wms adjustment create --warehouse-id <id> --assigned-to <userId> --due-date 2026-05-01
  wms adjustment finish <adjustmentId>
  wms adjustment approve <adjustmentId> --note "approved after spot check"
  wms config set apiUrl https://wms.example.com
`
);

program.parse();

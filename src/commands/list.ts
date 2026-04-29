import { Command } from 'commander';
import { fetchList, resolveResource, resourceNames } from '../lib/resources.js';
import { printError, printJson, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

export function registerListCommand(program: Command): void {
  const cmd = program
    .command('list <resource>')
    .description(`List records of a resource (${resourceNames().join(', ')})`)
    .option('--json', 'Output raw JSON')
    .option('--sku <value>', 'Filter by SKU (where supported)')
    .option('--location <value>', 'Filter by location (where supported)')
    .option('--status <value>', 'Filter by status (where supported)')
    .option('--zone <value>', 'Filter by zone (where supported)')
    .option('--area <value>', 'Filter by area (where supported)')
    .option('--from <date>', 'From date (ISO, where supported)')
    .option('--to <date>', 'To date (ISO, where supported)')
    .option('--type <value>', 'Filter by type (where supported)')
    .option('--customer-id <id>', 'Filter by customer id (where supported)')
    .option('--brand-id <id>', 'Filter by brand id (where supported)')
    .option('--warehouse-id <id>', 'Filter by warehouse id (where supported)')
    .option('--assigned <value>', 'Filter by assignee (where supported)')
    .option('--provider <value>', 'Filter by provider (where supported)')
    .option('--event <value>', 'Filter by event (where supported)')
    .option('--keyword <value>', 'Free-text keyword (where supported)')
    .option('--limit <n>', 'Page size, max 50 (where supported)')
    .option('--page <n>', 'Page number (where supported)');

  cmd.action(async (resourceName: string, options) => {
    const resource = resolveResource(resourceName);
    if (!resource) {
      printError(
        `Unknown resource: "${resourceName}". Try one of: ${resourceNames().join(', ')}`
      );
      process.exit(1);
    }

    try {
      const { items, raw } = await fetchList(resource, options);

      if (options.json) {
        printJson(raw);
        return;
      }

      if (items.length === 0) {
        console.log(`No ${resource.name} found`);
        return;
      }

      const headers = resource.listColumns.map((c) => c.header);
      const rows = items.map((item) =>
        resource.listColumns.map((c) => {
          const v = c.pick(item);
          return v === null || v === undefined || v === '' ? '-' : String(v);
        })
      );
      printTable(headers, rows);
    } catch (err) {
      handleError(err);
    }
  });
}

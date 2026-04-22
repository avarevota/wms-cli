import { Command } from 'commander';
import { fetchOne, resolveResource, resourceNames } from '../lib/resources.js';
import { printError, printJson } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

export function registerGetCommand(program: Command): void {
  program
    .command('get <resource> <id>')
    .description(`Fetch a single record (${resourceNames().join(', ')})`)
    .option('--json', 'Output raw JSON')
    .action(async (resourceName: string, id: string, options) => {
      const resource = resolveResource(resourceName);
      if (!resource) {
        printError(
          `Unknown resource: "${resourceName}". Try one of: ${resourceNames().join(', ')}`
        );
        process.exit(1);
      }

      if (resource.supportsGet === false) {
        printError(`"${resource.name}" has no detail endpoint — use 'wms list ${resource.name}' instead`);
        process.exit(1);
      }

      try {
        const item = await fetchOne(resource, id);

        if (item === undefined || item === null) {
          printError(`No ${resource.name} found for id "${id}"`);
          process.exit(1);
        }

        if (options.json) {
          printJson(item);
          return;
        }

        const rows = resource.detailFields.map((f) => {
          const v = f.pick(item);
          return [f.label, v === null || v === undefined || v === '' ? '-' : String(v)];
        });
        const width = Math.max(...rows.map(([label]) => label.length)) + 2;
        for (const [label, value] of rows) {
          console.log(`${label.padEnd(width)}${value}`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}

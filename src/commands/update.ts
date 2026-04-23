import { Command } from 'commander';
import {
  RESOURCES,
  fetchUpdate,
  resolveResource,
  resourceNames,
  type ResourceDef,
  type UpdateFieldDef,
} from '../lib/resources.js';
import { printError, printJson, printSuccess } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

function toCamel(apiKey: string): string {
  return apiKey;
}

// Commander strips the `--` prefix and camel-cases a flag like `--sku-external`
// into `skuExternal` on the options object.
function flagOptionKey(flag: string): string {
  const name = flag.replace(/^--/, '').split(/\s+/)[0];
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function coerce(value: unknown, type: UpdateFieldDef['type'], flag: string): unknown {
  if (type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new Error(`Flag ${flag} expects a number, got: ${String(value)}`);
    }
    return n;
  }
  if (type === 'json') {
    try {
      return JSON.parse(String(value));
    } catch (err) {
      throw new Error(
        `Flag ${flag} expects valid JSON. Parse error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  return String(value);
}

function buildPayload(
  resource: ResourceDef,
  options: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  // --data '<json>' merged first so explicit flags override it
  if (typeof options.data === 'string' && options.data.length > 0) {
    try {
      const parsed = JSON.parse(options.data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.assign(payload, parsed);
      } else {
        throw new Error('--data must be a JSON object');
      }
    } catch (err) {
      throw new Error(
        `--data must be valid JSON object. Parse error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  for (const field of resource.update!.fields) {
    const key = flagOptionKey(field.flag);
    if (options[key] === undefined) continue;
    payload[toCamel(field.apiKey)] = coerce(options[key], field.type, field.flag);
  }
  return payload;
}

export function registerUpdateCommand(program: Command): void {
  const updatable = RESOURCES.filter((r) => r.update);
  const updatableNames = updatable.map((r) => r.name).sort();

  const cmd = program
    .command('update <resource> <id>')
    .description(
      `Update a record (${updatableNames.join(', ') || 'no updatable resources'})`
    )
    .option('--json', 'Output raw JSON of the updated record')
    .option(
      '--data <json>',
      'Raw JSON payload (merged first; individual flags override)'
    );

  // Register the union of fields across all updatable resources so every flag
  // is discoverable via --help. Fields with the same flag across resources must
  // agree; we trust the resource defs here.
  const seen = new Set<string>();
  for (const res of updatable) {
    for (const field of res.update!.fields) {
      const key = field.flag.split(/\s+/)[0];
      if (seen.has(key)) continue;
      seen.add(key);
      cmd.option(field.flag, field.description);
    }
  }

  cmd.action(async (resourceName: string, id: string, options) => {
    const resource = resolveResource(resourceName);
    if (!resource) {
      printError(
        `Unknown resource: "${resourceName}". Try one of: ${resourceNames().join(', ')}`
      );
      process.exit(1);
    }

    if (!resource.update) {
      printError(
        `"${resource.name}" cannot be updated. Updatable: ${updatableNames.join(', ') || 'none'}`
      );
      process.exit(1);
    }

    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(resource, options);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    if (Object.keys(payload).length === 0) {
      printError(
        `Nothing to update. Pass at least one field flag or --data '{...}'. Run 'wms update ${resource.name} --help' for options.`
      );
      process.exit(1);
    }

    try {
      const result = await fetchUpdate(resource, id, payload);
      if (options.json) {
        printJson(result);
        return;
      }
      printSuccess(`Updated ${resource.name} ${id}`);
      if (result && typeof result === 'object') {
        const showable = resource.detailFields.length
          ? resource.detailFields
          : Object.keys(result).map((k) => ({
              label: k,
              pick: (i: any) => i[k],
            }));
        const rows = showable.map((f) => {
          const v = f.pick(result);
          return [f.label, v === null || v === undefined || v === '' ? '-' : String(v)];
        });
        const width = Math.max(...rows.map(([label]) => label.length)) + 2;
        for (const [label, value] of rows) {
          console.log(`${label.padEnd(width)}${value}`);
        }
      }
    } catch (err) {
      handleError(err);
    }
  });
}

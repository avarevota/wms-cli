import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

// Mirrors OpnameStatusEnum: PENDING=1, WAITING_FOR_APPROVAL=2, DONE=3, CANCELED=99
const OPNAME_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'WAITING_FOR_APPROVAL',
  3: 'DONE',
  99: 'CANCELED',
};
const opnameStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return OPNAME_STATUS[n] ?? String(v);
};
const OPNAME_TYPE: Record<number, string> = { 1: 'PRODUCT', 2: 'LOCATION' };

interface CreateOptions {
  name: string;
  warehouseId: string;
  assignedTo: string;
  type?: string;
  customerId?: string;
  brandId?: string;
  dueDate?: string;
  note?: string;
  json?: boolean;
}

interface UpdateOptions {
  name?: string;
  assignedTo?: string;
  dueDate?: string;
  note?: string;
  json?: boolean;
}

interface AddItemsOptions {
  data: string;
  json?: boolean;
}

interface BatchUpdateItemsOptions {
  items: string;
  json?: boolean;
}

interface ItemsListOptions {
  type?: string;
  group?: boolean;
  limit?: string;
  page?: string;
  json?: boolean;
}

interface ProductsOptions {
  warehouseId: string;
  type?: string;
  search?: string;
  customerId?: string;
  brandId?: string;
  zoneCode?: string;
  areaCode?: string;
  limit?: string;
  page?: string;
  json?: boolean;
}

function parseJsonArray(raw: string, flag: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${flag} must be a JSON array`);
    }
    return parsed;
  } catch (err) {
    throw new Error(
      `${flag} must be valid JSON array. Parse error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export function registerOpnameCommands(program: Command): void {
  const group = program
    .command('opname')
    .alias('stock-opname')
    .description('Stock opname / cycle-counting workflow');

  group
    .command('create')
    .description('Create a stock-opname session (header)')
    .requiredOption('--name <value>', 'Unique opname name')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption('--assigned-to <id>', 'User id assigned to perform the count')
    .option('--type <n>', 'Opname type (1 = PRODUCT, 2 = LOCATION)', '1')
    .option('--customer-id <id>', 'Customer id')
    .option('--brand-id <id>', 'Brand id')
    .option('--due-date <iso>', 'Due date, ISO string')
    .option('--note <text>', 'Note')
    .option('--json', 'Output raw JSON')
    .action(async (options: CreateOptions) => {
      try {
        const payload: Record<string, unknown> = {
          name: options.name,
          warehouseId: options.warehouseId,
          assignedTo: options.assignedTo,
          type: Number(options.type ?? 1),
        };
        if (options.customerId) payload.customerId = options.customerId;
        if (options.brandId) payload.brandId = options.brandId;
        if (options.dueDate) payload.dueDate = options.dueDate;
        if (options.note) payload.note = options.note;

        const result = await apiRequest<any>('/stock-opnames', {
          method: 'POST',
          body: payload,
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Created opname${result?.code ? ` ${result.code}` : ''}`);
        if (result && typeof result === 'object') {
          console.log(`ID:           ${result.id ?? '-'}`);
          console.log(`Name:         ${result.name ?? '-'}`);
          console.log(`Type:         ${OPNAME_TYPE[Number(result.type)] ?? result.type ?? '-'}`);
          console.log(`Status:       ${opnameStatusLabel(result.status)}`);
          console.log(`Warehouse:    ${result.warehouseId ?? '-'}`);
          console.log(`Assigned To:  ${result.assignedTo ?? '-'}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('update <opnameId>')
    .description('Update an opname header (name / assignee / due date / note)')
    .option('--name <value>', 'New name')
    .option('--assigned-to <id>', 'New assignee')
    .option('--due-date <iso>', 'Due date')
    .option('--note <text>', 'Note')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: UpdateOptions) => {
      try {
        const payload: Record<string, unknown> = {};
        if (options.name !== undefined) payload.name = options.name;
        if (options.assignedTo !== undefined) payload.assignedTo = options.assignedTo;
        if (options.dueDate !== undefined) payload.dueDate = options.dueDate;
        if (options.note !== undefined) payload.note = options.note;
        if (Object.keys(payload).length === 0) {
          printError('Nothing to update. Pass at least one of --name / --assigned-to / --due-date / --note.');
          process.exit(1);
        }
        // Backend marks `name` and `assignedTo` as required validators on UpdateStockOpnameDto;
        // for partial edits, fetch the record and merge before sending if either is missing.
        const result = await apiRequest<any>(
          `/stock-opnames/${encodeURIComponent(opnameId)}`,
          { method: 'PUT', body: payload }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Updated opname ${opnameId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('products <opnameId>')
    .description('List product variants available to add to an opname')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .option('--type <n>', 'Opname type (1 = PRODUCT, 2 = LOCATION)', '1')
    .option('--search <term>', 'Free-text search')
    .option('--customer-id <id>', 'Customer id')
    .option('--brand-id <id>', 'Brand id')
    .option('--zone-code <code>', 'Zone code')
    .option('--area-code <code>', 'Area code')
    .option('--limit <n>', 'Page size, max 50')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: ProductsOptions) => {
      try {
        const params = new URLSearchParams({
          stockOpnameId: opnameId,
          warehouseId: options.warehouseId,
          opnameType: String(options.type ?? 1),
        });
        if (options.search) params.append('search', options.search);
        if (options.customerId) params.append('customerId', options.customerId);
        if (options.brandId) params.append('brandId', options.brandId);
        if (options.zoneCode) params.append('zoneCode', options.zoneCode);
        if (options.areaCode) params.append('areaCode', options.areaCode);
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const raw = await apiRequest<unknown>(
          `/stock-opnames/products?${params.toString()}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No products found');
          return;
        }
        printTable(
          ['Variant ID', 'SKU', 'MSKU', 'Product', 'On-hand'],
          items.map((i: any) => [
            i.productVariantId ?? i.id ?? '-',
            i.sku ?? '-',
            i.msku ?? '-',
            i.productName ?? i.name ?? '-',
            i.onHandQty ?? i.onHand ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('add-items')
    .description('Add items in batch to an opname (JSON payload)')
    .requiredOption(
      '--data <json>',
      'JSON array: [{stockOpnameId, productVariantIds:[], storages:[{warehouseId,zoneCode,areaCode,storageCode,inventoryStatus?}]}]'
    )
    .option('--json', 'Output raw JSON')
    .action(async (options: AddItemsOptions) => {
      try {
        const items = parseJsonArray(options.data, '--data');
        const result = await apiRequest<any>('/stock-opnames/items', {
          method: 'POST',
          body: { items },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Added ${items.length} batch entry(ies) to opname(s)`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('batch-update-items <opnameId>')
    .description('Batch-update counted quantities for opname items')
    .requiredOption(
      '--items <json>',
      'JSON array: [{barcode, storage:{warehouseId,zoneCode,areaCode,storageCode}, actualQuantity}]'
    )
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: BatchUpdateItemsOptions) => {
      try {
        const items = parseJsonArray(options.items, '--items');
        const result = await apiRequest<any>('/stock-opnames/batch-items', {
          method: 'PUT',
          body: { stockOpnameId: opnameId, items },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Batch-updated ${items.length} item(s) for opname ${opnameId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('items <opnameId>')
    .description('List opname items (or grouped by location with --group)')
    .option('--type <n>', 'Opname type (1 = PRODUCT, 2 = LOCATION)', '1')
    .option('--group', 'Group items by location')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: ItemsListOptions) => {
      try {
        const params = new URLSearchParams({
          stockOpnameId: opnameId,
          opnameType: String(options.type ?? 1),
        });
        if (options.group) params.append('group', 'true');
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const raw = await apiRequest<unknown>(
          `/stock-opnames/items?${params.toString()}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No items found');
          return;
        }
        printTable(
          ['ID', 'SKU', 'Location', 'System', 'Counted', 'Status'],
          items.map((i: any) => [
            i.id ?? '-',
            i.sku ?? i.barcode ?? '-',
            [i.warehouseCode, i.zoneCode, i.areaCode, i.storageCode]
              .filter(Boolean)
              .join('/') || '-',
            i.systemQuantity ?? i.stockQuantity ?? '-',
            i.actualQuantity ?? '-',
            i.status ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('adjust-item <itemId>')
    .description('Adjust the counted quantity on a single opname item')
    .requiredOption('--quantity <n>', 'Counted quantity')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: { quantity: string; json?: boolean }) => {
      try {
        const n = Number(options.quantity);
        if (Number.isNaN(n)) {
          printError('--quantity must be a number');
          process.exit(1);
        }
        const result = await apiRequest<any>(
          `/stock-opnames/items/${encodeURIComponent(itemId)}/adjust-quantity`,
          { method: 'PUT', body: { quantity: n } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Adjusted item ${itemId} → quantity=${n}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel-item <itemId>')
    .description('Cancel a single opname item')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/stock-opnames/items/${encodeURIComponent(itemId)}/cancel`,
          { method: 'PATCH' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled item ${itemId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel <opnameId>')
    .description('Cancel an opname session')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/stock-opnames/${encodeURIComponent(opnameId)}/cancel`,
          { method: 'PATCH' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled opname ${opnameId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('finish <opnameId>')
    .description('Mark opname as finished (PENDING → WAITING_FOR_APPROVAL)')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/stock-opnames/${encodeURIComponent(opnameId)}/finish`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        const succeed = result?.succeed ?? 0;
        const failed = result?.failed ?? 0;
        printSuccess(`Finished: ${succeed} succeeded, ${failed} failed`);
        if (failed > 0 && Array.isArray(result?.errors)) {
          for (const e of result.errors) console.error(`  - ${JSON.stringify(e)}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('approve <opnameId>')
    .description('Approve an opname (applies stock corrections, status → DONE)')
    .option('--note <text>', 'Approval note')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: { note?: string; json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/stock-opnames/${encodeURIComponent(opnameId)}/approve`,
          { method: 'PUT', body: { note: options.note ?? '' } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Approved opname ${opnameId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('delete <opnameId>')
    .description('Delete (soft) an opname session')
    .option('--json', 'Output raw JSON')
    .action(async (opnameId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/stock-opnames/${encodeURIComponent(opnameId)}`,
          { method: 'DELETE' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Deleted opname ${opnameId}`);
      } catch (err) {
        handleError(err);
      }
    });
}

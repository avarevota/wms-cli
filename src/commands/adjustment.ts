import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { parseJsonArray } from '../lib/flags.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const ADJUSTMENT_TYPE = { PRODUCT: 1 } as const;

interface CreateOptions {
  warehouseId: string;
  assignedTo: string;
  dueDate: string;
  customerId?: string;
  brandId?: string;
  note?: string;
  type?: string;
  json?: boolean;
}

interface ApproveOptions {
  note?: string;
  json?: boolean;
}

interface UpdateItemOptions {
  qty: string;
  json?: boolean;
}

interface SaveProductsOptions {
  adjustmentId: string;
  warehouseId: string;
  items: string; // JSON array
  json?: boolean;
}

interface AddItemOptions {
  warehouseId: string;
  productVariantId: string;
  originLocation: string;
  qty: string;
  inboundDate?: string;
  expiredDate?: string;
  batchNumber?: string;
  inventoryStatus?: string;
  json?: boolean;
}

interface ProductsOptions {
  limit?: string;
  page?: string;
  json?: boolean;
}

interface ItemsListOptions {
  limit?: string;
  page?: string;
  json?: boolean;
}

function printDetail(
  fields: { label: string; pick: (o: any) => unknown }[],
  obj: any
): void {
  const rows = fields.map((f) => {
    const v = f.pick(obj);
    return [f.label, v === null || v === undefined || v === '' ? '-' : String(v)];
  });
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  for (const [label, value] of rows) {
    console.log(`${label.padEnd(width)}${value}`);
  }
}

export function registerAdjustmentCommands(program: Command): void {
  const group = program
    .command('adjustment')
    .description('Stock adjustment workflows (create, finish, approve, cancel, items)');

  group
    .command('create')
    .description('Create a new stock adjustment (header)')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption('--assigned-to <id>', 'User id assigned to perform the count')
    .requiredOption('--due-date <iso>', 'Due date, ISO string')
    .option('--customer-id <id>', 'Customer id')
    .option('--brand-id <id>', 'Brand id')
    .option('--note <text>', 'Note')
    .option('--type <n>', 'Adjustment type (default 1 = PRODUCT)', String(ADJUSTMENT_TYPE.PRODUCT))
    .option('--json', 'Output raw JSON')
    .action(async (options: CreateOptions) => {
      try {
        const payload: Record<string, unknown> = {
          warehouseId: options.warehouseId,
          assignedTo: options.assignedTo,
          dueDate: options.dueDate,
          type: Number(options.type ?? ADJUSTMENT_TYPE.PRODUCT),
        };
        if (options.customerId) payload.customerId = options.customerId;
        if (options.brandId) payload.brandId = options.brandId;
        if (options.note) payload.note = options.note;

        const result = await apiRequest<any>('/adjustments', {
          method: 'POST',
          body: payload,
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Created adjustment${result?.code ? ` ${result.code}` : ''}`);
        if (result && typeof result === 'object') {
          printDetail(
            [
              { label: 'ID', pick: (o) => o.id },
              { label: 'Code', pick: (o) => o.code },
              { label: 'Status', pick: (o) => o.status },
              { label: 'Warehouse', pick: (o) => o.warehouseId },
              { label: 'Assigned To', pick: (o) => o.assignedTo },
              { label: 'Due Date', pick: (o) => o.dueDate },
            ],
            result
          );
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('save-products <adjustmentId>')
    .description('Add product rows to an adjustment via JSON items')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption(
      '--items <json>',
      'JSON array: [{productVariantId, originLocation, qty, inboundDate?, expiredDate?, batchNumber?, inventoryStatus?}]'
    )
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: SaveProductsOptions) => {
      try {
        const items = parseJsonArray(options.items, '--items');
        const result = await apiRequest<any>('/adjustments/save-products', {
          method: 'POST',
          body: {
            adjustmentId,
            warehouseId: options.warehouseId,
            items,
          },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        const succeed = result?.succeed ?? 0;
        const failed = result?.failed ?? 0;
        printSuccess(`Saved ${succeed} item(s), ${failed} failed`);
        if (failed > 0 && Array.isArray(result?.errors)) {
          for (const e of result.errors) console.error(`  - ${JSON.stringify(e)}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('add-item <adjustmentId>')
    .description('Add a single product line to an adjustment (convenience wrapper around save-products)')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption('--product-variant-id <id>', 'Product variant id')
    .requiredOption('--origin-location <code>', 'Origin storage code (e.g. BIN-A1)')
    .requiredOption('--qty <n>', 'Counted / corrected quantity')
    .option('--batch-number <value>', 'Batch number')
    .option('--expired-date <iso>', 'Expired date, ISO string')
    .option('--inbound-date <iso>', 'Inbound date, ISO string')
    .option('--inventory-status <n>', 'InventoryStatusEnum value (auto-detected if omitted)')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: AddItemOptions) => {
      try {
        const qty = Number(options.qty);
        if (Number.isNaN(qty)) {
          printError('--qty must be a number');
          process.exit(1);
        }
        const item: Record<string, unknown> = {
          productVariantId: options.productVariantId,
          originLocation: options.originLocation,
          qty,
        };
        if (options.batchNumber) item.batchNumber = options.batchNumber;
        if (options.expiredDate) item.expiredDate = options.expiredDate;
        if (options.inboundDate) item.inboundDate = options.inboundDate;
        if (options.inventoryStatus) {
          const n = Number(options.inventoryStatus);
          if (Number.isNaN(n)) {
            printError('--inventory-status must be a number');
            process.exit(1);
          }
          item.inventoryStatus = n;
        }
        const result = await apiRequest<any>('/adjustments/save-products', {
          method: 'POST',
          body: {
            adjustmentId,
            warehouseId: options.warehouseId,
            items: [item],
          },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        const succeed = result?.succeed ?? 0;
        const failed = result?.failed ?? 0;
        if (failed > 0) {
          printError(`Add failed (${failed} error(s))`);
          if (Array.isArray(result?.errors)) {
            for (const e of result.errors) console.error(`  - ${JSON.stringify(e)}`);
          }
          process.exit(1);
        }
        printSuccess(`Added 1 item to adjustment ${adjustmentId} (succeed=${succeed})`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('products <adjustmentId>')
    .description('List product variants currently available to adjust on this work order')
    .option('--limit <n>', 'Page size, max 50')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: ProductsOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/adjustments/${encodeURIComponent(adjustmentId)}/products${qs ? `?${qs}` : ''}`
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
          ['Variant ID', 'SKU', 'Product', 'Location', 'Qty', 'Batch'],
          items.map((i: any) => [
            i.productVariantId ?? i.id ?? '-',
            i.sku ?? '-',
            i.productVariantName ?? '-',
            i.location ?? '-',
            i.qty ?? '-',
            i.batchNo ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('items <adjustmentId>')
    .description('List items of an adjustment')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: ItemsListOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<any>(
          `/adjustments/${encodeURIComponent(adjustmentId)}/items${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
        if (items.length === 0) {
          console.log('No items found');
          return;
        }
        printTable(
          ['ID', 'SKU', 'Location', 'Available', 'New', 'Adjust', 'Status'],
          items.map((i) => [
            i.id,
            i.sku ?? '-',
            i.location ?? '-',
            i.availableQuantity ?? 0,
            i.newAvailableQuantity ?? 0,
            i.adjustQuantity ?? 0,
            i.status ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('update-item <itemId>')
    .description('Update the new-available quantity of an adjustment item')
    .requiredOption('--qty <n>', 'New available quantity')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: UpdateItemOptions) => {
      try {
        const n = Number(options.qty);
        if (Number.isNaN(n)) {
          printError('--qty must be a number');
          process.exit(1);
        }
        const result = await apiRequest<any>(
          `/adjustments/items/${encodeURIComponent(itemId)}`,
          { method: 'PUT', body: { newAvailableQuantity: n } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Updated item ${itemId} → newAvailableQuantity=${n}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel-item <itemId>')
    .description('Cancel a single adjustment item')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/adjustments/items/${encodeURIComponent(itemId)}/cancel`,
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
    .command('cancel <adjustmentId>')
    .description('Cancel an adjustment')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/adjustments/${encodeURIComponent(adjustmentId)}/cancel`,
          { method: 'PATCH' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled adjustment ${adjustmentId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('finish <adjustmentId>')
    .description('Mark an adjustment as finished (moves to WAITING_FOR_APPROVAL)')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/adjustments/${encodeURIComponent(adjustmentId)}/finish`,
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
    .command('approve <adjustmentId>')
    .description('Approve an adjustment (applies the stock changes)')
    .option('--note <text>', 'Approval note')
    .option('--json', 'Output raw JSON')
    .action(async (adjustmentId: string, options: ApproveOptions) => {
      try {
        const result = await apiRequest<any>(
          `/adjustments/${encodeURIComponent(adjustmentId)}/approve`,
          { method: 'PUT', body: { note: options.note ?? '' } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        const succeed = result?.succeed ?? 0;
        const failed = result?.failed ?? 0;
        printSuccess(`Approved: ${succeed} succeeded, ${failed} failed`);
        if (failed > 0 && Array.isArray(result?.errors)) {
          for (const e of result.errors) console.error(`  - ${JSON.stringify(e)}`);
        }
      } catch (err) {
        handleError(err);
      }
    });
}

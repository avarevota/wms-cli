import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems, PACK_STATUS } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';

const packStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return PACK_STATUS[n] ?? String(v);
};

interface CreateOptions {
  picklistIds: string;
  json?: boolean;
}

interface PackAwayOptions {
  packItemId: string;
  qty: string;
  itemBarcode?: string;
  json?: boolean;
}

interface FinishOptions {
  packId: string;
  packOrderId: string;
  json?: boolean;
}

interface AdjustItemOptions {
  quantity: string;
  json?: boolean;
}

interface PackOrdersOptions {
  limit?: string;
  page?: string;
  json?: boolean;
}

interface PackItemsOptions {
  limit?: string;
  page?: string;
  json?: boolean;
}

interface MobileStoragesOptions {
  mobileStorageCode?: string;
  limit?: string;
  page?: string;
  json?: boolean;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function registerPackCommands(program: Command): void {
  const group = program
    .command('pack')
    .description('Pack workflow (create from picklists, pack-away, finish)');

  group
    .command('create')
    .description('Create a pack from one or more finished picklists')
    .requiredOption('--picklist-ids <csv>', 'Comma-separated picklist ids')
    .option('--json', 'Output raw JSON')
    .action(async (options: CreateOptions) => {
      try {
        const picklistIds = splitCsv(options.picklistIds);
        if (picklistIds.length === 0) {
          printError('--picklist-ids must contain at least one picklist id');
          process.exit(1);
        }
        const result = await apiRequest<any>('/packs', {
          method: 'POST',
          body: { picklistIds },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          `Created pack${result?.code ? ` ${result.code}` : ''}${result?.id ? ` (id ${result.id})` : ''} from ${picklistIds.length} picklist(s)`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('pack-away')
    .description('Record a pack scan (one item into a box)')
    .requiredOption('--pack-item-id <id>', 'Pack item id')
    .requiredOption('--qty <n>', 'Packed quantity for this scan')
    .option('--item-barcode <code>', 'Scanned item barcode')
    .option('--json', 'Output raw JSON')
    .action(async (options: PackAwayOptions) => {
      try {
        const qty = Number(options.qty);
        if (Number.isNaN(qty)) {
          printError('--qty must be a number');
          process.exit(1);
        }
        const payload: Record<string, unknown> = {
          packItemId: options.packItemId,
          qty,
        };
        if (options.itemBarcode !== undefined) payload.itemBarcode = options.itemBarcode;
        const result = await apiRequest<any>('/packs/pack-away', {
          method: 'POST',
          body: payload,
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          `Packed qty=${qty}${options.itemBarcode ? ` (${options.itemBarcode})` : ''}`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('finish')
    .description('Finish a pack order (mark complete and hand off to ship)')
    .requiredOption('--pack-id <id>', 'Pack id')
    .requiredOption('--pack-order-id <id>', 'Pack order id')
    .option('--json', 'Output raw JSON')
    .action(async (options: FinishOptions) => {
      try {
        const result = await apiRequest<any>('/packs/finish', {
          method: 'POST',
          body: { packId: options.packId, packOrderId: options.packOrderId },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Finished pack-order ${options.packOrderId} on pack ${options.packId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('orders <packId>')
    .description('List pack orders inside a pack')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (packId: string, options: PackOrdersOptions) => {
      try {
        const params = new URLSearchParams({ packId });
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const raw = await apiRequest<unknown>(
          `/packs/pack-orders?${params.toString()}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No pack orders found');
          return;
        }
        printTable(
          ['Order ID', 'Reference', 'Status', 'Items', 'Created'],
          items.map((i: any) => [
            i.id ?? '-',
            i.outboundOrderNumber ?? i.reference ?? i.code ?? '-',
            packStatusLabel(i.status),
            i.itemCount ?? i.items?.length ?? '-',
            fmtDate(i.createdAt),
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('items <packOrderId>')
    .description('List pack items inside a pack order')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (packOrderId: string, options: PackItemsOptions) => {
      try {
        const params = new URLSearchParams({ packOrderId });
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const raw = await apiRequest<unknown>(
          `/packs/pack-items?${params.toString()}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No pack items found');
          return;
        }
        printTable(
          ['Item ID', 'SKU', 'Required', 'Packed', 'Status'],
          items.map((i: any) => [
            i.id ?? '-',
            i.sku ?? i.barcode ?? '-',
            i.qty ?? i.requiredQty ?? '-',
            i.packedQty ?? i.actualQty ?? '-',
            packStatusLabel(i.status),
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('pack-order <packId> <orderId>')
    .description('Show a single pack order within a pack')
    .option('--json', 'Output raw JSON')
    .action(async (packId: string, orderId: string, options: { json?: boolean }) => {
      try {
        const raw = await apiRequest<any>(
          `/packs/${encodeURIComponent(packId)}/pack-orders/${encodeURIComponent(orderId)}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        if (!raw || typeof raw !== 'object') {
          console.log('Not found');
          return;
        }
        const fields: Array<[string, unknown]> = [
          ['Pack ID', packId],
          ['Order ID', raw.id ?? orderId],
          ['Reference', raw.outboundOrderNumber ?? raw.reference ?? raw.code],
          ['Status', packStatusLabel(raw.status)],
          ['Items', raw.itemCount ?? raw.items?.length],
          ['Created', fmtDate(raw.createdAt)],
        ];
        const width = Math.max(...fields.map(([k]) => k.length)) + 2;
        for (const [k, v] of fields) {
          console.log(`${k.padEnd(width)}${v ?? '-'}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('mobile-storages')
    .description('List mobile-storage carts available for packing')
    .option('--mobile-storage-code <code>', 'Filter by code')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (options: MobileStoragesOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.mobileStorageCode) params.append('mobileStorageCode', options.mobileStorageCode);
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/packs/mobile-storages${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No mobile-storage carts found');
          return;
        }
        printTable(
          ['Code', 'Picklists', 'Status'],
          items.map((i: any) => [
            i.mobileStorageCode ?? i.code ?? '-',
            i.picklistCount ?? i.picklists?.length ?? '-',
            i.status ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('adjust-item <itemId>')
    .description('Adjust the packed quantity on a single pack item')
    .requiredOption('--quantity <n>', 'New packed quantity')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: AdjustItemOptions) => {
      try {
        const n = Number(options.quantity);
        if (Number.isNaN(n)) {
          printError('--quantity must be a number');
          process.exit(1);
        }
        const result = await apiRequest<any>(
          `/packs/items/${encodeURIComponent(itemId)}/adjust-quantity`,
          { method: 'PATCH', body: { quantity: n } }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Adjusted pack item ${itemId} → quantity=${n}`);
      } catch (err) {
        handleError(err);
      }
    });
}

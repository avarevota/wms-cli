import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';

interface ItemsOptions {
  json?: boolean;
}

interface GenerateOptions {
  outboundIds: string;
  pickerCount?: string;
  isSelectedAll?: boolean;
  bulk?: boolean;
  customerId?: string;
  json?: boolean;
}

interface SetAreaOptions {
  areaCode: string;
  json?: boolean;
}

interface SetPickerOptions {
  picker: string;
  json?: boolean;
}

interface BulkSetPickerOptions {
  ids: string;
  picker: string;
  isSelectedAll?: boolean;
  wavePickNumber?: string;
  json?: boolean;
}

interface UpdateToShippedOptions {
  awb: string;
  json?: boolean;
}

interface PickAwayOptions {
  picklistId: string;
  pickItemId: string;
  itemBarcode: string;
  qty: string;
  warehouseId: string;
  zoneCode: string;
  areaCode: string;
  storageCode: string;
  mobileStorageCode: string;
  json?: boolean;
}

interface ProductScanOptions {
  sku: string;
  json?: boolean;
}

interface LocationScanOptions {
  location?: string;
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

export function registerPicklistCommands(program: Command): void {
  const group = program
    .command('picklist')
    .description('Picklist workflow (generate, assign, pick-away, finish, ship)');

  group
    .command('items <picklistId>')
    .description('Show items belonging to a picklist')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: ItemsOptions) => {
      try {
        const raw = await apiRequest<unknown>(
          `/picklist/items?id=${encodeURIComponent(picklistId)}`
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
          ['Item ID', 'SKU', 'Location', 'Picked', 'Required', 'Status'],
          items.map((i: any) => [
            i.id ?? '-',
            i.sku ?? i.barcode ?? '-',
            [i.warehouseCode, i.zoneCode, i.areaCode, i.storageCode]
              .filter(Boolean)
              .join('/') || i.location || '-',
            i.pickedQty ?? i.actualQty ?? '-',
            i.qty ?? i.requiredQty ?? '-',
            i.status ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('item <itemId>')
    .description('Show a single picklist item')
    .option('--json', 'Output raw JSON')
    .action(async (itemId: string, options: { json?: boolean }) => {
      try {
        const raw = await apiRequest<any>(
          `/picklist/item/${encodeURIComponent(itemId)}`
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
          ['ID', raw.id],
          ['SKU', raw.sku ?? raw.barcode],
          ['Location', [raw.warehouseCode, raw.zoneCode, raw.areaCode, raw.storageCode]
            .filter(Boolean)
            .join('/') || raw.location || '-'],
          ['Required Qty', raw.qty ?? raw.requiredQty],
          ['Picked Qty', raw.pickedQty ?? raw.actualQty],
          ['Status', raw.status],
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
    .command('generate')
    .description('Generate a picklist from selected outbound orders')
    .requiredOption('--outbound-ids <csv>', 'Comma-separated outbound ids')
    .option('--picker-count <n>', 'Number of pickers to split work among', '1')
    .option('--is-selected-all', 'Generate for ALL outbounds matching filters', false)
    .option('--bulk', 'Use the bulk-generate endpoint (background)', false)
    .option('--customer-id <id>', 'Customer id')
    .option('--json', 'Output raw JSON')
    .action(async (options: GenerateOptions) => {
      try {
        const outboundIds = splitCsv(options.outboundIds);
        if (outboundIds.length === 0 && !options.isSelectedAll) {
          printError('--outbound-ids must contain at least one id (or pass --is-selected-all)');
          process.exit(1);
        }
        const payload: Record<string, unknown> = {
          outboundIds,
          pickerCount: Number(options.pickerCount ?? 1),
          isSelectedAll: !!options.isSelectedAll,
        };
        if (options.customerId) payload.customerId = options.customerId;
        const path = options.bulk ? '/picklist/bulk-generate' : '/picklist/generate';
        const result = await apiRequest<any>(path, { method: 'POST', body: payload });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          options.bulk
            ? `Bulk picklist generation queued for ${outboundIds.length || 'all matching'} outbound(s)`
            : `Generated picklist(s) from ${outboundIds.length || 'all matching'} outbound(s)`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('set-picker <picklistId>')
    .description('Assign a picker to a picklist')
    .requiredOption('--picker <id>', 'Picker user id')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: SetPickerOptions) => {
      try {
        const result = await apiRequest<any>('/picklist/set-picker', {
          method: 'POST',
          body: { picklistId, picker: options.picker },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Assigned picker ${options.picker} to picklist ${picklistId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('bulk-set-picker')
    .description('Assign a picker to many picklists (or to a wave)')
    .requiredOption('--ids <csv>', 'Comma-separated picklist ids')
    .requiredOption('--picker <id>', 'Picker user id')
    .option('--is-selected-all', 'Apply to ALL records matching filters', false)
    .option('--wave-pick-number <code>', 'Wave-pick number to associate')
    .option('--json', 'Output raw JSON')
    .action(async (options: BulkSetPickerOptions) => {
      try {
        const picklistIds = splitCsv(options.ids);
        if (picklistIds.length === 0 && !options.isSelectedAll) {
          printError('--ids must contain at least one picklist id (or pass --is-selected-all)');
          process.exit(1);
        }
        const result = await apiRequest<any>('/picklist/set-picker', {
          method: 'POST',
          body: {
            picklistIds,
            picker: options.picker,
            isSelectedAll: !!options.isSelectedAll,
            wavePickNumber: options.wavePickNumber ?? '',
          },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Assigned picker ${options.picker} to ${picklistIds.length || 'all matching'} picklist(s)`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('set-mobile-storage <picklistId>')
    .description('Set the mobile-storage cart code on a picklist')
    .requiredOption('--area-code <code>', 'Mobile-storage area code')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: SetAreaOptions) => {
      try {
        const result = await apiRequest<any>('/picklist/set-mobile-storage', {
          method: 'POST',
          body: { picklistId, areaCode: options.areaCode },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Set mobile-storage area ${options.areaCode} on picklist ${picklistId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('set-packing-area <picklistId>')
    .description('Set the packing-area code on a picklist')
    .requiredOption('--area-code <code>', 'Packing-area code')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: SetAreaOptions) => {
      try {
        const result = await apiRequest<any>('/picklist/set-packing-area', {
          method: 'POST',
          body: { picklistId, areaCode: options.areaCode },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Set packing-area ${options.areaCode} on picklist ${picklistId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('pick-away')
    .description('Record a pick (one item from a location into the mobile-storage cart)')
    .requiredOption('--picklist-id <id>', 'Picklist id')
    .requiredOption('--pick-item-id <id>', 'Picklist item id')
    .requiredOption('--item-barcode <code>', 'Scanned item barcode')
    .requiredOption('--qty <n>', 'Picked quantity')
    .requiredOption('--warehouse-id <id>', 'Source warehouse id')
    .requiredOption('--zone-code <code>', 'Source zone code')
    .requiredOption('--area-code <code>', 'Source area code')
    .requiredOption('--storage-code <code>', 'Source storage / bin code')
    .requiredOption('--mobile-storage-code <code>', 'Destination mobile-storage cart code')
    .option('--json', 'Output raw JSON')
    .action(async (options: PickAwayOptions) => {
      try {
        const qty = Number(options.qty);
        if (Number.isNaN(qty)) {
          printError('--qty must be a number');
          process.exit(1);
        }
        const result = await apiRequest<any>('/picklist/pick-away', {
          method: 'POST',
          body: {
            picklistId: options.picklistId,
            pickItemId: options.pickItemId,
            itemBarcode: options.itemBarcode,
            qty,
            mobileStorageCode: options.mobileStorageCode,
            storage: {
              warehouseId: options.warehouseId,
              zoneCode: options.zoneCode,
              areaCode: options.areaCode,
              storageCode: options.storageCode,
            },
          },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Picked qty=${qty} (${options.itemBarcode}) → cart ${options.mobileStorageCode}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('update-to-shipped <picklistId>')
    .description('Mark a picklist as shipped (records AWB)')
    .requiredOption('--awb <code>', 'Air-waybill code')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: UpdateToShippedOptions) => {
      try {
        const result = await apiRequest<any>('/picklist/update-to-shipped', {
          method: 'POST',
          body: { picklistId, awb: options.awb },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Picklist ${picklistId} marked shipped (AWB ${options.awb})`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('finish <picklistId>')
    .description('Finish a picklist (transitions onward to packing)')
    .option('--json', 'Output raw JSON')
    .action(async (picklistId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/picklist/${encodeURIComponent(picklistId)}/finish`,
          { method: 'POST' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Finished picklist ${picklistId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('product-scan')
    .description('Resolve a scanned SKU/barcode to product info')
    .requiredOption('--sku <value>', 'Scanned SKU or barcode')
    .option('--json', 'Output raw JSON')
    .action(async (options: ProductScanOptions) => {
      try {
        const raw = await apiRequest<any>(
          `/picklist/product-scan?sku=${encodeURIComponent(options.sku)}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        printJson(raw);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('location-scan')
    .description('Resolve a scanned location code to location details')
    .option('--location <code>', 'Location / storage code')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (options: LocationScanOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.location) params.append('location', options.location);
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<any>(
          `/picklist/location-scan${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        printJson(raw);
      } catch (err) {
        handleError(err);
      }
    });
}

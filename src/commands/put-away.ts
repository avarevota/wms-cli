import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

// Mirrors InboundPutAwayStatusEnum on the backend (PENDING=1, COMPLETE=2, CANCELED=99)
const PUT_AWAY_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'COMPLETE',
  99: 'CANCELED',
};
const putAwayStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return PUT_AWAY_STATUS[n] ?? String(v);
};

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';

interface CreateOptions {
  inboundId: string;
  orderIds: string;
  json?: boolean;
}

interface ItemLocationOptions {
  inboundOrderId?: string;
  warehouseId: string;
  zoneCode: string;
  areaCode: string;
  storageCode: string;
  accepted: string;
  rejected?: string;
  json?: boolean;
}

function parseQty(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${flag} must be a number, got: ${value}`);
  }
  return n;
}

export function registerPutAwayCommands(program: Command): void {
  const group = program
    .command('put-away')
    .alias('putaway')
    .description('Inbound put-away workflow (create session, add items, finish, cancel)');

  group
    .command('list <inboundId>')
    .description('List put-away sessions for an inbound')
    .option('--json', 'Output raw JSON')
    .action(async (inboundId: string, options: { json?: boolean }) => {
      try {
        const raw = await apiRequest<unknown>(
          `/inbound-puts/by-inbound/${encodeURIComponent(inboundId)}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No put-away sessions found');
          return;
        }
        printTable(
          ['ID', 'Code', 'Status', 'Items', 'Created'],
          items.map((i: any) => [
            i.id ?? '-',
            i.code ?? '-',
            putAwayStatusLabel(i.status),
            i.itemCount ?? i.items?.length ?? '-',
            fmtDate(i.createdAt),
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('detail <putAwayId>')
    .description('Show a put-away session with its item lines')
    .option('--json', 'Output raw JSON')
    .action(async (putAwayId: string, options: { json?: boolean }) => {
      try {
        const raw = await apiRequest<any>(
          `/inbound-puts/${encodeURIComponent(putAwayId)}/detail`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const header = raw && typeof raw === 'object' ? raw : {};
        console.log(`ID:       ${header.id ?? '-'}`);
        console.log(`Code:     ${header.code ?? '-'}`);
        console.log(`Status:   ${putAwayStatusLabel(header.status)}`);
        console.log(`Created:  ${fmtDate(header.createdAt)}`);
        const items = Array.isArray(header.items)
          ? header.items
          : Array.isArray(header.data)
            ? header.data
            : [];
        console.log('');
        if (items.length === 0) {
          console.log('No items');
          return;
        }
        printTable(
          ['Item ID', 'Order', 'Location', 'Accepted', 'Rejected'],
          items.map((i: any) => [
            i.id ?? '-',
            i.inboundOrderId ?? '-',
            [i.warehouseCode, i.zoneCode, i.areaCode, i.storageCode]
              .filter(Boolean)
              .join('/') || '-',
            i.acceptedQuantity ?? 0,
            i.rejectedQuantity ?? 0,
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('create')
    .description('Create a put-away session for selected inbound order line(s)')
    .requiredOption('--inbound-id <id>', 'Inbound id')
    .requiredOption(
      '--order-ids <csv>',
      'Comma-separated inbound order ids to include in the session'
    )
    .option('--json', 'Output raw JSON')
    .action(async (options: CreateOptions) => {
      try {
        const inboundOrderIds = options.orderIds
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (inboundOrderIds.length === 0) {
          printError('--order-ids must contain at least one inbound order id');
          process.exit(1);
        }
        const result = await apiRequest<any>('/inbound-puts/create', {
          method: 'POST',
          body: { inboundId: options.inboundId, inboundOrderIds },
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          `Created put-away session${result?.id ? ` ${result.id}` : ''} (${inboundOrderIds.length} order line(s))`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('add-item <putAwayId>')
    .description('Add a counted item to a put-away session')
    .requiredOption('--inbound-order-id <id>', 'Inbound order line id')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption('--zone-code <code>', 'Zone code')
    .requiredOption('--area-code <code>', 'Area code')
    .requiredOption('--storage-code <code>', 'Storage / bin code')
    .requiredOption('--accepted <n>', 'Accepted quantity')
    .option('--rejected <n>', 'Rejected quantity', '0')
    .option('--json', 'Output raw JSON')
    .action(async (putAwayId: string, options: ItemLocationOptions) => {
      try {
        const accepted = parseQty(options.accepted, '--accepted');
        const rejected = parseQty(options.rejected, '--rejected') ?? 0;
        const result = await apiRequest<any>(
          `/inbound-puts/${encodeURIComponent(putAwayId)}/items`,
          {
            method: 'POST',
            body: {
              inboundOrderId: options.inboundOrderId,
              warehouseId: options.warehouseId,
              zoneCode: options.zoneCode,
              areaCode: options.areaCode,
              storageCode: options.storageCode,
              acceptedQuantity: accepted,
              rejectedQuantity: rejected,
            },
          }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          `Added item to ${putAwayId} → accepted=${accepted}, rejected=${rejected}`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('update-item <putAwayId> <itemId>')
    .description('Update a put-away item (location and/or quantities)')
    .requiredOption('--warehouse-id <id>', 'Warehouse id')
    .requiredOption('--zone-code <code>', 'Zone code')
    .requiredOption('--area-code <code>', 'Area code')
    .requiredOption('--storage-code <code>', 'Storage / bin code')
    .requiredOption('--accepted <n>', 'Accepted quantity')
    .option('--rejected <n>', 'Rejected quantity', '0')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        putAwayId: string,
        itemId: string,
        options: ItemLocationOptions
      ) => {
        try {
          const accepted = parseQty(options.accepted, '--accepted');
          const rejected = parseQty(options.rejected, '--rejected') ?? 0;
          const result = await apiRequest<any>(
            `/inbound-puts/${encodeURIComponent(putAwayId)}/items/${encodeURIComponent(itemId)}`,
            {
              method: 'PUT',
              body: {
                warehouseId: options.warehouseId,
                zoneCode: options.zoneCode,
                areaCode: options.areaCode,
                storageCode: options.storageCode,
                acceptedQuantity: accepted,
                rejectedQuantity: rejected,
              },
            }
          );
          if (options.json) {
            printJson(result);
            return;
          }
          printSuccess(`Updated item ${itemId} in ${putAwayId}`);
        } catch (err) {
          handleError(err);
        }
      }
    );

  group
    .command('delete-item <putAwayId> <itemId>')
    .description('Remove a put-away item line')
    .option('--json', 'Output raw JSON')
    .action(
      async (
        putAwayId: string,
        itemId: string,
        options: { json?: boolean }
      ) => {
        try {
          const result = await apiRequest<any>(
            `/inbound-puts/${encodeURIComponent(putAwayId)}/items/${encodeURIComponent(itemId)}`,
            { method: 'DELETE' }
          );
          if (options.json) {
            printJson(result);
            return;
          }
          printSuccess(`Deleted item ${itemId} from ${putAwayId}`);
        } catch (err) {
          handleError(err);
        }
      }
    );

  group
    .command('finish <putAwayId>')
    .description('Finish a put-away session (commits stock to locations)')
    .option('--json', 'Output raw JSON')
    .action(async (putAwayId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/inbound-puts/${encodeURIComponent(putAwayId)}/finish`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Finished put-away ${putAwayId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel <putAwayId>')
    .description('Cancel a put-away session')
    .option('--json', 'Output raw JSON')
    .action(async (putAwayId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/inbound-puts/${encodeURIComponent(putAwayId)}/cancel`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled put-away ${putAwayId}`);
      } catch (err) {
        handleError(err);
      }
    });
}

import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

interface OrdersOptions {
  limit?: string;
  page?: string;
  json?: boolean;
}

interface UpdateOrderOptions {
  expectedQuantity?: string;
  expiredDate?: string;
  batchNumber?: string;
  json?: boolean;
}

export function registerInboundCommands(program: Command): void {
  const group = program
    .command('inbound')
    .description('Inbound work-order actions (line items, finish, cancel)');

  group
    .command('orders <inboundId>')
    .description('List line items (orders) for an inbound')
    .option('--limit <n>', 'Page size, max 50')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (inboundId: string, options: OrdersOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/inbounds/${encodeURIComponent(inboundId)}/orders${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No orders found');
          return;
        }
        printTable(
          ['Order ID', 'SKU', 'Product', 'Expected', 'Received', 'Status'],
          items.map((i: any) => [
            i.id ?? '-',
            i.sku ?? i.productSku ?? '-',
            i.productName ?? i.name ?? '-',
            i.expectedQuantity ?? 0,
            i.receivedQuantity ?? i.acceptedQuantity ?? 0,
            i.status ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('update-order <orderId>')
    .description('Update an inbound order line (qty / batch / expiry)')
    .option('--expected-quantity <n>', 'Expected quantity')
    .option('--batch-number <value>', 'Batch number')
    .option('--expired-date <iso>', 'Expired date, ISO string')
    .option('--json', 'Output raw JSON')
    .action(async (orderId: string, options: UpdateOrderOptions) => {
      try {
        const payload: Record<string, unknown> = {};
        if (options.expectedQuantity !== undefined) {
          const n = Number(options.expectedQuantity);
          if (Number.isNaN(n)) {
            printError('--expected-quantity must be a number');
            process.exit(1);
          }
          payload.expectedQuantity = n;
        }
        if (options.batchNumber !== undefined) payload.batchNumber = options.batchNumber;
        if (options.expiredDate !== undefined) payload.expiredDate = options.expiredDate;

        if (Object.keys(payload).length === 0) {
          printError(
            'Nothing to update. Pass at least one of --expected-quantity / --batch-number / --expired-date.'
          );
          process.exit(1);
        }

        const result = await apiRequest<any>(
          `/inbounds/orders/${encodeURIComponent(orderId)}`,
          { method: 'PUT', body: payload }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Updated inbound order ${orderId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('finish <inboundId>')
    .description('Mark an inbound as finished')
    .option('--json', 'Output raw JSON')
    .action(async (inboundId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/inbounds/${encodeURIComponent(inboundId)}/finish`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Finished inbound ${inboundId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel <inboundId>')
    .description('Cancel an inbound')
    .option('--json', 'Output raw JSON')
    .action(async (inboundId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/inbounds/${encodeURIComponent(inboundId)}/cancel`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled inbound ${inboundId}`);
      } catch (err) {
        handleError(err);
      }
    });
}

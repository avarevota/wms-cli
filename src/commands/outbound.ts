import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { OUTBOUND_STATUS, extractItems, labelToCode } from '../lib/resources.js';
import { printError, printJson, printSuccess, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const outboundStatusFromLabel = labelToCode(OUTBOUND_STATUS);

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';

interface UpdateStatusOptions {
  status: string;
  awb?: string;
  cancelReason?: string;
  json?: boolean;
}

interface BulkUpdateStatusOptions {
  ids: string;
  status: string;
  cancelReason?: string;
  isSelectedAll?: boolean;
  filterStatus?: string;
  json?: boolean;
}

interface BulkSetPickerOptions {
  ids: string;
  picker: string;
  status: string;
  isSelectedAll?: boolean;
  customerId?: string;
  filterStatus?: string;
  json?: boolean;
}

interface LogsOptions {
  outboundNumber?: string;
  customerId?: string;
  limit?: string;
  page?: string;
  json?: boolean;
}

function parseStatus(raw: string): number {
  const code = outboundStatusFromLabel(raw);
  const n = Number(code);
  if (Number.isNaN(n)) {
    throw new Error(
      `--status must be a number or a known label (${Object.values(OUTBOUND_STATUS).join('/')}); got: ${raw}`
    );
  }
  return n;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function registerOutboundCommands(program: Command): void {
  const group = program
    .command('outbound')
    .description('Outbound order actions (status, picker, logs)');

  group
    .command('update-status <orderId>')
    .description('Update an outbound order status (HOLD/PROCESS/READY_TO_SHIP/COMPLETE/ERROR/CANCELED)')
    .requiredOption('--status <value>', 'Numeric code or label')
    .option('--awb <code>', 'Air-waybill code (required when transitioning to READY_TO_SHIP)')
    .option('--cancel-reason <text>', 'Reason (required when canceling)')
    .option('--json', 'Output raw JSON')
    .action(async (orderId: string, options: UpdateStatusOptions) => {
      try {
        const status = parseStatus(options.status);
        const payload: Record<string, unknown> = { status };
        if (options.awb !== undefined) payload.awb = options.awb;
        if (options.cancelReason !== undefined) payload.cancelReason = options.cancelReason;
        const result = await apiRequest<any>(
          `/outbounds/update-status/${encodeURIComponent(orderId)}`,
          { method: 'PATCH', body: payload }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Updated outbound ${orderId} → status ${OUTBOUND_STATUS[status] ?? status}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('cancel <orderId>')
    .description('Cancel an outbound order')
    .option('--json', 'Output raw JSON')
    .action(async (orderId: string, options: { json?: boolean }) => {
      try {
        const result = await apiRequest<any>(
          `/outbounds/${encodeURIComponent(orderId)}/cancel`,
          { method: 'PUT' }
        );
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Canceled outbound ${orderId}`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('bulk-update-status')
    .description('Bulk-update status across many outbound orders')
    .requiredOption('--ids <csv>', 'Comma-separated outbound ids')
    .requiredOption('--status <value>', 'Target status (numeric or label)')
    .option('--cancel-reason <text>', 'Reason (required when target status is CANCELED)')
    .option('--is-selected-all', 'Apply to ALL records matching the supplied filters', false)
    .option('--filter-status <value>', 'Filter — current status (numeric or label)')
    .option('--json', 'Output raw JSON')
    .action(async (options: BulkUpdateStatusOptions) => {
      try {
        const status = parseStatus(options.status);
        const outboundIds = splitCsv(options.ids);
        if (outboundIds.length === 0 && !options.isSelectedAll) {
          printError('--ids must contain at least one outbound id (or pass --is-selected-all with filters)');
          process.exit(1);
        }
        const payload: Record<string, unknown> = {
          status,
          outboundIds,
          isSelectedAll: !!options.isSelectedAll,
        };
        if (options.cancelReason !== undefined) payload.cancelReason = options.cancelReason;
        if (options.filterStatus !== undefined) payload.filterStatus = parseStatus(options.filterStatus);
        const result = await apiRequest<any>('/outbounds/bulk-update-status', {
          method: 'POST',
          body: payload,
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(
          `Bulk-updated ${outboundIds.length || 'all matching'} outbound(s) → ${OUTBOUND_STATUS[status] ?? status}`
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('bulk-set-picker')
    .description('Assign a picker to many outbound orders at once')
    .requiredOption('--ids <csv>', 'Comma-separated outbound ids')
    .requiredOption('--picker <id>', 'Picker user id')
    .requiredOption('--status <value>', 'Current status filter (numeric or label)')
    .option('--is-selected-all', 'Apply to ALL records matching the supplied filters', false)
    .option('--customer-id <id>', 'Customer id filter')
    .option('--filter-status <value>', 'Filter — current status (numeric or label)')
    .option('--json', 'Output raw JSON')
    .action(async (options: BulkSetPickerOptions) => {
      try {
        const status = parseStatus(options.status);
        const outboundIds = splitCsv(options.ids);
        if (outboundIds.length === 0 && !options.isSelectedAll) {
          printError('--ids must contain at least one outbound id (or pass --is-selected-all with filters)');
          process.exit(1);
        }
        const payload: Record<string, unknown> = {
          outboundIds,
          picker: options.picker,
          status,
          isSelectedAll: !!options.isSelectedAll,
        };
        if (options.customerId !== undefined) payload.customerId = options.customerId;
        if (options.filterStatus !== undefined) payload.filterStatus = parseStatus(options.filterStatus);
        const result = await apiRequest<any>('/outbounds/bulk-set-picker', {
          method: 'POST',
          body: payload,
        });
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess(`Set picker on ${outboundIds.length || 'all matching'} outbound(s)`);
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('logs')
    .description('Show outbound order logs (audit trail)')
    .option('--outbound-number <code>', 'Filter by outbound number')
    .option('--customer-id <id>', 'Customer id')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (options: LogsOptions) => {
      try {
        const params = new URLSearchParams();
        if (options.outboundNumber) params.append('outboundOrderNumber', options.outboundNumber);
        if (options.customerId) params.append('customerId', options.customerId);
        if (options.limit) params.append('limit', options.limit);
        if (options.page) params.append('page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/outbounds/order-logs${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No logs found');
          return;
        }
        printTable(
          ['When', 'Outbound', 'Action', 'User', 'Note'],
          items.map((i: any) => [
            fmtDate(i.createdAt),
            i.outboundOrderNumber ?? i.outboundId ?? '-',
            i.action ?? i.event ?? '-',
            i.userName ?? i.userId ?? '-',
            i.note ?? i.message ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });
}

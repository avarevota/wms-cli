import { Command } from 'commander';
import { apiRequest } from '../lib/client.js';
import { extractItems } from '../lib/resources.js';
import { printJson, printTable } from '../lib/output.js';
import { handleError } from '../lib/errors.js';

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';

interface ActivityOptions {
  module?: string;
  userId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  limit?: string;
  page?: string;
  json?: boolean;
}

interface WebhookLogsOptions {
  from: string;
  to: string;
  event?: string;
  keyword?: string;
  customerId?: string;
  json?: boolean;
}

interface SyncStocksOptions {
  from?: string;
  to?: string;
  type?: string;
  keyword?: string;
  customerId?: string;
  limit?: string;
  page?: string;
  json?: boolean;
}

function append(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value !== undefined && value !== '') params.append(key, value);
}

export function registerLogsCommands(program: Command): void {
  const group = program
    .command('logs')
    .description('Read-only operational logs (activity, webhooks, sync-stocks)');

  group
    .command('activity')
    .description('Activity logs (user actions across modules)')
    .option('--module <value>', 'Filter by module enum value')
    .option('--user-id <id>', 'Filter by user id')
    .option('--customer-id <id>', 'Filter by customer id')
    .option('--from <iso>', 'Start date (ISO)')
    .option('--to <iso>', 'End date (ISO)')
    .option('--limit <n>', 'Page size, max 50')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (options: ActivityOptions) => {
      try {
        const params = new URLSearchParams();
        append(params, 'module', options.module);
        append(params, 'userId', options.userId);
        append(params, 'customerId', options.customerId);
        append(params, 'startDate', options.from);
        append(params, 'endDate', options.to);
        append(params, 'limit', options.limit);
        append(params, 'page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/activity-logs${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No activity logs found');
          return;
        }
        printTable(
          ['When', 'User', 'Module', 'Action', 'Reference'],
          items.map((i: any) => [
            fmtDate(i.createdAt),
            i.userName ?? i.userEmail ?? i.userId ?? '-',
            i.module ?? '-',
            i.action ?? '-',
            i.referenceId ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('modules')
    .description('List the available activity-log module enum values')
    .option('--json', 'Output raw JSON')
    .action(async (options: { json?: boolean }) => {
      try {
        const raw = await apiRequest<unknown>('/activity-logs/modules');
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.data)
            ? (raw as any).data
            : extractItems(raw);
        if (items.length === 0) {
          console.log('No modules returned');
          return;
        }
        for (const item of items) {
          console.log(typeof item === 'string' ? item : JSON.stringify(item));
        }
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('webhooks')
    .description('Webhook logs (Forstok / Ginee / Qianyi callbacks)')
    .requiredOption('--from <iso>', 'Start date (ISO) — required')
    .requiredOption('--to <iso>', 'End date (ISO) — required')
    .option('--event <n>', 'Event type (1 = CREATE, 2 = UPDATE)')
    .option('--keyword <text>', 'Free-text keyword search')
    .option('--customer-id <id>', 'Filter by customer id')
    .option('--json', 'Output raw JSON')
    .action(async (options: WebhookLogsOptions) => {
      try {
        const params = new URLSearchParams({
          from: options.from,
          to: options.to,
        });
        append(params, 'event', options.event);
        append(params, 'keyword', options.keyword);
        append(params, 'customerId', options.customerId);
        const raw = await apiRequest<unknown>(
          `/activity-logs/webhooks?${params.toString()}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No webhook logs found');
          return;
        }
        printTable(
          ['When', 'Provider', 'Type', 'Event', 'Status', 'Reference'],
          items.map((i: any) => [
            fmtDate(i.createdAt),
            i.provider ?? i.providerName ?? '-',
            i.type ?? i.providerType ?? '-',
            i.event ?? '-',
            i.statusCode ?? i.status ?? '-',
            i.referenceId ?? i.externalId ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });

  group
    .command('sync-stocks')
    .description('Stock-sync logs (integrations pushing inventory back to channels)')
    .option('--from <iso>', 'Start date (ISO)')
    .option('--to <iso>', 'End date (ISO)')
    .option('--type <n>', 'Sync type (see SyncStockLogTypeEnum)')
    .option('--keyword <text>', 'Free-text keyword search')
    .option('--customer-id <id>', 'Filter by customer id')
    .option('--limit <n>', 'Page size')
    .option('--page <n>', 'Page number')
    .option('--json', 'Output raw JSON')
    .action(async (options: SyncStocksOptions) => {
      try {
        const params = new URLSearchParams();
        append(params, 'from', options.from);
        append(params, 'to', options.to);
        append(params, 'syncStockLogType', options.type);
        append(params, 'keyword', options.keyword);
        append(params, 'customerId', options.customerId);
        append(params, 'limit', options.limit);
        append(params, 'page', options.page);
        const qs = params.toString();
        const raw = await apiRequest<unknown>(
          `/activity-logs/sync-stocks${qs ? `?${qs}` : ''}`
        );
        if (options.json) {
          printJson(raw);
          return;
        }
        const items = extractItems(raw);
        if (items.length === 0) {
          console.log('No sync-stock logs found');
          return;
        }
        printTable(
          ['When', 'SKU', 'Type', 'Channel', 'Status', 'Message'],
          items.map((i: any) => [
            fmtDate(i.createdAt),
            i.sku ?? '-',
            i.type ?? i.syncStockLogType ?? '-',
            i.channel ?? i.provider ?? '-',
            i.status ?? '-',
            i.message ?? i.errorMessage ?? '-',
          ])
        );
      } catch (err) {
        handleError(err);
      }
    });
}

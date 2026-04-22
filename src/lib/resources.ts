import { apiRequest } from './client.js';

export interface ResourceDef {
  // Name used on the command line, e.g. "inbounds"
  name: string;
  // Alternate names accepted on the CLI (e.g. "skus" → products)
  aliases?: string[];
  // Endpoint base, e.g. "/inbounds"
  endpoint: string;
  // Query params supported by `list` (CLI flag → API param)
  listQuery?: Record<string, string>;
  // Columns for table output on list
  listColumns: { header: string; pick: (item: any) => unknown }[];
  // Detail fields for `get`
  detailFields: { label: string; pick: (item: any) => unknown }[];
  // Optional path-param name for detail lookup (default "id")
  idParam?: string;
  // Resource has no `GET /resource/:id` endpoint — disable `wms get <resource>`.
  supportsGet?: boolean;
}

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';
const str = (v: unknown): string => (v === null || v === undefined || v === '' ? '-' : String(v));

export const RESOURCES: ResourceDef[] = [
  {
    name: 'inbounds',
    aliases: ['inbound'],
    endpoint: '/inbounds',
    listQuery: { status: 'status', limit: 'limit', page: 'page' },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Reference', pick: (i) => i.reference ?? i.code },
      { header: 'Status', pick: (i) => i.status },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Reference', pick: (i) => i.reference ?? i.code },
      { label: 'Status', pick: (i) => i.status },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
      { label: 'Items', pick: (i) => i.items?.length ?? i.itemCount ?? 0 },
    ],
  },
  {
    name: 'outbounds',
    aliases: ['outbound'],
    endpoint: '/outbounds',
    listQuery: { status: 'status', limit: 'limit', page: 'page' },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Reference', pick: (i) => i.reference ?? i.code },
      { header: 'Status', pick: (i) => i.status },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Reference', pick: (i) => i.reference ?? i.code },
      { label: 'Status', pick: (i) => i.status },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
      { label: 'Items', pick: (i) => i.items?.length ?? i.itemCount ?? 0 },
    ],
  },
  {
    name: 'stock',
    endpoint: '/stock',
    // Backend uses ProductVariantQuery — free-form --sku/--location not guaranteed;
    // pass only `limit`/`page` for now.
    listQuery: { limit: 'limit', page: 'page' },
    supportsGet: false,
    // Backend shape: ProductStockWithVariant { msku, productName, variants: [{ sku, name, onHandQty, availableQty, ... }] }
    listColumns: [
      { header: 'MSKU', pick: (i) => i.msku },
      { header: 'Product', pick: (i) => i.productName },
      { header: 'Variants', pick: (i) => i.variants?.length ?? 0 },
      {
        header: 'On-hand',
        pick: (i) =>
          Array.isArray(i.variants)
            ? i.variants.reduce((sum: number, v: any) => sum + (v.onHandQty ?? 0), 0)
            : 0,
      },
      {
        header: 'Available',
        pick: (i) =>
          Array.isArray(i.variants)
            ? i.variants.reduce((sum: number, v: any) => sum + (v.availableQty ?? 0), 0)
            : 0,
      },
    ],
    detailFields: [],
  },
  {
    name: 'skus',
    aliases: ['sku', 'products', 'product'],
    endpoint: '/products',
    listQuery: { limit: 'limit', page: 'page' },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'MSKU', pick: (i) => i.msku },
      { header: 'SKU', pick: (i) => i.sku },
      { header: 'Name', pick: (i) => i.name },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'MSKU', pick: (i) => i.msku },
      { label: 'SKU', pick: (i) => i.sku },
      { label: 'Name', pick: (i) => i.name },
      { label: 'Description', pick: (i) => i.description },
    ],
  },
  {
    name: 'locations',
    aliases: ['location'],
    endpoint: '/location',
    listQuery: { zone: 'zone', area: 'area', limit: 'limit', page: 'page' },
    idParam: 'locationId',
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code },
      { header: 'Name', pick: (i) => i.name },
      { header: 'Zone', pick: (i) => i.zone?.name ?? i.zone },
      { header: 'Area', pick: (i) => i.area?.name ?? i.area },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Code', pick: (i) => i.code },
      { label: 'Name', pick: (i) => i.name },
      { label: 'Zone', pick: (i) => i.zone?.name ?? i.zone },
      { label: 'Area', pick: (i) => i.area?.name ?? i.area },
    ],
  },
  {
    name: 'customers',
    aliases: ['customer'],
    endpoint: '/customers',
    listQuery: { limit: 'limit', page: 'page' },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Name', pick: (i) => i.name },
      { header: 'Code', pick: (i) => i.code },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Name', pick: (i) => i.name },
      { label: 'Code', pick: (i) => i.code },
    ],
  },
  {
    name: 'movements',
    aliases: ['movement'],
    endpoint: '/movements',
    listQuery: { sku: 'sku', from: 'from', to: 'to', limit: 'limit', page: 'page' },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Type', pick: (i) => i.type },
      { header: 'Status', pick: (i) => i.status },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Type', pick: (i) => i.type },
      { label: 'Status', pick: (i) => i.status },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
  },
];

export function resolveResource(name: string): ResourceDef | null {
  const lower = name.toLowerCase();
  return (
    RESOURCES.find((r) => r.name === lower || r.aliases?.includes(lower)) ?? null
  );
}

export function resourceNames(): string[] {
  return RESOURCES.map((r) => r.name).sort();
}

// Backend lists come back under `data` as either a raw array, { items, meta },
// or { data, meta }. This normalizes to an array for rendering.
export function extractItems<T = any>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

export async function fetchList(
  resource: ResourceDef,
  flags: Record<string, string | undefined>
): Promise<{ items: any[]; raw: unknown }> {
  const params = new URLSearchParams();
  if (resource.listQuery) {
    for (const [flag, apiKey] of Object.entries(resource.listQuery)) {
      const val = flags[flag];
      if (val !== undefined && val !== '') params.append(apiKey, String(val));
    }
  }
  const qs = params.toString();
  const endpoint = qs ? `${resource.endpoint}?${qs}` : resource.endpoint;
  const raw = await apiRequest<unknown>(endpoint);
  return { items: extractItems(raw), raw };
}

export async function fetchOne(
  resource: ResourceDef,
  id: string
): Promise<any> {
  return apiRequest<any>(`${resource.endpoint}/${encodeURIComponent(id)}`);
}

export { str };

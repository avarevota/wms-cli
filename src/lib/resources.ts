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
  // Update support. If present, `wms update <resource> <id>` is enabled.
  update?: UpdateDef;
}

export interface UpdateFieldDef {
  // Commander flag definition, e.g. '--name <value>'
  flag: string;
  // Human-readable description
  description: string;
  // API payload key
  apiKey: string;
  // Value coercion
  type: 'string' | 'number' | 'json';
}

export interface UpdateDef {
  method: 'PUT' | 'PATCH';
  fields: UpdateFieldDef[];
  // Override the default `${endpoint}/${id}` path.
  pathFor?: (id: string) => string;
}

const fmtDate = (v: unknown): string =>
  v ? new Date(String(v)).toLocaleString() : '-';
const str = (v: unknown): string => (v === null || v === undefined || v === '' ? '-' : String(v));

// Mirrors AdjustmentStatusEnum in the backend
// (PENDING=1, WAITING_FOR_APPROVAL=2, DONE=3, CANCELED=99).
const ADJUSTMENT_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'WAITING_FOR_APPROVAL',
  3: 'DONE',
  99: 'CANCELED',
};
const adjustmentStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return ADJUSTMENT_STATUS[n] ?? String(v);
};

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
    // PUT /products/:id expects the product-variant id; the payload updates
    // both variant fields (sku, price, dimension…) and the product master name.
    update: {
      method: 'PUT',
      fields: [
        { flag: '--name <value>', description: 'Product name', apiKey: 'name', type: 'string' },
        { flag: '--sku <value>', description: 'Variant SKU', apiKey: 'sku', type: 'string' },
        { flag: '--sku-external <value>', description: 'External SKU', apiKey: 'skuExternal', type: 'string' },
        { flag: '--msku <value>', description: 'Master SKU', apiKey: 'msku', type: 'string' },
        { flag: '--brand-id <value>', description: 'Brand id', apiKey: 'brandId', type: 'string' },
        { flag: '--category-id <value>', description: 'Category id', apiKey: 'categoryId', type: 'string' },
        { flag: '--customer-id <value>', description: 'Customer id', apiKey: 'customerId', type: 'string' },
        { flag: '--cogs <number>', description: 'Cost of goods', apiKey: 'cogs', type: 'number' },
        { flag: '--price <number>', description: 'Sell price', apiKey: 'price', type: 'number' },
        { flag: '--method <number>', description: 'Costing method (default 1)', apiKey: 'method', type: 'number' },
        { flag: '--note <value>', description: 'Change note', apiKey: 'note', type: 'string' },
        { flag: '--attributes <json>', description: 'Attributes as JSON array', apiKey: 'attributes', type: 'json' },
        { flag: '--dimension <json>', description: 'Dimension object as JSON', apiKey: 'dimension', type: 'json' },
      ],
    },
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
    name: 'adjustments',
    aliases: ['adjustment'],
    endpoint: '/adjustments',
    // AdjustmentQuery: status/type are numeric enums (see AdjustmentStatusEnum).
    listQuery: {
      status: 'adjustmentStatus',
      type: 'adjustmentType',
      customerId: 'customerId',
      brandId: 'brandId',
      warehouseId: 'warehouseId',
      assigned: 'assigned',
      from: 'startDate',
      to: 'endDate',
      limit: 'limit',
      page: 'page',
    },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code },
      { header: 'Warehouse', pick: (i) => i.warehouseName ?? i.warehouseId },
      { header: 'Status', pick: (i) => adjustmentStatusLabel(i.status) },
      { header: 'Discrepancies', pick: (i) => i.discrepancies ?? 0 },
      { header: 'Due', pick: (i) => fmtDate(i.dueDate) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Code', pick: (i) => i.code },
      { label: 'Status', pick: (i) => adjustmentStatusLabel(i.status) },
      { label: 'Type', pick: (i) => i.type },
      { label: 'Warehouse', pick: (i) => i.warehouseName ?? i.warehouseId },
      { label: 'Customer', pick: (i) => i.customerName ?? i.customerId },
      { label: 'Brand', pick: (i) => i.brandName ?? i.brandId },
      { label: 'Assigned To', pick: (i) => i.assignedTo },
      { label: 'Due Date', pick: (i) => fmtDate(i.dueDate) },
      { label: 'Note', pick: (i) => i.note },
      { label: 'Discrepancies', pick: (i) => i.discrepancies ?? 0 },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
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

export async function fetchUpdate(
  resource: ResourceDef,
  id: string,
  payload: Record<string, unknown>
): Promise<any> {
  if (!resource.update) {
    throw new Error(`Resource "${resource.name}" does not support update`);
  }
  const path = resource.update.pathFor
    ? resource.update.pathFor(id)
    : `${resource.endpoint}/${encodeURIComponent(id)}`;
  return apiRequest<any>(path, {
    method: resource.update.method,
    body: payload,
  });
}

export { str };

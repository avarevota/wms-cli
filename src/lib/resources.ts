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
  // Optional per-flag value coercion before the value is passed to the API.
  // Keyed by the same CLI flag name used in `listQuery`. Lets resources
  // accept user-friendly labels (e.g. --status PENDING) and forward the
  // numeric code the backend expects.
  flagTransforms?: Record<string, (raw: string) => string>;
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

// Build a transform that accepts a label (case-insensitive) and returns
// the numeric code the backend uses. Falls back to the raw input so users
// can still pass numeric values directly.
function labelToCode(map: Record<number, string>): (raw: string) => string {
  const lookup = new Map<string, string>();
  for (const [code, label] of Object.entries(map)) {
    lookup.set(label.toLowerCase(), code);
  }
  return (raw: string) => {
    if (raw === undefined || raw === null) return raw;
    const trimmed = String(raw).trim();
    if (trimmed === '') return trimmed;
    if (/^\d+$/.test(trimmed)) return trimmed;
    return lookup.get(trimmed.toLowerCase()) ?? trimmed;
  };
}

// Same numeric mapping as AdjustmentStatus, but kept separate so the two
// domains can drift independently if/when the backend changes.
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

// Mirrors OutboundStatusEnum.
export const OUTBOUND_STATUS: Record<number, string> = {
  0: 'UNDEFINED',
  1: 'HOLD',
  2: 'PROCESS',
  3: 'READY_TO_SHIP',
  4: 'COMPLETE',
  5: 'ERROR',
  99: 'CANCELED',
};
const outboundStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return OUTBOUND_STATUS[n] ?? String(v);
};

// Mirrors PicklistStatusEnum.
export const PICKLIST_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'READY_TO_PICK',
  3: 'PICK',
  4: 'READY_TO_PACK',
  5: 'PACK',
  6: 'READY_TO_SHIP',
  7: 'SHIP',
  99: 'CANCELED',
};
const picklistStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return PICKLIST_STATUS[n] ?? String(v);
};

// Mirrors PackStatusEnum (PENDING=1, INPROGRESS=2, DONE=3).
export const PACK_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'INPROGRESS',
  3: 'DONE',
};
const packStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return PACK_STATUS[n] ?? String(v);
};

// Mirrors ShipOrderStatusEnum (READY_TO_SHIP=1, SHIPPED=2).
export const SHIP_STATUS: Record<number, string> = {
  1: 'READY_TO_SHIP',
  2: 'SHIPPED',
};
const shipStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return SHIP_STATUS[n] ?? String(v);
};

// Mirrors MovementStatusEnum — same numeric codes as Adjustment / Opname.
export const MOVEMENT_STATUS: Record<number, string> = {
  1: 'PENDING',
  2: 'WAITING_FOR_APPROVAL',
  3: 'DONE',
  99: 'CANCELED',
};
const movementStatusLabel = (v: unknown): string => {
  if (v === null || v === undefined) return '-';
  const n = Number(v);
  return MOVEMENT_STATUS[n] ?? String(v);
};

// Public-export the label-to-code helper so command files can build their
// own labelled flags (e.g. `wms outbound update-status --status COMPLETE`).
export { labelToCode };

// Status enum maps are also exported above (OUTBOUND_STATUS / PICKLIST_STATUS /
// PACK_STATUS / SHIP_STATUS); command files import from here.

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
    flagTransforms: { status: labelToCode(OUTBOUND_STATUS) },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Reference', pick: (i) => i.reference ?? i.code },
      { header: 'Status', pick: (i) => outboundStatusLabel(i.status) },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Reference', pick: (i) => i.reference ?? i.code },
      { label: 'Status', pick: (i) => outboundStatusLabel(i.status) },
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
    flagTransforms: {
      status: labelToCode(ADJUSTMENT_STATUS),
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
    name: 'opnames',
    aliases: ['opname', 'stock-opnames', 'stock-opname'],
    endpoint: '/stock-opnames',
    listQuery: {
      status: 'opnameStatus',
      type: 'opnameType',
      customerId: 'customerId',
      brandId: 'brandId',
      warehouseId: 'warehouseId',
      assigned: 'assigned',
      from: 'startDate',
      to: 'endDate',
      limit: 'limit',
      page: 'page',
    },
    flagTransforms: {
      status: labelToCode(OPNAME_STATUS),
    },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code },
      { header: 'Name', pick: (i) => i.name },
      { header: 'Status', pick: (i) => opnameStatusLabel(i.status) },
      { header: 'Warehouse', pick: (i) => i.warehouseName ?? i.warehouseId },
      { header: 'Due', pick: (i) => fmtDate(i.dueDate) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Code', pick: (i) => i.code },
      { label: 'Name', pick: (i) => i.name },
      { label: 'Status', pick: (i) => opnameStatusLabel(i.status) },
      { label: 'Type', pick: (i) => i.type },
      { label: 'Warehouse', pick: (i) => i.warehouseName ?? i.warehouseId },
      { label: 'Customer', pick: (i) => i.customerName ?? i.customerId },
      { label: 'Brand', pick: (i) => i.brandName ?? i.brandId },
      { label: 'Assigned To', pick: (i) => i.assignedTo },
      { label: 'Due Date', pick: (i) => fmtDate(i.dueDate) },
      { label: 'Note', pick: (i) => i.note },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
  },
  {
    name: 'picklists',
    aliases: ['picklist'],
    endpoint: '/picklist',
    supportsGet: false, // backend has /picklist/items?id=… and /picklist/item/:id
    listQuery: {
      status: 'status',
      providerShippingType: 'providerShippingType',
      limit: 'limit',
      page: 'page',
    },
    flagTransforms: { status: labelToCode(PICKLIST_STATUS) },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code ?? i.picklistNumber },
      { header: 'Status', pick: (i) => picklistStatusLabel(i.status) },
      { header: 'Picker', pick: (i) => i.pickerName ?? i.picker ?? '-' },
      { header: 'Items', pick: (i) => i.itemCount ?? i.items?.length ?? 0 },
      { header: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [],
  },
  {
    name: 'packs',
    aliases: ['pack'],
    endpoint: '/packs',
    listQuery: {
      status: 'status',
      mobileStorageCode: 'mobileStorageCode',
      customerId: 'customerId',
      from: 'startDate',
      to: 'endDate',
      limit: 'limit',
      page: 'page',
    },
    flagTransforms: { status: labelToCode(PACK_STATUS) },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code ?? i.packNumber },
      { header: 'Status', pick: (i) => packStatusLabel(i.status) },
      { header: 'Cart', pick: (i) => i.mobileStorageCode ?? '-' },
      { header: 'Orders', pick: (i) => i.orderCount ?? i.packOrders?.length ?? '-' },
      { header: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Code', pick: (i) => i.code ?? i.packNumber },
      { label: 'Status', pick: (i) => packStatusLabel(i.status) },
      { label: 'Cart', pick: (i) => i.mobileStorageCode },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
  },
  {
    name: 'ships',
    aliases: ['ship', 'shipments', 'shipment'],
    endpoint: '/ship',
    listQuery: {
      status: 'status',
      awb: 'awb',
      limit: 'limit',
      page: 'page',
    },
    flagTransforms: { status: labelToCode(SHIP_STATUS) },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'AWB', pick: (i) => i.awb ?? '-' },
      { header: 'Status', pick: (i) => shipStatusLabel(i.status) },
      { header: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'AWB', pick: (i) => i.awb },
      { label: 'Status', pick: (i) => shipStatusLabel(i.status) },
      { label: 'Proof of Delivery', pick: (i) => i.proofOfDelivery },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
  },
  {
    name: 'movements',
    aliases: ['movement'],
    endpoint: '/movements',
    // Backend MovementQuery uses movementStatus / movementType / startDate /
    // endDate plus customerId / brandId / warehouseId scope filters.
    listQuery: {
      status: 'movementStatus',
      type: 'movementType',
      customerId: 'customerId',
      brandId: 'brandId',
      warehouseId: 'warehouseId',
      from: 'startDate',
      to: 'endDate',
      limit: 'limit',
      page: 'page',
    },
    flagTransforms: { status: labelToCode(MOVEMENT_STATUS) },
    listColumns: [
      { header: 'ID', pick: (i) => i.id },
      { header: 'Code', pick: (i) => i.code ?? i.reference ?? '-' },
      { header: 'Type', pick: (i) => i.type },
      { header: 'Status', pick: (i) => movementStatusLabel(i.status) },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [
      { label: 'ID', pick: (i) => i.id },
      { label: 'Code', pick: (i) => i.code ?? i.reference },
      { label: 'Type', pick: (i) => i.type },
      { label: 'Status', pick: (i) => movementStatusLabel(i.status) },
      { label: 'Warehouse', pick: (i) => i.warehouseName ?? i.warehouseId },
      { label: 'Customer', pick: (i) => i.customerName ?? i.customerId },
      { label: 'Brand', pick: (i) => i.brandName ?? i.brandId },
      { label: 'Created', pick: (i) => fmtDate(i.createdAt) },
    ],
  },
  {
    name: 'webhook-logs',
    aliases: ['webhook-log'],
    endpoint: '/webhook/logs',
    supportsGet: false,
    listQuery: {
      provider: 'provider',
      from: 'from',
      to: 'to',
      event: 'event',
      keyword: 'keyword',
      limit: 'limit',
      page: 'page',
    },
    listColumns: [
      { header: 'Provider', pick: (i) => i.providerName ?? '-' },
      { header: 'Reference', pick: (i) => i.referenceId ?? '-' },
      { header: 'Event', pick: (i) => i.event ?? '-' },
      {
        header: 'Errors',
        pick: (i) => (Array.isArray(i.errors) ? i.errors.length : 0),
      },
      { header: 'Date', pick: (i) => fmtDate(i.createdAt) },
    ],
    detailFields: [],
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
      const raw = flags[flag];
      if (raw === undefined || raw === '') continue;
      const transform = resource.flagTransforms?.[flag];
      const val = transform ? transform(String(raw)) : String(raw);
      if (val !== '') params.append(apiKey, val);
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

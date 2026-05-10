# API Contract: Product Catalog

**Feature**: 001-core-pos-mvp
**Base URL**: `/api/v1/products`
**Date**: 2026-05-08

All endpoints require `Authorization: Bearer <accessToken>`.
The POS uses these endpoints to pull the product catalog for local SQLite storage.
All list endpoints use cursor-based pagination.

---

## GET /api/v1/products

Returns a paginated list of active products for the authenticated user's warehouse.
Used by the POS for full catalog sync and incremental updates.

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | String | No | Cursor from previous response for pagination |
| `limit` | Int | No | Page size, default 500, max 1000 |
| `updatedAfter` | ISO8601 | No | Return only products updated after this timestamp (incremental sync) |
| `warehouseId` | UUID | No | Filter by warehouse; defaults to token's warehouseId |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid",
      "barcode": "6281234567890",
      "sku": "PROD-001",
      "nameAr": "زيت دوار الشمس",
      "nameEn": "Sunflower Oil",
      "price": "12.500",
      "taxRate": "0.150",
      "unit": "bottle",
      "warehouseId": "uuid",
      "isActive": true,
      "updatedAt": "2026-05-01T00:00:00Z"
    }
  ],
  "meta": {
    "cursor": "next-cursor-string",
    "hasMore": true,
    "total": 50000,
    "limit": 500
  },
  "error": null
}
```

### Pagination Notes

- `cursor` in response `meta` is an opaque string encoding the last item's `updatedAt`
  and `id` for stable pagination even during concurrent updates.
- When `meta.hasMore = false`, the full page has been retrieved.
- For incremental sync: use `updatedAfter = lastSyncAt` to fetch only changed products.

---

## GET /api/v1/products/:id

Returns a single product by its remote ID.

### Response 200

```json
{
  "data": {
    "id": "uuid",
    "barcode": "6281234567890",
    "sku": "PROD-001",
    "nameAr": "زيت دوار الشمس",
    "nameEn": "Sunflower Oil",
    "price": "12.500",
    "taxRate": "0.150",
    "unit": "bottle",
    "warehouseId": "uuid",
    "isActive": true,
    "updatedAt": "2026-05-01T00:00:00Z"
  },
  "meta": {},
  "error": null
}
```

### Response 404

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product not found" }
}
```

---

## GET /api/v1/products/barcode/:barcode

Returns a single product by barcode. Used when the POS is online and a scanned
barcode is not found in the local cache (fallback lookup).

### Response 200

Same structure as `GET /api/v1/products/:id`.

### Response 404

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "PRODUCT_NOT_FOUND", "message": "No product found for barcode" }
}
```

---

## GET /api/v1/products/sync-manifest

Returns a lightweight manifest of all active product IDs and their `updatedAt`
timestamps. Used by the POS to determine which products need a full re-sync without
downloading the full catalog.

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `warehouseId` | UUID | No | Defaults to token's warehouseId |

### Response 200

```json
{
  "data": {
    "products": [
      { "id": "uuid", "updatedAt": "2026-05-01T00:00:00Z" }
    ],
    "totalCount": 50000,
    "generatedAt": "2026-05-08T11:00:00Z"
  },
  "meta": {},
  "error": null
}
```

---

## Sync Strategy for POS

Full sync (first run or manual refresh):
1. `GET /api/v1/products/sync-manifest` → build set of `(id, updatedAt)` pairs
2. Compare with local SQLite: find missing or stale products
3. `GET /api/v1/products?updatedAfter=<earliest_stale_date>&cursor=...` (paginate until done)
4. Upsert all fetched products into SQLite
5. Mark products present in local but absent from manifest as `isActive = false`
6. Update `lastCatalogSyncAt` in local settings

Incremental sync (background, every 15 minutes when online):
1. `GET /api/v1/products?updatedAfter=<lastCatalogSyncAt>` (paginate until done)
2. Upsert changed products into SQLite
3. Update `lastCatalogSyncAt`
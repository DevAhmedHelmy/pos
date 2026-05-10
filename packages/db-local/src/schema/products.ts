import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id').unique(),
  barcode: text('barcode').notNull().unique(),
  sku: text('sku').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  price: text('price').notNull(),
  taxRate: text('tax_rate').notNull().default('0'),
  unit: text('unit').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  syncStatus: text('sync_status').notNull().default('synced'),
  syncedAt: text('synced_at'),
  updatedAt: text('updated_at').notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

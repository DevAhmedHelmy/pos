import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const saleItems = sqliteTable('sale_items', {
  localId: text('local_id').primaryKey(),
  saleId: text('sale_id').notNull(),
  productLocalId: text('product_local_id').notNull(),
  snapshot: text('snapshot', { mode: 'json' }).notNull(),
  quantity: text('quantity').notNull(),
  unitPrice: text('unit_price').notNull(),
  discount: text('discount', { mode: 'json' }),
  tax: text('tax').notNull().default('0'),
  lineTotal: text('line_total').notNull(),
  createdAt: text('created_at').notNull(),
});

export type LocalSaleItem = typeof saleItems.$inferSelect;
export type NewLocalSaleItem = typeof saleItems.$inferInsert;

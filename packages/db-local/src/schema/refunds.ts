import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const refunds = sqliteTable('refunds', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id'),
  originalSaleId: text('original_sale_id').notNull(),
  cashierId: text('cashier_id').notNull(),
  supervisorId: text('supervisor_id').notNull(),
  items: text('items', { mode: 'json' }).notNull(),
  total: text('total').notNull(),
  receiptNumber: text('receipt_number').notNull().unique(),
  syncStatus: text('sync_status').notNull().default('pending'),
  syncedAt: text('synced_at'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type LocalRefund = typeof refunds.$inferSelect;
export type NewLocalRefund = typeof refunds.$inferInsert;

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sales = sqliteTable('sales', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id'),
  shiftId: text('shift_id').notNull(),
  cashierId: text('cashier_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  status: text('status').notNull().default('draft'),
  subtotal: text('subtotal').notNull().default('0'),
  invoiceDiscount: text('invoice_discount').notNull().default('0'),
  tax: text('tax').notNull().default('0'),
  total: text('total').notNull().default('0'),
  paidCash: text('paid_cash').notNull().default('0'),
  paidCard: text('paid_card').notNull().default('0'),
  changeDue: text('change_due').notNull().default('0'),
  holdRef: text('hold_ref'),
  receiptNumber: text('receipt_number').unique(),
  syncStatus: text('sync_status').notNull().default('pending'),
  syncedAt: text('synced_at'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  updatedAt: text('updated_at').notNull(),
});

export type LocalSale = typeof sales.$inferSelect;
export type NewLocalSale = typeof sales.$inferInsert;

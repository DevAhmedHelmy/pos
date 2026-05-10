import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const shifts = sqliteTable('shifts', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id'),
  cashierId: text('cashier_id').notNull(),
  terminalId: text('terminal_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  status: text('status').notNull().default('open'),
  openAt: text('open_at').notNull(),
  closeAt: text('close_at'),
  openingCash: text('opening_cash').notNull(),
  closingCash: text('closing_cash'),
  totalSales: text('total_sales').notNull().default('0'),
  totalRefunds: text('total_refunds').notNull().default('0'),
  totalCash: text('total_cash').notNull().default('0'),
  totalCard: text('total_card').notNull().default('0'),
  syncStatus: text('sync_status').notNull().default('pending'),
  syncedAt: text('synced_at'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type LocalShift = typeof shifts.$inferSelect;
export type NewLocalShift = typeof shifts.$inferInsert;

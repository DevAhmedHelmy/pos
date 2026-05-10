import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const payments = sqliteTable('payments', {
  localId: text('local_id').primaryKey(),
  saleId: text('sale_id').notNull(),
  method: text('method').notNull(),
  amount: text('amount').notNull(),
  reference: text('reference'),
  createdAt: text('created_at').notNull(),
});

export type LocalPayment = typeof payments.$inferSelect;
export type NewLocalPayment = typeof payments.$inferInsert;

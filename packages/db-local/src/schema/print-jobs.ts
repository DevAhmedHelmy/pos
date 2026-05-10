import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const printJobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: text('last_attempt_at'),
  error: text('error'),
  createdAt: text('created_at').notNull(),
});

export type PrintJob = typeof printJobs.$inferSelect;
export type NewPrintJob = typeof printJobs.$inferInsert;

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  priority: integer('priority').notNull().default(5),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: text('next_retry_at').notNull(),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type SyncQueueRow = typeof syncQueue.$inferSelect;
export type NewSyncQueueRow = typeof syncQueue.$inferInsert;

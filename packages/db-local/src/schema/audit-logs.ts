import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// append-only — no updatedAt; never UPDATE or DELETE
export const auditLogs = sqliteTable('audit_logs', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id'),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  terminalId: text('terminal_id').notNull(),
  beforeState: text('before_state', { mode: 'json' }),
  afterState: text('after_state', { mode: 'json' }),
  syncStatus: text('sync_status').notNull().default('pending'),
  timestamp: text('timestamp').notNull(),
});

export type LocalAuditLog = typeof auditLogs.$inferSelect;
export type NewLocalAuditLog = typeof auditLogs.$inferInsert;

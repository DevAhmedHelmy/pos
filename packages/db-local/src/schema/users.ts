import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id').notNull().unique(),
  username: text('username').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  pinHash: text('pin_hash').notNull(),
  role: text('role').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
});

export type LocalUser = typeof users.$inferSelect;
export type NewLocalUser = typeof users.$inferInsert;

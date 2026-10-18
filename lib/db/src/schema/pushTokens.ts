import { createInsertSchema } from "drizzle-zod";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pushTokensTable = pgTable(
  "city_push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    expoPushToken: text("expo_push_token").notNull(),
    platform: text("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("city_push_tokens_token_unique").on(table.expoPushToken),
    check(
      "city_push_tokens_platform_check",
      sql`${table.platform} in ('ios', 'android')`,
    ),
  ],
);

export const insertPushTokenSchema = createInsertSchema(pushTokensTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushToken = typeof pushTokensTable.$inferInsert;
export type PushToken = typeof pushTokensTable.$inferSelect;

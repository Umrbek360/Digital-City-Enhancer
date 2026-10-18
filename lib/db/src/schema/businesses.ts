import { createInsertSchema } from "drizzle-zod";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const businessesTable = pgTable(
  "city_businesses",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    description: text("description").notNull().default(""),
    hours: text("hours").notNull().default(""),
    status: text("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("city_businesses_owner_id_unique").on(table.ownerId),
    index("city_businesses_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "city_businesses_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    check(
      "city_businesses_category_check",
      sql`${table.category} in ('Ovqatlanish', 'Go‘zallik', 'Sog‘liq', 'Ta’lim')`,
    ),
  ],
);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBusiness = typeof businessesTable.$inferInsert;
export type Business = typeof businessesTable.$inferSelect;

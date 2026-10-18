import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const bookingsTable = pgTable(
  "city_bookings",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    businessOwnerId: text("business_owner_id").notNull(),
    businessName: text("business_name").notNull(),
    customerId: text("customer_id").notNull(),
    serviceName: text("service_name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    customerNote: text("customer_note"),
    ownerNote: text("owner_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("city_bookings_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("city_bookings_owner_created_idx").on(
      table.businessOwnerId,
      table.createdAt,
    ),
    index("city_bookings_status_start_idx").on(table.status, table.startsAt),
    check(
      "city_bookings_status_check",
      sql`${table.status} in ('pending', 'accepted', 'declined')`,
    ),
  ],
);

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  status: true,
  ownerNote: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = typeof bookingsTable.$inferInsert;
export type Booking = typeof bookingsTable.$inferSelect;

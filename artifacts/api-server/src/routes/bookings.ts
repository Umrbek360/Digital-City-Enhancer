import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateBookingBody,
  CreateBookingResponse,
  ListBusinessBookingsResponse,
  ListMyBookingsResponse,
  UpdateBookingStatusBody,
  UpdateBookingStatusParams,
  UpdateBookingStatusResponse,
} from "@workspace/api-zod";
import { bookingsTable, businessesTable, db } from "@workspace/db";
import { requireIdentity } from "../lib/requireIdentity";
import { sendPushToUser } from "../services/expoPush";

const router: IRouter = Router();

router.post("/bookings", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;
  if (!identity.emailVerified || !identity.email) {
    res.status(403).json({ error: "Verify your email before booking" });
    return;
  }

  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const serviceName = parsed.data.serviceName.trim();
  if (!serviceName) {
    res.status(400).json({ error: "Service name cannot be blank" });
    return;
  }

  const startsAt = new Date(parsed.data.startsAt);
  const now = Date.now();
  if (
    !Number.isFinite(startsAt.getTime()) ||
    startsAt.getTime() <= now ||
    startsAt.getTime() > now + 183 * 24 * 60 * 60 * 1000
  ) {
    res.status(400).json({ error: "Choose a future date within the next six months" });
    return;
  }

  const [business] = await db
    .select({
      id: businessesTable.id,
      ownerId: businessesTable.ownerId,
      name: businessesTable.name,
    })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, parsed.data.businessId),
        eq(businessesTable.status, "approved"),
      ),
    )
    .limit(1);

  if (!business) {
    res.status(404).json({ error: "Approved business not found" });
    return;
  }
  if (business.ownerId === identity.userId) {
    res.status(403).json({ error: "Business owners cannot book their own listing" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      id: randomUUID(),
      businessId: business.id,
      businessOwnerId: business.ownerId,
      businessName: business.name,
      customerId: identity.userId,
      serviceName,
      startsAt,
      status: "pending",
      customerNote: parsed.data.customerNote?.trim() || null,
      ownerNote: null,
    })
    .returning();

  const response = CreateBookingResponse.parse(booking);
  res.status(201).json(response);
  void sendPushToUser(business.ownerId, {
    title: "Yangi uchrashuv so‘rovi",
    body: `${business.name}: ${response.serviceName}`,
    data: { type: "booking", bookingId: response.id, route: "/business-bookings" },
  });
});

router.get("/bookings/mine", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.customerId, identity.userId))
    .orderBy(desc(bookingsTable.startsAt))
    .limit(200);
  res.json(ListMyBookingsResponse.parse(bookings));
});

router.get("/business-bookings", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.businessOwnerId, identity.userId))
    .orderBy(desc(bookingsTable.startsAt))
    .limit(200);
  res.json(ListBusinessBookingsResponse.parse(bookings));
});

router.patch(
  "/business-bookings/:bookingId/status",
  async (req, res): Promise<void> => {
    const identity = await requireIdentity(req, res);
    if (!identity) return;

    const params = UpdateBookingStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateBookingStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select({
        id: bookingsTable.id,
        customerId: bookingsTable.customerId,
        businessName: bookingsTable.businessName,
        serviceName: bookingsTable.serviceName,
        status: bookingsTable.status,
      })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.id, params.data.bookingId),
          eq(bookingsTable.businessOwnerId, identity.userId),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Appointment request not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: "Only pending requests can be changed" });
      return;
    }

    const [booking] = await db
      .update(bookingsTable)
      .set({
        status: parsed.data.status,
        ownerNote: parsed.data.ownerNote?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingsTable.id, existing.id),
          eq(bookingsTable.businessOwnerId, identity.userId),
          eq(bookingsTable.status, "pending"),
        ),
      )
      .returning();

    if (!booking) {
      res.status(409).json({ error: "This request has already been reviewed" });
      return;
    }

    const response = UpdateBookingStatusResponse.parse(booking);
    res.json(response);
    void sendPushToUser(existing.customerId, {
      title: "Uchrashuv so‘rovi yangilandi",
      body:
        parsed.data.status === "accepted"
          ? `${existing.businessName} so‘rovingizni qabul qildi.`
          : `${existing.businessName} boshqa vaqtni kelishishni so‘radi.`,
      data: { type: "booking", bookingId: response.id, route: "/(tabs)/bookings" },
    });
  },
);

export default router;

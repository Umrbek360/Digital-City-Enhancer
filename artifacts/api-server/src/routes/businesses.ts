import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateBusinessBody,
  CreateBusinessResponse,
  GetAdminDashboardResponse,
  GetCurrentAccountResponse,
  GetPublicBusinessParams,
  GetPublicBusinessResponse,
  ListAdminBusinessesQueryParams,
  ListAdminBusinessesResponse,
  ListMyBusinessesResponse,
  ListPublicBusinessesResponse,
  ReviewBusinessBody,
  ReviewBusinessParams,
  ReviewBusinessResponse,
  UpdateMyBusinessBody,
  UpdateMyBusinessParams,
  UpdateMyBusinessResponse,
} from "@workspace/api-zod";
import { db, businessesTable } from "@workspace/db";
import { requireIdentity } from "../lib/requireIdentity";
import { sendPushToUser } from "../services/expoPush";

const router: IRouter = Router();

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

router.get("/account/me", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const [ownedBusiness] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, identity.userId))
    .limit(1);

  const account = GetCurrentAccountResponse.parse({
    userId: identity.userId,
    email: identity.email,
    role: identity.isAdmin
      ? "admin"
      : ownedBusiness
        ? "business_owner"
        : "customer",
  });
  res.json(account);
});

router.get("/businesses/mine", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, identity.userId))
    .orderBy(desc(businessesTable.createdAt));
  res.json(ListMyBusinessesResponse.parse(businesses));
});

router.post("/businesses", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;
  if (!identity.emailVerified || !identity.email) {
    res.status(403).json({ error: "Verify your email before submitting a business" });
    return;
  }

  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existingBusiness] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, identity.userId))
    .limit(1);
  if (existingBusiness) {
    res.status(409).json({ error: "This account already has a business application" });
    return;
  }

  try {
    const [business] = await db
      .insert(businessesTable)
      .values({
        id: randomUUID(),
        ownerId: identity.userId,
        ownerName: parsed.data.ownerName.trim(),
        ownerEmail: identity.email,
        name: parsed.data.name.trim(),
        category: parsed.data.category,
        phone: parsed.data.phone.trim(),
        address: parsed.data.address.trim(),
        description: parsed.data.description.trim(),
        hours: parsed.data.hours.trim(),
        status: "pending",
        adminNote: null,
      })
      .returning();

    res.status(201).json(CreateBusinessResponse.parse(business));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This account already has a business application" });
      return;
    }
    throw error;
  }
});

router.get("/businesses", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.status, "approved"))
    .orderBy(desc(businessesTable.createdAt))
    .limit(200);
  res.json(ListPublicBusinessesResponse.parse(businesses));
});

router.get("/businesses/:businessId", async (req, res): Promise<void> => {
  const params = GetPublicBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, params.data.businessId),
        eq(businessesTable.status, "approved"),
      ),
    )
    .limit(1);

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(GetPublicBusinessResponse.parse(business));
});

router.patch("/businesses/:businessId", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const params = UpdateMyBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMyBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one field to update" });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set({
      ...parsed.data,
      status: "pending",
      adminNote: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(businessesTable.id, params.data.businessId),
        eq(businessesTable.ownerId, identity.userId),
      ),
    )
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  res.json(UpdateMyBusinessResponse.parse(business));
});

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res, true);
  if (!identity) return;

  const [grouped, recent] = await Promise.all([
    db
      .select({
        status: businessesTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(businessesTable)
      .groupBy(businessesTable.status),
    db
      .select()
      .from(businessesTable)
      .orderBy(desc(businessesTable.createdAt))
      .limit(6),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const row of grouped) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = Number(row.count);
    }
  }

  res.json(
    GetAdminDashboardResponse.parse({
      total: counts.pending + counts.approved + counts.rejected,
      ...counts,
      recent,
    }),
  );
});

router.get("/admin/businesses", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res, true);
  if (!identity) return;

  const query = ListAdminBusinessesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(
      query.data.status
        ? eq(businessesTable.status, query.data.status)
        : undefined,
    )
    .orderBy(desc(businessesTable.createdAt));
  res.json(ListAdminBusinessesResponse.parse(businesses));
});

router.patch(
  "/admin/businesses/:businessId/review",
  async (req, res): Promise<void> => {
    const identity = await requireIdentity(req, res, true);
    if (!identity) return;

    const params = ReviewBusinessParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = ReviewBusinessBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select({ ownerId: businessesTable.ownerId, name: businessesTable.name, status: businessesTable.status })
      .from(businessesTable)
      .where(eq(businessesTable.id, params.data.businessId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const [business] = await db
      .update(businessesTable)
      .set({
        status: parsed.data.status,
        adminNote: parsed.data.adminNote?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, params.data.businessId))
      .returning();

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    if (existing.status !== parsed.data.status) {
      const message =
        parsed.data.status === "approved"
          ? `${existing.name} biznes arizangiz tasdiqlandi.`
          : `${existing.name} biznes arizangiz rad etildi.`;
      void sendPushToUser(existing.ownerId, {
        title: "Biznes holati yangilandi",
        body: message,
        data: { type: "business-review", businessId: business.id, route: "/business-account" },
      });
    }
    res.json(ReviewBusinessResponse.parse(business));
  },
);

export default router;

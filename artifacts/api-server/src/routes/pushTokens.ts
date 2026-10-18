import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  RegisterPushTokenBody,
  RegisterPushTokenResponse,
  UnregisterPushTokenBody,
  UnregisterPushTokenResponse,
} from "@workspace/api-zod";
import { db, pushTokensTable } from "@workspace/db";
import { requireIdentity } from "../lib/requireIdentity";

const router: IRouter = Router();

router.post("/push-tokens", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .insert(pushTokensTable)
    .values({
      id: randomUUID(),
      userId: identity.userId,
      expoPushToken: parsed.data.expoPushToken,
      platform: parsed.data.platform,
    })
    .onConflictDoUpdate({
      target: pushTokensTable.expoPushToken,
      set: {
        userId: identity.userId,
        platform: parsed.data.platform,
        updatedAt: new Date(),
      },
    });

  res.json(RegisterPushTokenResponse.parse({ registered: true }));
});

router.delete("/push-tokens", async (req, res): Promise<void> => {
  const identity = await requireIdentity(req, res);
  if (!identity) return;

  const parsed = UnregisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const removed = await db
    .delete(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.expoPushToken, parsed.data.expoPushToken),
        eq(pushTokensTable.userId, identity.userId),
      ),
    )
    .returning({ id: pushTokensTable.id });

  res.json(UnregisterPushTokenResponse.parse({ removed: removed.length > 0 }));
});

export default router;

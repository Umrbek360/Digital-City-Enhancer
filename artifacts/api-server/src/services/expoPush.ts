import { inArray, eq } from "drizzle-orm";
import { db, pushTokensTable } from "@workspace/db";
import { logger } from "../lib/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MESSAGE_BATCH_SIZE = 100;

type PushContent = {
  title: string;
  body: string;
  data: Record<string, string>;
};

type ExpoTicket = {
  status?: string;
  details?: { error?: string };
};

export async function sendPushToUser(
  userId: string,
  content: PushContent,
): Promise<void> {
  try {
    const tokens = await db
      .select({ id: pushTokensTable.id, token: pushTokensTable.expoPushToken })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId));

    for (let offset = 0; offset < tokens.length; offset += MESSAGE_BATCH_SIZE) {
      const batch = tokens.slice(offset, offset + MESSAGE_BATCH_SIZE);
      const messages = batch.map(({ token }) => ({
        to: token,
        sound: "default",
        priority: "high",
        channelId: "default",
        title: content.title,
        body: content.body,
        data: content.data,
      }));

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(messages),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          logger.warn({ status: response.status }, "Expo push service rejected a batch");
          continue;
        }

        const result = (await response.json()) as { data?: ExpoTicket[] };
        const invalidIds = batch.flatMap((token, index) =>
          result.data?.[index]?.details?.error === "DeviceNotRegistered"
            ? [token.id]
            : [],
        );
        if (invalidIds.length) {
          await db.delete(pushTokensTable).where(inArray(pushTokensTable.id, invalidIds));
        }
      } catch (error) {
        logger.warn({ err: error }, "Expo push delivery failed");
      }
    }
  } catch (error) {
    logger.warn({ err: error }, "Could not look up registered Expo push tokens");
  }
}

import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";

export type ClerkIdentity = {
  userId: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
};

export async function getClerkIdentity(
  req: Request,
): Promise<ClerkIdentity | null> {
  const { userId } = getAuth(req);
  if (!userId) {
    return null;
  }

  const user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  const email = primaryEmail?.emailAddress ?? "";
  const emailVerified = primaryEmail?.verification?.status === "verified";
  const allowedAdminEmails = new Set(
    (process.env.DIGITAL_CITY_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    userId,
    email,
    emailVerified,
    isAdmin: emailVerified && allowedAdminEmails.has(email.toLowerCase()),
  };
}

import type { Request, Response } from "express";
import { getClerkIdentity, type ClerkIdentity } from "./clerkIdentity";

export async function requireIdentity(
  req: Request,
  res: Response,
  adminOnly = false,
): Promise<ClerkIdentity | null> {
  const identity = await getClerkIdentity(req);
  if (!identity) {
    res.status(401).json({ error: "Sign-in required" });
    return null;
  }
  if (adminOnly && !identity.isAdmin) {
    res.status(403).json({ error: "Administrator access required" });
    return null;
  }
  return identity;
}

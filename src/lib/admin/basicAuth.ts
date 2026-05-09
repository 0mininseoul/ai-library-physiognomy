import type { NextRequest } from "next/server";

export function isAdminRequest(req: NextRequest): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  return decoded === `${expectedUser}:${expectedPassword}`;
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, {
    status: 401,
  });
}

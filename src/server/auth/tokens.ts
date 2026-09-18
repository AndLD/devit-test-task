import { createHash } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Access+refresh JWT pattern (see AGENTS.md): a short-lived access token
// authorizes admin requests by signature alone; a longer-lived refresh token
// is only ever exchanged for a new access token, and its hash is checked
// against the RefreshToken table so it can be revoked (logout, rotation).
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

function getSecretKey(envVar: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const secret = process.env[envVar];
  if (!secret) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
  return new TextEncoder().encode(secret);
}

export interface AdminTokenPayload extends JWTPayload {
  sub: string;
}

export async function signAccessToken(adminUserId: string): Promise<string> {
  return new SignJWT({ sub: adminUserId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey("JWT_ACCESS_SECRET"));
}

export async function verifyAccessToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecretKey("JWT_ACCESS_SECRET"),
    );
    if (typeof payload.sub !== "string") return null;
    return payload as AdminTokenPayload;
  } catch {
    return null;
  }
}

export interface RefreshTokenResult {
  token: string;
  jti: string;
  expiresAt: Date;
}

export async function signRefreshToken(
  adminUserId: string,
): Promise<RefreshTokenResult> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ sub: adminUserId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecretKey("JWT_REFRESH_SECRET"));
  return { token, jti, expiresAt };
}

export async function verifyRefreshToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecretKey("JWT_REFRESH_SECRET"),
    );
    if (typeof payload.sub !== "string") return null;
    return payload as AdminTokenPayload;
  } catch {
    return null;
  }
}

// Refresh tokens are high-entropy JWTs already, so a fast SHA-256 digest
// (rather than a slow password hash) is enough to avoid storing the raw,
// replayable token value in the database.
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

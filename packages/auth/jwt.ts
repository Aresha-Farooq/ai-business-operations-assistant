import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env["JWT_SECRET"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

const secret = new TextEncoder().encode(JWT_SECRET);

type AuthTokenPayload = {
  userId: number;
  organizationId: number;
  role: string;
};

export async function createAccessToken(payload: AuthTokenPayload) {
  return new SignJWT({
    userId: payload.userId,
    organizationId: payload.organizationId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  return {
    userId: Number(payload.userId),
    organizationId: Number(payload.organizationId),
    role: String(payload.role),
  };
}
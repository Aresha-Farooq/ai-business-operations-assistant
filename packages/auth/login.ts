import { createHash } from "node:crypto";
import { verifyPassword } from "./password";
import {
  db,
  getDbRuntime,
  createAuditLog,
} from "@business-platform/database";
import { createAccessToken } from "./jwt";

type LoginUserInput = {
  email: string;
  password: string;
};

function logUnknownAccountAttempt(email: string) {
  const emailHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");

  console.warn("LOGIN_FAILED_UNKNOWN_ACCOUNT", {
    emailHash,
    source: "AUTH",
    timestamp: new Date().toISOString(),
  });
}

export async function loginUser(input: LoginUserInput) {
  const runtime = await getDbRuntime();

  const userPlan = db.sql.public.user
    .select(
      "id",
      "name",
      "email",
      "passwordHash",
      "organizationId",
      "role"
    )
    .where((fields, fns) => fns.eq(fields.email, input.email))
    .build();

  const users = await runtime.query(userPlan);

  if (users.length === 0) {
    logUnknownAccountAttempt(input.email);
    throw new Error("Invalid email or password.");
  }

  const user = users[0];

  const passwordIsValid = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "LOGIN_FAILED",
      source: "AUTH",
      status: "FAILURE",
    });

    throw new Error("Invalid email or password.");
  }

  const accessToken = await createAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  await createAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    action: "LOGIN_SUCCESS",
    source: "AUTH",
    status: "SUCCESS",
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
    accessToken,
  };
}


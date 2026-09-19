import { verifyPassword } from "./password";
import { db, getDbRuntime } from "@business-platform/database";
import { createAccessToken } from "./jwt";

type LoginUserInput = {
  email: string;
  password: string;
};

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
    throw new Error("Invalid email or password.");
  }

  const user = users[0];

  const passwordIsValid = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    throw new Error("Invalid email or password.");
  }

  const accessToken = await createAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
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
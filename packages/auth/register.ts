import { hashPassword } from "./password.js";
import { db } from "@business-platform/database";

type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  organizationId: number;
};

export async function registerUser(input: RegisterUserInput) {
  const runtime = await db.connect({
    url: process.env["DATABASE_URL"]!,
  });

  // Check whether the email is already registered
 const existingUserPlan = db.sql.public.user
  .select("id")
  .where((fields, fns) => fns.eq(fields.email, input.email))
  .build();
  const existingUsers = await runtime.query(existingUserPlan);

  if (existingUsers.length > 0) {
    throw new Error("An account with this email already exists.");
  }

  // Hash the password before storing it
  const passwordHash = await hashPassword(input.password);

  const plan = db.sql.public.user
    .insert([
      {
        name: input.name,
        email: input.email,
        passwordHash,
        organizationId: input.organizationId,
      },
    ])
    .returning("id", "name", "email", "organizationId")
    .build();

  const users = await runtime.query(plan);

  return users[0];
}
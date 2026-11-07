import {
  db,
  getDbRuntime,
  createAuditLog,
} from "@business-platform/database";

import { requirePermission } from "@business-platform/auth/authorization";
import { hashPassword } from "@business-platform/auth/password";

type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "STAFF";
};
type UpdateStaffInput = {
  name?: string;
  email?: string;
  role?: "MANAGER" | "STAFF";
};
export async function createStaff(input: CreateStaffInput) {
  // 1. Check whether the current user can manage employees
  const currentUser = await requirePermission("employees:manage");

  const runtime = await getDbRuntime();

  // 2. Normalize the email
  const email = input.email.trim().toLowerCase();

  // 3. Check for an existing account (email is globally unique)
  const existingUserPlan = db.sql.public.user
    .select("id")
    .where((fields, fns) => fns.eq(fields.email, email))
    .build();

  const existingUsers = await runtime.query(existingUserPlan);

  if (existingUsers.length > 0) {
    throw new Error("An account with this email already exists.");
  }

  // 4. Hash the password
  const passwordHash = await hashPassword(input.password);

  // 5. Create the staff account in the current organization
  const createUserPlan = db.sql.public.user
    .insert([
      {
        name: input.name.trim(),
        email,
        passwordHash,
        organizationId: currentUser.organizationId,
        role: input.role,
        isActive: true,
        deletedAt: null,
      },
    ])
    .returning("id", "name", "email", "organizationId", "role", "isActive")
    .build();

  const createdUsers = await runtime.query(createUserPlan);
  const createdUser = createdUsers[0];

  if (!createdUser) {
    throw new Error("Failed to create staff account.");
  }

  // 6. Record the action
  await createAuditLog({
    organizationId: currentUser.organizationId,
    userId: currentUser.userId,
    action: "STAFF_CREATED",
    source: "BUSINESS_API",
    status: "SUCCESS",
  });

  return createdUser;
}
export async function getAllStaff() {
  const currentUser = await requirePermission("employees:manage");
  const runtime = await getDbRuntime();

  const staffPlan = db.sql.public.user
    .select(
      "id",
      "name",
      "email",
      "role",
      "isActive",
      "createdAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, currentUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const staff = await runtime.query(staffPlan);

  // OWNER accounts are not displayed in Staff Management.
  return staff.filter((member) => member.role !== "OWNER");
}
export async function updateStaff(
  staffId: number,
  input: UpdateStaffInput
) {
  // 1. Verify permission
  const currentUser = await requirePermission("employees:manage");

  const runtime = await getDbRuntime();

  // 2. Find the target account inside the current organization
  const targetPlan = db.sql.public.user
    .select("id", "role")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, staffId),
        fns.eq(fields.organizationId, currentUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const targets = await runtime.query(targetPlan);
  const target = targets[0];

  if (!target) {
    throw new Error("Staff member not found.");
  }

  // 3. Protect OWNER accounts
  if (target.role === "OWNER") {
    throw new Error("You cannot update an owner account.");
  }

  // 4. Prevent users from changing their own role
  if (
    staffId === currentUser.userId &&
    input.role !== undefined
  ) {
    throw new Error("You cannot change your own role.");
  }

  // 5. Prepare only the fields supplied by the caller
  const updates = {
    ...(input.name !== undefined
      ? { name: input.name.trim() }
      : {}),
    ...(input.email !== undefined
      ? { email: input.email.trim().toLowerCase() }
      : {}),
    ...(input.role !== undefined
      ? { role: input.role }
      : {}),
  };

  if (Object.keys(updates).length === 0) {
    throw new Error("Provide at least one field to update.");
  }

  // 6. Update the account within the current organization
  const updatePlan = db.sql.public.user
    .update(updates)
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, staffId),
        fns.eq(fields.organizationId, currentUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .returning(
      "id",
      "name",
      "email",
      "role",
      "isActive",
      "updatedAt"
    )
    .build();

  const updatedUsers = await runtime.query(updatePlan);
  const updatedUser = updatedUsers[0];

  if (!updatedUser) {
    throw new Error("Staff member not found.");
  }

  // 7. Record the action
  await createAuditLog({
    organizationId: currentUser.organizationId,
    userId: currentUser.userId,
    action: "STAFF_UPDATED",
    source: "BUSINESS_API",
    status: "SUCCESS",
  });

  return updatedUser;
}


export async function deactivateStaff(staffId: number) {
  // 1. Verify permission
  const currentUser = await requirePermission("employees:manage");

  const runtime = await getDbRuntime();

  // 2. Find the target account in the current organization
  const targetPlan = db.sql.public.user
    .select("id", "role")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, staffId),
        fns.eq(fields.organizationId, currentUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const targets = await runtime.query(targetPlan);
  const target = targets[0];

  if (!target) {
    throw new Error("Staff member not found or already inactive.");
  }

  // 3. Protect owner accounts
  if (target.role === "OWNER") {
    throw new Error("You cannot deactivate an owner account.");
  }

  // 4. Prevent self-deactivation
  if (staffId === currentUser.userId) {
    throw new Error("You cannot deactivate your own account.");
  }

  // 5. Perform soft deletion
  const deactivatePlan = db.sql.public.user
    .update({
      isActive: false,
      deletedAt: new Date(),
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, staffId),
        fns.eq(fields.organizationId, currentUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .returning("id", "name", "email", "role", "isActive", "deletedAt")
    .build();

  const deactivatedUsers = await runtime.query(deactivatePlan);
  const deactivatedUser = deactivatedUsers[0];

  if (!deactivatedUser) {
    throw new Error("Staff member not found or already inactive.");
  }

  // 6. Record the action
  await createAuditLog({
    organizationId: currentUser.organizationId,
    userId: currentUser.userId,
    action: "STAFF_DEACTIVATED",
    source: "BUSINESS_API",
    status: "SUCCESS",
  });

  return deactivatedUser;
}
import { cache } from "react";
import { getCurrentUser } from "@business-platform/auth/session";
import { db, getDbRuntime } from "@business-platform/database";

export type CurrentWorkspace = {
  userName: string;
  organizationName: string;
  dataError?: string;
};

export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace | null> => {
  const session = await getCurrentUser();

  if (!session) {
    return null;
  }

  try {
    const runtime = await getDbRuntime();

    const userPlan = db.sql.public.user
      .select("id", "name", "organizationId")
      .where((fields, fns) => fns.eq(fields.id, session.userId))
      .build();

    const organizationPlan = db.sql.public.organization
      .select("id", "name")
      .where((fields, fns) => fns.eq(fields.id, session.organizationId))
      .build();

    const [users, organizations] = await Promise.all([
      runtime.query(userPlan),
      runtime.query(organizationPlan),
    ]);

    const user = users[0];
    const organization = organizations[0];

    if (!user || user.organizationId !== session.organizationId) {
      return null;
    }

    return {
      userName: user.name,
      organizationName: organization?.name ?? "Workspace",
      dataError: organization
        ? undefined
        : "Workspace details could not be loaded from the database.",
    };
  } catch (error) {
    console.error("Failed to load current workspace:", error);

    return {
      userName: "Account",
      organizationName: "Workspace",
      dataError: "Unable to load workspace details right now.",
    };
  }
});

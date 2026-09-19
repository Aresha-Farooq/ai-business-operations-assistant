import { getDbRuntime, db } from "@business-platform/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const runtime = await getDbRuntime();

  const plan = db.sql.public.organization
    .select("id", "name")
    .build();

  const organizations = await runtime.query(plan);

  return (
    <main>
      <h1>Organizations</h1>

      <pre>{JSON.stringify(organizations, null, 2)}</pre>
    </main>
  );
}
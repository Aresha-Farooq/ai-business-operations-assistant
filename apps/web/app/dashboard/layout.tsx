import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/login");
  }

  return <DashboardShell workspace={workspace}>{children}</DashboardShell>;
}

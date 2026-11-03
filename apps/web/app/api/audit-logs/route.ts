
import { NextResponse } from "next/server";
import { getAuditLogs } from "@business-platform/business";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const allowedStatuses = ["SUCCESS", "FAILURE", "DENIED"];

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid audit status." },
        { status: 400 }
      );
    }

    const logs = await getAuditLogs({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      status: status ? status as "SUCCESS" | "FAILURE" | "DENIED" : undefined,
      toolName: searchParams.get("toolName") ?? undefined,
      userId: searchParams.has("userId")
        ? Number(searchParams.get("userId"))
        : undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message === "Forbidden.") {
  return NextResponse.json(
    { error: "You do not have permission to view audit logs." },
    { status: 403 }
  );
}

    console.error("GET AUDIT LOGS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}

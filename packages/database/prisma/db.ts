import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./schema.d.ts";
import schemaJson from "./schema.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson: schemaJson,
  url: process.env["DATABASE_URL"]!,
});

let runtimePromise: ReturnType<typeof db.connect> | undefined;

export function getDbRuntime() {
  runtimePromise ??= db.connect();

  return runtimePromise;
}
import { postgresPool } from "./postgres.js";

async function main() {
  try {
    const result = await postgresPool.query(
      `SELECT
        id,
        name,
        "mimeType",
        "storagePath",
        status,
        "approvalStatus",
        "organizationId"
      FROM public.document
      WHERE id = $1`,
      [37],
    );

    console.dir(result.rows, { depth: null });
  } finally {
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("Document inspection failed:", error);
  process.exitCode = 1;
});
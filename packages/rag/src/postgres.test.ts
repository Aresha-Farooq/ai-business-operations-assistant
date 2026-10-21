
import { afterAll, it } from "vitest";
import {
  postgresPool,
  testPostgresConnection,
} from "./postgres.js";

it("connects to PostgreSQL", async () => {
  await testPostgresConnection();
});

afterAll(async () => {
  await postgresPool.end();
});

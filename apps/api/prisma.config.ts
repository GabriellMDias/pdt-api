import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();
config({ path: "../../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --transpile-only prisma/seed/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

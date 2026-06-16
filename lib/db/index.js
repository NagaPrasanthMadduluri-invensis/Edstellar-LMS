import { createClient } from "@libsql/client";
import { createSchema, seedIfEmpty, seedBankingCourse, seedExtraContent, seedLearners, seedDemoLearner } from "./schema.js";

const g = globalThis;

export async function getDb() {
  if (!g._lmsDb) {
    const client = createClient({
      url: process.env.TURSO_DB_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await createSchema(client);
    await seedIfEmpty(client);
    await seedBankingCourse(client);
    await seedExtraContent(client);
    await seedLearners(client);
    await seedDemoLearner(client);
    g._lmsDb = client;
  }
  return g._lmsDb;
}

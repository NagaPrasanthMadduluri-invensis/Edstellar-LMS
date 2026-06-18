import { createClient } from "@libsql/client";
import { createSchema, seedIfEmpty, seedBankingCourse, seedExtraContent, seedLearners, seedDemoLearner, seedProfileMigration, seedDraftCourse, seedSessions } from "./schema.js";

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
    await seedProfileMigration(client);
    await seedDraftCourse(client);
    await seedSessions(client);
    g._lmsDb = client;
  }
  return g._lmsDb;
}

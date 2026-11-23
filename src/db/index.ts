import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
  dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum dikonfigurasi. Salin .env.example menjadi .env dan atur koneksi PostgreSQL."
    );
  }
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 60,
    connect_timeout: 10,
  });
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!globalForDb.pgClient) {
    globalForDb.pgClient = createClient();
  }
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = drizzle(globalForDb.pgClient, { schema });
  }
  return globalForDb.dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    return Reflect.get(instance, prop, receiver);
  },
});

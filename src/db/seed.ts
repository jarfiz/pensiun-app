import { db } from "./index";
import { appSettings, units } from "./schema";

export const DEFAULT_UNITS = [
  {
    code: "BRIDA",
    name: "BRIDA",
    sheetAlias: "PNS BRIDA",
  },
  {
    code: "UPTB_KRS",
    name: "UPTB Kebun Raya Sriwijaya",
    sheetAlias: "UPTB KRS BRIDA",
  },
  {
    code: "UPTB_STP",
    name: "UPTB Science Techno Park",
    sheetAlias: "UPTB STP BRIDA",
  },
] as const;

const globalForSeed = globalThis as unknown as {
  seedPromise: Promise<void> | undefined;
};

export function resetSeedMemo(): void {
  globalForSeed.seedPromise = undefined;
}

export async function ensureDefaultSeed(): Promise<void> {
  if (!globalForSeed.seedPromise) {
    globalForSeed.seedPromise = Promise.all([
      db
        .insert(units)
        .values([...DEFAULT_UNITS])
        .onConflictDoNothing({ target: units.code }),
      db
        .insert(appSettings)
        .values({
          id: 1,
          institutionName: "BADAN RISET DAN INOVASI DAERAH",
          institutionSubname: "PROVINSI SUMATERA SELATAN",
          defaultBupAge: 60,
          tmtRule: "FIRST_OF_NEXT_MONTH",
          criticalMonths: 6,
          warningMonths: 12,
          upcomingMonths: 24,
        })
        .onConflictDoNothing({ target: appSettings.id }),
    ])
      .then(() => undefined)
      .catch((error) => {
        globalForSeed.seedPromise = undefined;
        throw error;
      });
  }

  return globalForSeed.seedPromise;
}

async function main() {
  if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Abaikan jika file .env tidak ada (mis. env sudah disuntikkan dari sistem)
    }
  }
  resetSeedMemo();
  await ensureDefaultSeed();
  console.log("Seed default units dan app_settings berhasil dijalankan.");
  process.exit(0);
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1]?.replace(/\\/g, "/").endsWith("src/db/seed.ts");

if (isDirectRun) {
  main().catch((error) => {
    console.error("Gagal menjalankan seed:", error);
    process.exit(1);
  });
}

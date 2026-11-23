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

export async function ensureDefaultSeed() {
  for (const unit of DEFAULT_UNITS) {
    await db
      .insert(units)
      .values(unit)
      .onConflictDoNothing({ target: units.code });
  }

  await db
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
    .onConflictDoNothing({ target: appSettings.id });
}

async function main() {
  if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Abaikan jika file .env tidak ada (mis. env sudah disuntikkan dari sistem)
    }
  }
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

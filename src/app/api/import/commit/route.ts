import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { employees, units } from "@/db/schema";
import { ensureDefaultSeed } from "@/db/seed";
import { getAppSettingsOrDefault } from "@/lib/employee-queries";
import { parseNip } from "@/lib/nip-parser";
import { calculateRetirementDate } from "@/lib/retirement";

const commitRowSchema = z.object({
  nip: z.string(),
  fullName: z.string().trim().min(1),
  rankGrade: z.string().trim().default("-"),
  positionName: z.string().trim().default("-"),
  employmentStatus: z.enum(["PNS", "PPPK_FULL", "PPPK_PART"]),
  unitCode: z.enum(["BRIDA", "UPTB_KRS", "UPTB_STP"]),
  bupAge: z.number().int().min(50).max(75).optional(),
});

const commitPayloadSchema = z.object({
  mode: z.enum(["skip", "update"]),
  rows: z.array(commitRowSchema).min(1, "Tidak ada baris pegawai untuk diimpor."),
});

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi (DATABASE_URL kosong)." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = commitPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Payload impor tidak valid.",
        },
        { status: 400 }
      );
    }

    await ensureDefaultSeed();
    const [settings, unitRows] = await Promise.all([
      getAppSettingsOrDefault(),
      db.select().from(units),
    ]);

    const unitMap = new Map<string, number>(
      unitRows.map((u) => [u.code, u.id])
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
      for (const row of parsed.data.rows) {
        const nipResult = parseNip(row.nip);
        if (!nipResult.valid) {
          skipped += 1;
          continue;
        }

        const unitId = unitMap.get(row.unitCode);
        if (!unitId) {
          skipped += 1;
          continue;
        }

        const bupAge = row.bupAge ?? settings.defaultBupAge;
        const retirementDate = calculateRetirementDate(
          nipResult.data.birthDate,
          bupAge,
          settings.tmtRule
        );

        const [existing] = await tx
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.nip, nipResult.data.nip))
          .limit(1);

        if (existing) {
          if (parsed.data.mode === "skip") {
            skipped += 1;
            continue;
          }
          await tx
            .update(employees)
            .set({
              fullName: row.fullName,
              birthDate: nipResult.data.birthDate,
              gender: nipResult.data.gender,
              rankGrade: row.rankGrade || "-",
              positionName: row.positionName || "-",
              employmentStatus: row.employmentStatus,
              unitId,
              retirementDate,
              updatedAt: new Date(),
            })
            .where(eq(employees.id, existing.id));
          updated += 1;
        } else {
          await tx.insert(employees).values({
            nip: nipResult.data.nip,
            fullName: row.fullName,
            birthDate: nipResult.data.birthDate,
            gender: nipResult.data.gender,
            rankGrade: row.rankGrade || "-",
            positionName: row.positionName || "-",
            employmentStatus: row.employmentStatus,
            unitId,
            bupAge,
            retirementDate,
            isActive: true,
            processStatus: "BELUM",
          });
          inserted += 1;
        }
      }
    });

    return NextResponse.json({
      inserted,
      updated,
      skipped,
      totalProcessed: parsed.data.rows.length,
    });
  } catch (error) {
    console.error("POST /api/import/commit error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data impor ke database." },
      { status: 500 }
    );
  }
}

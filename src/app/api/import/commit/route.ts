import { NextRequest, NextResponse } from "next/server";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { employees, units, type NewEmployee } from "@/db/schema";
import { ensureDefaultSeed } from "@/db/seed";
import {
  getAppSettingsOrDefault,
  invalidateEmployeeCache,
} from "@/lib/employee-queries";
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

const CHUNK_SIZE = 100;

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

    let skipped = 0;
    const dedupedByNip = new Map<string, NewEmployee>();

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

      const cleanNip = nipResult.data.nip;
      if (dedupedByNip.has(cleanNip)) {
        if (parsed.data.mode === "skip") {
          skipped += 1;
          continue;
        }
        // Di mode update, baris terbaru dengan NIP sama menggantikan yang sebelumnya
        skipped += 1;
      }

      dedupedByNip.set(cleanNip, {
        nip: cleanNip,
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
    }

    const preparedRows = Array.from(dedupedByNip.values());
    let inserted = 0;
    let updated = 0;

    if (preparedRows.length > 0) {
      const validNips = preparedRows.map((r) => r.nip);

      await db.transaction(async (tx) => {
        const existingRows = await tx
          .select({ nip: employees.nip })
          .from(employees)
          .where(inArray(employees.nip, validNips));

        const existingSet = new Set(existingRows.map((r) => r.nip));
        const toInsert: NewEmployee[] = [];
        const toUpdate: NewEmployee[] = [];

        for (const item of preparedRows) {
          if (existingSet.has(item.nip)) {
            if (parsed.data.mode === "skip") {
              skipped += 1;
            } else {
              toUpdate.push(item);
            }
          } else {
            toInsert.push(item);
          }
        }

        for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
          const chunk = toInsert.slice(i, i + CHUNK_SIZE);
          await tx
            .insert(employees)
            .values(chunk)
            .onConflictDoNothing({ target: employees.nip });
          inserted += chunk.length;
        }

        if (parsed.data.mode === "update" && toUpdate.length > 0) {
          for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
            const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
            await tx
              .insert(employees)
              .values(chunk)
              .onConflictDoUpdate({
                target: employees.nip,
                set: {
                  fullName: sql`excluded.full_name`,
                  birthDate: sql`excluded.birth_date`,
                  gender: sql`excluded.gender`,
                  rankGrade: sql`excluded.rank_grade`,
                  positionName: sql`excluded.position_name`,
                  employmentStatus: sql`excluded.employment_status`,
                  unitId: sql`excluded.unit_id`,
                  retirementDate: sql`excluded.retirement_date`,
                  updatedAt: new Date(),
                },
              });
            updated += chunk.length;
          }
        }
      });

      invalidateEmployeeCache();
    }

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

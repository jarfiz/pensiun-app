import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { appSettings, employees } from "@/db/schema";
import { getAppSettingsOrDefault } from "@/lib/employee-queries";
import { calculateRetirementDate } from "@/lib/retirement";

const updateSettingsSchema = z.object({
  institutionName: z.string().trim().min(2).max(200),
  institutionSubname: z.string().trim().min(2).max(200),
  defaultBupAge: z.coerce.number().int().min(50).max(75),
  tmtRule: z.enum(["FIRST_OF_NEXT_MONTH", "EXACT_BIRTHDAY"]),
  criticalMonths: z.coerce.number().int().min(1).max(24),
  warningMonths: z.coerce.number().int().min(2).max(36),
  upcomingMonths: z.coerce.number().int().min(6).max(60),
  recalculateExistingBup: z.boolean().optional(),
});

export async function GET() {
  try {
    const settings = await getAppSettingsOrDefault();
    return NextResponse.json({
      settings,
      dbConfigured: isDatabaseConfigured(),
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pengaturan aplikasi." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi (DATABASE_URL kosong)." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Data pengaturan tidak valid.",
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const prevSettings = await getAppSettingsOrDefault();

    const [updated] = await db
      .update(appSettings)
      .set({
        institutionName: input.institutionName,
        institutionSubname: input.institutionSubname,
        defaultBupAge: input.defaultBupAge,
        tmtRule: input.tmtRule,
        criticalMonths: input.criticalMonths,
        warningMonths: input.warningMonths,
        upcomingMonths: input.upcomingMonths,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, 1))
      .returning();

    let recalculatedCount = 0;

    // Recalculate retirement_date massal jika aturan TMT berubah atau diminta update BUP default
    const shouldRecalculate =
      prevSettings.tmtRule !== input.tmtRule ||
      (input.recalculateExistingBup &&
        prevSettings.defaultBupAge !== input.defaultBupAge);

    if (shouldRecalculate) {
      const allEmployees = await db
        .select({
          id: employees.id,
          birthDate: employees.birthDate,
          bupAge: employees.bupAge,
        })
        .from(employees);

      await db.transaction(async (tx) => {
        for (const emp of allEmployees) {
          const nextBup =
            input.recalculateExistingBup &&
            emp.bupAge === prevSettings.defaultBupAge
              ? input.defaultBupAge
              : emp.bupAge;

          const nextRetirementDate = calculateRetirementDate(
            emp.birthDate,
            nextBup,
            input.tmtRule
          );

          await tx
            .update(employees)
            .set({
              bupAge: nextBup,
              retirementDate: nextRetirementDate,
              updatedAt: new Date(),
            })
            .where(eq(employees.id, emp.id));
          recalculatedCount += 1;
        }
      });
    }

    return NextResponse.json({
      settings: updated,
      recalculatedCount,
    });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan aplikasi." },
      { status: 500 }
    );
  }
}

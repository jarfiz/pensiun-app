import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { employees } from "@/db/schema";
import {
  getAppSettingsOrDefault,
  queryEmployees,
  type EmployeeSortBy,
  type UrgencyFilter,
} from "@/lib/employee-queries";
import { parseNip } from "@/lib/nip-parser";
import { calculateRetirementDate } from "@/lib/retirement";

const createEmployeeSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi."),
  fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(180),
  rankGrade: z.string().trim().min(1, "Pangkat/Golongan wajib diisi.").max(32),
  positionName: z.string().trim().min(2, "Nama jabatan wajib diisi.").max(200),
  employmentStatus: z.enum(["PNS", "PPPK_FULL", "PPPK_PART"]),
  unitId: z.coerce.number().int().positive("Unit kerja wajib dipilih."),
  bupAge: z.coerce.number().int().min(50).max(75).optional(),
  processStatus: z
    .enum(["BELUM", "BERKAS", "DIAJUKAN", "SELESAI"])
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q") ?? undefined;
    const unitIdParam = sp.get("unitId");
    const unitId =
      unitIdParam && unitIdParam !== "all" ? Number(unitIdParam) : null;
    const statusParam = sp.get("status") ?? "all";
    const urgencyParam = (sp.get("urgency") ?? "all") as UrgencyFilter;
    const tmtYearParam = sp.get("tmtYear");
    const tmtYear =
      tmtYearParam && tmtYearParam !== "all" ? Number(tmtYearParam) : null;
    const processStatusParam = sp.get("processStatus") ?? "all";
    const isActiveParam = sp.get("isActive");
    const isActive =
      isActiveParam === "all"
        ? "all"
        : isActiveParam === "false"
          ? false
          : true;
    const sortBy = (sp.get("sortBy") ?? "retirementDate") as EmployeeSortBy;
    const sortDir = sp.get("sortDir") === "desc" ? "desc" : "asc";
    const page = Number(sp.get("page") ?? "1") || 1;
    const pageSize = Number(sp.get("pageSize") ?? "25") || 25;

    const result = await queryEmployees({
      q,
      unitId: Number.isFinite(unitId) ? unitId : null,
      status: statusParam as "PNS" | "PPPK_FULL" | "PPPK_PART" | "all",
      urgency: urgencyParam,
      tmtYear: Number.isFinite(tmtYear) ? tmtYear : null,
      processStatus: processStatusParam as
        | "BELUM"
        | "BERKAS"
        | "DIAJUKAN"
        | "SELESAI"
        | "all",
      isActive,
      sortBy,
      sortDir,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data pegawai." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi (DATABASE_URL kosong)." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsedBody = createEmployeeSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            parsedBody.error.issues[0]?.message ?? "Data pegawai tidak valid.",
          issues: parsedBody.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsedBody.data;
    const nipResult = parseNip(input.nip);
    if (!nipResult.valid) {
      return NextResponse.json({ error: nipResult.error }, { status: 400 });
    }

    const existing = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.nip, nipResult.data.nip))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: `NIP ${nipResult.data.formatted} sudah terdaftar di database.`,
        },
        { status: 409 }
      );
    }

    const settings = await getAppSettingsOrDefault();
    const bupAge = input.bupAge ?? settings.defaultBupAge;
    const retirementDate = calculateRetirementDate(
      nipResult.data.birthDate,
      bupAge,
      settings.tmtRule
    );

    const [created] = await db
      .insert(employees)
      .values({
        nip: nipResult.data.nip,
        fullName: input.fullName,
        birthDate: nipResult.data.birthDate,
        gender: nipResult.data.gender,
        rankGrade: input.rankGrade,
        positionName: input.positionName,
        employmentStatus: input.employmentStatus,
        unitId: input.unitId,
        bupAge,
        retirementDate,
        processStatus: input.processStatus ?? "BELUM",
        notes: input.notes ?? null,
      })
      .returning();

    return NextResponse.json({ employee: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data pegawai baru." },
      { status: 500 }
    );
  }
}

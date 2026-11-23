import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { employees } from "@/db/schema";
import {
  getAppSettingsOrDefault,
  invalidateEmployeeCache,
} from "@/lib/employee-queries";
import { parseNip } from "@/lib/nip-parser";
import { calculateRetirementDate } from "@/lib/retirement";

const updateEmployeeSchema = z.object({
  nip: z.string().optional(),
  fullName: z.string().trim().min(2).max(180).optional(),
  rankGrade: z.string().trim().min(1).max(32).optional(),
  positionName: z.string().trim().min(2).max(200).optional(),
  employmentStatus: z.enum(["PNS", "PPPK_FULL", "PPPK_PART"]).optional(),
  unitId: z.coerce.number().int().positive().optional(),
  bupAge: z.coerce.number().int().min(50).max(75).optional(),
  isActive: z.boolean().optional(),
  processStatus: z
    .enum(["BELUM", "BERKAS", "DIAJUKAN", "SELESAI"])
    .optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const employeeId = Number(id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: "ID pegawai tidak valid." }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Data pegawai tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({ employee: row });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi." },
      { status: 503 }
    );
  }

  try {
    const { id } = await context.params;
    const employeeId = Number(id);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        { error: "ID pegawai tidak valid." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Data pegawai tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsedBody = updateEmployeeSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            parsedBody.error.issues[0]?.message ?? "Data pembaruan tidak valid.",
          issues: parsedBody.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsedBody.data;
    let nextNip = existing.nip;
    let nextBirthDate = existing.birthDate;
    let nextGender = existing.gender;

    if (input.nip !== undefined) {
      const nipResult = parseNip(input.nip);
      if (!nipResult.valid) {
        return NextResponse.json({ error: nipResult.error }, { status: 400 });
      }
      const duplicate = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.nip, nipResult.data.nip),
            ne(employees.id, employeeId)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: `NIP ${nipResult.data.formatted} sudah digunakan pegawai lain.` },
          { status: 409 }
        );
      }

      nextNip = nipResult.data.nip;
      nextBirthDate = nipResult.data.birthDate;
      nextGender = nipResult.data.gender;
    }

    const nextBupAge = input.bupAge ?? existing.bupAge;
    let nextRetirementDate = existing.retirementDate;

    if (input.nip !== undefined || input.bupAge !== undefined) {
      const settings = await getAppSettingsOrDefault();
      nextRetirementDate = calculateRetirementDate(
        nextBirthDate,
        nextBupAge,
        settings.tmtRule
      );
    }

    const [updated] = await db
      .update(employees)
      .set({
        nip: nextNip,
        birthDate: nextBirthDate,
        gender: nextGender,
        fullName: input.fullName ?? existing.fullName,
        rankGrade: input.rankGrade ?? existing.rankGrade,
        positionName: input.positionName ?? existing.positionName,
        employmentStatus: input.employmentStatus ?? existing.employmentStatus,
        unitId: input.unitId ?? existing.unitId,
        bupAge: nextBupAge,
        retirementDate: nextRetirementDate,
        isActive: input.isActive ?? existing.isActive,
        processStatus: input.processStatus ?? existing.processStatus,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId))
      .returning();

    invalidateEmployeeCache();

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error("PATCH /api/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data pegawai." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database PostgreSQL belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const employeeId = Number(id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: "ID pegawai tidak valid." }, { status: 400 });
  }

  const [deleted] = await db
    .delete(employees)
    .where(eq(employees.id, employeeId))
    .returning({ id: employees.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Data pegawai tidak ditemukan." },
      { status: 404 }
    );
  }

  invalidateEmployeeCache();

  return NextResponse.json({ deletedId: deleted.id });
}

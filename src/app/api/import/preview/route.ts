import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { employees } from "@/db/schema";
import { getAppSettingsOrDefault } from "@/lib/employee-queries";
import { parseBridaExcel } from "@/lib/excel-importer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File Excel (.xlsx / .xls) wajib diunggah." },
        { status: 400 }
      );
    }

    const normalizePositionTitle =
      formData.get("normalizePositionTitle") !== "false";

    const arrayBuffer = await file.arrayBuffer();
    const settings = await getAppSettingsOrDefault();

    const parsed = parseBridaExcel(arrayBuffer, {
      normalizePositionTitle,
      defaultBupAge: settings.defaultBupAge,
      tmtRule: settings.tmtRule,
    });

    const existingNipSet = new Set<string>();
    if (isDatabaseConfigured() && parsed.rows.length > 0) {
      const nips = Array.from(new Set(parsed.rows.map((r) => r.nip)));
      const existingRows = await db
        .select({ nip: employees.nip })
        .from(employees)
        .where(inArray(employees.nip, nips));

      for (const row of existingRows) {
        existingNipSet.add(row.nip);
      }
    }

    const rowsWithStatus = parsed.rows.map((row) => ({
      ...row,
      isDuplicate: existingNipSet.has(row.nip),
    }));

    const duplicateCount = rowsWithStatus.filter((r) => r.isDuplicate).length;
    const newCount = rowsWithStatus.length - duplicateCount;

    return NextResponse.json({
      fileName: file.name,
      sheetsProcessed: parsed.sheetsProcessed,
      rows: rowsWithStatus,
      errors: parsed.errors,
      summary: {
        ...parsed.summary,
        newCount,
        duplicateCount,
      },
    });
  } catch (error) {
    console.error("POST /api/import/preview error:", error);
    return NextResponse.json(
      { error: "Gagal membaca file Excel. Pastikan format file valid (.xlsx/.xls)." },
      { status: 500 }
    );
  }
}

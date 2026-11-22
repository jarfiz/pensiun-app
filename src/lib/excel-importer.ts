import * as XLSX from "xlsx";
import type { EmploymentStatus, Gender, TmtRule } from "@/db/schema";
import { toTitleCasePosition } from "./formatters";
import { parseNip } from "./nip-parser";
import { calculateRetirementDate, DEFAULT_BUP_AGE } from "./retirement";

export type UnitCode = "BRIDA" | "UPTB_KRS" | "UPTB_STP";

export interface ImportedEmployeeRow {
  sheetName: string;
  rowNumber: number;
  unitCode: UnitCode;
  employmentStatus: EmploymentStatus;
  nip: string;
  formattedNip: string;
  fullName: string;
  rankGrade: string;
  positionName: string;
  birthDate: string;
  gender: Gender;
  bupAge: number;
  retirementDate: string;
}

export interface ImportRowError {
  sheetName: string;
  rowNumber: number;
  fullName: string;
  rawNip: string;
  error: string;
}

export interface ExcelImportParseResult {
  rows: ImportedEmployeeRow[];
  errors: ImportRowError[];
  sheetsProcessed: string[];
  summary: {
    totalValid: number;
    totalErrors: number;
    byUnit: Record<UnitCode, number>;
    byStatus: Record<EmploymentStatus, number>;
  };
}

export interface ParseBridaExcelOptions {
  normalizePositionTitle?: boolean;
  defaultBupAge?: number;
  tmtRule?: TmtRule;
}

export function mapSheetNameToUnitCode(sheetName: string): UnitCode {
  const upper = sheetName.trim().toUpperCase();
  if (upper.includes("KRS")) return "UPTB_KRS";
  if (upper.includes("STP")) return "UPTB_STP";
  return "BRIDA";
}

function detectStatusBlock(rowTextUpper: string): EmploymentStatus | null {
  if (
    rowTextUpper.includes("PARUH") ||
    rowTextUpper.includes("PRUH") // tangani typo 'P3K PRUH WAKTU KRS'
  ) {
    return "PPPK_PART";
  }
  if (
    (rowTextUpper.includes("P3K") || rowTextUpper.includes("PPPK")) &&
    rowTextUpper.includes("PENUH")
  ) {
    return "PPPK_FULL";
  }
  if (
    rowTextUpper.includes("PNS") &&
    !rowTextUpper.includes("TOTAL") &&
    !rowTextUpper.includes("JUMLAH")
  ) {
    return "PNS";
  }
  return null;
}

function isPositiveIntegerCell(cell: unknown): boolean {
  if (typeof cell === "number") {
    return Number.isInteger(cell) && cell > 0;
  }
  if (typeof cell === "string") {
    const trimmed = cell.trim();
    return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
  }
  return false;
}

/**
 * Mem-parse file Excel multi-sheet format BRIDA/UPTB.
 * - Mengabaikan spasi berlebih pada nama sheet (mis. 'PNS BRIDA ').
 * - Mendeteksi blok vertikal PNS, PPPK Penuh Waktu, dan PPPK Paruh Waktu (termasuk typo 'P3K PRUH WAKTU').
 * - Hanya membaca kolom A..E (index 0..4), mengabaikan kolom F ke kanan.
 * - Membersihkan non-breaking space (\xa0) pada NIP dan memvalidasi 18 digit.
 */
export function parseBridaExcel(
  data: ArrayBuffer | Uint8Array,
  options: ParseBridaExcelOptions = {}
): ExcelImportParseResult {
  const normalizePositionTitle = options.normalizePositionTitle ?? true;
  const defaultBupAge = options.defaultBupAge ?? DEFAULT_BUP_AGE;
  const tmtRule = options.tmtRule ?? "FIRST_OF_NEXT_MONTH";

  const workbook = XLSX.read(data, { type: "array" });

  const rows: ImportedEmployeeRow[] = [];
  const errors: ImportRowError[] = [];
  const sheetsProcessed: string[] = [];

  const byUnit: Record<UnitCode, number> = {
    BRIDA: 0,
    UPTB_KRS: 0,
    UPTB_STP: 0,
  };
  const byStatus: Record<EmploymentStatus, number> = {
    PNS: 0,
    PPPK_FULL: 0,
    PPPK_PART: 0,
  };

  for (const rawSheetName of workbook.SheetNames) {
    const sheetName = rawSheetName.trim();
    const sheet = workbook.Sheets[rawSheetName];
    if (!sheet) continue;

    sheetsProcessed.push(sheetName);
    const unitCode = mapSheetNameToUnitCode(sheetName);
    let currentStatus: EmploymentStatus = "PNS";

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i] ?? [];
      // Hanya ambil kolom A-E (index 0..4), abaikan kolom F ke kanan
      const colA = row[0];
      const colB = String(row[1] ?? "").trim();
      const colC = String(row[2] ?? "").trim();
      const colD = String(row[3] ?? "").trim();
      const colE = String(row[4] ?? "").trim();

      if (!isPositiveIntegerCell(colA)) {
        const joinedUpper = [colA, colB, colC, colD, colE]
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .join(" ")
          .toUpperCase();

        if (joinedUpper) {
          const detected = detectStatusBlock(joinedUpper);
          if (detected) {
            currentStatus = detected;
          }
        }
        continue;
      }

      // Lewati baris jika nama dan NIP keduanya kosong
      if (!colB && !colD) {
        continue;
      }

      const parsedNip = parseNip(colD);
      if (!parsedNip.valid) {
        errors.push({
          sheetName,
          rowNumber: i + 1,
          fullName: colB || "(Tanpa Nama)",
          rawNip: colD,
          error: parsedNip.error,
        });
        continue;
      }

      const positionName = normalizePositionTitle
        ? toTitleCasePosition(colE)
        : colE.replace(/\s+/g, " ").trim();

      const retirementDate = calculateRetirementDate(
        parsedNip.data.birthDate,
        defaultBupAge,
        tmtRule
      );

      rows.push({
        sheetName,
        rowNumber: i + 1,
        unitCode,
        employmentStatus: currentStatus,
        nip: parsedNip.data.nip,
        formattedNip: parsedNip.data.formatted,
        fullName: colB.replace(/\s+/g, " ").trim(),
        rankGrade: colC || "-",
        positionName: positionName || "-",
        birthDate: parsedNip.data.birthDate,
        gender: parsedNip.data.gender,
        bupAge: defaultBupAge,
        retirementDate,
      });

      byUnit[unitCode] += 1;
      byStatus[currentStatus] += 1;
    }
  }

  return {
    rows,
    errors,
    sheetsProcessed,
    summary: {
      totalValid: rows.length,
      totalErrors: errors.length,
      byUnit,
      byStatus,
    },
  };
}

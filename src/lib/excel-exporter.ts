import * as XLSX from "xlsx";
import type { EnrichedEmployee } from "./employee-queries";
import {
  EMPLOYMENT_STATUS_LABELS,
  formatIndonesianDate,
  PROCESS_STATUS_LABELS,
  URGENCY_META,
} from "./formatters";

export interface ExportWorkbookOptions {
  institutionName?: string;
  institutionSubname?: string;
  title?: string;
}

/**
 * Menghasilkan buffer file .xlsx formal berisi daftar monitoring pensiun sesuai filter aktif.
 */
export function buildRetirementExcelBuffer(
  employees: EnrichedEmployee[],
  options: ExportWorkbookOptions = {}
): Buffer {
  const institutionName =
    options.institutionName ?? "BADAN RISET DAN INOVASI DAERAH";
  const institutionSubname =
    options.institutionSubname ?? "PROVINSI SUMATERA SELATAN";
  const title =
    options.title ?? "DAFTAR MONITORING PENSIUN PEGAWAI (SIM-PENSIUN BRIDA)";

  const printedAt = formatIndonesianDate(
    new Date().toISOString().slice(0, 10)
  );

  const headerRows: (string | number)[][] = [
    [institutionName],
    [institutionSubname],
    [title],
    [`Tanggal Cetak: ${printedAt} | Total Data: ${employees.length} pegawai`],
    [],
    [
      "No",
      "NIP",
      "Nama Lengkap",
      "Jabatan",
      "Pangkat/Gol",
      "Unit Kerja",
      "Status Pegawai",
      "Tanggal Lahir",
      "Usia Saat Ini",
      "BUP (Thn)",
      "TMT Pensiun",
      "Sisa Masa Kerja",
      "Kategori Urgensi",
      "Status Berkas",
      "Catatan",
    ],
  ];

  const dataRows = employees.map((emp, idx) => [
    idx + 1,
    emp.formattedNip,
    emp.fullName,
    emp.positionName,
    emp.rankGrade,
    emp.unitName,
    EMPLOYMENT_STATUS_LABELS[emp.employmentStatus],
    formatIndonesianDate(emp.birthDate, true),
    emp.metrics.age.label,
    emp.bupAge,
    formatIndonesianDate(emp.retirementDate, true),
    emp.metrics.remaining.label,
    URGENCY_META[emp.metrics.urgency].label,
    PROCESS_STATUS_LABELS[emp.processStatus],
    emp.notes ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 30 },
    { wch: 34 },
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 15 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monitoring Pensiun");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

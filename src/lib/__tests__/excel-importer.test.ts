import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseBridaExcel } from "@/lib/excel-importer";

function buildMockBridaWorkbook(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 'PNS BRIDA ' (dengan trailing space!) + 3 blok vertikal + kolom F-H rekap
  const bridaRows = [
    ["PNS BRIDA", "", "", "", "", "", "REKAP", "TOTAL"],
    ["NO", "NAMA", "PANGKAT/GOL.RUANG", "NIP", "NAMA JABATAN", "", "Total PNS", 1],
    [
      1,
      "Dr. Budi Santoso, M.Si",
      "IV/b",
      "19670629\u00A0199503\u00A01\u00A0001",
      "PENELITI AHLI MADYA",
      "",
      "Total P3K",
      2,
    ],
    [],
    ["P3K PENUH WAKTUSEKRETARIAT DAN UMPEG BRIDA"],
    ["NO", "NAMA", "PANGKAT/GOL.RUANG", "NIP", "NAMA JABATAN"],
    [
      1,
      "Siti Aminah, S.Kom",
      "IX",
      "19900512 202203 2 004",
      "OPERATOR LAYANAN OPERASIONAL",
    ],
    [],
    ["P3K PARUH WAKTU BRIDA"],
    ["NO", "NAMA", "PANGKAT/GOL.RUANG", "NIP", "NAMA JABATAN"],
    [
      1,
      "Ahmad Fauzi",
      "-",
      "198512042024211002",
      "PENGADMINISTRASI PERKANTORAN",
    ],
    [
      2,
      "Baris Invalid",
      "-",
      "12345",
      "STAF",
    ],
  ];
  const wsBrida = XLSX.utils.aoa_to_sheet(bridaRows);
  XLSX.utils.book_append_sheet(wb, wsBrida, "PNS BRIDA ");

  // Sheet 2: 'UPTB KRS BRIDA' dengan typo 'P3K PRUH WAKTU KRS'
  const krsRows = [
    ["PNS UPTB KRS BRIDA"],
    ["NO", "NAMA", "PANGKAT/GOL.RUANG", "NIP", "NAMA JABATAN"],
    [1, "Rina Wijaya", "III/c", "197803102006042005", "KEPALA SUBBAGIAN TU"],
    [],
    ["P3K PRUH WAKTU KRS"],
    ["NO", "NAMA", "PANGKAT/GOL.RUANG", "NIP", "NAMA JABATAN"],
    [1, "Dedi Kurniawan", "-", "199208152025211009", "TEKNISI KEBUN RAYA"],
  ];
  const wsKrs = XLSX.utils.aoa_to_sheet(krsRows);
  XLSX.utils.book_append_sheet(wb, wsKrs, "UPTB KRS BRIDA");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buffer);
}

describe("excel-importer", () => {
  it("mem-parse multi-sheet BRIDA dengan trailing space, blok vertikal, typo PRUH, \\xa0 NIP, dan mengabaikan kolom F+", () => {
    const data = buildMockBridaWorkbook();
    const result = parseBridaExcel(data, { normalizePositionTitle: true });

    expect(result.sheetsProcessed).toEqual(["PNS BRIDA", "UPTB KRS BRIDA"]);
    expect(result.summary.totalValid).toBe(5);
    expect(result.summary.totalErrors).toBe(1);

    expect(result.summary.byUnit).toEqual({
      BRIDA: 3,
      UPTB_KRS: 2,
      UPTB_STP: 0,
    });
    expect(result.summary.byStatus).toEqual({
      PNS: 2,
      PPPK_FULL: 1,
      PPPK_PART: 2,
    });

    // Cek normalisasi NIP \xa0 dan Title Case jabatan
    const first = result.rows[0];
    expect(first.nip).toBe("196706291995031001");
    expect(first.unitCode).toBe("BRIDA");
    expect(first.employmentStatus).toBe("PNS");
    expect(first.positionName).toBe("Peneliti Ahli Madya");
    expect(first.retirementDate).toBe("2027-07-01");

    // Cek blok P3K PENUH WAKTUSEKRETARIAT...
    const second = result.rows[1];
    expect(second.employmentStatus).toBe("PPPK_FULL");
    expect(second.positionName).toBe("Operator Layanan Operasional");

    // Cek typo 'P3K PRUH WAKTU KRS' -> PPPK_PART & singkatan TU tetap uppercase
    const krsPns = result.rows[3];
    expect(krsPns.unitCode).toBe("UPTB_KRS");
    expect(krsPns.positionName).toBe("Kepala Subbagian TU");

    const krsPart = result.rows[4];
    expect(krsPart.unitCode).toBe("UPTB_KRS");
    expect(krsPart.employmentStatus).toBe("PPPK_PART");

    // Cek error tercatat dengan benar
    expect(result.errors[0].fullName).toBe("Baris Invalid");
    expect(result.errors[0].sheetName).toBe("PNS BRIDA");
  });
});

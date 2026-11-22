export type NipGender = "L" | "P";

export interface ParsedNip {
  nip: string;
  formatted: string;
  birthDate: string; // YYYY-MM-DD
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  appointmentYm: string; // YYYY-MM
  gender: NipGender;
  sequence: string;
}

export type NipParseResult =
  | { valid: true; data: ParsedNip }
  | { valid: false; error: string; sanitized: string };

/**
 * Menghapus seluruh karakter non-digit dari NIP, termasuk spasi dan non-breaking space (\u00A0).
 */
export function sanitizeNip(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Memvalidasi tanggal kalender yang sah (termasuk tahun kabisat).
 */
export function isValidCalendarDate(
  year: number,
  month: number,
  day: number
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Mem-parse dan memvalidasi NIP ASN/PPPK 18 digit.
 * Format: YYYYMMDD (lahir) + YYYYMM (pengangkatan) + G (1=L, 2=P) + NNN (urut).
 */
export function parseNip(raw: string): NipParseResult {
  const sanitized = sanitizeNip(raw);

  if (sanitized.length !== 18) {
    return {
      valid: false,
      error: `NIP harus terdiri dari tepat 18 digit angka (ditemukan ${sanitized.length} digit).`,
      sanitized,
    };
  }

  const birthYearStr = sanitized.slice(0, 4);
  const birthMonthStr = sanitized.slice(4, 6);
  const birthDayStr = sanitized.slice(6, 8);
  const birthYear = Number(birthYearStr);
  const birthMonth = Number(birthMonthStr);
  const birthDay = Number(birthDayStr);

  if (!isValidCalendarDate(birthYear, birthMonth, birthDay)) {
    return {
      valid: false,
      error: `Tanggal lahir pada 8 digit pertama NIP (${birthYearStr}-${birthMonthStr}-${birthDayStr}) tidak valid.`,
      sanitized,
    };
  }

  const appYearStr = sanitized.slice(8, 12);
  const appMonthStr = sanitized.slice(12, 14);
  const appYear = Number(appYearStr);
  const appMonth = Number(appMonthStr);

  if (appYear < 1950 || appYear > 2100 || appMonth < 1 || appMonth > 12) {
    return {
      valid: false,
      error: `Tahun/bulan pengangkatan pada digit 9–14 NIP (${appYearStr}-${appMonthStr}) tidak valid.`,
      sanitized,
    };
  }

  const genderDigit = sanitized.slice(14, 15);
  if (genderDigit !== "1" && genderDigit !== "2") {
    return {
      valid: false,
      error: `Kode jenis kelamin pada digit ke-15 NIP harus 1 (Laki-laki) atau 2 (Perempuan).`,
      sanitized,
    };
  }

  const sequence = sanitized.slice(15, 18);

  return {
    valid: true,
    data: {
      nip: sanitized,
      formatted: formatNip(sanitized),
      birthDate: `${birthYearStr}-${birthMonthStr}-${birthDayStr}`,
      birthYear,
      birthMonth,
      birthDay,
      appointmentYm: `${appYearStr}-${appMonthStr}`,
      gender: genderDigit === "1" ? "L" : "P",
      sequence,
    },
  };
}

/**
 * Memformat NIP 18 digit menjadi format spasi standar BKN: YYYYMMDD YYYYMM G NNN.
 */
export function formatNip(raw: string): string {
  const sanitized = sanitizeNip(raw);
  if (sanitized.length !== 18) {
    return String(raw ?? "").trim();
  }
  return `${sanitized.slice(0, 8)} ${sanitized.slice(8, 14)} ${sanitized.slice(14, 15)} ${sanitized.slice(15, 18)}`;
}

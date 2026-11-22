import type { TmtRule } from "@/db/schema";

export const DEFAULT_BUP_AGE = 60;

export type UrgencyLevel =
  | "OVERDUE"
  | "CRITICAL"
  | "WARNING"
  | "UPCOMING"
  | "SAFE";

export interface UrgencyThresholds {
  criticalMonths?: number;
  warningMonths?: number;
  upcomingMonths?: number;
}

export interface CalendarDiff {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface RetirementMetrics {
  retirementDate: string; // YYYY-MM-DD
  age: {
    years: number;
    months: number;
    days: number;
    label: string;
  };
  remaining: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
    totalMonths: number;
    label: string;
  };
  urgency: UrgencyLevel;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseIsoDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Format tanggal harus YYYY-MM-DD, diterima: "${dateStr}"`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Menghitung tanggal TMT Pensiun berdasarkan tanggal lahir, usia BUP, dan aturan TMT.
 * - FIRST_OF_NEXT_MONTH (Default BKN): Tanggal 1 bulan berikutnya setelah genap usia BUP.
 *   Contoh: lahir 1967-12-04, BUP 60 -> 2028-01-01.
 * - EXACT_BIRTHDAY: Tepat pada ulang tahun ke-BUP (29 Feb di tahun non-kabisat -> 28 Feb).
 */
export function calculateRetirementDate(
  birthDateStr: string,
  bupAge: number = DEFAULT_BUP_AGE,
  rule: TmtRule = "FIRST_OF_NEXT_MONTH"
): string {
  const { year, month, day } = parseIsoDateParts(birthDateStr);
  const targetYear = year + bupAge;

  if (rule === "FIRST_OF_NEXT_MONTH") {
    if (month === 12) {
      return `${targetYear + 1}-01-01`;
    }
    return `${targetYear}-${pad2(month + 1)}-01`;
  }

  // EXACT_BIRTHDAY
  let targetDay = day;
  if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
    targetDay = 28;
  }
  return `${targetYear}-${pad2(month)}-${pad2(targetDay)}`;
}

/**
 * Menghitung selisih kalender (tahun, bulan, hari) dari startStr ke endStr (diasumsikan start <= end).
 */
export function diffCalendarDates(startStr: string, endStr: string): CalendarDiff {
  const start = parseIsoDateParts(startStr);
  const end = parseIsoDateParts(endStr);

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const totalDays = Math.round((endUtc - startUtc) / 86_400_000);

  if (totalDays < 0) {
    return { years: 0, months: 0, days: 0, totalDays };
  }

  let years = end.year - start.year;
  let months = end.month - start.month;
  let days = end.day - start.day;

  if (days < 0) {
    months -= 1;
    // Jumlah hari di bulan sebelum `end.month` pada tahun `end.year`
    const prevMonthLastDay = new Date(
      Date.UTC(end.year, end.month - 1, 0)
    ).getUTCDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, totalDays };
}

/**
 * Menghitung usia saat ini dalam format kalender dan label ringkas Bahasa Indonesia.
 */
export function calculateAge(
  birthDateStr: string,
  referenceDate: Date | string = new Date()
): { years: number; months: number; days: number; label: string } {
  const refStr =
    typeof referenceDate === "string"
      ? referenceDate
      : toIsoDateString(referenceDate);
  const diff = diffCalendarDates(birthDateStr, refStr);

  if (diff.totalDays < 0) {
    return { years: 0, months: 0, days: 0, label: "0 th 0 bln" };
  }

  return {
    years: diff.years,
    months: diff.months,
    days: diff.days,
    label: `${diff.years} th ${diff.months} bln`,
  };
}

/**
 * Menghitung sisa masa kerja menuju TMT Pensiun dan mengklasifikasikan tingkat urgensi.
 */
export function calculateRemainingService(
  retirementDateStr: string,
  referenceDate: Date | string = new Date(),
  thresholds: UrgencyThresholds = {}
): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  label: string;
  urgency: UrgencyLevel;
} {
  const criticalMonths = thresholds.criticalMonths ?? 6;
  const warningMonths = thresholds.warningMonths ?? 12;
  const upcomingMonths = thresholds.upcomingMonths ?? 24;

  const refStr =
    typeof referenceDate === "string"
      ? referenceDate
      : toIsoDateString(referenceDate);

  const forward = diffCalendarDates(refStr, retirementDateStr);

  if (forward.totalDays <= 0) {
    const overdue = diffCalendarDates(retirementDateStr, refStr);
    let label = "Jatuh Tempo Hari Ini";
    if (overdue.totalDays > 0) {
      if (overdue.years > 0) {
        label =
          overdue.months > 0
            ? `Lewat ${overdue.years} thn ${overdue.months} bln`
            : `Lewat ${overdue.years} thn`;
      } else if (overdue.months > 0) {
        label =
          overdue.days > 0
            ? `Lewat ${overdue.months} bln ${overdue.days} hr`
            : `Lewat ${overdue.months} bln`;
      } else {
        label = `Lewat ${overdue.days} hr`;
      }
    }

    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: forward.totalDays,
      totalMonths: 0,
      label,
      urgency: "OVERDUE",
    };
  }

  const totalMonths =
    forward.years * 12 + forward.months + (forward.days > 0 ? forward.days / 31 : 0);

  let urgency: UrgencyLevel = "SAFE";
  if (totalMonths <= criticalMonths) {
    urgency = "CRITICAL";
  } else if (totalMonths <= warningMonths) {
    urgency = "WARNING";
  } else if (totalMonths <= upcomingMonths) {
    urgency = "UPCOMING";
  }

  let label: string;
  if (forward.years >= 1) {
    label =
      forward.months > 0
        ? `${forward.years} thn ${forward.months} bln`
        : `${forward.years} thn`;
  } else if (forward.months >= 1) {
    label =
      forward.days > 0
        ? `${forward.months} bln ${forward.days} hr`
        : `${forward.months} bln`;
  } else {
    label = `${forward.days} hr`;
  }

  return {
    years: forward.years,
    months: forward.months,
    days: forward.days,
    totalDays: forward.totalDays,
    totalMonths,
    label,
    urgency,
  };
}

/**
 * Menghitung seluruh metrik pensiun pegawai sekaligus.
 */
export function getRetirementMetrics(
  birthDateStr: string,
  retirementDateStr: string,
  referenceDate: Date | string = new Date(),
  thresholds?: UrgencyThresholds
): RetirementMetrics {
  const age = calculateAge(birthDateStr, referenceDate);
  const rem = calculateRemainingService(
    retirementDateStr,
    referenceDate,
    thresholds
  );

  return {
    retirementDate: retirementDateStr,
    age,
    remaining: {
      years: rem.years,
      months: rem.months,
      days: rem.days,
      totalDays: rem.totalDays,
      totalMonths: rem.totalMonths,
      label: rem.label,
    },
    urgency: rem.urgency,
  };
}

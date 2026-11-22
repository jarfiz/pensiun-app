import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type {
  EmploymentStatus,
  RetirementProcessStatus,
} from "@/db/schema";
import type { UrgencyLevel } from "./retirement";

/**
 * Memformat tanggal YYYY-MM-DD ke format Indonesia formal (mis. "01 Juli 2027" atau "01 Jul 2027").
 */
export function formatIndonesianDate(
  dateStr: string | null | undefined,
  shortMonth = false
): string {
  if (!dateStr) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return format(date, shortMonth ? "dd MMM yyyy" : "dd MMMM yyyy", {
    locale: idLocale,
  });
}

const PRESERVED_UPPERCASE = new Set([
  "UPTB",
  "BRIDA",
  "PNS",
  "PPPK",
  "P3K",
  "ASN",
  "BKN",
  "TU",
  "TI",
  "IT",
  "SDM",
  "KRS",
  "STP",
  "RI",
  "SP",
  "SE",
  "SH",
  "ST",
  "MM",
  "MT",
  "II",
  "III",
  "IV",
]);

const LOWERCASE_CONJUNCTIONS = new Set([
  "dan",
  "di",
  "ke",
  "dari",
  "pada",
  "untuk",
  "atau",
  "yang",
]);

/**
 * Menormalisasi kapitalisasi nama jabatan menjadi Title Case yang rapi
 * sambil mempertahankan singkatan umum instansi/gelar.
 */
export function toTitleCasePosition(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (PRESERVED_UPPERCASE.has(upper)) {
        return upper;
      }
      // Tangani singkatan dengan titik seperti S.Kom, S.Si, M.Si
      if (/^[a-zA-Z]\.[a-zA-Z.]+$/.test(word)) {
        return word
          .split(".")
          .map((part) =>
            part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
          )
          .join(".");
      }
      const lower = word.toLowerCase();
      if (index > 0 && LOWERCASE_CONJUNCTIONS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  PNS: "PNS",
  PPPK_FULL: "PPPK Penuh Waktu",
  PPPK_PART: "PPPK Paruh Waktu",
};

export const EMPLOYMENT_STATUS_SHORT: Record<EmploymentStatus, string> = {
  PNS: "PNS",
  PPPK_FULL: "PPPK Penuh",
  PPPK_PART: "PPPK Paruh",
};

export const PROCESS_STATUS_LABELS: Record<RetirementProcessStatus, string> = {
  BELUM: "Belum Diproses",
  BERKAS: "Pengumpulan Berkas",
  DIAJUKAN: "Diajukan",
  SELESAI: "Selesai",
};

export const URGENCY_META: Record<
  UrgencyLevel,
  { label: string; badgeClass: string; order: number }
> = {
  OVERDUE: {
    label: "Lewat BUP / Perlu Cek",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    order: 0,
  },
  CRITICAL: {
    label: "Kritis (≤ 6 Bulan)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    order: 1,
  },
  WARNING: {
    label: "Siaga (6–12 Bulan)",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    order: 2,
  },
  UPCOMING: {
    label: "Persiapan (1–2 Tahun)",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    order: 3,
  },
  SAFE: {
    label: "Aman (> 2 Tahun)",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    order: 4,
  },
};

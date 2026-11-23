import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import {
  appSettings,
  employees,
  units,
  type AppSettings,
  type EmploymentStatus,
  type RetirementProcessStatus,
  type Unit,
} from "@/db/schema";
import { ensureDefaultSeed } from "@/db/seed";
import { formatNip } from "./nip-parser";
import {
  getRetirementMetrics,
  type RetirementMetrics,
  type UrgencyLevel,
} from "./retirement";

export type UrgencyFilter =
  | "all"
  | UrgencyLevel
  | "CRITICAL_OR_OVERDUE"
  | "TWO_TO_FIVE";

export type EmployeeSortBy =
  | "retirementDate"
  | "birthDate"
  | "fullName"
  | "rankGrade"
  | "unitName";

export interface EmployeeQueryParams {
  q?: string;
  unitId?: number | null;
  status?: EmploymentStatus | "all";
  rankGrade?: string | "all";
  birthYear?: number | null;
  urgency?: UrgencyFilter;
  tmtYear?: number | null;
  processStatus?: RetirementProcessStatus | "all";
  isActive?: boolean | "all";
  sortBy?: EmployeeSortBy;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface EnrichedEmployee {
  id: number;
  nip: string;
  formattedNip: string;
  fullName: string;
  birthDate: string;
  gender: "L" | "P";
  rankGrade: string;
  positionName: string;
  employmentStatus: EmploymentStatus;
  unitId: number;
  unitCode: string;
  unitName: string;
  bupAge: number;
  retirementDate: string;
  isActive: boolean;
  processStatus: RetirementProcessStatus;
  notes: string | null;
  metrics: RetirementMetrics;
}

export interface UrgencyCounts {
  allActive: number;
  overdue: number;
  critical: number;
  warning: number;
  upcoming: number;
  twoToFive: number;
}

export const DEFAULT_APP_SETTINGS: Omit<AppSettings, "updatedAt"> = {
  id: 1,
  institutionName: "BADAN RISET DAN INOVASI DAERAH",
  institutionSubname: "PROVINSI SUMATERA SELATAN",
  defaultBupAge: 60,
  tmtRule: "FIRST_OF_NEXT_MONTH",
  criticalMonths: 6,
  warningMonths: 12,
  upcomingMonths: 24,
};

export async function getAppSettingsOrDefault(): Promise<AppSettings> {
  if (!isDatabaseConfigured()) {
    return { ...DEFAULT_APP_SETTINGS, updatedAt: new Date() };
  }
  await ensureDefaultSeed();
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  return row ?? { ...DEFAULT_APP_SETTINGS, updatedAt: new Date() };
}

export async function getAllUnits(): Promise<Unit[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureDefaultSeed();
  return db.select().from(units).orderBy(asc(units.id));
}

function matchesUrgencyFilter(
  metrics: RetirementMetrics,
  urgencyFilter: UrgencyFilter | undefined
): boolean {
  if (!urgencyFilter || urgencyFilter === "all") return true;
  if (urgencyFilter === "CRITICAL_OR_OVERDUE") {
    return metrics.urgency === "OVERDUE" || metrics.urgency === "CRITICAL";
  }
  if (urgencyFilter === "TWO_TO_FIVE") {
    return (
      metrics.remaining.totalMonths > 24 && metrics.remaining.totalMonths <= 60
    );
  }
  return metrics.urgency === urgencyFilter;
}

export async function queryEmployees(params: EmployeeQueryParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, params.pageSize ?? 25));
  const sortBy = params.sortBy ?? "retirementDate";
  const sortDir = params.sortDir ?? "asc";

  if (!isDatabaseConfigured()) {
    return {
      dbConfigured: false,
      items: [] as EnrichedEmployee[],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
      counts: {
        allActive: 0,
        overdue: 0,
        critical: 0,
        warning: 0,
        upcoming: 0,
        twoToFive: 0,
      } satisfies UrgencyCounts,
      availableYears: [] as number[],
      availableBirthYears: [] as number[],
      availableRankGrades: [] as string[],
      units: [] as Unit[],
      settings: { ...DEFAULT_APP_SETTINGS, updatedAt: new Date() },
    };
  }

  const [settings, unitList] = await Promise.all([
    getAppSettingsOrDefault(),
    getAllUnits(),
  ]);

  const conditions = [];

  if (params.isActive !== "all") {
    const activeVal = params.isActive ?? true;
    conditions.push(eq(employees.isActive, activeVal));
  }

  if (params.unitId) {
    conditions.push(eq(employees.unitId, params.unitId));
  }

  if (params.status && params.status !== "all") {
    conditions.push(eq(employees.employmentStatus, params.status));
  }

  if (params.rankGrade && params.rankGrade !== "all") {
    conditions.push(eq(employees.rankGrade, params.rankGrade));
  }

  if (params.birthYear) {
    conditions.push(
      and(
        gte(employees.birthDate, `${params.birthYear}-01-01`),
        lte(employees.birthDate, `${params.birthYear}-12-31`)
      )
    );
  }

  if (params.processStatus && params.processStatus !== "all") {
    conditions.push(eq(employees.processStatus, params.processStatus));
  }

  if (params.tmtYear) {
    conditions.push(
      and(
        gte(employees.retirementDate, `${params.tmtYear}-01-01`),
        lte(employees.retirementDate, `${params.tmtYear}-12-31`)
      )
    );
  }

  if (params.q && params.q.trim()) {
    const rawQ = params.q.trim();
    const digitsOnly = rawQ.replace(/\D/g, "");
    const textPattern = `%${rawQ}%`;
    if (digitsOnly.length >= 3) {
      conditions.push(
        or(
          ilike(employees.fullName, textPattern),
          ilike(employees.positionName, textPattern),
          ilike(employees.nip, `%${digitsOnly}%`)
        )
      );
    } else {
      conditions.push(
        or(
          ilike(employees.fullName, textPattern),
          ilike(employees.positionName, textPattern),
          ilike(employees.nip, textPattern)
        )
      );
    }
  }

  const sortDirectionFn = sortDir === "desc" ? desc : asc;
  const lowerFullNameExpr = sql`LOWER(${employees.fullName})`;

  const orderExprs =
    sortBy === "fullName"
      ? [sortDirectionFn(lowerFullNameExpr)]
      : sortBy === "unitName"
        ? [
            sortDirectionFn(units.name),
            sortDirectionFn(employees.employmentStatus),
            asc(lowerFullNameExpr),
          ]
        : [
            sortBy === "birthDate"
              ? sortDirectionFn(employees.birthDate)
              : sortBy === "rankGrade"
                ? sortDirectionFn(employees.rankGrade)
                : sortDirectionFn(employees.retirementDate),
            asc(lowerFullNameExpr),
          ];

  const rows = await db
    .select({
      employee: employees,
      unit: units,
    })
    .from(employees)
    .innerJoin(units, eq(employees.unitId, units.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(...orderExprs);

  const today = new Date();
  const thresholds = {
    criticalMonths: settings.criticalMonths,
    warningMonths: settings.warningMonths,
    upcomingMonths: settings.upcomingMonths,
  };

  const enrichedAll: EnrichedEmployee[] = rows.map(({ employee, unit }) => ({
    id: employee.id,
    nip: employee.nip,
    formattedNip: formatNip(employee.nip),
    fullName: employee.fullName,
    birthDate: employee.birthDate,
    gender: employee.gender,
    rankGrade: employee.rankGrade,
    positionName: employee.positionName,
    employmentStatus: employee.employmentStatus,
    unitId: employee.unitId,
    unitCode: unit.code,
    unitName: unit.name,
    bupAge: employee.bupAge,
    retirementDate: employee.retirementDate,
    isActive: employee.isActive,
    processStatus: employee.processStatus,
    notes: employee.notes,
    metrics: getRetirementMetrics(
      employee.birthDate,
      employee.retirementDate,
      today,
      thresholds
    ),
  }));

  const filtered = enrichedAll.filter((item) =>
    matchesUrgencyFilter(item.metrics, params.urgency)
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  // Hitung counter tab urgensi dari seluruh pegawai aktif + opsi filter sesuai cakupan isActive
  const metaRows = await db
    .select({
      birthDate: employees.birthDate,
      retirementDate: employees.retirementDate,
      rankGrade: employees.rankGrade,
      isActive: employees.isActive,
    })
    .from(employees);

  const activeRows = metaRows.filter((r) => r.isActive);
  const scopeRows =
    params.isActive === "all"
      ? metaRows
      : params.isActive === false
        ? metaRows.filter((r) => !r.isActive)
        : activeRows;

  const counts: UrgencyCounts = {
    allActive: activeRows.length,
    overdue: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    twoToFive: 0,
  };

  for (const r of activeRows) {
    const m = getRetirementMetrics(
      r.birthDate,
      r.retirementDate,
      today,
      thresholds
    );
    if (m.urgency === "OVERDUE") counts.overdue += 1;
    else if (m.urgency === "CRITICAL") counts.critical += 1;
    else if (m.urgency === "WARNING") counts.warning += 1;
    else if (m.urgency === "UPCOMING") counts.upcoming += 1;

    if (m.remaining.totalMonths > 24 && m.remaining.totalMonths <= 60) {
      counts.twoToFive += 1;
    }
  }

  const yearSet = new Set<number>();
  const birthYearSet = new Set<number>();
  const rankGradeSet = new Set<string>();

  for (const r of scopeRows) {
    const tmtYearVal = Number(r.retirementDate.slice(0, 4));
    if (!Number.isNaN(tmtYearVal)) yearSet.add(tmtYearVal);

    const birthYearVal = Number(r.birthDate.slice(0, 4));
    if (!Number.isNaN(birthYearVal)) birthYearSet.add(birthYearVal);

    const grade = r.rankGrade.trim();
    if (grade) rankGradeSet.add(grade);
  }

  const availableYears = Array.from(yearSet).sort((a, b) => a - b);
  const availableBirthYears = Array.from(birthYearSet).sort((a, b) => a - b);
  const availableRankGrades = Array.from(rankGradeSet).sort((a, b) =>
    a.localeCompare(b, "id")
  );

  return {
    dbConfigured: true,
    items,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : totalPages,
    },
    counts,
    availableYears,
    availableBirthYears,
    availableRankGrades,
    units: unitList,
    settings,
  };
}

export async function getYearRangeSummary() {
  if (!isDatabaseConfigured()) return [];
  const rows = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${employees.retirementDate})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(sql`EXTRACT(YEAR FROM ${employees.retirementDate})`);
  return rows;
}

import { asc, eq, sql } from "drizzle-orm";
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
  toIsoDateString,
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

const EMPLOYEE_SNAPSHOT_TTL_MS = 30_000;

interface CachedSnapshot {
  fetchedAt: number;
  dateKey: string;
  settings: AppSettings;
  units: Unit[];
  enrichedEmployees: EnrichedEmployee[];
  activeCounts: UrgencyCounts;
}

const globalForEmployeeCache = globalThis as unknown as {
  employeeSnapshot: CachedSnapshot | undefined;
  employeeSnapshotPromise: Promise<CachedSnapshot> | undefined;
};

export function invalidateEmployeeCache(): void {
  globalForEmployeeCache.employeeSnapshot = undefined;
  globalForEmployeeCache.employeeSnapshotPromise = undefined;
}

async function fetchSnapshotFromDb(): Promise<CachedSnapshot> {
  const today = new Date();
  const dateKey = toIsoDateString(today);

  let [settingsRows, unitRows, empRows] = await Promise.all([
    db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1),
    db.select().from(units).orderBy(asc(units.id)),
    db
      .select({
        employee: employees,
        unit: units,
      })
      .from(employees)
      .innerJoin(units, eq(employees.unitId, units.id)),
  ]);

  if (settingsRows.length === 0 || unitRows.length === 0) {
    await ensureDefaultSeed();
    [settingsRows, unitRows] = await Promise.all([
      db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1),
      db.select().from(units).orderBy(asc(units.id)),
    ]);
    if (empRows.length === 0) {
      empRows = await db
        .select({
          employee: employees,
          unit: units,
        })
        .from(employees)
        .innerJoin(units, eq(employees.unitId, units.id));
    }
  }

  const settings = settingsRows[0] ?? {
    ...DEFAULT_APP_SETTINGS,
    updatedAt: today,
  };

  const thresholds = {
    criticalMonths: settings.criticalMonths,
    warningMonths: settings.warningMonths,
    upcomingMonths: settings.upcomingMonths,
  };

  const activeCounts: UrgencyCounts = {
    allActive: 0,
    overdue: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    twoToFive: 0,
  };

  const enrichedEmployees: EnrichedEmployee[] = empRows.map(
    ({ employee, unit }) => {
      const metrics = getRetirementMetrics(
        employee.birthDate,
        employee.retirementDate,
        today,
        thresholds
      );

      if (employee.isActive) {
        activeCounts.allActive += 1;
        if (metrics.urgency === "OVERDUE") activeCounts.overdue += 1;
        else if (metrics.urgency === "CRITICAL") activeCounts.critical += 1;
        else if (metrics.urgency === "WARNING") activeCounts.warning += 1;
        else if (metrics.urgency === "UPCOMING") activeCounts.upcoming += 1;

        if (
          metrics.remaining.totalMonths > 24 &&
          metrics.remaining.totalMonths <= 60
        ) {
          activeCounts.twoToFive += 1;
        }
      }

      return {
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
        metrics,
      };
    }
  );

  return {
    fetchedAt: Date.now(),
    dateKey,
    settings,
    units: unitRows,
    enrichedEmployees,
    activeCounts,
  };
}

async function loadSnapshot(): Promise<CachedSnapshot> {
  const now = Date.now();
  const todayKey = toIsoDateString(new Date());
  const cached = globalForEmployeeCache.employeeSnapshot;

  if (
    cached &&
    cached.dateKey === todayKey &&
    now - cached.fetchedAt < EMPLOYEE_SNAPSHOT_TTL_MS
  ) {
    return cached;
  }

  if (!globalForEmployeeCache.employeeSnapshotPromise) {
    globalForEmployeeCache.employeeSnapshotPromise = fetchSnapshotFromDb()
      .then((snapshot) => {
        globalForEmployeeCache.employeeSnapshot = snapshot;
        globalForEmployeeCache.employeeSnapshotPromise = undefined;
        return snapshot;
      })
      .catch((error) => {
        globalForEmployeeCache.employeeSnapshotPromise = undefined;
        throw error;
      });
  }

  return globalForEmployeeCache.employeeSnapshotPromise;
}

export async function getAppSettingsOrDefault(): Promise<AppSettings> {
  if (!isDatabaseConfigured()) {
    return { ...DEFAULT_APP_SETTINGS, updatedAt: new Date() };
  }
  const snapshot = await loadSnapshot();
  return snapshot.settings;
}

export async function getAllUnits(): Promise<Unit[]> {
  if (!isDatabaseConfigured()) return [];
  const snapshot = await loadSnapshot();
  return snapshot.units;
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

function compareText(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la < lb) return -1;
  if (la > lb) return 1;
  return 0;
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

  const snapshot = await loadSnapshot();
  const rawQ = params.q?.trim() ?? "";
  const lowerQ = rawQ.toLowerCase();
  const digitsOnly = rawQ.replace(/\D/g, "");
  const birthYearPrefix = params.birthYear ? `${params.birthYear}-` : null;
  const tmtYearPrefix = params.tmtYear ? `${params.tmtYear}-` : null;

  const yearSet = new Set<number>();
  const birthYearSet = new Set<number>();
  const rankGradeSet = new Set<string>();
  const filtered: EnrichedEmployee[] = [];

  for (const item of snapshot.enrichedEmployees) {
    // Scope pilihan filter (tahun lahir, tahun TMT, golongan) sesuai status aktif/arsip
    const matchesActiveScope =
      params.isActive === "all"
        ? true
        : params.isActive === false
          ? !item.isActive
          : item.isActive;

    if (!matchesActiveScope) continue;

    const tmtYr = Number(item.retirementDate.slice(0, 4));
    if (!Number.isNaN(tmtYr)) yearSet.add(tmtYr);

    const birthYr = Number(item.birthDate.slice(0, 4));
    if (!Number.isNaN(birthYr)) birthYearSet.add(birthYr);

    const grade = item.rankGrade.trim();
    if (grade) rankGradeSet.add(grade);

    if (params.unitId && item.unitId !== params.unitId) continue;
    if (
      params.status &&
      params.status !== "all" &&
      item.employmentStatus !== params.status
    ) {
      continue;
    }
    if (
      params.rankGrade &&
      params.rankGrade !== "all" &&
      item.rankGrade !== params.rankGrade
    ) {
      continue;
    }
    if (birthYearPrefix && !item.birthDate.startsWith(birthYearPrefix)) {
      continue;
    }
    if (
      params.processStatus &&
      params.processStatus !== "all" &&
      item.processStatus !== params.processStatus
    ) {
      continue;
    }
    if (tmtYearPrefix && !item.retirementDate.startsWith(tmtYearPrefix)) {
      continue;
    }
    if (lowerQ) {
      const nameMatch = item.fullName.toLowerCase().includes(lowerQ);
      const posMatch = item.positionName.toLowerCase().includes(lowerQ);
      const nipTarget = digitsOnly.length >= 3 ? digitsOnly : lowerQ;
      const nipMatch = item.nip.toLowerCase().includes(nipTarget);
      if (!nameMatch && !posMatch && !nipMatch) continue;
    }
    if (!matchesUrgencyFilter(item.metrics, params.urgency)) continue;

    filtered.push(item);
  }

  const dirMultiplier = sortDir === "desc" ? -1 : 1;
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "fullName") {
      cmp = compareText(a.fullName, b.fullName) * dirMultiplier;
      if (cmp !== 0) return cmp;
      return a.id - b.id;
    }
    if (sortBy === "unitName") {
      cmp = compareText(a.unitName, b.unitName) * dirMultiplier;
      if (cmp !== 0) return cmp;
      cmp = compareText(a.employmentStatus, b.employmentStatus) * dirMultiplier;
      if (cmp !== 0) return cmp;
      return compareText(a.fullName, b.fullName);
    }
    if (sortBy === "birthDate") {
      cmp = compareText(a.birthDate, b.birthDate) * dirMultiplier;
    } else if (sortBy === "rankGrade") {
      cmp = compareText(a.rankGrade, b.rankGrade) * dirMultiplier;
    } else {
      cmp = compareText(a.retirementDate, b.retirementDate) * dirMultiplier;
    }
    if (cmp !== 0) return cmp;
    return compareText(a.fullName, b.fullName);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

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
    counts: snapshot.activeCounts,
    availableYears,
    availableBirthYears,
    availableRankGrades,
    units: snapshot.units,
    settings: snapshot.settings,
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

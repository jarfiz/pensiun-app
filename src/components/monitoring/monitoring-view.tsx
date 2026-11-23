"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { AppSettings, Unit } from "@/db/schema";
import { fetchCachedJson, getCachedJson } from "@/lib/client-fetch-cache";
import type {
  EmployeeSortBy,
  EnrichedEmployee,
  UrgencyCounts,
  UrgencyFilter,
} from "@/lib/employee-queries";
import { EmployeeDrawer } from "./employee-drawer";
import { FilterBar } from "./filter-bar";
import { MonitoringTable } from "./monitoring-table";
import { UrgencyTabs } from "./urgency-tabs";

interface EmployeesApiResponse {
  dbConfigured: boolean;
  items: EnrichedEmployee[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  counts: UrgencyCounts;
  availableYears: number[];
  units: Unit[];
  settings?: AppSettings;
}

function normalizeUrgencyParam(raw: string | null): UrgencyFilter {
  if (!raw) return "all";
  const upper = raw.toUpperCase();
  if (
    upper === "OVERDUE" ||
    upper === "CRITICAL" ||
    upper === "WARNING" ||
    upper === "UPCOMING" ||
    upper === "TWO_TO_FIVE" ||
    upper === "SAFE" ||
    upper === "CRITICAL_OR_OVERDUE"
  ) {
    return upper as UrgencyFilter;
  }
  return "all";
}

export function MonitoringView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [debouncedQ, setDebouncedQ] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [unitId, setUnitId] = useState(
    () => searchParams.get("unitId") ?? "all"
  );
  const [status, setStatus] = useState(
    () => searchParams.get("status") ?? "all"
  );
  const [tmtYear, setTmtYear] = useState(
    () => searchParams.get("tmtYear") ?? "all"
  );
  const [processStatus, setProcessStatus] = useState(
    () => searchParams.get("processStatus") ?? "all"
  );
  const [urgency, setUrgency] = useState<UrgencyFilter>(() =>
    normalizeUrgencyParam(searchParams.get("urgency"))
  );
  const [sortBy, setSortBy] = useState<EmployeeSortBy>(
    () => (searchParams.get("sortBy") as EmployeeSortBy) || "retirementDate"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("sortDir") === "desc" ? "desc" : "asc"
  );
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const ps = Number(searchParams.get("pageSize") ?? "25");
    return [15, 25, 50, 100].includes(ps) ? ps : 25;
  });

  const apiUrl = useMemo(() => {
    const apiParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir,
      urgency,
    });
    if (debouncedQ.trim()) apiParams.set("q", debouncedQ.trim());
    if (unitId !== "all") apiParams.set("unitId", unitId);
    if (status !== "all") apiParams.set("status", status);
    if (tmtYear !== "all") apiParams.set("tmtYear", tmtYear);
    if (processStatus !== "all") apiParams.set("processStatus", processStatus);
    return `/api/employees?${apiParams.toString()}`;
  }, [
    debouncedQ,
    unitId,
    status,
    tmtYear,
    processStatus,
    urgency,
    sortBy,
    sortDir,
    page,
    pageSize,
  ]);

  const [data, setData] = useState<EmployeesApiResponse | null>(() =>
    getCachedJson<EmployeesApiResponse>(apiUrl)
  );
  const [loading, setLoading] = useState(
    () => !getCachedJson<EmployeesApiResponse>(apiUrl)
  );
  const [selectedEmployee, setSelectedEmployee] =
    useState<EnrichedEmployee | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Debounce input pencarian 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== debouncedQ) {
        setLoading(true);
        setDebouncedQ(searchInput);
        setPage(1);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedQ]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (unitId !== "all") params.set("unitId", unitId);
    if (status !== "all") params.set("status", status);
    if (tmtYear !== "all") params.set("tmtYear", tmtYear);
    if (processStatus !== "all") params.set("processStatus", processStatus);
    if (urgency !== "all") params.set("urgency", urgency);
    if (sortBy !== "retirementDate") params.set("sortBy", sortBy);
    if (sortDir !== "asc") params.set("sortDir", sortDir);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("pageSize", String(pageSize));
    return params.toString();
  }, [
    debouncedQ,
    unitId,
    status,
    tmtYear,
    processStatus,
    urgency,
    sortBy,
    sortDir,
    page,
    pageSize,
  ]);

  // Sinkronkan filter ke URL tanpa reload (lewati jika sudah sama)
  const currentSearchString = searchParams.toString();
  useEffect(() => {
    if (queryString === currentSearchString) return;
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [currentSearchString, pathname, queryString, router]);

  // Fetch data dari API dengan cache SWR ringan
  useEffect(() => {
    void refreshTick;
    const controller = new AbortController();

    fetchCachedJson<EmployeesApiResponse>(apiUrl, controller.signal)
      .then((json) => {
        setData(json);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        console.error(error);
        toast.error("Gagal memuat data monitoring pensiun.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [apiUrl, refreshTick]);

  const handleSortChange = (col: EmployeeSortBy) => {
    setLoading(true);
    if (sortBy === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    unitId !== "all" ||
    status !== "all" ||
    tmtYear !== "all" ||
    processStatus !== "all" ||
    urgency !== "all";

  const handleResetFilters = () => {
    setLoading(true);
    setSearchInput("");
    setDebouncedQ("");
    setUnitId("all");
    setStatus("all");
    setTmtYear("all");
    setProcessStatus("all");
    setUrgency("all");
    setPage(1);
  };

  const exportParams = new URLSearchParams({
    sortBy,
    sortDir,
    urgency,
  });
  if (debouncedQ.trim()) exportParams.set("q", debouncedQ.trim());
  if (unitId !== "all") exportParams.set("unitId", unitId);
  if (status !== "all") exportParams.set("status", status);
  if (tmtYear !== "all") exportParams.set("tmtYear", tmtYear);
  if (processStatus !== "all") exportParams.set("processStatus", processStatus);
  const exportQuery = exportParams.toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Monitoring Pensiun Pegawai
          </h1>
          <p className="text-sm text-slate-600">
            Pemantauan TMT pensiun otomatis berdasarkan NIP dan Batas Usia Pensiun (BUP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/export/excel?${exportQuery}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="mr-1.5 size-4" />
            Ekspor Excel
          </a>
          <Link
            href={`/laporan/cetak?${exportQuery}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer className="mr-1.5 size-4" />
            Cetak / PDF
          </Link>
        </div>
      </div>

      {data && !data.dbConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Database PostgreSQL belum terhubung (<code>DATABASE_URL</code> belum diatur). Tabel akan menampilkan data setelah koneksi database dikonfigurasi.
        </div>
      )}

      <UrgencyTabs
        value={urgency}
        counts={
          data?.counts ?? {
            allActive: 0,
            overdue: 0,
            critical: 0,
            warning: 0,
            upcoming: 0,
            twoToFive: 0,
          }
        }
        onChange={(next) => {
          setLoading(true);
          setUrgency(next);
          setPage(1);
        }}
      />

      <FilterBar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        unitId={unitId}
        onUnitIdChange={(val) => {
          setLoading(true);
          setUnitId(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setLoading(true);
          setStatus(val);
          setPage(1);
        }}
        tmtYear={tmtYear}
        onTmtYearChange={(val) => {
          setLoading(true);
          setTmtYear(val);
          setPage(1);
        }}
        processStatus={processStatus}
        onProcessStatusChange={(val) => {
          setLoading(true);
          setProcessStatus(val);
          setPage(1);
        }}
        units={data?.units ?? []}
        availableYears={data?.availableYears ?? []}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      />

      <MonitoringTable
        items={data?.items ?? []}
        loading={loading}
        page={data?.pagination.page ?? page}
        pageSize={pageSize}
        total={data?.pagination.total ?? 0}
        totalPages={data?.pagination.totalPages ?? 0}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        onPageSizeChange={(nextSize) => {
          setLoading(true);
          setPageSize(nextSize);
          setPage(1);
        }}
        onSelectEmployee={(emp) => setSelectedEmployee(emp)}
      />

      <EmployeeDrawer
        employee={selectedEmployee}
        tmtRule={data?.settings?.tmtRule}
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployee(null);
        }}
        onUpdated={() => {
          setLoading(true);
          setRefreshTick((t) => t + 1);
        }}
      />
    </div>
  );
}

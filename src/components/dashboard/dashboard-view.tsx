"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { Unit } from "@/db/schema";
import type { EnrichedEmployee, UrgencyCounts } from "@/lib/employee-queries";
import { cn } from "@/lib/utils";
import { KpiCards } from "./kpi-cards";
import { ProjectionChart } from "./projection-chart";
import { WatchlistTable } from "./watchlist-table";

interface DashboardApiResponse {
  dbConfigured: boolean;
  items: EnrichedEmployee[];
  counts: UrgencyCounts;
  units: Unit[];
}

export function DashboardView() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "/api/employees?isActive=true&pageSize=500&sortBy=retirementDate&sortDir=asc",
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat ringkasan dasbor.");
        return res.json() as Promise<DashboardApiResponse>;
      })
      .then((json) => setData(json))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        console.error(error);
        toast.error("Gagal memuat data dasbor.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const statusBreakdown = useMemo(() => {
    const items = data?.items ?? [];
    return {
      pns: items.filter((e) => e.employmentStatus === "PNS").length,
      pppkFull: items.filter((e) => e.employmentStatus === "PPPK_FULL").length,
      pppkPart: items.filter((e) => e.employmentStatus === "PPPK_PART").length,
    };
  }, [data]);

  const counts = data?.counts ?? {
    allActive: 0,
    overdue: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    twoToFive: 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Dasbor Monitoring Pensiun
          </h1>
          <p className="text-sm text-slate-600">
            Ringkasan proyeksi masa purna tugas pegawai BRIDA &amp; UPTB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/impor-laporan"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileSpreadsheet className="mr-1.5 size-4" />
            Impor Excel BRIDA
          </Link>
          <Link
            href="/monitoring"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
            )}
          >
            <span>Buka Monitoring</span>
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </div>
      </div>

      {!loading && data && !data.dbConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Database PostgreSQL belum terhubung (<code>DATABASE_URL</code> belum diatur). Silakan atur koneksi database di <code>.env</code> lalu jalankan migrasi &amp; impor Excel BRIDA.
        </div>
      )}

      {!loading && data && data.dbConfigured && counts.allActive === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Belum ada data pegawai di database.
          </p>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Impor langsung file Excel <code>DATA PEGAWAI BRIDA DAN UPTB BRIDA.xlsx</code> atau tambahkan pegawai secara manual.
          </p>
          <Link
            href="/impor-laporan"
            className={cn(
              buttonVariants({ size: "sm" }),
              "mt-4 bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
            )}
          >
            <FileSpreadsheet className="mr-1.5 size-4" />
            Impor File Excel BRIDA
          </Link>
        </div>
      )}

      <KpiCards
        totalActive={counts.allActive}
        statusBreakdown={statusBreakdown}
        criticalAndOverdue={counts.overdue + counts.critical}
        warningCount={counts.warning}
        upcomingCount={counts.upcoming}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <ProjectionChart
            employees={data?.items ?? []}
            units={data?.units ?? []}
          />
        </div>
        <div className="xl:col-span-6">
          <WatchlistTable employees={data?.items ?? []} />
        </div>
      </div>
    </div>
  );
}

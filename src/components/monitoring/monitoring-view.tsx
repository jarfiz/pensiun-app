"use client";

import React, { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { Unit } from "@/db/schema";
import type {
  EmployeeSortBy,
  EnrichedEmployee,
  UrgencyCounts,
  UrgencyFilter,
} from "@/lib/employee-queries";
import { MonitoringTable } from "./monitoring-table";

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
}

export function MonitoringView() {
  const [data, setData] = useState<EmployeesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<EmployeeSortBy>("retirementDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [urgency] = useState<UrgencyFilter>("all");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir,
      urgency,
    });

    fetch(`/api/employees?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data monitoring.");
        return res.json() as Promise<EmployeesApiResponse>;
      })
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
  }, [page, pageSize, sortBy, sortDir, urgency]);

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

  const exportQuery = new URLSearchParams({
    sortBy,
    sortDir,
    urgency,
  }).toString();

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
          Database PostgreSQL belum terhubung (`DATABASE_URL` belum diatur). Tabel akan menampilkan data setelah koneksi database dikonfigurasi.
        </div>
      )}

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
        onSelectEmployee={() => {
          // Drawer detail akan ditambahkan di tahap berikutnya
        }}
      />
    </div>
  );
}

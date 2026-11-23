"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppSettings, Unit } from "@/db/schema";
import {
  fetchCachedJson,
  getCachedJson,
  invalidateClientCache,
} from "@/lib/client-fetch-cache";
import type { EmployeeSortBy, EnrichedEmployee } from "@/lib/employee-queries";
import {
  EMPLOYMENT_STATUS_SHORT,
  formatIndonesianDate,
} from "@/lib/formatters";
import { EmployeeFormDialog } from "./employee-form-dialog";

interface EmployeesResponse {
  dbConfigured: boolean;
  items: EnrichedEmployee[];
  pagination: { total: number };
  availableYears: number[];
  availableBirthYears: number[];
  availableRankGrades: string[];
  units: Unit[];
  settings: AppSettings;
}

const VALID_SORT_COLUMNS: EmployeeSortBy[] = [
  "fullName",
  "unitName",
  "rankGrade",
  "birthDate",
  "retirementDate",
];

const SORT_ITEMS: Record<string, string> = {
  "fullName:asc": "Nama (A–Z)",
  "fullName:desc": "Nama (Z–A)",
  "unitName:asc": "Unit & Status (A–Z)",
  "unitName:desc": "Unit & Status (Z–A)",
  "rankGrade:asc": "Golongan (A–Z)",
  "rankGrade:desc": "Golongan (Z–A)",
  "birthDate:asc": "Tgl Lahir (Tertua)",
  "birthDate:desc": "Tgl Lahir (Termuda)",
  "retirementDate:asc": "TMT Pensiun (Tercepat)",
  "retirementDate:desc": "TMT Pensiun (Terlama)",
};

const STATUS_ITEMS: Record<string, string> = {
  all: "Semua Status",
  PNS: "PNS",
  PPPK_FULL: "PPPK Penuh Waktu",
  PPPK_PART: "PPPK Paruh Waktu",
};

function SortableHeader({
  label,
  columnKey,
  activeSortBy,
  activeSortDir,
  onSort,
}: {
  label: string;
  columnKey: EmployeeSortBy;
  activeSortBy: EmployeeSortBy;
  activeSortDir: "asc" | "desc";
  onSort: (col: EmployeeSortBy) => void;
}) {
  const isActive = activeSortBy === columnKey;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className="inline-flex items-center gap-1 text-left font-semibold text-slate-700 hover:text-slate-900"
    >
      <span>{label}</span>
      {isActive ? (
        activeSortDir === "asc" ? (
          <ArrowUp className="size-3.5 text-[#1E3A5F]" />
        ) : (
          <ArrowDown className="size-3.5 text-[#1E3A5F]" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 text-slate-400" />
      )}
    </button>
  );
}

export function EmployeesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"active" | "archived">(() =>
    searchParams.get("tab") === "archived" ? "archived" : "active"
  );
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
  const [rankGrade, setRankGrade] = useState(
    () => searchParams.get("rankGrade") ?? "all"
  );
  const [birthYear, setBirthYear] = useState(
    () => searchParams.get("birthYear") ?? "all"
  );
  const [tmtYear, setTmtYear] = useState(
    () => searchParams.get("tmtYear") ?? "all"
  );
  const [sortBy, setSortBy] = useState<EmployeeSortBy>(() => {
    const sb = searchParams.get("sortBy") as EmployeeSortBy | null;
    return sb && VALID_SORT_COLUMNS.includes(sb) ? sb : "fullName";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("sortDir") === "desc" ? "desc" : "asc"
  );

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      isActive: tab === "active" ? "true" : "false",
      pageSize: "500",
      sortBy,
      sortDir,
    });
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (unitId !== "all") params.set("unitId", unitId);
    if (status !== "all") params.set("status", status);
    if (rankGrade !== "all") params.set("rankGrade", rankGrade);
    if (birthYear !== "all") params.set("birthYear", birthYear);
    if (tmtYear !== "all") params.set("tmtYear", tmtYear);
    return `/api/employees?${params.toString()}`;
  }, [
    tab,
    debouncedQ,
    unitId,
    status,
    rankGrade,
    birthYear,
    tmtYear,
    sortBy,
    sortDir,
  ]);

  const [data, setData] = useState<EmployeesResponse | null>(() =>
    getCachedJson<EmployeesResponse>(apiUrl)
  );
  const [loading, setLoading] = useState(
    () => !getCachedJson<EmployeesResponse>(apiUrl)
  );
  const [refreshTick, setRefreshTick] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<EnrichedEmployee | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== debouncedQ) {
        setLoading(true);
        setDebouncedQ(searchInput);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedQ]);

  const urlQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (tab !== "active") params.set("tab", tab);
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (unitId !== "all") params.set("unitId", unitId);
    if (status !== "all") params.set("status", status);
    if (rankGrade !== "all") params.set("rankGrade", rankGrade);
    if (birthYear !== "all") params.set("birthYear", birthYear);
    if (tmtYear !== "all") params.set("tmtYear", tmtYear);
    if (sortBy !== "fullName") params.set("sortBy", sortBy);
    if (sortDir !== "asc") params.set("sortDir", sortDir);
    return params.toString();
  }, [
    tab,
    debouncedQ,
    unitId,
    status,
    rankGrade,
    birthYear,
    tmtYear,
    sortBy,
    sortDir,
  ]);

  const currentSearchString = searchParams.toString();
  useEffect(() => {
    if (urlQueryString === currentSearchString) return;
    const targetUrl = urlQueryString ? `${pathname}?${urlQueryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [currentSearchString, pathname, router, urlQueryString]);

  useEffect(() => {
    void refreshTick;
    const controller = new AbortController();

    fetchCachedJson<EmployeesResponse>(apiUrl, controller.signal)
      .then((json) => {
        setData(json);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        console.error(error);
        toast.error("Gagal memuat master data pegawai.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
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
  };

  const handleSortSelect = (val: string | null) => {
    if (!val) return;
    const [col, dir] = val.split(":") as [EmployeeSortBy, "asc" | "desc"];
    if (!VALID_SORT_COLUMNS.includes(col)) return;
    setLoading(true);
    setSortBy(col);
    setSortDir(dir === "desc" ? "desc" : "asc");
  };

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    unitId !== "all" ||
    status !== "all" ||
    rankGrade !== "all" ||
    birthYear !== "all" ||
    tmtYear !== "all" ||
    sortBy !== "fullName" ||
    sortDir !== "asc";

  const handleResetFilters = () => {
    setLoading(true);
    setSearchInput("");
    setDebouncedQ("");
    setUnitId("all");
    setStatus("all");
    setRankGrade("all");
    setBirthYear("all");
    setTmtYear("all");
    setSortBy("fullName");
    setSortDir("asc");
  };

  const handleToggleActive = async (emp: EnrichedEmployee) => {
    const nextActive = !emp.isActive;
    const ok = window.confirm(
      nextActive
        ? `Aktifkan kembali ${emp.fullName}?`
        : `Arsipkan ${emp.fullName} sebagai purna tugas?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui status pegawai.");
      invalidateClientCache();
      toast.success(
        nextActive
          ? "Pegawai diaktifkan kembali."
          : "Pegawai dipindahkan ke Arsip Purna Tugas."
      );
      setLoading(true);
      setRefreshTick((t) => t + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui status."
      );
    }
  };

  const handleDelete = async (emp: EnrichedEmployee) => {
    const ok = window.confirm(
      `Hapus permanen data pegawai ${emp.fullName} (NIP ${emp.formattedNip})? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus pegawai.");
      invalidateClientCache();
      toast.success("Data pegawai berhasil dihapus.");
      setLoading(true);
      setRefreshTick((t) => t + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus pegawai."
      );
    }
  };

  const units = data?.units ?? [];
  const availableRankGrades = data?.availableRankGrades ?? [];
  const availableBirthYears = data?.availableBirthYears ?? [];
  const availableYears = data?.availableYears ?? [];

  const unitItems: Record<string, string> = {
    all: "Semua Unit Kerja",
    ...Object.fromEntries(units.map((u) => [String(u.id), u.name])),
  };
  const rankGradeItems: Record<string, string> = {
    all: "Semua Golongan",
    ...Object.fromEntries(availableRankGrades.map((g) => [g, `Gol. ${g}`])),
  };
  const birthYearItems: Record<string, string> = {
    all: "Semua Tahun Lahir",
    ...Object.fromEntries(
      availableBirthYears.map((yr) => [String(yr), `Lahir ${yr}`])
    ),
  };
  const tmtYearItems: Record<string, string> = {
    all: "Semua Tahun Pensiun",
    ...Object.fromEntries(
      availableYears.map((yr) => [String(yr), `Pensiun ${yr}`])
    ),
  };

  const totalCount = data?.pagination.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Data Pegawai
          </h1>
          <p className="text-sm text-slate-600">
            Kelola master data ASN &amp; PPPK serta arsip pegawai purna tugas.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingEmployee(null);
            setDialogOpen(true);
          }}
          className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
        >
          <Plus className="mr-1.5 size-4" />
          Tambah Pegawai
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        {/* Baris 1: Tab Status Aktif/Arsip, Pencarian, dan Urutkan */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setLoading(true);
              setTab(v as "active" | "archived");
              setRankGrade("all");
              setBirthYear("all");
              setTmtYear("all");
            }}
          >
            <TabsList>
              <TabsTrigger value="active">Pegawai Aktif</TabsTrigger>
              <TabsTrigger value="archived">Arsip Purna Tugas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari Nama, NIP, atau Jabatan..."
                className="h-9 pl-8 text-sm"
              />
            </div>

            <div className="w-full sm:w-52">
              <Select
                value={`${sortBy}:${sortDir}`}
                onValueChange={handleSortSelect}
                items={SORT_ITEMS}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_ITEMS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Baris 2: Filter Unit, Status, Golongan, Tahun Lahir, Tahun TMT Pensiun */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            value={unitId}
            onValueChange={(v) => {
              setLoading(true);
              setUnitId(v ?? "all");
            }}
            items={unitItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Unit Kerja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Unit Kerja</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(v) => {
              setLoading(true);
              setStatus(v ?? "all");
            }}
            items={STATUS_ITEMS}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="PNS">PNS</SelectItem>
              <SelectItem value="PPPK_FULL">PPPK Penuh Waktu</SelectItem>
              <SelectItem value="PPPK_PART">PPPK Paruh Waktu</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={rankGrade}
            onValueChange={(v) => {
              setLoading(true);
              setRankGrade(v ?? "all");
            }}
            items={rankGradeItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Golongan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Golongan</SelectItem>
              {availableRankGrades.map((g) => (
                <SelectItem key={g} value={g}>
                  Gol. {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={birthYear}
            onValueChange={(v) => {
              setLoading(true);
              setBirthYear(v ?? "all");
            }}
            items={birthYearItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Tahun Lahir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun Lahir</SelectItem>
              {availableBirthYears.map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  Lahir {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tmtYear}
            onValueChange={(v) => {
              setLoading(true);
              setTmtYear(v ?? "all");
            }}
            items={tmtYearItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Tahun Pensiun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun Pensiun</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  Pensiun {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Footer Info & Reset Filter */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <p className="text-xs text-slate-600 tabular-nums">
            Menampilkan{" "}
            <span className="font-semibold text-slate-900">{totalCount}</span>{" "}
            pegawai
          </p>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Filter</span>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="max-h-[640px] overflow-x-auto overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#E2E8F0]">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="w-12 text-xs">No</TableHead>
                <TableHead className="text-xs">NIP</TableHead>
                <TableHead className="text-xs">
                  <SortableHeader
                    label="Nama & Jabatan"
                    columnKey="fullName"
                    activeSortBy={sortBy}
                    activeSortDir={sortDir}
                    onSort={handleSortChange}
                  />
                </TableHead>
                <TableHead className="text-xs">
                  <SortableHeader
                    label="Unit & Status"
                    columnKey="unitName"
                    activeSortBy={sortBy}
                    activeSortDir={sortDir}
                    onSort={handleSortChange}
                  />
                </TableHead>
                <TableHead className="text-xs">
                  <SortableHeader
                    label="Gol."
                    columnKey="rankGrade"
                    activeSortBy={sortBy}
                    activeSortDir={sortDir}
                    onSort={handleSortChange}
                  />
                </TableHead>
                <TableHead className="text-xs">
                  <SortableHeader
                    label="Tgl Lahir"
                    columnKey="birthDate"
                    activeSortBy={sortBy}
                    activeSortDir={sortDir}
                    onSort={handleSortChange}
                  />
                </TableHead>
                <TableHead className="text-xs">
                  <SortableHeader
                    label="TMT Pensiun"
                    columnKey="retirementDate"
                    activeSortBy={sortBy}
                    activeSortDir={sortDir}
                    onSort={handleSortChange}
                  />
                </TableHead>
                <TableHead className="text-right text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={
                loading && (data?.items.length ?? 0) > 0
                  ? "opacity-60 transition-opacity"
                  : undefined
              }
            >
              {loading && (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-slate-500"
                  >
                    Memuat master data pegawai...
                  </TableCell>
                </TableRow>
              ) : (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-slate-500"
                  >
                    {hasActiveFilters
                      ? "Tidak ada data pegawai yang sesuai dengan filter."
                      : tab === "active"
                        ? "Belum ada data pegawai aktif."
                        : "Belum ada pegawai di arsip purna tugas."}
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((emp, idx) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50/70">
                    <TableCell className="font-mono text-xs tabular-nums text-slate-500">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
                      {emp.formattedNip}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="font-medium text-slate-900">
                        {emp.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {emp.positionName}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-800">
                        {emp.unitName}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-0.5 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                      >
                        {EMPLOYMENT_STATUS_SHORT[emp.employmentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-slate-700">
                      {emp.rankGrade}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-700">
                      {formatIndonesianDate(emp.birthDate, true)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-slate-900">
                      {formatIndonesianDate(emp.retirementDate, true)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-700"
                          onClick={() => {
                            setEditingEmployee(emp);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-700"
                          onClick={() => handleToggleActive(emp)}
                        >
                          {emp.isActive ? (
                            <>
                              <Archive className="mr-1 size-3.5" />
                              Arsipkan
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Aktifkan
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDelete(emp)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmployee}
        units={units}
        defaultBupAge={data?.settings?.defaultBupAge ?? 60}
        tmtRule={data?.settings?.tmtRule ?? "FIRST_OF_NEXT_MONTH"}
        onSaved={() => {
          setLoading(true);
          setRefreshTick((t) => t + 1);
        }}
      />
    </div>
  );
}

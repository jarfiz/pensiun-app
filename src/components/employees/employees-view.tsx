"use client";

import React, { useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { EnrichedEmployee } from "@/lib/employee-queries";
import {
  EMPLOYMENT_STATUS_SHORT,
  formatIndonesianDate,
} from "@/lib/formatters";
import { EmployeeFormDialog } from "./employee-form-dialog";

interface EmployeesResponse {
  dbConfigured: boolean;
  items: EnrichedEmployee[];
  pagination: { total: number };
  units: Unit[];
  settings: AppSettings;
}

export function EmployeesView() {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [data, setData] = useState<EmployeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      isActive: tab === "active" ? "true" : "false",
      pageSize: "200",
      sortBy: "fullName",
      sortDir: "asc",
    });
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());

    fetch(`/api/employees?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data pegawai.");
        return res.json() as Promise<EmployeesResponse>;
      })
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
  }, [tab, debouncedQ, refreshTick]);

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
      toast.success("Data pegawai berhasil dihapus.");
      setLoading(true);
      setRefreshTick((t) => t + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus pegawai."
      );
    }
  };

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

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setLoading(true);
            setTab(v as "active" | "archived");
          }}
        >
          <TabsList>
            <TabsTrigger value="active">Pegawai Aktif</TabsTrigger>
            <TabsTrigger value="archived">Arsip Purna Tugas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari Nama, NIP, atau Jabatan..."
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-xs">No</TableHead>
                <TableHead className="text-xs">NIP</TableHead>
                <TableHead className="text-xs">Nama &amp; Jabatan</TableHead>
                <TableHead className="text-xs">Unit &amp; Status</TableHead>
                <TableHead className="text-xs">Gol.</TableHead>
                <TableHead className="text-xs">Tgl Lahir</TableHead>
                <TableHead className="text-xs">TMT Pensiun</TableHead>
                <TableHead className="text-right text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
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
                    {tab === "active"
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
        units={data?.units ?? []}
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

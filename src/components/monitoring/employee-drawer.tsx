"use client";

import React, { useState } from "react";
import { Archive, CalendarClock, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { RetirementProcessStatus, TmtRule } from "@/db/schema";
import type { EnrichedEmployee } from "@/lib/employee-queries";
import {
  EMPLOYMENT_STATUS_LABELS,
  formatIndonesianDate,
  PROCESS_STATUS_LABELS,
  URGENCY_META,
} from "@/lib/formatters";
import { calculateRetirementDate } from "@/lib/retirement";
import { cn } from "@/lib/utils";

interface EmployeeDrawerProps {
  employee: EnrichedEmployee | null;
  tmtRule?: TmtRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const BUP_OPTIONS = [58, 60, 65, 70] as const;

const BUP_ITEMS: Record<string, string> = {
  "58": "58 Tahun (Pelaksana/Administrasi)",
  "60": "60 Tahun (Default)",
  "65": "65 Tahun (Peneliti Madya / Fungsional)",
  "70": "70 Tahun (Peneliti Ahli Utama)",
};

export function EmployeeDrawer({
  employee,
  tmtRule = "FIRST_OF_NEXT_MONTH",
  open,
  onOpenChange,
  onUpdated,
}: EmployeeDrawerProps) {
  const [processStatus, setProcessStatus] = useState<RetirementProcessStatus>(
    employee?.processStatus ?? "BELUM"
  );
  const [bupAge, setBupAge] = useState<number>(employee?.bupAge ?? 60);
  const [notes, setNotes] = useState<string>(employee?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Sinkronkan state form ketika pegawai yang dipilih berubah
  const [prevId, setPrevId] = useState<number | null>(null);
  if (employee && employee.id !== prevId) {
    setPrevId(employee.id);
    setProcessStatus(employee.processStatus);
    setBupAge(employee.bupAge);
    setNotes(employee.notes ?? "");
  }

  if (!employee) {
    return null;
  }

  const urgencyMeta = URGENCY_META[employee.metrics.urgency];
  const previewRetirementDate =
    bupAge !== employee.bupAge
      ? calculateRetirementDate(employee.birthDate, bupAge, tmtRule)
      : employee.retirementDate;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processStatus,
          bupAge,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memperbarui data pegawai.");
      }
      toast.success("Data monitoring pegawai berhasil diperbarui.");
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    const nextActive = !employee.isActive;
    const confirmed = window.confirm(
      nextActive
        ? `Aktifkan kembali ${employee.fullName} ke daftar monitoring aktif?`
        : `Tandai ${employee.fullName} sebagai Purna Tugas (Arsipkan)?`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal mengubah status arsip.");
      }
      toast.success(
        nextActive
          ? "Pegawai diaktifkan kembali."
          : "Pegawai ditandai purna tugas dan diarsipkan."
      );
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengubah status arsip."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-2 pr-6">
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">
                {employee.fullName}
              </SheetTitle>
              <SheetDescription className="mt-1 font-mono text-xs tabular-nums text-slate-600">
                NIP {employee.formattedNip}
              </SheetDescription>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              {employee.unitName}
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
            </Badge>
            <Badge
              variant="outline"
              className={cn("border text-xs", urgencyMeta.badgeClass)}
            >
              {urgencyMeta.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Countdown Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <CalendarClock className="size-4 text-[#1E3A5F]" />
              <span>Proyeksi TMT Pensiun</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-4">
              <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                {formatIndonesianDate(previewRetirementDate)}
              </p>
              <span className="font-mono text-xs font-semibold tabular-nums text-[#1E3A5F]">
                {employee.metrics.remaining.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {employee.metrics.remaining.totalDays > 0
                ? `${employee.metrics.remaining.totalDays.toLocaleString("id-ID")} hari kalender menuju TMT pensiun.`
                : "Telah melewati atau tepat pada tanggal TMT pensiun."}
            </p>
          </div>

          {/* Detail Profil */}
          <div className="space-y-2.5 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Informasi Kepegawaian
            </h3>
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <dt className="text-slate-500">Jabatan</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {employee.positionName}
              </dd>

              <dt className="text-slate-500">Pangkat / Gol</dt>
              <dd className="col-span-2 font-mono font-medium text-slate-900">
                {employee.rankGrade}
              </dd>

              <dt className="text-slate-500">Jenis Kelamin</dt>
              <dd className="col-span-2 text-slate-800">
                {employee.gender === "L" ? "Laki-laki" : "Perempuan"}
              </dd>

              <dt className="text-slate-500">Tanggal Lahir</dt>
              <dd className="col-span-2 text-slate-800">
                {formatIndonesianDate(employee.birthDate)} (
                <span className="font-mono tabular-nums">
                  {employee.metrics.age.label}
                </span>
                )
              </dd>
            </dl>
          </div>

          <Separator />

          {/* Form Aksi Cepat */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pemberkasan &amp; Override BUP
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Status Pemberkasan Pensiun
              </label>
              <Select
                value={processStatus}
                onValueChange={(v) =>
                  setProcessStatus(v as RetirementProcessStatus)
                }
                items={PROCESS_STATUS_LABELS}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      PROCESS_STATUS_LABELS
                    ) as RetirementProcessStatus[]
                  ).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PROCESS_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Batas Usia Pensiun (BUP)
              </label>
              <Select
                value={String(bupAge)}
                onValueChange={(v) => setBupAge(Number(v))}
                items={BUP_ITEMS}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUP_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {BUP_ITEMS[String(opt)]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bupAge !== employee.bupAge && (
                <p className="text-[11px] font-medium text-[#1E3A5F]">
                  TMT akan berubah menjadi{" "}
                  {formatIndonesianDate(previewRetirementDate)}.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Catatan Admin / Alasan Override BUP
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Peneliti Ahli Utama BUP 70, atau catatan kelengkapan SK/Karis..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-slate-200 p-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={handleToggleArchive}
              className="text-xs text-slate-700"
            >
              {employee.isActive ? (
                <>
                  <Archive className="mr-1.5 size-3.5" />
                  Tandai Purna Tugas
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Aktifkan Kembali
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
            >
              <Save className="mr-1.5 size-3.5" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

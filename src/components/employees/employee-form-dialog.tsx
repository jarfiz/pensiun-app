"use client";

import React, { useMemo, useState } from "react";
import { CalendarCheck2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EmploymentStatus, TmtRule, Unit } from "@/db/schema";
import { invalidateClientCache } from "@/lib/client-fetch-cache";
import type { EnrichedEmployee } from "@/lib/employee-queries";
import { formatIndonesianDate } from "@/lib/formatters";
import { parseNip } from "@/lib/nip-parser";
import { calculateRetirementDate } from "@/lib/retirement";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EnrichedEmployee | null;
  units: Unit[];
  defaultBupAge?: number;
  tmtRule?: TmtRule;
  onSaved: () => void;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  units,
  defaultBupAge = 60,
  tmtRule = "FIRST_OF_NEXT_MONTH",
  onSaved,
}: EmployeeFormDialogProps) {
  const isEdit = Boolean(employee);

  const [nip, setNip] = useState(employee?.nip ?? "");
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [rankGrade, setRankGrade] = useState(employee?.rankGrade ?? "");
  const [positionName, setPositionName] = useState(employee?.positionName ?? "");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? "PNS"
  );
  const [unitId, setUnitId] = useState<string>(
    employee ? String(employee.unitId) : units[0] ? String(units[0].id) : ""
  );
  const [bupAge, setBupAge] = useState<number>(
    employee?.bupAge ?? defaultBupAge
  );
  const [notes, setNotes] = useState(employee?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Sinkronkan state ketika dialog dibuka dengan data baru/edit
  const [lastKey, setLastKey] = useState<string>("");
  const currentKey = `${open}-${employee?.id ?? "new"}-${units[0]?.id ?? ""}`;
  if (open && currentKey !== lastKey) {
    setLastKey(currentKey);
    setNip(employee?.nip ?? "");
    setFullName(employee?.fullName ?? "");
    setRankGrade(employee?.rankGrade ?? "");
    setPositionName(employee?.positionName ?? "");
    setEmploymentStatus(employee?.employmentStatus ?? "PNS");
    setUnitId(
      employee ? String(employee.unitId) : units[0] ? String(units[0].id) : ""
    );
    setBupAge(employee?.bupAge ?? defaultBupAge);
    setNotes(employee?.notes ?? "");
  }

  const nipPreview = useMemo(() => {
    if (!nip.trim()) return null;
    const parsed = parseNip(nip);
    if (!parsed.valid) {
      return { valid: false as const, error: parsed.error };
    }
    const retirementDate = calculateRetirementDate(
      parsed.data.birthDate,
      bupAge,
      tmtRule
    );
    return {
      valid: true as const,
      data: parsed.data,
      retirementDate,
    };
  }, [nip, bupAge, tmtRule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nipPreview || !nipPreview.valid) {
      toast.error(
        nipPreview?.error ?? "NIP 18 digit wajib diisi dengan benar."
      );
      return;
    }
    if (!unitId) {
      toast.error("Unit kerja wajib dipilih.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nip: nipPreview.data.nip,
        fullName: fullName.trim(),
        rankGrade: rankGrade.trim() || "-",
        positionName: positionName.trim(),
        employmentStatus,
        unitId: Number(unitId),
        bupAge,
        notes: notes.trim() || null,
      };

      const url = isEdit
        ? `/api/employees/${employee!.id}`
        : "/api/employees";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan data pegawai.");
      }

      invalidateClientCache();
      toast.success(
        isEdit
          ? "Data pegawai berhasil diperbarui."
          : "Pegawai baru berhasil ditambahkan."
      );
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan data pegawai."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
          </DialogTitle>
          <DialogDescription>
            Masukkan NIP 18 digit untuk mengekstrak tanggal lahir, jenis kelamin, dan TMT pensiun secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              NIP (18 Digit) <span className="text-red-600">*</span>
            </label>
            <Input
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 19670629 199503 2 001"
              className="font-mono text-sm"
              required
            />
            {nipPreview && (
              <div
                className={`mt-2 rounded-md border p-2.5 text-xs ${
                  nipPreview.valid
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {nipPreview.valid ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1E3A5F]">
                      <CheckCircle2 className="size-3.5" />
                      <span className="font-mono">{nipPreview.data.formatted}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                      <span>
                        Tgl Lahir:{" "}
                        <strong>
                          {formatIndonesianDate(nipPreview.data.birthDate, true)}
                        </strong>
                      </span>
                      <span>
                        JK:{" "}
                        <strong>
                          {nipPreview.data.gender === "L"
                            ? "Laki-laki"
                            : "Perempuan"}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck2 className="size-3 text-[#1E3A5F]" />
                        TMT:{" "}
                        <strong>
                          {formatIndonesianDate(nipPreview.retirementDate, true)}
                        </strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{nipPreview.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">
                Nama Lengkap (dengan Gelar) <span className="text-red-600">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap pegawai"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Pangkat / Golongan <span className="text-red-600">*</span>
              </label>
              <Input
                value={rankGrade}
                onChange={(e) => setRankGrade(e.target.value)}
                placeholder="Contoh: IV/a, III/c, IX, -"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Status Pegawai <span className="text-red-600">*</span>
              </label>
              <Select
                value={employmentStatus}
                onValueChange={(v) =>
                  setEmploymentStatus(v as EmploymentStatus)
                }
                items={{
                  PNS: "PNS",
                  PPPK_FULL: "PPPK Penuh Waktu",
                  PPPK_PART: "PPPK Paruh Waktu",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNS">PNS</SelectItem>
                  <SelectItem value="PPPK_FULL">PPPK Penuh Waktu</SelectItem>
                  <SelectItem value="PPPK_PART">PPPK Paruh Waktu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">
                Nama Jabatan <span className="text-red-600">*</span>
              </label>
              <Input
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                placeholder="Contoh: Analis Kebijakan Ahli Muda"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Unit Kerja <span className="text-red-600">*</span>
              </label>
              <Select
                value={unitId}
                onValueChange={(v) => setUnitId(v ?? "")}
                items={Object.fromEntries(units.map((u) => [String(u.id), u.name]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
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
                items={{
                  "58": "58 Tahun",
                  "60": "60 Tahun (Default)",
                  "65": "65 Tahun",
                  "70": "70 Tahun",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58 Tahun</SelectItem>
                  <SelectItem value="60">60 Tahun (Default)</SelectItem>
                  <SelectItem value="65">65 Tahun</SelectItem>
                  <SelectItem value="70">70 Tahun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">
                Catatan (Opsional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan atau alasan override BUP..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
            >
              {submitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Tambah Pegawai"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

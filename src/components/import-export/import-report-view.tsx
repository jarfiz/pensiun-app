"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ImportRowError } from "@/lib/excel-importer";
import { cn } from "@/lib/utils";
import { ExcelDropzone } from "./excel-dropzone";
import {
  ImportPreviewTable,
  type PreviewRowWithDuplicate,
} from "./import-preview-table";

interface PreviewApiResponse {
  fileName: string;
  sheetsProcessed: string[];
  rows: PreviewRowWithDuplicate[];
  errors: ImportRowError[];
  summary: {
    totalValid: number;
    totalErrors: number;
    newCount: number;
    duplicateCount: number;
    byUnit: Record<"BRIDA" | "UPTB_KRS" | "UPTB_STP", number>;
    byStatus: Record<"PNS" | "PPPK_FULL" | "PPPK_PART", number>;
  };
}

const REPORT_PRESETS = [
  {
    title: "Daftar Pegawai Pensiun ≤ 2 Tahun Mendatang",
    description:
      "Menampilkan pegawai yang telah melewati BUP, kritis (≤ 6 bulan), siaga (6–12 bulan), dan persiapan (1–2 tahun).",
    query: "urgency=UPCOMING&sortBy=retirementDate&sortDir=asc",
    excelQuery: "sortBy=retirementDate&sortDir=asc",
    printTitle: "DAFTAR PRIORITAS PENSIUN PEGAWAI (1–2 TAHUN MENDATANG)",
  },
  {
    title: "Daftar Pegawai Pensiun Tahun Berjalan",
    description:
      "Daftar nominatif pegawai dengan TMT pensiun pada tahun kalender berjalan.",
    query: `tmtYear=${new Date().getFullYear()}&sortBy=retirementDate&sortDir=asc`,
    excelQuery: `tmtYear=${new Date().getFullYear()}&sortBy=retirementDate&sortDir=asc`,
    printTitle: `DAFTAR NOMINATIF PEGAWAI PENSIUN TAHUN ${new Date().getFullYear()}`,
  },
  {
    title: "Rekapitulasi Seluruh Pegawai Aktif Urut TMT Pensiun",
    description:
      "Seluruh pegawai aktif BRIDA dan UPTB diurutkan dari TMT pensiun paling cepat.",
    query: "isActive=true&sortBy=retirementDate&sortDir=asc",
    excelQuery: "isActive=true&sortBy=retirementDate&sortDir=asc",
    printTitle: "REKAPITULASI MONITORING PENSIUN SELURUH PEGAWAI AKTIF",
  },
];

export function ImportReportView() {
  const [normalizeTitle, setNormalizeTitle] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<PreviewApiResponse | null>(null);
  const [lastResult, setLastResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const handleFileSelected = async (file: File) => {
    setParsing(true);
    setLastResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("normalizePositionTitle", String(normalizeTitle));

      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal membaca file Excel.");
      }
      setPreview(json as PreviewApiResponse);
      toast.success(
        `File "${file.name}" berhasil dipindai: ${json.summary.totalValid} baris valid.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses file Excel."
      );
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || preview.rows.length === 0) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: updateExisting ? "update" : "skip",
          rows: preview.rows.map((r) => ({
            nip: r.nip,
            fullName: r.fullName,
            rankGrade: r.rankGrade,
            positionName: r.positionName,
            employmentStatus: r.employmentStatus,
            unitCode: r.unitCode,
            bupAge: r.bupAge,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan data impor.");
      }
      setLastResult(json);
      toast.success(
        `Impor selesai: ${json.inserted} baru, ${json.updated} diperbarui, ${json.skipped} dilewati.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan data impor."
      );
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Impor Data &amp; Pusat Laporan
        </h1>
        <p className="text-sm text-slate-600">
          Unggah file Excel pegawai BRIDA/UPTB atau buat laporan resmi siap cetak (Excel &amp; PDF).
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Impor Data Excel</TabsTrigger>
          <TabsTrigger value="reports">Pusat Laporan Siap Cetak</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Unggah File Excel BRIDA &amp; UPTB
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <Checkbox
                    checked={normalizeTitle}
                    onCheckedChange={(v) => setNormalizeTitle(Boolean(v))}
                  />
                  <span>Normalisasi huruf kapital nama jabatan (Title Case)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <Checkbox
                    checked={updateExisting}
                    onCheckedChange={(v) => setUpdateExisting(Boolean(v))}
                  />
                  <span>Perbarui data jika NIP sudah ada di database</span>
                </label>
              </div>

              <ExcelDropzone
                onFileSelected={handleFileSelected}
                disabled={parsing || committing}
              />

              {parsing && (
                <p className="text-xs font-medium text-slate-600">
                  Membaca sheet dan memvalidasi NIP pegawai...
                </p>
              )}
            </CardContent>
          </Card>

          {lastResult && (
            <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                <span>
                  Impor berhasil disimpan:{" "}
                  <strong>{lastResult.inserted}</strong> pegawai baru,{" "}
                  <strong>{lastResult.updated}</strong> diperbarui,{" "}
                  <strong>{lastResult.skipped}</strong> dilewati.
                </span>
              </div>
              <Link
                href="/monitoring"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
                )}
              >
                Lihat di Monitoring Pensiun
              </Link>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Baris Valid
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {preview.summary.totalValid}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Data Baru
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-sky-700">
                    {preview.summary.newCount}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    NIP Sudah Ada
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-700">
                    {preview.summary.duplicateCount}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Baris Bermasalah
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-700">
                    {preview.summary.totalErrors}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="space-y-0.5 text-xs text-slate-600">
                  <p>
                    Sheet terbaca:{" "}
                    <strong>{preview.sheetsProcessed.join(", ")}</strong>
                  </p>
                  <p>
                    Unit: BRIDA ({preview.summary.byUnit.BRIDA}), UPTB KRS (
                    {preview.summary.byUnit.UPTB_KRS}), UPTB STP (
                    {preview.summary.byUnit.UPTB_STP})
                  </p>
                </div>

                <Button
                  onClick={handleCommit}
                  disabled={committing || preview.rows.length === 0}
                  className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
                >
                  <UploadCloud className="mr-1.5 size-4" />
                  {committing ? "Menyimpan ke Database..." : "Konfirmasi Impor"}
                </Button>
              </div>

              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-800">
                    <AlertCircle className="size-4" />
                    <span>
                      {preview.errors.length} baris dilewati karena NIP tidak valid:
                    </span>
                  </div>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                    {preview.errors.map((err, i) => (
                      <li key={i}>
                        [{err.sheetName} • Baris {err.rowNumber}]{" "}
                        <strong>{err.fullName}</strong> (NIP:{" "}
                        <code>{err.rawNip || "-"}</code>) — {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ImportPreviewTable
                rows={preview.rows}
                updateExisting={updateExisting}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {REPORT_PRESETS.map((preset) => (
              <Card key={preset.title} className="flex flex-col border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-[#1E3A5F]">
                    <FileSpreadsheet className="size-4" />
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      {preset.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-xs text-slate-600">{preset.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/export/excel?${preset.excelQuery}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <Download className="mr-1.5 size-3.5" />
                      Ekspor Excel
                    </a>
                    <Link
                      href={`/laporan/cetak?${preset.query}&title=${encodeURIComponent(preset.printTitle)}`}
                      target="_blank"
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
                      )}
                    >
                      <Printer className="mr-1.5 size-3.5" />
                      Cetak / PDF
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

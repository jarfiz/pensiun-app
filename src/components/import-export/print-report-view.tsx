"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AppSettings } from "@/db/schema";
import type { EnrichedEmployee } from "@/lib/employee-queries";
import {
  EMPLOYMENT_STATUS_SHORT,
  formatIndonesianDate,
  PROCESS_STATUS_LABELS,
} from "@/lib/formatters";

interface PrintApiResponse {
  items: EnrichedEmployee[];
  settings: AppSettings;
}

export function PrintReportView() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PrintApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reportTitle =
    searchParams.get("title") ??
    "DAFTAR MONITORING PENSIUN PEGAWAI (SIM-PENSIUN BRIDA)";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", "500");
    params.set("page", "1");

    fetch(`/api/employees?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<PrintApiResponse>)
      .then((json) => setData(json))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [searchParams]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const printedDate = formatIndonesianDate(todayIso);
  const items = data?.items ?? [];
  const institutionName =
    data?.settings?.institutionName ?? "BADAN RISET DAN INOVASI DAERAH";
  const institutionSubname =
    data?.settings?.institutionSubname ?? "PROVINSI SUMATERA SELATAN";

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      {/* Toolbar non-cetak */}
      <div className="no-print mx-auto mb-4 flex max-w-[1120px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <Link
          href="/monitoring"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Kembali ke Monitoring
        </Link>

        <Button
          onClick={() => window.print()}
          className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
          size="sm"
        >
          <Printer className="mr-1.5 size-4" />
          Cetak / Simpan PDF (A4 Landscape)
        </Button>
      </div>

      {/* Lembar Cetak Formal A4 Landscape */}
      <div className="mx-auto max-w-[1120px] bg-white p-6 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Kop Instansi Resmi */}
        <div className="border-b-2 border-black pb-3 text-center">
          <p className="text-xs font-semibold tracking-wider uppercase">
            PEMERINTAH {institutionSubname}
          </p>
          <h1 className="mt-0.5 text-lg font-bold tracking-wide uppercase">
            {institutionName}
          </h1>
          <p className="text-[11px] text-slate-700">
            Subbagian Umum dan Kepegawaian • Sistem Informasi Monitoring Pensiun Pegawai
          </p>
        </div>

        <div className="my-4 text-center">
          <h2 className="text-sm font-bold uppercase underline underline-offset-4">
            {reportTitle}
          </h2>
          <p className="mt-1 text-xs">
            Dicetak pada: {printedDate} • Total Data: {items.length} pegawai
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-xs text-slate-500">
            Menyiapkan pratinjau laporan...
          </p>
        ) : (
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-100">
                <th className="border border-black px-2 py-1.5 text-center">
                  No
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  NIP
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Nama Lengkap
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Pangkat/Gol
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Jabatan
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Unit Kerja
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Status
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Tgl Lahir
                </th>
                <th className="border border-black px-2 py-1.5 text-center">
                  BUP
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  TMT Pensiun
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Sisa Masa Kerja
                </th>
                <th className="border border-black px-2 py-1.5 text-left">
                  Status Berkas
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="border border-black px-3 py-6 text-center"
                  >
                    Tidak ada data pegawai sesuai filter yang dipilih.
                  </td>
                </tr>
              ) : (
                items.map((emp, idx) => (
                  <tr key={emp.id} className="break-inside-avoid">
                    <td className="border border-black px-2 py-1 text-center font-mono tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1 font-mono tabular-nums">
                      {emp.formattedNip}
                    </td>
                    <td className="border border-black px-2 py-1 font-medium">
                      {emp.fullName}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1 text-center font-mono">
                      {emp.rankGrade}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {emp.positionName}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1">
                      {emp.unitName}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1">
                      {EMPLOYMENT_STATUS_SHORT[emp.employmentStatus]}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1">
                      {formatIndonesianDate(emp.birthDate, true)}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-mono tabular-nums">
                      {emp.bupAge}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1 font-mono font-semibold tabular-nums">
                      {formatIndonesianDate(emp.retirementDate, true)}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1">
                      {emp.metrics.remaining.label}
                    </td>
                    <td className="whitespace-nowrap border border-black px-2 py-1">
                      {PROCESS_STATUS_LABELS[emp.processStatus]}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Blok Tanda Tangan Formal */}
        <div className="mt-8 flex justify-end break-inside-avoid">
          <div className="w-72 text-center text-xs">
            <p>Palembang, {printedDate}</p>
            <p className="mt-1 font-semibold">
              Kepala Subbagian Umum dan Kepegawaian
            </p>
            <div className="h-16" />
            <p className="font-semibold underline underline-offset-4">
              (....................................................)
            </p>
            <p className="mt-0.5 text-[11px]">NIP. ..........................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}

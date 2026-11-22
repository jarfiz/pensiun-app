"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportedEmployeeRow } from "@/lib/excel-importer";
import {
  EMPLOYMENT_STATUS_SHORT,
  formatIndonesianDate,
} from "@/lib/formatters";

export interface PreviewRowWithDuplicate extends ImportedEmployeeRow {
  isDuplicate: boolean;
}

interface ImportPreviewTableProps {
  rows: PreviewRowWithDuplicate[];
  updateExisting: boolean;
}

export function ImportPreviewTable({
  rows,
  updateExisting,
}: ImportPreviewTableProps) {
  const displayRows = rows.slice(0, 100);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-700">
          Pratinjau Data Terdeteksi ({rows.length} baris valid
          {rows.length > 100 ? ", menampilkan 100 baris pertama" : ""})
        </p>
      </div>
      <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            <TableRow>
              <TableHead className="w-12 text-xs">No</TableHead>
              <TableHead className="text-xs">Aksi</TableHead>
              <TableHead className="text-xs">NIP</TableHead>
              <TableHead className="text-xs">Nama &amp; Jabatan</TableHead>
              <TableHead className="text-xs">Unit &amp; Status</TableHead>
              <TableHead className="text-xs">Gol.</TableHead>
              <TableHead className="text-xs">Tgl Lahir</TableHead>
              <TableHead className="text-xs">TMT Pensiun</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, idx) => (
              <TableRow key={`${row.nip}-${idx}`}>
                <TableCell className="font-mono text-xs tabular-nums text-slate-500">
                  {idx + 1}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.isDuplicate ? (
                    <Badge
                      variant="outline"
                      className={
                        updateExisting
                          ? "border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                          : "border-slate-200 bg-slate-100 text-[10px] text-slate-600"
                      }
                    >
                      {updateExisting ? "PERBARUI" : "LEWATI"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-[10px] text-sky-800"
                    >
                      BARU
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
                  {row.formattedNip}
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <p className="text-xs font-medium text-slate-900">
                    {row.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {row.positionName}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <p className="text-xs text-slate-800">{row.unitCode}</p>
                  <p className="text-[11px] text-slate-500">
                    {EMPLOYMENT_STATUS_SHORT[row.employmentStatus]}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-slate-700">
                  {row.rankGrade}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-700">
                  {formatIndonesianDate(row.birthDate, true)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-slate-900">
                  {formatIndonesianDate(row.retirementDate, true)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

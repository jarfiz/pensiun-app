"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EnrichedEmployee } from "@/lib/employee-queries";
import { formatIndonesianDate, URGENCY_META } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface WatchlistTableProps {
  employees: EnrichedEmployee[];
}

export function WatchlistTable({ employees }: WatchlistTableProps) {
  const top8 = employees.slice(0, 8);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Prioritas Terdekat (Top 8)
          </CardTitle>
          <p className="text-xs text-slate-500">
            Pegawai dengan TMT pensiun paling dekat
          </p>
        </div>
        <Link
          href="/monitoring"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-xs text-[#1E3A5F]"
          )}
        >
          <span>Lihat Semua</span>
          <ArrowRight className="ml-1 size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs">Nama &amp; NIP</TableHead>
                <TableHead className="text-xs">Unit Kerja</TableHead>
                <TableHead className="text-xs">TMT Pensiun</TableHead>
                <TableHead className="text-xs">Sisa Waktu</TableHead>
                <TableHead className="text-right text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top8.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-28 text-center text-sm text-slate-500"
                  >
                    Belum ada data pegawai aktif.
                  </TableCell>
                </TableRow>
              ) : (
                top8.map((emp) => {
                  const meta = URGENCY_META[emp.metrics.urgency];
                  return (
                    <TableRow key={emp.id} className="hover:bg-slate-50/80">
                      <TableCell className="min-w-[200px]">
                        <p className="font-medium text-slate-900">
                          {emp.fullName}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-slate-500">
                          {emp.formattedNip}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-700">
                        {emp.unitName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-slate-900">
                        {formatIndonesianDate(emp.retirementDate, true)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border text-xs tabular-nums",
                            meta.badgeClass
                          )}
                        >
                          {emp.metrics.remaining.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Link
                          href={`/monitoring?q=${encodeURIComponent(emp.nip)}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-8 px-2 text-xs text-[#1E3A5F]"
                          )}
                        >
                          <Eye className="mr-1 size-3.5" />
                          Lihat Detail
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

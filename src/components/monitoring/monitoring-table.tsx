"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type {
  EmployeeSortBy,
  EnrichedEmployee,
} from "@/lib/employee-queries";
import {
  EMPLOYMENT_STATUS_SHORT,
  formatIndonesianDate,
  PROCESS_STATUS_LABELS,
  URGENCY_META,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MonitoringTableProps {
  items: EnrichedEmployee[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sortBy: EmployeeSortBy;
  sortDir: "asc" | "desc";
  onSortChange: (col: EmployeeSortBy) => void;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  onSelectEmployee: (emp: EnrichedEmployee) => void;
}

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

export function MonitoringTable({
  items,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  sortBy,
  sortDir,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSelectEmployee,
}: MonitoringTableProps) {
  const columns = useMemo<ColumnDef<EnrichedEmployee>[]>(
    () => [
      {
        id: "no",
        header: "No",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "formattedNip",
        header: "NIP",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
            {row.original.formattedNip}
          </span>
        ),
      },
      {
        id: "fullName",
        header: () => (
          <SortableHeader
            label="Nama & Jabatan"
            columnKey="fullName"
            activeSortBy={sortBy}
            activeSortDir={sortDir}
            onSort={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[200px] max-w-[280px]">
            <p className="truncate font-medium text-slate-900">
              {row.original.fullName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.original.positionName}
            </p>
          </div>
        ),
      },
      {
        id: "unitName",
        header: () => (
          <SortableHeader
            label="Unit & Status"
            columnKey="unitName"
            activeSortBy={sortBy}
            activeSortDir={sortDir}
            onSort={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1 whitespace-nowrap">
            <p className="text-xs font-medium text-slate-800">
              {row.original.unitName}
            </p>
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600"
            >
              {EMPLOYMENT_STATUS_SHORT[row.original.employmentStatus]}
            </Badge>
          </div>
        ),
      },
      {
        id: "rankGrade",
        header: () => (
          <SortableHeader
            label="Gol."
            columnKey="rankGrade"
            activeSortBy={sortBy}
            activeSortDir={sortDir}
            onSort={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-slate-700">
            {row.original.rankGrade}
          </span>
        ),
      },
      {
        id: "birthDate",
        header: () => (
          <SortableHeader
            label="Tgl Lahir & Usia"
            columnKey="birthDate"
            activeSortBy={sortBy}
            activeSortDir={sortDir}
            onSort={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p className="text-xs font-medium text-slate-800">
              {formatIndonesianDate(row.original.birthDate, true)}
            </p>
            <p className="font-mono text-[11px] tabular-nums text-slate-500">
              {row.original.metrics.age.label}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "bupAge",
        header: "BUP",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
            {row.original.bupAge} th
          </span>
        ),
      },
      {
        id: "retirementDate",
        header: () => (
          <SortableHeader
            label="TMT Pensiun"
            columnKey="retirementDate"
            activeSortBy={sortBy}
            activeSortDir={sortDir}
            onSort={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-slate-900">
            {formatIndonesianDate(row.original.retirementDate, true)}
          </span>
        ),
      },
      {
        id: "remaining",
        header: "Sisa Masa Kerja",
        cell: ({ row }) => {
          const urgency = row.original.metrics.urgency;
          const meta = URGENCY_META[urgency];
          return (
            <Badge
              variant="outline"
              className={cn(
                "whitespace-nowrap border text-xs font-medium tabular-nums",
                meta.badgeClass
              )}
            >
              {row.original.metrics.remaining.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "processStatus",
        header: "Status Berkas",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-slate-600">
            {PROCESS_STATUS_LABELS[row.original.processStatus]}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-[#1E3A5F] hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onSelectEmployee(row.original);
            }}
          >
            <Eye className="size-3.5" />
            <span>Detail</span>
          </Button>
        ),
      },
    ],
    [onSelectEmployee, onSortChange, page, pageSize, sortBy, sortDir]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="max-h-[640px] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#E2E8F0]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-slate-50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 whitespace-nowrap px-3 text-xs font-semibold text-slate-700"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={
              loading && items.length > 0
                ? "opacity-60 transition-opacity"
                : undefined
            }
          >
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-slate-500"
                >
                  Memuat data monitoring pensiun...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <p className="text-sm font-medium text-slate-700">
                      Tidak ada data pegawai yang sesuai kriteria.
                    </p>
                    <p className="text-xs text-slate-500">
                      Ubah filter pencarian atau impor data pegawai dari file Excel BRIDA.
                    </p>
                    <Link
                      href="/impor-laporan"
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "mt-2 bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
                      )}
                    >
                      <FileSpreadsheet className="mr-1.5 size-4" />
                      Impor File Excel BRIDA
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onSelectEmployee(row.original)}
                  className="cursor-pointer border-slate-200 transition-colors hover:bg-slate-50/90"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-600 tabular-nums">
          Menampilkan{" "}
          <span className="font-semibold text-slate-900">
            {startItem}–{endItem}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-900">{total}</span> pegawai
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Baris:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[74px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Sebelumnya
            </Button>
            <span className="px-2 font-mono text-xs tabular-nums text-slate-600">
              {totalPages === 0 ? 0 : page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={page >= totalPages || totalPages === 0 || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Berikutnya
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

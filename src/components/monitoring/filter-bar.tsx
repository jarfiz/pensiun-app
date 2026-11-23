"use client";

import React from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit } from "@/db/schema";

interface FilterBarProps {
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  unitId: string;
  onUnitIdChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  tmtYear: string;
  onTmtYearChange: (val: string) => void;
  processStatus: string;
  onProcessStatusChange: (val: string) => void;
  units: Unit[];
  availableYears: number[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

export function FilterBar({
  searchInput,
  onSearchInputChange,
  unitId,
  onUnitIdChange,
  status,
  onStatusChange,
  tmtYear,
  onTmtYearChange,
  processStatus,
  onProcessStatusChange,
  units,
  availableYears,
  hasActiveFilters,
  onReset,
}: FilterBarProps) {
  const unitItems: Record<string, string> = {
    all: "Semua Unit Kerja",
    ...Object.fromEntries(units.map((u) => [String(u.id), u.name])),
  };
  const statusItems = {
    all: "Semua Status",
    PNS: "PNS",
    PPPK_FULL: "PPPK Penuh Waktu",
    PPPK_PART: "PPPK Paruh Waktu",
  };
  const yearItems: Record<string, string> = {
    all: "Semua Tahun TMT",
    ...Object.fromEntries(availableYears.map((yr) => [String(yr), `Tahun ${yr}`])),
  };
  const processItems = {
    all: "Semua Status Berkas",
    BELUM: "Belum Diproses",
    BERKAS: "Pengumpulan Berkas",
    DIAJUKAN: "Diajukan",
    SELESAI: "Selesai",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Cari Nama, NIP (dengan/tanpa spasi), atau Jabatan..."
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="lg:col-span-2">
          <Select
            value={unitId}
            onValueChange={(v) => onUnitIdChange(v ?? "all")}
            items={unitItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Semua Unit" />
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
        </div>

        <div className="lg:col-span-2">
          <Select
            value={status}
            onValueChange={(v) => onStatusChange(v ?? "all")}
            items={statusItems}
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
        </div>

        <div className="lg:col-span-2">
          <Select
            value={tmtYear}
            onValueChange={(v) => onTmtYearChange(v ?? "all")}
            items={yearItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Tahun TMT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun TMT</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  Tahun {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Select
            value={processStatus}
            onValueChange={(v) => onProcessStatusChange(v ?? "all")}
            items={processItems}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Status Berkas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status Berkas</SelectItem>
              <SelectItem value="BELUM">Belum Diproses</SelectItem>
              <SelectItem value="BERKAS">Pengumpulan Berkas</SelectItem>
              <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
              <SelectItem value="SELESAI">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-2.5 flex items-center justify-end border-t border-slate-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Filter</span>
          </Button>
        </div>
      )}
    </div>
  );
}

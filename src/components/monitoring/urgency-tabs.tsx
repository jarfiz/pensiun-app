"use client";

import React from "react";
import type { UrgencyCounts, UrgencyFilter } from "@/lib/employee-queries";
import { cn } from "@/lib/utils";

interface UrgencyTabsProps {
  value: UrgencyFilter;
  counts: UrgencyCounts;
  onChange: (next: UrgencyFilter) => void;
}

interface TabDef {
  id: UrgencyFilter;
  label: string;
  countKey: keyof UrgencyCounts;
  highlightClass?: string;
}

const TABS: TabDef[] = [
  { id: "all", label: "Semua Aktif", countKey: "allActive" },
  {
    id: "OVERDUE",
    label: "Perlu Cek / Lewat BUP",
    countKey: "overdue",
    highlightClass: "text-red-700",
  },
  {
    id: "CRITICAL",
    label: "≤ 6 Bulan",
    countKey: "critical",
    highlightClass: "text-rose-700",
  },
  {
    id: "WARNING",
    label: "6–12 Bulan",
    countKey: "warning",
    highlightClass: "text-amber-800",
  },
  {
    id: "UPCOMING",
    label: "1–2 Tahun",
    countKey: "upcoming",
    highlightClass: "text-sky-800",
  },
  { id: "TWO_TO_FIVE", label: "2–5 Tahun", countKey: "twoToFive" },
];

export function UrgencyTabs({ value, counts, onChange }: UrgencyTabsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const isActive =
          value === tab.id ||
          (tab.id === "CRITICAL" && value === "CRITICAL_OR_OVERDUE");
        const count = counts[tab.countKey] ?? 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                isActive
                  ? "bg-white/20 text-white"
                  : cn("bg-slate-100 text-slate-600", tab.highlightClass)
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

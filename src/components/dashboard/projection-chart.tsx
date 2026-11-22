"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit } from "@/db/schema";
import type { EnrichedEmployee } from "@/lib/employee-queries";

interface ProjectionChartProps {
  employees: EnrichedEmployee[];
  units: Unit[];
}

const emptySubscribe = () => () => {};

export function ProjectionChart({ employees, units }: ProjectionChartProps) {
  const [unitFilter, setUnitFilter] = useState("all");
  const currentYear = useSyncExternalStore(
    emptySubscribe,
    () => new Date().getFullYear(),
    () => 2026
  );

  const chartData = useMemo(() => {
    const years = Array.from({ length: 10 }, (_, idx) => currentYear + idx);

    const filtered =
      unitFilter === "all"
        ? employees
        : employees.filter((e) => String(e.unitId) === unitFilter);

    const countsByYear = new Map<number, number>();
    for (const y of years) countsByYear.set(y, 0);

    for (const emp of filtered) {
      const y = Number(emp.retirementDate.slice(0, 4));
      if (countsByYear.has(y)) {
        countsByYear.set(y, (countsByYear.get(y) ?? 0) + 1);
      }
    }

    return years.map((y) => ({
      year: String(y),
      jumlah: countsByYear.get(y) ?? 0,
    }));
  }, [currentYear, employees, unitFilter]);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Proyeksi Pensiun 10 Tahun ke Depan
          </CardTitle>
          <p className="text-xs text-slate-500">
            Distribusi jumlah pegawai yang memasuki TMT pensiun per tahun
          </p>
        </div>

        <Select
          value={unitFilter}
          onValueChange={(v) => setUnitFilter(v ?? "all")}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
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
      </CardHeader>

      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "#475569" }}
                axisLine={{ stroke: "#CBD5E1" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#F1F5F9" }}
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${value ?? 0} pegawai`, "Akan Pensiun"]}
                labelFormatter={(label) => `Tahun ${label}`}
              />
              <Bar
                dataKey="jumlah"
                fill="#1E3A5F"
                radius={[4, 4, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

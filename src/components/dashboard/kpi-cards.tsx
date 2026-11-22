"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardsProps {
  totalActive: number;
  statusBreakdown: { pns: number; pppkFull: number; pppkPart: number };
  criticalAndOverdue: number;
  warningCount: number;
  upcomingCount: number;
}

export function KpiCards({
  totalActive,
  statusBreakdown,
  criticalAndOverdue,
  warningCount,
  upcomingCount,
}: KpiCardsProps) {
  const cards = [
    {
      title: "Total Pegawai Aktif",
      value: totalActive,
      subtitle: `PNS ${statusBreakdown.pns} • PPPK Penuh ${statusBreakdown.pppkFull} • PPPK Paruh ${statusBreakdown.pppkPart}`,
      href: "/monitoring",
      icon: Users,
      accentClass: "text-[#1E3A5F]",
    },
    {
      title: "Lewat BUP & Kritis (≤ 6 Bln)",
      value: criticalAndOverdue,
      subtitle: "Memerlukan pengecekan & pemberkasan segera",
      href: "/monitoring?urgency=CRITICAL_OR_OVERDUE",
      icon: AlertTriangle,
      accentClass: "text-rose-700",
    },
    {
      title: "Pensiun Dalam 1 Tahun",
      value: warningCount,
      subtitle: "Rentang 6–12 bulan menuju TMT pensiun",
      href: "/monitoring?urgency=WARNING",
      icon: Clock,
      accentClass: "text-amber-700",
    },
    {
      title: "Pensiun 1–2 Tahun",
      value: upcomingCount,
      subtitle: "Tahap persiapan administrasi kepegawaian",
      href: "/monitoring?urgency=UPCOMING",
      icon: CalendarClock,
      accentClass: "text-sky-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href} className="group block">
            <Card className="h-full border-slate-200 bg-white transition-colors group-hover:border-[#1E3A5F]/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </CardTitle>
                <Icon className={`size-4 ${card.accentClass}`} />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-bold tabular-nums text-slate-900">
                  {card.value}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{card.subtitle}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

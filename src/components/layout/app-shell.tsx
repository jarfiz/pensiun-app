"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Building2,
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dasbor",
    href: "/",
    icon: LayoutDashboard,
    description: "Ringkasan KPI & proyeksi pensiun",
  },
  {
    label: "Monitoring Pensiun",
    href: "/monitoring",
    icon: CalendarClock,
    description: "Pantau TMT & urgensi pensiun",
  },
  {
    label: "Data Pegawai",
    href: "/pegawai",
    icon: Users,
    description: "Master data pegawai & arsip",
  },
  {
    label: "Impor & Laporan",
    href: "/impor-laporan",
    icon: FileSpreadsheet,
    description: "Impor Excel BRIDA & cetak laporan",
  },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    description: "Konfigurasi BUP, TMT & instansi",
  },
];

function getBreadcrumbLabel(pathname: string): string {
  if (pathname === "/") return "Dasbor";
  const matched = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href)
  );
  if (matched) return matched.label;
  if (pathname.startsWith("/laporan/cetak")) return "Pratinjau Cetak Laporan";
  return "Halaman";
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1E3A5F] text-white">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">
            SIM-PENSIUN
          </p>
          <p className="truncate text-[11px] font-medium text-slate-500">
            BRIDA &amp; UPTB Sumsel
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Navigasi Utama">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1E3A5F] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-white" : "text-slate-500"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Subbagian Umum &amp; Kepegawaian
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Standar BKN • BUP Default 60 Thn
          </p>
        </div>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const todayLabel = useSyncExternalStore(
    emptySubscribe,
    () => format(new Date(), "EEEE, dd MMMM yyyy", { locale: idLocale }),
    () => ""
  );

  // Halaman cetak PDF A4 tidak menggunakan sidebar/header shell
  if (pathname.startsWith("/laporan/cetak")) {
    return <>{children}</>;
  }

  const currentTitle = getBreadcrumbLabel(pathname);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Fixed Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SidebarContent
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <Menu className="size-4" />
            </Button>

            <div className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link
                href="/"
                className="hidden font-medium text-slate-500 hover:text-slate-900 sm:inline"
              >
                SIM-PENSIUN BRIDA
              </Link>
              <ChevronRight className="hidden size-4 text-slate-400 sm:inline" />
              <span className="truncate font-semibold text-slate-900">
                {currentTitle}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
            <span>{todayLabel}</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

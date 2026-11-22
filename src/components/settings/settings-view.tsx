"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppSettings, TmtRule } from "@/db/schema";

interface SettingsApiResponse {
  settings: AppSettings;
  dbConfigured: boolean;
}

export function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbConfigured, setDbConfigured] = useState(true);

  const [institutionName, setInstitutionName] = useState(
    "BADAN RISET DAN INOVASI DAERAH"
  );
  const [institutionSubname, setInstitutionSubname] = useState(
    "PROVINSI SUMATERA SELATAN"
  );
  const [defaultBupAge, setDefaultBupAge] = useState("60");
  const [tmtRule, setTmtRule] = useState<TmtRule>("FIRST_OF_NEXT_MONTH");
  const [initialTmtRule, setInitialTmtRule] =
    useState<TmtRule>("FIRST_OF_NEXT_MONTH");
  const [criticalMonths, setCriticalMonths] = useState("6");
  const [warningMonths, setWarningMonths] = useState("12");
  const [upcomingMonths, setUpcomingMonths] = useState("24");
  const [recalculateExistingBup, setRecalculateExistingBup] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then((res) => res.json() as Promise<SettingsApiResponse>)
      .then((json) => {
        setDbConfigured(json.dbConfigured);
        if (json.settings) {
          setInstitutionName(json.settings.institutionName);
          setInstitutionSubname(json.settings.institutionSubname);
          setDefaultBupAge(String(json.settings.defaultBupAge));
          setTmtRule(json.settings.tmtRule);
          setInitialTmtRule(json.settings.tmtRule);
          setCriticalMonths(String(json.settings.criticalMonths));
          setWarningMonths(String(json.settings.warningMonths));
          setUpcomingMonths(String(json.settings.upcomingMonths));
        }
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.error(error);
          toast.error("Gagal memuat pengaturan.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tmtRule !== initialTmtRule) {
      const ok = window.confirm(
        "Mengubah aturan perhitungan TMT Pensiun akan menghitung ulang tanggal TMT seluruh pegawai di database. Lanjutkan?"
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionName,
          institutionSubname,
          defaultBupAge: Number(defaultBupAge),
          tmtRule,
          criticalMonths: Number(criticalMonths),
          warningMonths: Number(warningMonths),
          upcomingMonths: Number(upcomingMonths),
          recalculateExistingBup,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan pengaturan.");
      }
      setInitialTmtRule(tmtRule);
      const msg =
        json.recalculatedCount > 0
          ? `Pengaturan disimpan & ${json.recalculatedCount} data TMT pegawai dihitung ulang.`
          : "Pengaturan aplikasi berhasil disimpan.";
      toast.success(msg);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan pengaturan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Pengaturan Aplikasi
        </h1>
        <p className="text-sm text-slate-600">
          Konfigurasi identitas instansi untuk kop cetak, usia default BUP, aturan TMT, dan ambang peringatan.
        </p>
      </div>

      {!dbConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Database PostgreSQL belum terhubung (<code>DATABASE_URL</code> belum diatur). Perubahan pengaturan baru dapat disimpan setelah database aktif.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Identitas Instansi (Kop Laporan Cetak)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Nama Instansi
              </label>
              <Input
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Sub-nama Instansi / Pemerintah Daerah
              </label>
              <Input
                value={institutionSubname}
                onChange={(e) => setInstitutionSubname(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Aturan BUP &amp; Perhitungan TMT Pensiun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Usia Default BUP (Tahun)
                </label>
                <Input
                  type="number"
                  min={50}
                  max={75}
                  value={defaultBupAge}
                  onChange={(e) => setDefaultBupAge(e.target.value)}
                  disabled={loading}
                  className="font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Standar default aplikasi adalah 60 tahun.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Metode Perhitungan TMT Pensiun
                </label>
                <Select
                  value={tmtRule}
                  onValueChange={(v) => setTmtRule(v as TmtRule)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_OF_NEXT_MONTH">
                      Tanggal 1 Bulan Berikutnya (Standar BKN)
                    </SelectItem>
                    <SelectItem value="EXACT_BIRTHDAY">
                      Tepat Tanggal Ulang Tahun
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <Checkbox
                checked={recalculateExistingBup}
                onCheckedChange={(v) => setRecalculateExistingBup(Boolean(v))}
              />
              <span>
                Terapkan perubahan usia default BUP ke pegawai yang masih menggunakan BUP default sebelumnya
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Ambang Batas Peringatan (Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Kritis (≤ Bulan)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={criticalMonths}
                  onChange={(e) => setCriticalMonths(e.target.value)}
                  disabled={loading}
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Siaga (≤ Bulan)
                </label>
                <Input
                  type="number"
                  min={2}
                  max={36}
                  value={warningMonths}
                  onChange={(e) => setWarningMonths(e.target.value)}
                  disabled={loading}
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Persiapan (≤ Bulan)
                </label>
                <Input
                  type="number"
                  min={6}
                  max={60}
                  value={upcomingMonths}
                  onChange={(e) => setUpcomingMonths(e.target.value)}
                  disabled={loading}
                  className="font-mono"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || saving || !dbConfigured}
            className="bg-[#1E3A5F] text-white hover:bg-[#162D4A]"
          >
            <Save className="mr-1.5 size-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

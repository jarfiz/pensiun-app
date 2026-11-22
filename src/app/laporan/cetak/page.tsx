import { Suspense } from "react";
import { PrintReportView } from "@/components/import-export/print-report-view";

export default function CetakLaporanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          Menyiapkan halaman cetak...
        </div>
      }
    >
      <PrintReportView />
    </Suspense>
  );
}

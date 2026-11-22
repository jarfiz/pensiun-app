import { Suspense } from "react";
import { MonitoringView } from "@/components/monitoring/monitoring-view";

export default function MonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat halaman monitoring...
        </div>
      }
    >
      <MonitoringView />
    </Suspense>
  );
}

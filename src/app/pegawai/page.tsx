import { Suspense } from "react";
import { EmployeesView } from "@/components/employees/employees-view";

export default function PegawaiPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat data pegawai...
        </div>
      }
    >
      <EmployeesView />
    </Suspense>
  );
}

import { NextRequest, NextResponse } from "next/server";
import {
  queryEmployees,
  type EmployeeSortBy,
  type UrgencyFilter,
} from "@/lib/employee-queries";
import { buildRetirementExcelBuffer } from "@/lib/excel-exporter";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q") ?? undefined;
    const unitIdParam = sp.get("unitId");
    const unitId =
      unitIdParam && unitIdParam !== "all" ? Number(unitIdParam) : null;
    const statusParam = sp.get("status") ?? "all";
    const urgencyParam = (sp.get("urgency") ?? "all") as UrgencyFilter;
    const tmtYearParam = sp.get("tmtYear");
    const tmtYear =
      tmtYearParam && tmtYearParam !== "all" ? Number(tmtYearParam) : null;
    const processStatusParam = sp.get("processStatus") ?? "all";
    const isActiveParam = sp.get("isActive");
    const isActive =
      isActiveParam === "all"
        ? "all"
        : isActiveParam === "false"
          ? false
          : true;
    const sortBy = (sp.get("sortBy") ?? "retirementDate") as EmployeeSortBy;
    const sortDir = sp.get("sortDir") === "desc" ? "desc" : "asc";

    const result = await queryEmployees({
      q,
      unitId: Number.isFinite(unitId) ? unitId : null,
      status: statusParam as "PNS" | "PPPK_FULL" | "PPPK_PART" | "all",
      urgency: urgencyParam,
      tmtYear: Number.isFinite(tmtYear) ? tmtYear : null,
      processStatus: processStatusParam as
        | "BELUM"
        | "BERKAS"
        | "DIAJUKAN"
        | "SELESAI"
        | "all",
      isActive,
      sortBy,
      sortDir,
      page: 1,
      pageSize: 500,
    });

    const buffer = buildRetirementExcelBuffer(result.items, {
      institutionName: result.settings.institutionName,
      institutionSubname: result.settings.institutionSubname,
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan-Monitoring-Pensiun-BRIDA-${todayStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/excel error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan file Excel." },
      { status: 500 }
    );
  }
}

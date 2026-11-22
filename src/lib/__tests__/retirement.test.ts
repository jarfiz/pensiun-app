import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateRemainingService,
  calculateRetirementDate,
} from "@/lib/retirement";

describe("retirement calculator", () => {
  it("menghitung TMT default BUP 60 (tanggal 1 bulan berikutnya)", () => {
    expect(calculateRetirementDate("1967-06-29", 60, "FIRST_OF_NEXT_MONTH")).toBe(
      "2027-07-01"
    );
  });

  it("menangani edge case lahir bulan Desember rollover ke 1 Januari tahun berikutnya", () => {
    expect(calculateRetirementDate("1967-12-04", 60, "FIRST_OF_NEXT_MONTH")).toBe(
      "2028-01-01"
    );
  });

  it("menangani edge case lahir tanggal 1 tetap jatuh pada tanggal 1 bulan berikutnya", () => {
    expect(calculateRetirementDate("1972-05-01", 60, "FIRST_OF_NEXT_MONTH")).toBe(
      "2032-06-01"
    );
  });

  it("mendukung override BUP 58, 65, dan 70", () => {
    expect(calculateRetirementDate("1968-03-15", 58, "FIRST_OF_NEXT_MONTH")).toBe(
      "2026-04-01"
    );
    expect(calculateRetirementDate("1968-03-15", 65, "FIRST_OF_NEXT_MONTH")).toBe(
      "2033-04-01"
    );
    expect(calculateRetirementDate("1968-03-15", 70, "FIRST_OF_NEXT_MONTH")).toBe(
      "2038-04-01"
    );
  });

  it("mendukung metode EXACT_BIRTHDAY termasuk penanganan 29 Feb pada tahun non-kabisat", () => {
    expect(calculateRetirementDate("1980-02-29", 60, "EXACT_BIRTHDAY")).toBe(
      "2040-02-29"
    );
    expect(calculateRetirementDate("1980-02-29", 61, "EXACT_BIRTHDAY")).toBe(
      "2041-02-28"
    );
  });

  it("menghitung usia saat ini dengan benar", () => {
    const age = calculateAge("1967-06-29", "2026-11-22");
    expect(age.years).toBe(59);
    expect(age.months).toBe(4);
    expect(age.label).toBe("59 th 4 bln");
  });

  it("mengklasifikasikan 5 level urgensi berdasarkan sisa masa kerja", () => {
    // OVERDUE: sisaHari <= 0
    const overdue = calculateRemainingService("2026-10-01", "2026-11-22");
    expect(overdue.urgency).toBe("OVERDUE");
    expect(overdue.label).toContain("Lewat");

    const dueToday = calculateRemainingService("2026-11-22", "2026-11-22");
    expect(dueToday.urgency).toBe("OVERDUE");

    // CRITICAL: <= 6 bulan
    const critical = calculateRemainingService("2027-05-01", "2026-11-22");
    expect(critical.urgency).toBe("CRITICAL");

    // WARNING: > 6 bulan dan <= 12 bulan
    const warning = calculateRemainingService("2027-07-01", "2026-11-22");
    expect(warning.urgency).toBe("WARNING");

    // UPCOMING: > 12 bulan dan <= 24 bulan
    const upcoming = calculateRemainingService("2028-06-01", "2026-11-22");
    expect(upcoming.urgency).toBe("UPCOMING");

    // SAFE: > 24 bulan
    const safe = calculateRemainingService("2030-01-01", "2026-11-22");
    expect(safe.urgency).toBe("SAFE");
  });
});

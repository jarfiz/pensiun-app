import { describe, expect, it } from "vitest";
import { formatNip, parseNip, sanitizeNip } from "@/lib/nip-parser";

describe("nip-parser", () => {
  it("membersihkan spasi biasa dan non-breaking space (\\xa0) dari NIP", () => {
    const raw = "19670629\u00A0199503\u00A02\u00A0001 ";
    expect(sanitizeNip(raw)).toBe("196706291995032001");

    const parsed = parseNip(raw);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.data.nip).toBe("196706291995032001");
      expect(parsed.data.birthDate).toBe("1967-06-29");
      expect(parsed.data.appointmentYm).toBe("1995-03");
      expect(parsed.data.gender).toBe("P");
      expect(parsed.data.sequence).toBe("001");
      expect(parsed.data.formatted).toBe("19670629 199503 2 001");
    }
  });

  it("mem-parse NIP laki-laki dengan benar", () => {
    const parsed = parseNip("197205011998031004");
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.data.gender).toBe("L");
      expect(parsed.data.birthDate).toBe("1972-05-01");
    }
  });

  it("menolak NIP yang panjangnya bukan 18 digit", () => {
    const res = parseNip("19670629199503200");
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain("18 digit");
    }
  });

  it("menolak tanggal lahir tidak valid seperti 31 Februari atau bulan 13", () => {
    const feb31 = parseNip("198002312005011001");
    expect(feb31.valid).toBe(false);

    const month13 = parseNip("198013012005011001");
    expect(month13.valid).toBe(false);

    // 1999 bukan tahun kabisat, jadi 29 Feb 1999 tidak valid
    const nonLeapFeb29 = parseNip("199902292020012001");
    expect(nonLeapFeb29.valid).toBe(false);

    // 2000 adalah tahun kabisat, jadi 29 Feb 2000 valid
    const leapFeb29 = parseNip("200002292022012001");
    expect(leapFeb29.valid).toBe(true);
  });

  it("menolak kode jenis kelamin selain 1 atau 2", () => {
    const res = parseNip("198005102005013001");
    expect(res.valid).toBe(false);
  });

  it("memformat NIP ke standar BKN YYYYMMDD YYYYMM G NNN", () => {
    expect(formatNip("19670629\u00A01995032001")).toBe(
      "19670629 199503 2 001"
    );
  });
});

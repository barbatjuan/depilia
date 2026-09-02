import { describe, expect, it } from "vitest";
import { buildCashMonthSummary } from "@/features/accounting/domain/cash-month";

describe("buildCashMonthSummary", () => {
  it("counts closed vs open days and classifies each closed day's frozen difference", () => {
    const result = buildCashMonthSummary({
      sessions: [
        { status: "closed", difference: 200 }, // sobrante
        { status: "closed", difference: -150 }, // faltante
        { status: "closed", difference: 0 }, // exacto
        { status: "open", difference: null },
      ],
      movements: [],
    });
    expect(result.closedDays).toBe(3);
    expect(result.openDays).toBe(1);
    expect(result.sobrantes).toBe(1);
    expect(result.faltantes).toBe(1);
    expect(result.exactos).toBe(1);
    expect(result.arqueoNet).toBe(50);
    expect(result.arqueoAbs).toBe(350);
  });

  it("sums manual movements by direction, separate from arqueo", () => {
    const result = buildCashMonthSummary({
      sessions: [],
      movements: [
        { direction: "in", amount: 1000 },
        { direction: "in", amount: 500 },
        { direction: "out", amount: 300 },
      ],
    });
    expect(result.manualIn).toBe(1500);
    expect(result.manualOut).toBe(300);
  });

  it("empty input yields all zeros", () => {
    expect(buildCashMonthSummary({ sessions: [], movements: [] })).toEqual({
      closedDays: 0,
      openDays: 0,
      arqueoNet: 0,
      arqueoAbs: 0,
      sobrantes: 0,
      faltantes: 0,
      exactos: 0,
      manualIn: 0,
      manualOut: 0,
    });
  });
});

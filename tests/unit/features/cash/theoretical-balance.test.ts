import { describe, expect, it } from "vitest";
import { deriveTheoreticalCash } from "@/features/cash/domain/theoretical-balance";

describe("deriveTheoreticalCash", () => {
  it("mirrors the SQL view: opening + cash payments + signed movements - cash expenses", () => {
    const result = deriveTheoreticalCash({
      openingAmount: 5000,
      cashPayments: [{ amount: 3000 }],
      movements: [{ direction: "out", amount: 1000 }],
      cashExpenses: [{ amount: 500 }],
    });

    expect(result).toEqual({
      openingAmount: 5000,
      cashIn: 3000,
      movementsNet: -1000,
      cashOut: 500,
      theoretical: 6500,
    });
  });

  it("only counts what it is given (card/transfer excluded upstream) and nets multiple movements", () => {
    const result = deriveTheoreticalCash({
      openingAmount: 20000,
      cashPayments: [{ amount: 1000 }, { amount: 2500 }],
      movements: [
        { direction: "in", amount: 800 },
        { direction: "out", amount: 300 },
      ],
      cashExpenses: [{ amount: 1200 }, { amount: 400 }],
    });

    expect(result.cashIn).toBe(3500);
    expect(result.movementsNet).toBe(500);
    expect(result.cashOut).toBe(1600);
    expect(result.theoretical).toBe(22400);
  });

  it("returns the opening amount when there is no activity", () => {
    const result = deriveTheoreticalCash({
      openingAmount: 7000,
      cashPayments: [],
      movements: [],
      cashExpenses: [],
    });

    expect(result.theoretical).toBe(7000);
  });
});

import { describe, expect, it } from "vitest";
import { buildReceivables } from "@/features/accounting/domain/receivables";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("buildReceivables", () => {
  it("groups multiple unpaid sales for the same client into one row", () => {
    const result = buildReceivables(
      [
        { clientId: "c1", clientName: "Ana", saleId: "s1", balance: 100, soldAt: "2026-06-01T12:00:00Z" },
        { clientId: "c1", clientName: "Ana", saleId: "s2", balance: 50, soldAt: "2026-06-05T12:00:00Z" },
      ],
      NOW,
    );
    expect(result.clients).toEqual([
      {
        clientId: "c1",
        clientName: "Ana",
        owed: 150,
        saleCount: 2,
        oldestUnpaidAt: "2026-06-01T12:00:00Z",
      },
    ]);
    expect(result.grandTotal).toBe(150);
  });

  it("sorts clients by amount owed, descending", () => {
    const result = buildReceivables(
      [
        { clientId: "c1", clientName: "Ana", saleId: "s1", balance: 50, soldAt: "2026-06-01T12:00:00Z" },
        { clientId: "c2", clientName: "Beto", saleId: "s2", balance: 200, soldAt: "2026-06-01T12:00:00Z" },
      ],
      NOW,
    );
    expect(result.clients.map((c) => c.clientId)).toEqual(["c2", "c1"]);
  });

  it("buckets by the client's oldest unpaid sale age", () => {
    const result = buildReceivables(
      [
        // 14 days old -> 0-30
        { clientId: "c1", clientName: "Ana", saleId: "s1", balance: 100, soldAt: "2026-06-01T12:00:00Z" },
        // 45 days old -> 31-60
        { clientId: "c2", clientName: "Beto", saleId: "s2", balance: 200, soldAt: "2026-05-01T12:00:00Z" },
        // 106 days old -> 61+
        { clientId: "c3", clientName: "Cami", saleId: "s3", balance: 300, soldAt: "2026-03-01T12:00:00Z" },
      ],
      NOW,
    );
    expect(result.buckets).toEqual({ "0-30": 100, "31-60": 200, "61+": 300 });
  });

  it("empty input yields empty clients and zeroed buckets", () => {
    const result = buildReceivables([], NOW);
    expect(result.clients).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result.buckets).toEqual({ "0-30": 0, "31-60": 0, "61+": 0 });
  });
});

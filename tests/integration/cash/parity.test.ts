import { describe, it } from "vitest";

// A.7 — parity: cash_session_theoretical view === close-trigger snapshot ===
// deriveTheoreticalCash(), and the SQL BA-day window === getClinicDayBounds().
//
// Skipped until Slice B ships src/features/cash/domain/theoretical-balance.ts
// (deriveTheoreticalCash). Un-skipped by task B.16 once that pure function
// exists and can be compared against the real Postgres view + trigger.
describe.skip("parity: view === trigger === deriveTheoreticalCash", () => {
  it("agrees on identical data (pending Slice B deriveTheoreticalCash)", () => {});
});

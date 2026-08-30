import { describe, expect, it } from "vitest";
import {
  cashWithoutOpenSession,
  CLOSED_CAJA_WARNING,
} from "@/features/cash/domain/closed-caja-warning";

describe("cashWithoutOpenSession", () => {
  it("warns when a cash entry is recorded with no open session", () => {
    expect(
      cashWithoutOpenSession({ method: "cash", openSession: null }),
    ).toBe(CLOSED_CAJA_WARNING);
  });

  it("stays silent when a cash entry lands on an open session", () => {
    expect(
      cashWithoutOpenSession({ method: "cash", openSession: { id: "s1" } }),
    ).toBeNull();
  });

  it("never warns for card or transfer entries, open session or not", () => {
    expect(
      cashWithoutOpenSession({ method: "card", openSession: null }),
    ).toBeNull();
    expect(
      cashWithoutOpenSession({ method: "transfer", openSession: null }),
    ).toBeNull();
  });
});

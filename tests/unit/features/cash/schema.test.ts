import { describe, expect, it } from "vitest";
import {
  closeSessionSchema,
  movementSchema,
  openSessionSchema,
} from "@/features/cash/schema";

describe("openSessionSchema", () => {
  it("coerces the opening amount and accepts zero", () => {
    const parsed = openSessionSchema.parse({
      businessDate: "2026-08-30",
      openingAmount: "0",
    });
    expect(parsed).toEqual({ businessDate: "2026-08-30", openingAmount: 0 });
  });

  it("rejects a negative opening amount", () => {
    expect(
      openSessionSchema.safeParse({
        businessDate: "2026-08-30",
        openingAmount: "-1",
      }).success,
    ).toBe(false);
  });
});

describe("closeSessionSchema", () => {
  it("requires a uuid session id and a non-negative counted amount", () => {
    const parsed = closeSessionSchema.parse({
      sessionId: "11111111-1111-1111-1111-111111111111",
      countedAmount: "6800",
    });
    expect(parsed.countedAmount).toBe(6800);
  });

  it("rejects a missing counted amount", () => {
    expect(
      closeSessionSchema.safeParse({
        sessionId: "11111111-1111-1111-1111-111111111111",
      }).success,
    ).toBe(false);
  });
});

describe("movementSchema", () => {
  it("accepts a well-formed movement", () => {
    const parsed = movementSchema.parse({
      sessionId: "11111111-1111-1111-1111-111111111111",
      kind: "ajuste",
      direction: "out",
      amount: "250",
      reason: "faltante",
    });
    expect(parsed.amount).toBe(250);
    expect(parsed.kind).toBe("ajuste");
  });

  it("rejects a non-positive amount and an empty reason", () => {
    expect(
      movementSchema.safeParse({
        sessionId: "11111111-1111-1111-1111-111111111111",
        kind: "retiro",
        direction: "out",
        amount: "0",
        reason: "x",
      }).success,
    ).toBe(false);
    expect(
      movementSchema.safeParse({
        sessionId: "11111111-1111-1111-1111-111111111111",
        kind: "retiro",
        direction: "out",
        amount: "10",
        reason: "   ",
      }).success,
    ).toBe(false);
  });
});

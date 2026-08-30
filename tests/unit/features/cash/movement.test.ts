import { describe, expect, it } from "vitest";
import {
  directionForKind,
  KIND_DIRECTION,
  signedAmount,
} from "@/features/cash/domain/movement";

describe("signedAmount", () => {
  it("returns a positive amount for an 'in' direction", () => {
    expect(signedAmount({ direction: "in", amount: 500 })).toBe(500);
  });

  it("returns a negated amount for an 'out' direction", () => {
    expect(signedAmount({ direction: "out", amount: 1000 })).toBe(-1000);
  });
});

describe("directionForKind", () => {
  it("pins ingreso to 'in' regardless of any chosen direction", () => {
    expect(directionForKind("ingreso")).toBe("in");
    expect(directionForKind("ingreso", "out")).toBe("in");
  });

  it("pins retiro to 'out' regardless of any chosen direction", () => {
    expect(directionForKind("retiro")).toBe("out");
    expect(directionForKind("retiro", "in")).toBe("out");
  });

  it("uses the operator-chosen direction for a bidirectional ajuste", () => {
    expect(directionForKind("ajuste", "in")).toBe("in");
    expect(directionForKind("ajuste", "out")).toBe("out");
  });

  it("throws when ajuste is given no direction to disambiguate", () => {
    expect(() => directionForKind("ajuste")).toThrow();
  });
});

describe("KIND_DIRECTION", () => {
  it("maps the fixed kinds and leaves ajuste open", () => {
    expect(KIND_DIRECTION).toEqual({ ingreso: "in", retiro: "out", ajuste: null });
  });
});

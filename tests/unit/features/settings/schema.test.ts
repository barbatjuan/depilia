import { describe, expect, it } from "vitest";
import {
  TARIFA_VAT_DEFAULT,
  tariffSchema,
  tariffUpdateSchema,
} from "@/features/settings/schema";

const validCreate = {
  zoneName: "Pómulos",
  gender: "mujer",
  sizeCategory: "mini",
  sessionPrice: "6",
  bonoPrice: "30",
};

describe("tariffSchema (create)", () => {
  it("accepts a valid payload and defaults defaultSessions to 6", () => {
    const parsed = tariffSchema.parse(validCreate);
    expect(parsed.defaultSessions).toBe(6);
    expect(parsed.sessionPrice).toBe(6);
    expect(parsed.bonoPrice).toBe(30);
  });

  it("trims the new zone name", () => {
    const parsed = tariffSchema.parse({ ...validCreate, zoneName: "  Axilas  " });
    expect(parsed.zoneName).toBe("Axilas");
  });

  it("rejects a blank zone name", () => {
    expect(tariffSchema.safeParse({ ...validCreate, zoneName: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a non-positive price", () => {
    expect(
      tariffSchema.safeParse({ ...validCreate, sessionPrice: "0" }).success,
    ).toBe(false);
    expect(
      tariffSchema.safeParse({ ...validCreate, bonoPrice: "-5" }).success,
    ).toBe(false);
  });

  it("rejects an unknown gender or size", () => {
    expect(
      tariffSchema.safeParse({ ...validCreate, gender: "unisex" }).success,
    ).toBe(false);
    expect(
      tariffSchema.safeParse({ ...validCreate, sizeCategory: "enorme" }).success,
    ).toBe(false);
  });

  it("defaults vatRate to 0.21 (21%) when vatPercent is omitted", () => {
    const parsed = tariffSchema.parse(validCreate);
    expect(parsed.vatRate).toBe(TARIFA_VAT_DEFAULT);
  });

  it("transforms vatPercent into a vatRate fraction", () => {
    expect(tariffSchema.parse({ ...validCreate, vatPercent: "0" }).vatRate).toBe(0);
    expect(
      tariffSchema.parse({ ...validCreate, vatPercent: "10.5" }).vatRate,
    ).toBe(0.105);
  });

  it("rejects a vatPercent outside [0, 99.9]", () => {
    expect(
      tariffSchema.safeParse({ ...validCreate, vatPercent: "100" }).success,
    ).toBe(false);
    expect(
      tariffSchema.safeParse({ ...validCreate, vatPercent: "-1" }).success,
    ).toBe(false);
  });
});

describe("tariffUpdateSchema (edit)", () => {
  it("accepts size + prices + vat", () => {
    const parsed = tariffUpdateSchema.parse({
      sizeCategory: "grande",
      sessionPrice: "40",
      bonoPrice: "210",
      vatPercent: "10.5",
    });
    expect(parsed).toEqual({
      sizeCategory: "grande",
      sessionPrice: 40,
      bonoPrice: 210,
      vatRate: 0.105,
    });
  });

  it("defaults vatRate to 0.21 when vatPercent is omitted", () => {
    const parsed = tariffUpdateSchema.parse({
      sizeCategory: "grande",
      sessionPrice: "40",
      bonoPrice: "210",
    });
    expect(parsed.vatRate).toBe(TARIFA_VAT_DEFAULT);
  });

  it("rejects a non-positive price", () => {
    expect(
      tariffUpdateSchema.safeParse({
        sizeCategory: "grande",
        sessionPrice: "40",
        bonoPrice: "0",
      }).success,
    ).toBe(false);
  });
});

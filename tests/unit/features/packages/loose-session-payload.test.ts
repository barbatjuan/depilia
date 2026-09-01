import { describe, expect, it } from "vitest";
import { buildLooseSessionPayload } from "@/features/packages/domain/sell-package";

const base = {
  templateId: "tpl-1",
  templateName: "Axilas",
  zoneName: "Axilas",
  sessionPrice: 10,
};

describe("buildLooseSessionPayload", () => {
  it("prefills the sale total from the tariff's session_price when the amount is not overridden", () => {
    const payload = buildLooseSessionPayload({ ...base, amount: null });
    expect(payload).toMatchObject({
      templateId: "tpl-1",
      description: "Sesión suelta — Axilas",
      price: 10,
    });
  });

  it("uses the operator-overridden amount instead of the prefilled session_price", () => {
    const payload = buildLooseSessionPayload({ ...base, amount: 8 });
    expect(payload).toMatchObject({
      templateId: "tpl-1",
      description: "Sesión suelta — Axilas",
      price: 8,
    });
  });

  it("rejects an overridden amount that is zero or negative", () => {
    expect(() =>
      buildLooseSessionPayload({ ...base, amount: 0 }),
    ).toThrow("El precio debe ser mayor a 0");
  });

  it("rejects a tariff whose session_price is non-positive and no override is given", () => {
    expect(() =>
      buildLooseSessionPayload({ ...base, sessionPrice: 0, amount: null }),
    ).toThrow("El precio debe ser mayor a 0");
  });
});

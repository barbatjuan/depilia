import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavItemActive } from "@/components/nav-items";

describe("NAV_ITEMS", () => {
  it("lists the shell sections in order with Caja before Ventas", () => {
    expect(NAV_ITEMS.map((item) => item.title)).toEqual([
      "Dashboard",
      "Agenda",
      "Clientes",
      "Caja",
      "Ventas",
      "Gastos",
      "Configuración",
    ]);
  });

  it("points Caja at /caja", () => {
    const caja = NAV_ITEMS.find((item) => item.title === "Caja");
    expect(caja?.href).toBe("/caja");
  });

  it("keeps Ventas after adding Caja", () => {
    const titles = NAV_ITEMS.map((item) => item.title);
    expect(titles).toContain("Ventas");
    expect(titles.indexOf("Caja")).toBeLessThan(titles.indexOf("Ventas"));
  });
});

describe("isNavItemActive", () => {
  it("is active on an exact match", () => {
    expect(isNavItemActive("/clientes", "/clientes")).toBe(true);
  });

  it("is active on a nested route (e.g. client ficha)", () => {
    expect(isNavItemActive("/clientes/abc-123", "/clientes")).toBe(true);
  });

  it("is not active for a different top-level section", () => {
    expect(isNavItemActive("/ventas", "/clientes")).toBe(false);
  });

  it("treats /dashboard as active only at the dashboard root", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavItemActive("/agenda", "/dashboard")).toBe(false);
  });
});

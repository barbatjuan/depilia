import { describe, expect, it } from "vitest";
import { NAV_GROUPS, NAV_ITEMS, isNavItemActive } from "@/components/nav-items";

describe("NAV_GROUPS", () => {
  it("has the three shell groups in order", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Operación",
      "Contabilidad",
      "Configuración",
    ]);
  });

  it("puts Ventas, Gastos, Caja and Reportes under Contabilidad", () => {
    const contabilidad = NAV_GROUPS.find((g) => g.label === "Contabilidad");
    expect(contabilidad?.items.map((i) => i.title)).toEqual([
      "Ventas",
      "Gastos",
      "Caja",
      "Reportes",
    ]);
  });

  it("keeps the operational sections under Operación", () => {
    const operacion = NAV_GROUPS.find((g) => g.label === "Operación");
    expect(operacion?.items.map((i) => i.title)).toEqual([
      "Dashboard",
      "Agenda",
      "Clientes",
    ]);
  });

  it("points Reportes at /contabilidad and Caja at /caja", () => {
    const items = NAV_GROUPS.flatMap((g) => g.items);
    expect(items.find((i) => i.title === "Reportes")?.href).toBe("/contabilidad");
    expect(items.find((i) => i.title === "Caja")?.href).toBe("/caja");
  });
});

describe("NAV_ITEMS", () => {
  it("is the flat list of every grouped item, in order", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/agenda",
      "/clientes",
      "/ventas",
      "/gastos",
      "/caja",
      "/contabilidad",
      "/configuracion",
    ]);
  });
});

describe("isNavItemActive", () => {
  it("is active on an exact match", () => {
    expect(isNavItemActive("/clientes", "/clientes")).toBe(true);
  });

  it("is active on a nested route (e.g. client ficha)", () => {
    expect(isNavItemActive("/clientes/abc-123", "/clientes")).toBe(true);
  });

  it("is active on a nested accounting route", () => {
    expect(
      isNavItemActive("/contabilidad/cuentas-por-cobrar", "/contabilidad"),
    ).toBe(true);
  });

  it("is not active for a different top-level section", () => {
    expect(isNavItemActive("/caja", "/contabilidad")).toBe(false);
  });

  it("treats /dashboard as active only at the dashboard root", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavItemActive("/agenda", "/dashboard")).toBe(false);
  });
});

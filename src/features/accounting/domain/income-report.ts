import { splitVat } from "./vat";

export type SaleType = "bono" | "suelta" | "combo";

/**
 * A sale's commercial type (spec: PASO 5.2). `client_package_id` set → sold
 * against a bono; no package but a `promotion_id` → a combo (promotions'
 * `create_combo_sale` path); neither → a loose session.
 */
export function classifySale(sale: {
  clientPackageId: string | null;
  promotionId: string | null;
}): SaleType {
  if (sale.clientPackageId) return "bono";
  if (sale.promotionId) return "combo";
  return "suelta";
}

export type IncomeSaleInput = {
  total: number;
  vatRate: number;
  clientPackageId: string | null;
  promotionId: string | null;
};

export type SalesByTypeRow = {
  type: SaleType | "total";
  label: string;
  gross: number;
  net: number;
  vat: number;
  count: number;
};

const TYPE_LABEL: Record<SaleType, string> = {
  bono: "Bono",
  suelta: "Sesión suelta",
  combo: "Combo",
};

const TYPE_ORDER: SaleType[] = ["bono", "suelta", "combo"];

/** Sales grouped by commercial type, VAT-split, with a trailing total row. */
export function buildSalesByType(
  sales: IncomeSaleInput[],
  fractionDigits: number,
): SalesByTypeRow[] {
  const totals = new Map<
    SaleType,
    { gross: number; net: number; vat: number; count: number }
  >();

  for (const sale of sales) {
    const type = classifySale(sale);
    const split = splitVat(sale.total, sale.vatRate, fractionDigits);
    const acc = totals.get(type) ?? { gross: 0, net: 0, vat: 0, count: 0 };
    acc.gross += split.gross;
    acc.net += split.net;
    acc.vat += split.vat;
    acc.count += 1;
    totals.set(type, acc);
  }

  const rows: SalesByTypeRow[] = TYPE_ORDER.filter((type) => totals.has(type)).map(
    (type) => {
      const acc = totals.get(type)!;
      return { type, label: TYPE_LABEL[type], ...acc };
    },
  );

  const total = rows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.gross,
      net: acc.net + row.net,
      vat: acc.vat + row.vat,
      count: acc.count + row.count,
    }),
    { gross: 0, net: 0, vat: 0, count: 0 },
  );

  rows.push({ type: "total", label: "Total", ...total });
  return rows;
}

export type VatBreakdownRow = {
  rateLabel: string;
  gross: number;
  net: number;
  vat: number;
};

/** Sales grouped by VAT rate ("21%", "10%", "Exento"), desc by rate, + total row. */
export function buildVatBreakdown(
  sales: { total: number; vatRate: number }[],
  fractionDigits: number,
): VatBreakdownRow[] {
  const totals = new Map<
    string,
    { rate: number; gross: number; net: number; vat: number }
  >();

  for (const sale of sales) {
    const rateLabel =
      sale.vatRate === 0 ? "Exento" : `${Math.round(sale.vatRate * 1000) / 10}%`;
    const split = splitVat(sale.total, sale.vatRate, fractionDigits);
    const acc =
      totals.get(rateLabel) ?? { rate: sale.vatRate, gross: 0, net: 0, vat: 0 };
    acc.gross += split.gross;
    acc.net += split.net;
    acc.vat += split.vat;
    totals.set(rateLabel, acc);
  }

  const rows = [...totals.entries()]
    .sort((a, b) => b[1].rate - a[1].rate)
    .map(([rateLabel, v]) => ({
      rateLabel,
      gross: v.gross,
      net: v.net,
      vat: v.vat,
    }));

  const total = rows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.gross,
      net: acc.net + row.net,
      vat: acc.vat + row.vat,
    }),
    { gross: 0, net: 0, vat: 0 },
  );

  rows.push({ rateLabel: "Total", ...total });
  return rows;
}

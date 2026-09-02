export const DEFAULT_VAT_RATE = 0.21;

export type VatSplit = { gross: number; net: number; vat: number };

function round(amount: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Splits a VAT-inclusive gross amount into net + vat (tariffs are priced
 * IVA-included). `rate <= 0` (exempt) or a non-finite gross short-circuits to
 * `net = gross, vat = 0` — no division, so `net + vat` stays exactly `gross`.
 */
export function splitVat(
  gross: number,
  rate: number,
  fractionDigits = 2,
): VatSplit {
  if (!Number.isFinite(gross) || rate <= 0) {
    return { gross, net: gross, vat: 0 };
  }
  const net = round(gross / (1 + rate), fractionDigits);
  const vat = round(gross - net, fractionDigits);
  return { gross, net, vat };
}

import {
  applyDiscount,
  bonusPrice,
  bonusSessions,
  type DiscountKind,
} from "@/features/promotions/domain/discount";
import { DEFAULT_VAT_RATE } from "@/features/accounting/domain/vat";

export type Gender = "mujer" | "hombre";

/**
 * Optional per-sale manual discount applied on top of a package / loose
 * session sale (spec: "sale-discounts / Manual discount at both flows").
 * `by` is the acting staff id, resolved in the server action; `fractionDigits`
 * comes from the clinic currency. The pure builders fold this into the
 * payload's `listTotal` / `total` / `discountAmount` so the data layer just
 * persists what it is given.
 */
export type SaleDiscountInput = {
  kind: DiscountKind;
  value: number;
  reason: string;
  by?: string | null;
  fractionDigits?: number;
  /** Set when the discount comes from a `discount_codes` row (P3). */
  codeId?: string | null;
};

export type SaleDiscountFields = {
  listTotal: number;
  total: number;
  discountAmount: number;
  discountReason: string | null;
  discountedBy: string | null;
  discountCodeId: string | null;
};

export function resolveSaleDiscount(
  listTotal: number,
  discount: SaleDiscountInput | null | undefined,
): SaleDiscountFields {
  if (!discount) {
    return {
      listTotal,
      total: listTotal,
      discountAmount: 0,
      discountReason: null,
      discountedBy: null,
      discountCodeId: null,
    };
  }

  const reason = discount.reason?.trim();
  if (!reason) {
    throw new Error("Ingresá el motivo del descuento.");
  }

  const result = applyDiscount({
    listTotal,
    kind: discount.kind,
    value: discount.value,
    fractionDigits: discount.fractionDigits ?? 2,
  });
  if (!result.ok) {
    throw new Error(
      result.reason === "exceeds"
        ? "El descuento no puede dejar la venta en cero o negativa."
        : "El descuento ingresado no es válido.",
    );
  }

  return {
    listTotal,
    total: result.total,
    discountAmount: result.discountAmount,
    discountReason: reason,
    discountedBy: discount.by ?? null,
    discountCodeId: discount.codeId ?? null,
  };
}
export type SizeCategory =
  | "mini"
  | "pequena"
  | "mediana"
  | "grande"
  | "cuerpo";

export type PackageTemplateOption = {
  id: string;
  zoneId: string;
  zoneName: string;
  name: string;
  gender: Gender;
  sizeCategory: SizeCategory;
  defaultSessions: number;
  sessionPrice: number;
  bonoPrice: number;
  vatRate: number;
};

export type PackageSaleRequest =
  | { source: "template"; template: PackageTemplateOption }
  | {
      source: "custom";
      zoneId: string;
      zoneName: string;
      sessionCount: number;
      price: number;
      vatRate?: number;
    }
  | {
      source: "promotion";
      promotionId: string;
      promotionName: string;
      tariff: PackageTemplateOption;
      bonusSessions: number;
      overridePrice: number | null;
    };

export type PackageSalePayload = {
  templateId: string | null;
  zoneId: string;
  totalSessions: number;
  price: number;
  description: string;
  listTotal?: number;
  total?: number;
  discountAmount?: number;
  discountReason?: string | null;
  discountedBy?: string | null;
  discountCodeId?: string | null;
  promotionId?: string | null;
  vatRate: number;
};

/**
 * Pure computation of a package sale's `client_packages` + `sales` payload
 * (spec: "package-sessions / Sell a package"). A package sale always covers
 * exactly one body zone with N total sessions and no expiry — this function
 * decides N, the price, and a human-readable description, whether the admin
 * picked a catalog `package_template` or an ad-hoc zone + session count.
 */
export function buildPackageSalePayload(
  request: PackageSaleRequest,
  discount?: SaleDiscountInput | null,
): PackageSalePayload {
  if (request.source === "template") {
    const { template } = request;
    return withDiscount(
      {
        templateId: template.id,
        zoneId: template.zoneId,
        totalSessions: template.defaultSessions,
        price: template.bonoPrice,
        description: `Paquete ${template.name} — ${template.defaultSessions} sesiones (${template.zoneName})`,
        vatRate: template.vatRate,
      },
      discount,
    );
  }

  if (request.source === "promotion") {
    const { tariff } = request;
    const totalSessions = bonusSessions(
      tariff.defaultSessions,
      request.bonusSessions,
    );
    return withDiscount(
      {
        templateId: tariff.id,
        zoneId: tariff.zoneId,
        totalSessions,
        price: bonusPrice(tariff.bonoPrice, request.overridePrice),
        description: `Promo ${request.promotionName} — ${tariff.defaultSessions}+${request.bonusSessions} sesiones (${tariff.zoneName})`,
        promotionId: request.promotionId,
        vatRate: tariff.vatRate,
      },
      discount,
    );
  }

  if (!Number.isInteger(request.sessionCount) || request.sessionCount <= 0) {
    throw new Error(
      "La cantidad de sesiones debe ser un entero mayor a 0",
    );
  }
  if (request.price <= 0) {
    throw new Error("El precio debe ser mayor a 0");
  }

  return withDiscount(
    {
      templateId: null,
      zoneId: request.zoneId,
      totalSessions: request.sessionCount,
      price: request.price,
      description: `Paquete a medida — ${request.sessionCount} sesiones (${request.zoneName})`,
      vatRate: request.vatRate ?? DEFAULT_VAT_RATE,
    },
    discount,
  );
}

function withDiscount(
  base: PackageSalePayload,
  discount: SaleDiscountInput | null | undefined,
): PackageSalePayload {
  const d = resolveSaleDiscount(base.price, discount);
  return {
    ...base,
    listTotal: d.listTotal,
    total: d.total,
    discountAmount: d.discountAmount,
    discountReason: d.discountReason,
    discountedBy: d.discountedBy,
    discountCodeId: d.discountCodeId,
    promotionId: base.promotionId ?? null,
  };
}

export type LooseSessionRequest = {
  templateId: string | null;
  templateName: string;
  zoneName: string;
  sessionPrice: number;
  vatRate: number;
  amount?: number | null;
};

export type LooseSessionPayload = {
  templateId: string | null;
  description: string;
  price: number;
  listTotal?: number;
  total?: number;
  discountAmount?: number;
  discountReason?: string | null;
  discountedBy?: string | null;
  discountCodeId?: string | null;
  vatRate: number;
};

/**
 * Pure computation of a loose/single-session sale payload (spec:
 * "service-catalog / Selling a loose session with a tariff-prefilled
 * price"). The operator picks a tariff; the amount field is prefilled with
 * the tariff's `session_price` and stays editable, so `amount` overrides the
 * prefill when present. No `client_packages` row is ever produced — the sale
 * is tied only to the client.
 */
export function buildLooseSessionPayload(
  request: LooseSessionRequest,
  discount?: SaleDiscountInput | null,
): LooseSessionPayload {
  const price =
    request.amount === undefined || request.amount === null
      ? request.sessionPrice
      : request.amount;

  if (price <= 0) {
    throw new Error("El precio debe ser mayor a 0");
  }

  const d = resolveSaleDiscount(price, discount);
  return {
    templateId: request.templateId,
    description: `Sesión suelta — ${request.zoneName}`,
    price,
    listTotal: d.listTotal,
    total: d.total,
    discountAmount: d.discountAmount,
    discountReason: d.discountReason,
    discountedBy: d.discountedBy,
    discountCodeId: d.discountCodeId,
    vatRate: request.vatRate,
  };
}

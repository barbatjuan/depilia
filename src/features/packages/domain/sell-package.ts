export type Gender = "mujer" | "hombre";
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
};

export type PackageSaleRequest =
  | { source: "template"; template: PackageTemplateOption }
  | {
      source: "custom";
      zoneId: string;
      zoneName: string;
      sessionCount: number;
      price: number;
    };

export type PackageSalePayload = {
  templateId: string | null;
  zoneId: string;
  totalSessions: number;
  price: number;
  description: string;
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
): PackageSalePayload {
  if (request.source === "template") {
    const { template } = request;
    return {
      templateId: template.id,
      zoneId: template.zoneId,
      totalSessions: template.defaultSessions,
      price: template.bonoPrice,
      description: `Paquete ${template.name} — ${template.defaultSessions} sesiones (${template.zoneName})`,
    };
  }

  if (!Number.isInteger(request.sessionCount) || request.sessionCount <= 0) {
    throw new Error(
      "La cantidad de sesiones debe ser un entero mayor a 0",
    );
  }
  if (request.price <= 0) {
    throw new Error("El precio debe ser mayor a 0");
  }

  return {
    templateId: null,
    zoneId: request.zoneId,
    totalSessions: request.sessionCount,
    price: request.price,
    description: `Paquete a medida — ${request.sessionCount} sesiones (${request.zoneName})`,
  };
}

export type LooseSessionRequest = {
  zoneId: string;
  zoneName: string;
  price: number;
};

export type LooseSessionPayload = {
  description: string;
  price: number;
};

/**
 * Pure computation of a loose/single-session sale payload (spec:
 * "package-sessions / Sell a loose session"). No `client_packages` row is
 * ever produced from this — the sale is tied only to a client and a zone.
 */
export function buildLooseSessionPayload(
  request: LooseSessionRequest,
): LooseSessionPayload {
  if (request.price <= 0) {
    throw new Error("El precio debe ser mayor a 0");
  }

  return {
    description: `Sesión suelta — ${request.zoneName}`,
    price: request.price,
  };
}

import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL,
  type SaleBalanceStatus,
} from "@/features/sales/domain/sale-balance";

const STATUS_VARIANT: Record<
  SaleBalanceStatus,
  "default" | "secondary" | "outline"
> = {
  paid: "secondary",
  partial: "default",
  unpaid: "outline",
};

/**
 * Renders a sale's paid/partial/unpaid status as a Spanish-language badge,
 * driven only by the derived `SaleBalance` (never a stored status column).
 */
export function SaleStatusBadge({ status }: { status: SaleBalanceStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

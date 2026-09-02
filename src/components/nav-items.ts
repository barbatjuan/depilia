import {
  Banknote,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * The app-shell sections, grouped for the sidebar. "Contabilidad" collects
 * everything money-related — Ventas, Gastos, Caja and the monthly Reportes —
 * so the daily cash workflow and the reporting that reconciles it live
 * together.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Agenda", href: "/agenda", icon: Calendar },
      { title: "Clientes", href: "/clientes", icon: Users },
    ],
  },
  {
    label: "Contabilidad",
    items: [
      { title: "Ventas", href: "/ventas", icon: ShoppingCart },
      { title: "Gastos", href: "/gastos", icon: Wallet },
      { title: "Caja", href: "/caja", icon: Banknote },
      { title: "Reportes", href: "/contabilidad", icon: BarChart3 },
    ],
  },
  {
    label: "Configuración",
    items: [
      { title: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
];

/** Flat list of every nav item, in sidebar order — kept for consumers that
 * don't care about grouping. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * A nav item is active on an exact match or on any nested route below it
 * (e.g. `/clientes/abc-123` activates the `/clientes` item), except for
 * `/dashboard`, which is only active at its own root.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

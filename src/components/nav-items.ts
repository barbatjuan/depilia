import {
  Banknote,
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

/**
 * The app-shell sections (design "UI System"), in nav order. "Caja" sits
 * between "Clientes" and "Ventas" so the daily cash workflow is one click
 * from the sales it reconciles.
 */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Caja", href: "/caja", icon: Banknote },
  { title: "Ventas", href: "/ventas", icon: ShoppingCart },
  { title: "Gastos", href: "/gastos", icon: Wallet },
  { title: "Configuración", href: "/configuracion", icon: Settings },
];

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

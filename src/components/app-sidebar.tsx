"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_GROUPS, isNavItemActive } from "@/components/nav-items";
import { Logo, LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const initial = userEmail?.trim()?.[0]?.toUpperCase() ?? "D";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-3">
        <Link
          href="/dashboard"
          className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo className="group-data-[collapsible=icon]:hidden" />
          <LogoMark className="hidden size-6 text-brand group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[0.6875rem] font-medium tracking-[0.14em] text-sidebar-foreground/55 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "h-9 gap-3 rounded-lg font-medium text-sidebar-foreground/80 transition-colors",
                          "hover:text-sidebar-foreground",
                          active &&
                            "relative text-sidebar-accent-foreground before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary group-data-[collapsible=icon]:before:hidden",
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(active && "text-sidebar-primary")}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-display text-sm text-sidebar-accent-foreground">
            {initial}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {userEmail ?? "Depilia"}
            </p>
            <p className="text-xs text-sidebar-foreground/55">Administración</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { MoneyFormatProvider } from "@/components/money-format-provider";

/**
 * Shared shell for every authenticated route (design "UI System"). The
 * unauthenticated case never reaches this layout — `middleware.ts`
 * redirects to `/login` before the request gets here.
 *
 * Reads the clinic's configured (currency, locale) once and mounts
 * `MoneyFormatProvider` so every client component under the shell formats
 * money through the one shared module.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const moneyFormat = await getMoneyFormat(supabase);

  return (
    <MoneyFormatProvider value={moneyFormat}>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">Depilia</span>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
    </MoneyFormatProvider>
  );
}

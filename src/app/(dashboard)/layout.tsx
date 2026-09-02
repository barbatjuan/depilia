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
  const [moneyFormat, { data: userData }] = await Promise.all([
    getMoneyFormat(supabase),
    supabase.auth.getUser(),
  ]);

  return (
    <MoneyFormatProvider value={moneyFormat}>
      <SidebarProvider>
        <AppSidebar userEmail={userData.user?.email ?? undefined} />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-4 backdrop-blur-sm">
            <SidebarTrigger className="text-muted-foreground" />
            <Separator orientation="vertical" className="h-4" />
          </header>
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </MoneyFormatProvider>
  );
}

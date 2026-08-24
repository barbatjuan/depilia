import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listAllExpenseCategories } from "@/features/expenses/data/categories";
import { CategoryTable } from "@/features/expenses/components/category-table";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const categories = await listAllExpenseCategories(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Categorías de gastos
          </h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} categoría{categories.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/configuracion/categorias/nueva">Nueva categoría</Link>
        </Button>
      </div>
      <CategoryTable categories={categories} />
    </div>
  );
}

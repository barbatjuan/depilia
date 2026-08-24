import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getExpenseCategory } from "@/features/expenses/data/categories";
import { CategoryForm } from "@/features/expenses/components/category-form";
import { updateCategoryAction } from "@/features/expenses/actions/update-category";

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const category = await getExpenseCategory(supabase, id);
  if (!category) notFound();

  const boundAction = updateCategoryAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Editar categoría
      </h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={boundAction}
            category={category}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}

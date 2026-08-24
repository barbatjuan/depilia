import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm } from "@/features/expenses/components/category-form";
import { createCategoryAction } from "@/features/expenses/actions/create-category";

export default function NuevaCategoriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Nueva categoría
      </h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Datos de la categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={createCategoryAction}
            submitLabel="Crear categoría"
          />
        </CardContent>
      </Card>
    </div>
  );
}

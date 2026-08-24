import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listActiveExpenseCategories } from "@/features/expenses/data/categories";
import { ExpenseForm } from "@/features/expenses/components/expense-form";
import { createExpenseAction } from "@/features/expenses/actions/create-expense";

export default async function NuevoGastoPage() {
  const supabase = await createClient();
  const categories = await listActiveExpenseCategories(supabase);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo gasto</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            action={createExpenseAction}
            categories={categories}
            submitLabel="Crear gasto"
          />
        </CardContent>
      </Card>
    </div>
  );
}

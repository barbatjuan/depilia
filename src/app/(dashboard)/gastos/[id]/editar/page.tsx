import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getExpense } from "@/features/expenses/data/expenses";
import { listActiveExpenseCategories } from "@/features/expenses/data/categories";
import { ExpenseForm } from "@/features/expenses/components/expense-form";
import { updateExpenseAction } from "@/features/expenses/actions/update-expense";

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [expense, activeCategories] = await Promise.all([
    getExpense(supabase, id),
    listActiveExpenseCategories(supabase),
  ]);
  if (!expense) notFound();

  // The expense's own category may have been archived since it was
  // recorded — keep it selectable on this form even if it's no longer in
  // the active dropdown for new expenses.
  const categories = activeCategories.some((c) => c.id === expense.categoryId)
    ? activeCategories
    : [
        ...activeCategories,
        { id: expense.categoryId, name: expense.categoryName, archived: true },
      ];

  const boundAction = updateExpenseAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar gasto</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{expense.categoryName}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            action={boundAction}
            categories={categories}
            expense={expense}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}

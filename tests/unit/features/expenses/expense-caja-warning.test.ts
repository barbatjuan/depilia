import { beforeEach, describe, expect, it, vi } from "vitest";

const createExpense = vi.fn();
const updateExpense = vi.fn();
const getSessionForDate = vi.fn();
const redirect = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __fake: true })),
}));
vi.mock("@/features/expenses/data/expenses", () => ({
  createExpense: (...args: unknown[]) => createExpense(...args),
  updateExpense: (...args: unknown[]) => updateExpense(...args),
}));
vi.mock("@/features/cash/data/cash-session", () => ({
  getSessionForDate: (...args: unknown[]) => getSessionForDate(...args),
}));

import { createExpenseAction } from "@/features/expenses/actions/create-expense";
import { updateExpenseAction } from "@/features/expenses/actions/update-expense";

const CATEGORY_ID = "22222222-2222-2222-2222-222222222222";
const EXPENSE_ID = "33333333-3333-3333-3333-333333333333";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function cashExpenseForm(): FormData {
  return form({
    categoryId: CATEGORY_ID,
    amount: "5000",
    description: "insumos",
    spentOn: "2026-08-30",
    method: "cash",
  });
}

describe("expense actions — closed-caja redirect param", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createExpense.mockResolvedValue({ id: "exp-1" });
    updateExpense.mockResolvedValue({ id: EXPENSE_ID });
  });

  it("redirects a cash expense with no open session to the aviso banner URL", async () => {
    getSessionForDate.mockResolvedValue(null);

    await createExpenseAction({ error: null }, cashExpenseForm());

    expect(getSessionForDate).toHaveBeenCalledWith(expect.anything(), "2026-08-30");
    expect(redirect).toHaveBeenCalledWith("/gastos?aviso=caja-cerrada");
  });

  it("redirects a cash expense to plain /gastos when a session is open", async () => {
    getSessionForDate.mockResolvedValue({ id: "s-1", status: "open" });

    await createExpenseAction({ error: null }, cashExpenseForm());

    expect(redirect).toHaveBeenCalledWith("/gastos");
  });

  it("does not check the session for a card expense", async () => {
    await createExpenseAction(
      { error: null },
      form({
        categoryId: CATEGORY_ID,
        amount: "5000",
        description: "tarjeta",
        spentOn: "2026-08-30",
        method: "card",
      }),
    );

    expect(getSessionForDate).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/gastos");
  });

  it("applies the same aviso redirect on update", async () => {
    getSessionForDate.mockResolvedValue(null);

    await updateExpenseAction(EXPENSE_ID, { error: null }, cashExpenseForm());

    expect(redirect).toHaveBeenCalledWith("/gastos?aviso=caja-cerrada");
  });
});

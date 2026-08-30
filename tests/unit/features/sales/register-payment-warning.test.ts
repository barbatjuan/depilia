import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOSED_CAJA_WARNING } from "@/features/cash/domain/closed-caja-warning";

const registerPayment = vi.fn();
const getSessionForDate = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __fake: true })),
}));
vi.mock("@/features/sales/data/payments", () => ({
  registerPayment: (...args: unknown[]) => registerPayment(...args),
}));
vi.mock("@/features/cash/data/cash-session", () => ({
  getSessionForDate: (...args: unknown[]) => getSessionForDate(...args),
}));

import { registerPaymentAction } from "@/features/sales/actions/register-payment";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const SALE_ID = "11111111-1111-1111-1111-111111111111";

describe("registerPaymentAction — closed-caja warning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerPayment.mockResolvedValue({ id: "pay-1" });
  });

  it("adds a non-blocking Spanish warning when a cash payment lands with no open session", async () => {
    getSessionForDate.mockResolvedValue(null);

    const state = await registerPaymentAction(
      SALE_ID,
      { error: null },
      form({ amount: "1000", method: "cash", note: "" }),
    );

    expect(state.error).toBeNull();
    expect(state.warning).toBe(CLOSED_CAJA_WARNING);
    expect(registerPayment).toHaveBeenCalledOnce();
  });

  it("does not warn for a card payment and never queries the session", async () => {
    const state = await registerPaymentAction(
      SALE_ID,
      { error: null },
      form({ amount: "1000", method: "card", note: "" }),
    );

    expect(state.error).toBeNull();
    expect(state.warning ?? null).toBeNull();
    expect(getSessionForDate).not.toHaveBeenCalled();
  });

  it("does not warn for a cash payment when a session is open", async () => {
    getSessionForDate.mockResolvedValue({ id: "session-1", status: "open" });

    const state = await registerPaymentAction(
      SALE_ID,
      { error: null },
      form({ amount: "1000", method: "cash", note: "" }),
    );

    expect(state.warning ?? null).toBeNull();
  });

  it("swallows a session-check failure and still returns a clean success", async () => {
    getSessionForDate.mockRejectedValue(new Error("network"));

    const state = await registerPaymentAction(
      SALE_ID,
      { error: null },
      form({ amount: "1000", method: "cash", note: "" }),
    );

    expect(state.error).toBeNull();
    expect(state.warning ?? null).toBeNull();
  });
});

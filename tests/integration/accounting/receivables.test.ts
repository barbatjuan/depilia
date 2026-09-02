import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedClient, seedLooseSale } from "../helpers/fixtures";
import { getReceivables, getReceivablesTotal } from "@/features/accounting/data/receivables";

const db = createServiceRoleClient();

describe.sequential("getReceivables", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("includes a partially-paid open sale with its remaining balance", async () => {
    const client = await seedClient(db, "Ana");
    const sale = await seedLooseSale(db, { client_id: client.id, total: 1000 });
    await db.from("payments").insert({ sale_id: sale.id, amount: 400, method: "cash" });

    const rows = await getReceivables(db);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clientId: client.id, balance: 600 });
  });

  it("excludes a fully-paid sale", async () => {
    const client = await seedClient(db, "Ana");
    const sale = await seedLooseSale(db, { client_id: client.id, total: 1000 });
    await db.from("payments").insert({ sale_id: sale.id, amount: 1000, method: "cash" });

    const rows = await getReceivables(db);

    expect(rows).toHaveLength(0);
  });

  it("excludes a void sale even with an unpaid balance", async () => {
    const client = await seedClient(db, "Ana");
    const sale = await seedLooseSale(db, { client_id: client.id, total: 1000 });
    await db.from("sales").update({ status: "void" }).eq("id", sale.id);

    const rows = await getReceivables(db);

    expect(rows).toHaveLength(0);
  });

  it("getReceivablesTotal sums every client's owed balance", async () => {
    const clientA = await seedClient(db, "Ana");
    const clientB = await seedClient(db, "Beto");
    const saleA = await seedLooseSale(db, { client_id: clientA.id, total: 1000 });
    await seedLooseSale(db, { client_id: clientB.id, total: 500 });
    await db.from("payments").insert({ sale_id: saleA.id, amount: 400, method: "cash" });

    const total = await getReceivablesTotal(db);

    expect(total).toBe(600 + 500);
  });
});

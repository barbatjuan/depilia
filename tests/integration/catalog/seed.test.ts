import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase } from "../helpers/fixtures";
import { withPgClient } from "../helpers/pg";

const MIGRATION_0013 = readFileSync(
  join(process.cwd(), "supabase/migrations/0013_seed_service_catalog.sql"),
  "utf8",
);

/**
 * Replays `0013` against a freshly-emptied catalog INSIDE a transaction that
 * is always rolled back. Keeps every assertion bound to the real migration
 * text (not a transcription of it) and leaves the live seeded catalog
 * untouched for the rest of the suite.
 */
async function withSeededCatalog<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  return withPgClient(async (client) => {
    await client.query("begin");
    try {
      await client.query("truncate table body_zones restart identity cascade");
      await client.query(MIGRATION_0013);
      return await fn(client);
    } finally {
      await client.query("rollback");
    }
  });
}

describe.sequential("migration 0013: real service catalog seed", () => {
  const db = createServiceRoleClient();

  afterAll(async () => {
    await resetDatabase(db);
  });

  it("Catalog size and shape (68 active templates, 35 zones, no dupes, every bono 6 sessions)", async () => {
    await withSeededCatalog(async (client) => {
      const zones = await client.query(
        "select count(*)::int as n from body_zones",
      );
      expect(zones.rows[0].n).toBe(35);

      const templates = await client.query(
        "select count(*)::int as n from package_templates where active",
      );
      expect(templates.rows[0].n).toBe(68);

      const sessions = await client.query(
        "select count(*)::int as n from package_templates where active and default_sessions <> 6",
      );
      expect(sessions.rows[0].n).toBe(0);

      const dupes = await client.query(
        `select count(*)::int as n from (
           select zone_id, gender from package_templates
           where active group by zone_id, gender having count(*) > 1
         ) d`,
      );
      expect(dupes.rows[0].n).toBe(0);

      const bySize = await client.query(
        `select size_category, count(*)::int as n from package_templates
         where active group by size_category order by size_category`,
      );
      expect(bySize.rows).toEqual([
        { size_category: "cuerpo", n: 2 },
        { size_category: "grande", n: 8 },
        { size_category: "mediana", n: 26 },
        { size_category: "mini", n: 22 },
        { size_category: "pequena", n: 10 },
      ]);

      const byGender = await client.query(
        `select gender, count(*)::int as n from package_templates
         where active group by gender order by gender`,
      );
      expect(byGender.rows).toEqual([
        { gender: "hombre", n: 34 },
        { gender: "mujer", n: 34 },
      ]);
    });
  });

  it("Gender-specific areas: Ingles Completas mujer-only, Perfilado de barba hombre-only", async () => {
    await withSeededCatalog(async (client) => {
      const inglesCompletas = await client.query(
        `select gender from package_templates
         where name = 'Ingles Completas' and active order by gender`,
      );
      expect(inglesCompletas.rows).toEqual([{ gender: "mujer" }]);

      const perfilado = await client.query(
        `select gender from package_templates
         where name = 'Perfilado de barba' and active order by gender`,
      );
      expect(perfilado.rows).toEqual([{ gender: "hombre" }]);
    });
  });

  it("Spot-check prices against the source price list", async () => {
    await withSeededCatalog(async (client) => {
      const { rows } = await client.query(
        `select p.name, p.gender, p.size_category, p.session_price, p.bono_price
         from package_templates p
         where p.active and (
           (p.name = 'Labio' and p.gender = 'mujer')
           or (p.name = 'Abdomen' and p.gender = 'hombre')
           or (p.name = 'Cuerpo Completo' and p.gender = 'mujer')
           or (p.name = 'Piernas completas (incluye pies)' and p.gender = 'hombre')
           or (p.name = 'Axilas' and p.gender = 'mujer')
           or (p.name = 'Lumbar' and p.gender = 'mujer')
           or (p.name = 'Lumbar' and p.gender = 'hombre')
         )
         order by p.name, p.gender`,
      );
      expect(rows).toEqual([
        { name: "Abdomen", gender: "hombre", size_category: "mediana", session_price: "30.00", bono_price: "150.00" },
        { name: "Axilas", gender: "mujer", size_category: "pequena", session_price: "10.00", bono_price: "48.00" },
        { name: "Cuerpo Completo", gender: "mujer", size_category: "cuerpo", session_price: "80.00", bono_price: "450.00" },
        { name: "Labio", gender: "mujer", size_category: "mini", session_price: "6.00", bono_price: "30.00" },
        { name: "Lumbar", gender: "hombre", size_category: "mediana", session_price: "30.00", bono_price: "150.00" },
        { name: "Lumbar", gender: "mujer", size_category: "mediana", session_price: "15.00", bono_price: "78.00" },
        { name: "Piernas completas (incluye pies)", gender: "hombre", size_category: "grande", session_price: "50.00", bono_price: "240.00" },
      ]);
    });
  });

  it("Idempotent re-run inserts zero additional rows", async () => {
    await withSeededCatalog(async (client) => {
      const before = await client.query(
        `select
           (select count(*)::int from body_zones) as zones,
           (select count(*)::int from package_templates) as templates`,
      );
      expect(before.rows[0]).toEqual({ zones: 35, templates: 68 });

      await client.query(MIGRATION_0013);

      const after = await client.query(
        `select
           (select count(*)::int from body_zones) as zones,
           (select count(*)::int from package_templates) as templates`,
      );
      expect(after.rows[0]).toEqual({ zones: 35, templates: 68 });
    });
  });
});

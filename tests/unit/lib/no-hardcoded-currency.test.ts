import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard (spec clinic-currency R2): after the shared money module lands, no
 * component / page / action / helper may format money with a hardcoded
 * currency or locale. `src/lib/money.ts` is the single allowed home for an
 * `Intl.NumberFormat` currency instance.
 */
const SRC = join(process.cwd(), "src");
const ALLOWED = join(SRC, "lib", "money.ts");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

describe("no hardcoded currency formatting outside src/lib/money.ts", () => {
  const files = walk(SRC).filter((f) => f !== ALLOWED);

  it("has no `currency:` option in an Intl.NumberFormat call", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /new Intl\.NumberFormat\([^)]*currency/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("has no literal 'ARS' currency code left in the source", () => {
    const offenders = files.filter((f) => /["']ARS["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

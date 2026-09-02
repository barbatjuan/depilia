import { describe, expect, it } from "vitest";
import { toCsv } from "@/features/accounting/domain/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("prepends a UTF-8 BOM and CRLF-joins rows", () => {
    const out = toCsv(["a", "b"], [["1", "2"]]);
    expect(out).toBe(`${BOM}a,b\r\n1,2`);
  });

  it("quotes fields containing a comma, quote, or newline", () => {
    const out = toCsv(
      ["name", "note"],
      [["Pérez, Ana", 'dijo "hola"'], ["line\nbreak", "ok"]],
    );
    expect(out).toBe(
      `${BOM}name,note\r\n"Pérez, Ana","dijo ""hola"""\r\n"line\nbreak",ok`,
    );
  });

  it("passes numbers through and renders null as empty", () => {
    const out = toCsv(["x", "y", "z"], [[10, null, 0]]);
    expect(out).toBe(`${BOM}x,y,z\r\n10,,0`);
  });

  it("emits only the header row when there are no data rows", () => {
    expect(toCsv(["only", "header"], [])).toBe(`${BOM}only,header`);
  });
});

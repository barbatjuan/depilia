const BOM = "﻿";

function escapeField(value: string | number | null): string {
  if (value === null) return "";
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * RFC-4180 CSV. Prepends a UTF-8 BOM so Excel reads accented text correctly,
 * joins rows with CRLF, quotes any field containing a comma, quote or
 * newline, and doubles internal quotes. Pure — the report pages already hold
 * the data; `ExportCsvButton` turns this into a client-side download.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null)[][],
): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeField).join(","),
  );
  return BOM + lines.join("\r\n");
}

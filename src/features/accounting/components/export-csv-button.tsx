"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Turns an already-built CSV string into a client-side download (spec:
 * PASO 5.4). No server round-trip — the report page already holds the data.
 */
export function ExportCsvButton({
  csv,
  filename,
}: {
  csv: string;
  filename: string;
}) {
  function handleClick() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Download className="size-4" />
      Exportar CSV
    </Button>
  );
}

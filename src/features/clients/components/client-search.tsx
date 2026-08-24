"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box that drives the client list via the `q` searchParam — filtering
 * stays server-side and shareable, per the design's DataTable convention.
 */
export function ClientSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("q", next);
    } else {
      params.delete("q");
    }
    router.replace(`/clientes?${params.toString()}`);
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        className="pl-8"
      />
    </div>
  );
}

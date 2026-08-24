import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/components/client-form";
import { createClientAction } from "@/features/clients/actions/create-client";

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm action={createClientAction} submitLabel="Crear cliente" />
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/features/clients/data/clients";
import { ClientForm } from "@/features/clients/components/client-form";
import { updateClientAction } from "@/features/clients/actions/update-client";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const client = await getClient(supabase, id);
  if (!client) notFound();

  const boundAction = updateClientAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Editar cliente
      </h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {client.firstName} {client.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={boundAction}
            client={client}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}

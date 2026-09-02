"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { clientSchema } from "@/features/clients/schema";
import { updateClient as updateClientRow } from "@/features/clients/data/clients";

export type ClientFormState = { error: string | null };

/**
 * Server action backing the "editar cliente" form. Re-validates server-side,
 * persists, revalidates both the list and the ficha, and redirects back to
 * the ficha. Bound with the client id from the client component via
 * `.bind(null, clientId)`, the Next.js-recommended way to pass an extra
 * argument into a `useActionState` action.
 */
export async function updateClientAction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del formulario.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();
  try {
    await updateClientRow(supabase, clientId, parsed.data);
  } catch {
    return { error: "No se pudo actualizar el cliente. Intentá de nuevo." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { clientSchema } from "@/features/clients/schema";
import { createClient as createClientRow } from "@/features/clients/data/clients";

export type ClientFormState = { error: string | null };

/**
 * Server action backing the "nuevo cliente" form. Re-validates with
 * `clientSchema` server-side, persists, revalidates the list, and redirects
 * to the new client's ficha.
 */
export async function createClientAction(
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
  let created;
  try {
    created = await createClientRow(supabase, parsed.data);
  } catch {
    return { error: "No se pudo guardar el cliente. Intentá de nuevo." };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${created.id}`);
}

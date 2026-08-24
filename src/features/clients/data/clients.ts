import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { ClientInput } from "@/features/clients/schema";

export type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
};

function toClientRow(row: {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}): ClientRow {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Lists active (non-archived) clients, optionally filtered by a search term
 * matched against first name, last name, or phone.
 */
export async function listClients(
  supabase: AppSupabaseClient,
  search?: string,
): Promise<ClientRow[]> {
  let query = supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes, created_at")
    .is("archived_at", null)
    .order("last_name", { ascending: true });

  const term = search?.trim();
  if (term) {
    const escaped = term.replace(/[%_]/g, "\\$&");
    query = query.or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toClientRow);
}

export async function getClient(
  supabase: AppSupabaseClient,
  id: string,
): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toClientRow(data) : null;
}

export async function createClient(
  supabase: AppSupabaseClient,
  input: ClientInput,
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
    })
    .select("id, first_name, last_name, phone, email, notes, created_at")
    .single();
  if (error) throw error;
  return toClientRow(data);
}

export async function updateClient(
  supabase: AppSupabaseClient,
  id: string,
  input: ClientInput,
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
    })
    .eq("id", id)
    .select("id, first_name, last_name, phone, email, notes, created_at")
    .single();
  if (error) throw error;
  return toClientRow(data);
}

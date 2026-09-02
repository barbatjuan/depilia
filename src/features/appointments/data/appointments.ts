import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { AppointmentStatus } from "@/features/appointments/domain/status";
import { mapAppointmentError } from "@/features/appointments/domain/appointment-errors";
import type {
  CreateAppointmentInput,
  EditAppointmentInput,
} from "@/features/appointments/schema";

export type AppointmentListRow = {
  id: string;
  clientId: string;
  clientName: string;
  zoneId: string;
  zoneName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  confirmedAt: string | null;
  clientPackageId: string | null;
  notes: string | null;
};

const LIST_SELECT =
  "id, client_id, zone_id, scheduled_at, duration_minutes, status, confirmed_at, client_package_id, notes, clients(first_name, last_name), body_zones(name)";

function toListRow(row: {
  id: string;
  client_id: string;
  zone_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  confirmed_at: string | null;
  client_package_id: string | null;
  notes: string | null;
  clients: { first_name: string; last_name: string } | null;
  body_zones: { name: string } | null;
}): AppointmentListRow {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients
      ? `${row.clients.first_name} ${row.clients.last_name}`
      : "Cliente desconocido",
    zoneId: row.zone_id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    confirmedAt: row.confirmed_at,
    clientPackageId: row.client_package_id,
    notes: row.notes,
  };
}

/**
 * Appointments whose `scheduled_at` falls in `[range.start, range.end)`,
 * joined to client name and zone, ordered by time — backs both the agenda
 * day view (given `getClinicDayBounds`) and week view (given
 * `getClinicWeekBounds`).
 */
export async function listAppointmentsInRange(
  supabase: AppSupabaseClient,
  range: { start: Date; end: Date },
): Promise<AppointmentListRow[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(LIST_SELECT)
    .gte("scheduled_at", range.start.toISOString())
    .lt("scheduled_at", range.end.toISOString())
    .order("scheduled_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map(toListRow);
}

/**
 * Creates an appointment (spec: "appointment-scheduling / Book
 * appointment"). Optionally links it to an existing unclaimed loose-session
 * sale (`looseSaleId`) by setting that `sales` row's `appointment_id` — the
 * sale itself was already created by the Paquetes/Sesiones sell-loose-session
 * flow (PR4), this only wires the two together. A rejected insert (most
 * commonly the single-chair overlap `EXCLUDE` constraint) is mapped to a
 * friendly Spanish message instead of the raw Postgres error.
 */
export async function createAppointment(
  supabase: AppSupabaseClient,
  input: CreateAppointmentInput,
): Promise<AppointmentListRow> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_id: input.clientId,
      zone_id: input.zoneId,
      client_package_id: input.clientPackageId || null,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      notes: input.notes || null,
    })
    .select(LIST_SELECT)
    .single();
  if (error) throw new Error(mapAppointmentError(error));

  if (input.looseSaleId) {
    const { error: linkError } = await supabase
      .from("sales")
      .update({ appointment_id: data.id })
      .eq("id", input.looseSaleId)
      .is("appointment_id", null);
    if (linkError) {
      throw new Error(
        "El turno se creó pero no se pudo vincular la sesión suelta.",
      );
    }
  }

  return toListRow(data);
}

/**
 * Edits a still-scheduled appointment — date/time, duration and zone (spec:
 * "Edit/reschedule an appointment"). Subject to the same single-chair overlap
 * `EXCLUDE` constraint as creation; a rejection is mapped to a friendly
 * Spanish message.
 */
export async function updateAppointment(
  supabase: AppSupabaseClient,
  id: string,
  input: EditAppointmentInput,
): Promise<AppointmentListRow> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      zone_id: input.zoneId,
    })
    .eq("id", id)
    .select(LIST_SELECT)
    .single();
  if (error) throw new Error(mapAppointmentError(error));

  return toListRow(data);
}

/**
 * Toggles a turno's confirmation flag (migration `0018`). `confirmed` true →
 * stamp `now()`, false → clear it. Orthogonal to `status`, so this is a plain
 * update, not a `set_appointment_status` transition.
 */
export async function setAppointmentConfirmation(
  supabase: AppSupabaseClient,
  id: string,
  confirmed: boolean,
): Promise<AppointmentListRow> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq("id", id)
    .select(LIST_SELECT)
    .single();
  if (error) throw new Error(mapAppointmentError(error));

  return toListRow(data);
}

/**
 * The single mutation entry point for status transitions (design decision
 * 2): calls the `set_appointment_status` RPC, which is backed by the
 * `appointments_session_ledger` trigger — this function never issues a raw
 * `UPDATE ... SET status` itself, so the trigger's guarantees (decrement on
 * complete, restore on cancel-after-completion, no-op on no_show) are the
 * only way `sessions_used` ever changes.
 */
export async function setAppointmentStatus(
  supabase: AppSupabaseClient,
  id: string,
  status: AppointmentStatus,
): Promise<{ id: string; status: string; consumedAt: string | null }> {
  const { data, error } = await supabase.rpc("set_appointment_status", {
    p_appointment_id: id,
    p_status: status,
  });
  if (error) throw new Error(mapAppointmentError(error));

  return {
    id: data.id,
    status: data.status,
    consumedAt: data.consumed_at,
  };
}

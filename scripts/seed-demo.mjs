// Demo data seeder for local manual QA — NOT part of the app or test suite.
//
//   node scripts/seed-demo.mjs
//
// Requires `npx supabase start` running. Wipes the transactional tables
// (clients + everything that references them, plus expenses / reminder_log)
// via the dev-only `truncate_table` RPC, then rebuilds a realistic month:
//   - ~5 package_templates ("servicios")
//   - 20 clients
//   - a package for ~14 of them
//   - 5 appointments per weekday for the current BA calendar month
//     (past ones marked completed so the session ledger trigger runs)
//   - sales + installment payments (cash / card / transfer) across the month
//   - expenses across the month
// Catalog rows (body_zones, expense_categories, staff, e2e fixtures) are left
// untouched.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const db = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLINIC_TZ_OFFSET_HOURS = 3; // America/Argentina/Buenos_Aires = UTC-3, no DST

function die(context, error) {
  if (error) {
    console.error(`✗ ${context}:`, error.message ?? error);
    process.exit(1);
  }
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const round2 = (n) => Math.round(n * 100) / 100;

// A UTC instant for a given BA wall-clock time.
function baInstant(year, monthIndex, day, hour, minute = 0) {
  return new Date(
    Date.UTC(year, monthIndex, day, hour + CLINIC_TZ_OFFSET_HOURS, minute),
  );
}

async function main() {
  // 1. Clean slate for transactional data (cascade wipes client_packages,
  //    appointments, sales, payments through the clients FK chain).
  for (const table of [
    "cash_movements",
    "cash_sessions",
    "clients",
    "expenses",
    "reminder_log",
  ]) {
    const { error } = await db.rpc("truncate_table", { table_name: table });
    die(`truncate ${table}`, error);
  }
  console.log("• transactional tables cleared");

  // 2. Body zones — find-or-create (the vitest suite truncates catalog
  //    tables, so we can't assume the migration seed survived). Real Spanish
  //    tariff areas: the 5 English demo zones from 0010 are archived by
  //    migration 0012.
  // `recommended_weeks` (migration 0020) drives "Recontacto por zona" — a
  // spread of intervals so the demo shows the per-zone nature of the screen.
  const serviceSpecs = [
    { name: "Piernas completas", gender: "mujer", size_category: "grande", session_price: 40, bono_price: 210, default_sessions: 6, vat_rate: 0.21, recommended_weeks: 8 },
    { name: "Axilas", gender: "mujer", size_category: "pequena", session_price: 10, bono_price: 48, default_sessions: 6, vat_rate: 0.21, recommended_weeks: 5 },
    // Exempt on purpose — demo variety so the IVA breakdown shows more than one rate.
    { name: "Facial Completo", gender: "mujer", size_category: "mediana", session_price: 15, bono_price: 78, default_sessions: 6, vat_rate: 0, recommended_weeks: 6 },
    { name: "Muslos", gender: "mujer", size_category: "mediana", session_price: 25, bono_price: 120, default_sessions: 6, vat_rate: 0.21, recommended_weeks: 7 },
    { name: "Media espalda", gender: "mujer", size_category: "mediana", session_price: 25, bono_price: 120, default_sessions: 6, vat_rate: 0.21, recommended_weeks: 7 },
  ];
  for (const s of serviceSpecs) {
    await db
      .from("body_zones")
      .upsert(
        { name: s.name, recommended_weeks: s.recommended_weeks },
        { onConflict: "name" },
      );
  }
  const { data: zones, error: zonesErr } = await db.from("body_zones").select("id, name");
  die("load body_zones", zonesErr);
  const zoneId = Object.fromEntries(zones.map((z) => [z.name, z.id]));

  // 3. Servicios / package templates. Find-or-create by (name, gender):
  //    migration 0013 seeds the real catalog with one row per gender for each
  //    area, so a name-only lookup would match two rows.
  const templates = [];
  for (const s of serviceSpecs) {
    const { data: existing } = await db
      .from("package_templates")
      .select("id, name, default_sessions, bono_price, vat_rate")
      .eq("name", s.name)
      .eq("gender", s.gender)
      .maybeSingle();
    if (existing) {
      templates.push(existing);
      continue;
    }
    const { data, error } = await db
      .from("package_templates")
      .insert({
        zone_id: zoneId[s.name],
        name: s.name,
        gender: s.gender,
        size_category: s.size_category,
        default_sessions: s.default_sessions,
        session_price: s.session_price,
        bono_price: s.bono_price,
        vat_rate: s.vat_rate,
        active: true,
      })
      .select("id, name, default_sessions, bono_price, vat_rate")
      .single();
    die(`insert template ${s.name}`, error);
    templates.push(data);
  }
  console.log(`• ${templates.length} servicios ready`);

  // 4. 20 clients.
  const firstNames = [
    "María", "Sofía", "Valentina", "Camila", "Lucía", "Martina", "Julieta",
    "Florencia", "Agustina", "Carolina", "Paula", "Rocío", "Micaela",
    "Belén", "Antonella", "Daniela", "Gabriela", "Romina", "Natalia", "Verónica",
  ];
  const lastNames = [
    "González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez",
    "Gómez", "Sánchez", "Romero", "Díaz", "Álvarez", "Torres", "Ruiz",
    "Ramírez", "Flores", "Benítez", "Acosta", "Medina", "Herrera", "Suárez",
  ];
  // Every demo first name above is unambiguously female, so `mujer` is the
  // correct backfill here. A real import would classify per name.
  const clientRows = firstNames.map((first, i) => ({
    first_name: first,
    last_name: lastNames[i],
    gender: "mujer",
    phone: `+54 9 11 ${rand(3000, 6999)}-${rand(1000, 9999)}`,
    email: Math.random() < 0.7
      ? `${first.toLowerCase()}.${lastNames[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@example.com`
      : null,
    notes: null,
  }));
  const { data: clients, error: clientsErr } = await db
    .from("clients")
    .insert(clientRows)
    .select("id, first_name, last_name");
  die("insert clients", clientsErr);
  console.log(`• ${clients.length} clients`);

  // 5. A package for ~14 clients. Track in-memory remaining capacity so we
  //    never complete more sessions than a package holds.
  const packaged = clients.slice(0, 14).map((c) => {
    const tpl = pick(templates);
    return {
      client_id: c.id,
      clientName: `${c.first_name} ${c.last_name}`,
      template_id: tpl.id,
      template: tpl,
      total_sessions: tpl.default_sessions,
      sessions_used: 0,
    };
  });
  const { data: pkgs, error: pkgErr } = await db
    .from("client_packages")
    .insert(
      packaged.map((p) => ({
        client_id: p.client_id,
        template_id: p.template_id,
        zone_id: zoneId[p.template.name] ?? zoneId[serviceSpecs[0].name],
        total_sessions: p.total_sessions,
        sessions_used: 0,
      })),
    )
    .select("id, client_id");
  die("insert client_packages", pkgErr);
  for (const p of packaged) {
    p.packageId = pkgs.find((row) => row.client_id === p.client_id).id;
  }

  const packageByClient = new Map(packaged.map((p) => [p.client_id, p]));

  // 6-8. Appointments + sales/payments + expenses, spread across the current
  // BA month and the 2 months before it (PASO 8 — otherwise `/contabilidad`'s
  // month picker and month-over-month deltas have nothing to compare against).
  const nowBa = new Date(Date.now() - 0); // "today" in wall terms is close enough
  const baNow = new Date(
    nowBa.getTime() - CLINIC_TZ_OFFSET_HOURS * 3600 * 1000,
  );
  const year = baNow.getUTCFullYear();
  const monthIndex = baNow.getUTCMonth();
  const todayDay = baNow.getUTCDate();
  const slotHours = [10, 11, 12, 13, 14];
  const methods = ["cash", "card", "transfer"];
  // Derived from serviceSpecs (single source of truth) instead of hardcoded
  // — a separate hand-picked scale here drifted 100-600x above the real
  // tariff catalog and made /contabilidad's totals nonsensical.
  const looseServices = serviceSpecs.map((s) => [
    `Sesión suelta ${s.name.toLowerCase()}`,
    s.session_price,
  ]);

  // ~60% cash so the arqueo is not trivially all-cash.
  const expenseMethod = () => (Math.random() < 0.6 ? "cash" : pick(["transfer", "card"]));

  for (const name of ["Alquiler", "Insumos", "Servicios", "Marketing"]) {
    const { data: existing } = await db
      .from("expense_categories")
      .select("id")
      .eq("name", name)
      .eq("archived", false)
      .maybeSingle();
    if (!existing) await db.from("expense_categories").insert({ name });
  }
  const { data: categories, error: catErr } = await db
    .from("expense_categories")
    .select("id, name")
    .eq("archived", false);
  die("load expense_categories", catErr);

  let totalAppointments = 0;
  let totalCompleted = 0;
  let saleCount = 0;
  let paymentCount = 0;
  let totalExpenses = 0;

  // Oldest month first: the packaged clients' bono purchase happens 2 months
  // back, and their sessions get consumed across the following months.
  for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
    let y = year;
    let m = monthIndex - monthsAgo;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const isCurrentMonth = monthsAgo === 0;
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lastDay = isCurrentMonth ? todayDay : daysInMonth;

    // Appointments: 5 slots per weekday, up through `lastDay`.
    const apptInserts = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(Date.UTC(y, m, day)).getUTCDay();
      if (dow === 0 || dow === 6) continue; // clinic closed weekends
      if (day > lastDay) continue; // don't schedule beyond "today" in the current month
      for (const hour of slotHours) {
        const client = pick(clients);
        const pkg = packageByClient.get(client.id);
        const isPast = isCurrentMonth ? day < todayDay : true;
        let clientPackageId = null;
        if (pkg && Math.random() < 0.5) {
          if (!isPast || pkg.sessions_used < pkg.total_sessions - 1) {
            clientPackageId = pkg.packageId;
            if (isPast) pkg.sessions_used++;
          }
        }
        apptInserts.push({
          client_id: client.id,
          client_package_id: clientPackageId,
          zone_id: pick(zones).id,
          scheduled_at: baInstant(y, m, day, hour).toISOString(),
          duration_minutes: 30,
          status: "scheduled",
          _isPast: isPast,
        });
      }
    }

    const { data: appts, error: apptErr } = await db
      .from("appointments")
      .insert(
        apptInserts.map((row) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _isPast, ...rest } = row;
          return rest;
        }),
      )
      .select("id");
    die("insert appointments", apptErr);
    totalAppointments += appts.length;

    // Mark past appointments completed one-by-one so the BEFORE UPDATE
    // session ledger trigger fires (it does not fire on plain INSERT).
    for (let i = 0; i < appts.length; i++) {
      if (!apptInserts[i]._isPast) continue;
      const roll = Math.random();
      const status = roll < 0.85 ? "completed" : roll < 0.93 ? "no_show" : "cancelled";
      const { error } = await db
        .from("appointments")
        .update({ status })
        .eq("id", appts[i].id);
      die(`complete appointment ${appts[i].id}`, error);
      if (status === "completed") totalCompleted++;
    }

    // The packaged clients' bono purchase happens once, in the oldest month.
    if (monthsAgo === 2) {
      for (const p of packaged) {
        const total = Number(p.template.bono_price);
        const soldDay = rand(1, Math.max(1, lastDay - 1 || 1));
        const { data: sale, error: saleErr } = await db
          .from("sales")
          .insert({
            client_id: p.client_id,
            client_package_id: p.packageId,
            description: `Paquete ${p.template.name} — ${p.template.default_sessions} sesiones`,
            total,
            vat_rate: p.template.vat_rate,
            sold_at: baInstant(y, m, soldDay, 12).toISOString(),
            status: "open",
          })
          .select("id")
          .single();
        die("insert package sale", saleErr);
        saleCount++;

        // 1-3 installments summing to 40-100% of total.
        const coverage = pick([0.4, 0.6, 0.75, 1, 1]);
        const target = round2(total * coverage);
        const parts = rand(1, 3);
        let remaining = target;
        for (let k = 0; k < parts; k++) {
          const amount =
            k === parts - 1 ? remaining : round2(remaining / (parts - k) * (0.7 + Math.random() * 0.6));
          const capped = Math.min(amount, remaining);
          if (capped < 1) break;
          remaining = round2(remaining - capped);
          const payDay = Math.min(daysInMonth, soldDay + k * rand(2, 6));
          const { error } = await db.from("payments").insert({
            sale_id: sale.id,
            amount: capped,
            paid_at: baInstant(y, m, payDay, rand(10, 18)).toISOString(),
            method: pick(methods),
          });
          die("insert payment", error);
          paymentCount++;
        }
      }
    }

    // Ad-hoc loose sales, fully paid, spread through the month.
    const looseCount = isCurrentMonth ? 6 : 4;
    for (let i = 0; i < looseCount; i++) {
      const [desc, price] = pick(looseServices);
      const client = pick(clients);
      const day = isCurrentMonth && i < 2 ? todayDay : rand(1, Math.max(1, lastDay));
      const { data: sale, error: saleErr } = await db
        .from("sales")
        .insert({
          client_id: client.id,
          description: desc,
          total: price,
          sold_at: baInstant(y, m, day, rand(10, 18)).toISOString(),
          status: "open",
        })
        .select("id")
        .single();
      die("insert loose sale", saleErr);
      saleCount++;
      const { error } = await db.from("payments").insert({
        sale_id: sale.id,
        amount: price,
        paid_at: baInstant(y, m, day, rand(10, 18)).toISOString(),
        method: pick(methods),
      });
      die("insert loose payment", error);
      paymentCount++;
    }

    // Expenses across the month, one dated "today" for the current month.
    // Today's expense is deliberately small and kept out of the periodic
    // loop below (skip day === todayDay there) so the live caja theoretical
    // balance (opening - retiros + cobros - gastos) always stays comfortably
    // positive regardless of the random draws — a business paying out more
    // cash than it took in on a single day is not a realistic demo default,
    // and `caja.spec.ts` asserts the theoretical is positive before closing.
    const expenseInserts = [];
    for (let day = 1; day <= lastDay; day += rand(2, 4)) {
      if (isCurrentMonth && day === todayDay) continue;
      const cat = pick(categories);
      expenseInserts.push({
        category_id: cat.id,
        amount: rand(15, 80),
        spent_on: `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        description: `${cat.name} — gasto del ${day}/${m + 1}`,
        method: expenseMethod(),
      });
    }
    if (isCurrentMonth) {
      const cat = pick(categories);
      expenseInserts.push({
        category_id: cat.id,
        amount: rand(15, 40),
        spent_on: `${y}-${String(m + 1).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`,
        description: `${cat.name} — gasto de hoy`,
        method: "cash",
      });
    }
    const { error: expErr } = await db.from("expenses").insert(expenseInserts);
    die("insert expenses", expErr);
    totalExpenses += expenseInserts.length;
  }

  // 8b. Lapsed bonos — so "Recontacto por zona" has 🔴 rows in the demo. For a
  //     few packaged clients: no session booked, last one was 12-16 weeks ago
  //     (past 2x every zone interval), and 2 sessions still on the bono.
  let lapsedBonos = 0;
  for (const [i, p] of packaged.slice(0, 3).entries()) {
    const lapsedAt = new Date(
      Date.now() - (12 + i * 2) * 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await db
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("client_package_id", p.packageId)
      .eq("status", "scheduled");
    const { data: doneAppts } = await db
      .from("appointments")
      .select("id")
      .eq("client_package_id", p.packageId)
      .eq("status", "completed");
    if (doneAppts?.length) {
      await db
        .from("appointments")
        .update({ scheduled_at: lapsedAt })
        .eq("client_package_id", p.packageId)
        .eq("status", "completed");
    } else {
      await db.from("appointments").insert({
        client_id: p.client_id,
        client_package_id: p.packageId,
        zone_id: zoneId[p.template.name] ?? zoneId[serviceSpecs[0].name],
        scheduled_at: lapsedAt,
        duration_minutes: 30,
        status: "completed",
      });
    }
    await db
      .from("client_packages")
      .update({ sessions_used: p.total_sessions - 2 })
      .eq("id", p.packageId);
    lapsedBonos++;
  }

  console.log(`• ${totalAppointments} appointments (${totalCompleted} completed) across 3 months`);
  console.log(`• ${lapsedBonos} bonos marcados como atrasados (Recontacto por zona)`);
  console.log(`• ${saleCount} sales, ${paymentCount} payments across 3 months`);
  console.log(`• ${totalExpenses} expenses across 3 months`);

  // 9. Caja diaria: an open session for today plus a couple of movements, and
  //    yesterday closed so /caja has history. Needs a staff row (catalog,
  //    created once by the first-run local setup) for the actor FKs.
  const { data: staffRow } = await db
    .from("staff")
    .select("id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!staffRow) {
    console.log("• caja diaria skipped (no staff row — see README first-run setup)");
  } else {
    const baDate = (day) =>
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (todayDay > 1) {
      const { data: yday, error: ydayErr } = await db
        .from("cash_sessions")
        .insert({
          business_date: baDate(todayDay - 1),
          opening_amount: 250,
          opened_by: staffRow.id,
        })
        .select("id")
        .single();
      die("insert yesterday cash_session", ydayErr);
      const { error: closeErr } = await db
        .from("cash_sessions")
        .update({
          status: "closed",
          counted_amount: round2(250 + rand(-20, 40)),
          closed_by: staffRow.id,
          closing_note: "Cierre del día anterior",
        })
        .eq("id", yday.id);
      die("close yesterday cash_session", closeErr);
    }

    const { data: session, error: sessionErr } = await db
      .from("cash_sessions")
      .insert({
        business_date: baDate(todayDay),
        opening_amount: 300,
        opened_by: staffRow.id,
      })
      .select("id")
      .single();
    die("insert today cash_session", sessionErr);

    const movements = [
      { kind: "retiro", direction: "out", amount: 80, reason: "Pago a cadete" },
      { kind: "ingreso", direction: "in", amount: 50, reason: "Aporte de socia" },
      { kind: "ajuste", direction: "out", amount: 10, reason: "Redondeo de caja" },
    ].map((m) => ({ ...m, session_id: session.id, created_by: staffRow.id }));
    const { error: movErr } = await db.from("cash_movements").insert(movements);
    die("insert cash_movements", movErr);
    console.log(`• caja abierta (hoy) + ${movements.length} movimientos`);
  }

  console.log("\n✓ demo data seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

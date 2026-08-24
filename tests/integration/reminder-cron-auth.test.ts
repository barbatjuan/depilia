import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Threat-matrix boundary (design "Reminder Cron"): the cron route must
 * reject any request whose `Authorization` header doesn't carry the exact
 * `CRON_SECRET`, so it can't be triggered by an arbitrary public request.
 * The auth check must short-circuit before any Supabase/DB access.
 */
describe("GET /api/cron/reminders auth guard", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalSecret !== undefined) {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reminders"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the Authorization header has the wrong secret", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reminders", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("does not return 401 when the Authorization header carries the correct secret", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reminders", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).not.toBe(401);
  });
});

import { describe, expect, it } from "vitest";
import { isValidCronSecret } from "@/features/reminders/domain/verify-cron-secret";

describe("isValidCronSecret", () => {
  it("accepts a bearer header matching the configured secret", () => {
    expect(isValidCronSecret("Bearer super-secret", "super-secret")).toBe(true);
  });

  it("rejects a missing Authorization header", () => {
    expect(isValidCronSecret(null, "super-secret")).toBe(false);
  });

  it("rejects a header with the wrong secret", () => {
    expect(isValidCronSecret("Bearer wrong-value", "super-secret")).toBe(false);
  });

  it("rejects when CRON_SECRET is not configured server-side", () => {
    expect(isValidCronSecret("Bearer anything", undefined)).toBe(false);
  });

  it("rejects a header of a different length without throwing", () => {
    expect(() => isValidCronSecret("Bearer x", "super-secret")).not.toThrow();
    expect(isValidCronSecret("Bearer x", "super-secret")).toBe(false);
  });
});

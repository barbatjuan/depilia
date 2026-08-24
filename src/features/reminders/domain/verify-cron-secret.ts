import { timingSafeEqual } from "node:crypto";

/**
 * Validates the Vercel Cron `Authorization: Bearer <CRON_SECRET>` header
 * against the server-configured secret using a constant-time comparison —
 * a naive `===` string compare leaks timing information an attacker could
 * use to guess the secret byte-by-byte (threat-matrix boundary, spec:
 * "appointment-reminders" cron route).
 *
 * Returns `false` (never throws) for a missing header, a missing/empty
 * server secret, or a header of a different length than expected.
 */
export function isValidCronSecret(
  authHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret) return false;
  if (!authHeader) return false;

  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  const actual = Buffer.from(authHeader);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

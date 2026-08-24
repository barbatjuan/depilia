import { describe, expect, it } from "vitest";
import { shouldRedirectToLogin } from "@/lib/supabase/guard";

describe("shouldRedirectToLogin", () => {
  it("redirects an unauthenticated request to a protected path", () => {
    expect(shouldRedirectToLogin({ pathname: "/dashboard", hasUser: false })).toBe(
      true,
    );
  });

  it("does not redirect an authenticated request to a protected path", () => {
    expect(shouldRedirectToLogin({ pathname: "/dashboard", hasUser: true })).toBe(
      false,
    );
  });

  it("does not redirect an unauthenticated request to the login page itself", () => {
    expect(shouldRedirectToLogin({ pathname: "/login", hasUser: false })).toBe(
      false,
    );
  });

  it("does not redirect an unauthenticated request to a nested public path", () => {
    expect(
      shouldRedirectToLogin({ pathname: "/login/reset", hasUser: false }),
    ).toBe(false);
  });
});

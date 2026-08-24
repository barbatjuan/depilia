const PUBLIC_PATHS = ["/login"];

/**
 * Pure guard decision extracted from `updateSession` so the auth-redirect
 * rule (spec: "Unauthenticated route access") is unit-testable without a
 * real `NextRequest`/Supabase client.
 */
export function shouldRedirectToLogin({
  pathname,
  hasUser,
}: {
  pathname: string;
  hasUser: boolean;
}): boolean {
  if (hasUser) return false;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  return !isPublicPath;
}

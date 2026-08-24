"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/features/auth/schema";
import { signInWithPassword } from "@/features/auth/data/sign-in";
import { toSignInErrorMessage } from "@/features/auth/domain/sign-in-error";

export type SignInState = { error: string | null };

/**
 * Server action backing the login form. Re-validates with `loginSchema`
 * server-side (client validation is UX only, never the boundary), attempts
 * Supabase Auth sign-in, and redirects to the dashboard on success.
 */
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Completá email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await signInWithPassword(supabase, parsed.data);

  const message = toSignInErrorMessage(error);
  if (message) {
    return { error: message };
  }

  redirect("/dashboard");
}

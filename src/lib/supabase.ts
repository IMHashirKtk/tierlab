import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("placeholder") &&
      supabaseUrl.startsWith("https://")
  );
};

// Singleton Supabase Client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

let sessionPromise: Promise<string | null> | null = null;

/**
 * Checks for an active Supabase auth session; if none exists, initiates
 * anonymous sign-in so every client receives a signed JWT with auth.uid().
 */
export async function ensureAuthenticatedSession(): Promise<string | null> {
  if (!supabase) return null;

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
      if (sessionError) {
        console.warn("Supabase session retrieval warning:", sessionError.message);
      }

      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        console.warn("Supabase anonymous auth warning:", signInError.message);
        return null;
      }
      return data?.user?.id || null;
    } catch (err) {
      console.warn("Failed to ensure Supabase session:", err);
      return null;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

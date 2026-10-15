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

let mockSessionToken: any = undefined;

/**
 * Test helper to inject a controlled mock access token during testing.
 */
export function setMockSessionToken(token: any) {
  mockSessionToken = token;
}

export function resetMockSessionToken() {
  mockSessionToken = undefined;
}

/**
 * Ensures an active Supabase session (initiating anonymous sign-in if needed)
 * and returns the signed JWT access token for Authorization headers.
 * Throws an explicit, actionable error if authentication fails.
 */
export async function getAuthenticatedSessionToken(): Promise<string> {
  if (mockSessionToken !== undefined) {
    if (mockSessionToken === null) {
      throw new Error("Anonymous authentication failed or is disabled in Supabase. Please check your Supabase Auth settings.");
    }
    return mockSessionToken;
  }

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(
      "Supabase client is not configured on the client. Cannot establish authenticated session."
    );
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return session.access_token;
    }

    if (sessionError) {
      console.warn("Supabase session retrieval notice:", sessionError.message);
    }

    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      throw new Error(
        `Anonymous sign-in failed: ${signInError.message}. Please verify Anonymous Sign-Ins are enabled in your Supabase Auth provider settings.`
      );
    }

    if (!data.session?.access_token) {
      throw new Error(
        "Supabase did not return an access token after anonymous sign-in."
      );
    }

    return data.session.access_token;
  } catch (err: any) {
    throw new Error(
      err?.message || "Failed to obtain Supabase authentication access token."
    );
  }
}


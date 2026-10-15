import { createClient, SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: src/lib/server/supabase-admin cannot be imported in client-side code.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let mockAdminClient: any = undefined;

/**
 * Test helper to inject a controlled Supabase mock client during testing.
 */
export function setMockSupabaseAdmin(client: any) {
  mockAdminClient = client;
}

/**
 * Resets test mock back to production behavior.
 */
export function resetMockSupabaseAdmin() {
  mockAdminClient = undefined;
}

/**
 * Validates that privileged Supabase server-side credentials are configured.
 */
export function isSupabaseAdminConfigured(): boolean {
  if (mockAdminClient !== undefined) {
    return Boolean(mockAdminClient);
  }

  return Boolean(
    supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes("placeholder") &&
    !serviceRoleKey.includes("placeholder") &&
    supabaseUrl.startsWith("https://")
  );
}

/**
 * Returns a stateless server-side Supabase client authenticated with the service role key.
 * Sessions are strictly non-persisted to prevent state leakage across requests.
 */
export function getSupabaseAdmin(overrideClient?: SupabaseClient | null): SupabaseClient | null {
  if (overrideClient !== undefined) {
    return overrideClient;
  }

  if (mockAdminClient !== undefined) {
    return mockAdminClient;
  }

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


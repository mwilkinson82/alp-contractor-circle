/**
 * supabaseClient.ts — Server-side Supabase client for member management.
 *
 * Used by the Stripe webhook to insert new members into the external
 * Supabase members table so they can log into the portal immediately.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase integration disabled");
    return null;
  }

  _supabase = createClient(url, key);
  console.log("[Supabase] Client initialized");
  return _supabase;
}

/**
 * Insert or update a member in the Supabase `members` table.
 *
 * Uses upsert on the unique `email` column so duplicate payments
 * don't create duplicate records.
 */
export async function upsertSupabaseMember(params: {
  name: string;
  email: string;
  subscriptionStatus?: string;
  foundingMember?: boolean;
  stripeSessionId?: string;
  stripeCustomerId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: "Supabase client not configured" };
  }

  const { data, error } = await supabase
    .from("members")
    .upsert(
      {
        name: params.name,
        email: params.email,
        subscription_status: params.subscriptionStatus || "active",
        founding_member: params.foundingMember ?? true,
        stripe_session_id: params.stripeSessionId || null,
        stripe_customer_id: params.stripeCustomerId || null,
      },
      { onConflict: "email" }
    )
    .select();

  if (error) {
    console.error("[Supabase] Failed to upsert member:", error.message);
    return { success: false, error: error.message };
  }

  console.log(`[Supabase] Member upserted successfully: ${params.email}`, data);
  return { success: true };
}

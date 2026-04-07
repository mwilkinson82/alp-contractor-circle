import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from("members")
  .upsert(
    {
      name: "Jacob Nichter",
      email: "jae@nciconstruction.com",
      subscription_status: "active",
      founding_member: true,
    },
    { onConflict: "email" }
  )
  .select();

if (error) {
  console.error("❌ Supabase upsert failed:", error.message);
} else {
  console.log("✅ Jacob added to Supabase members:", JSON.stringify(data, null, 2));
}

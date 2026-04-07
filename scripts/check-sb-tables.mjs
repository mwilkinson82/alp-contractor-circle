import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const tables = ['templates', 'template', 'portal_templates', 'template_library', 'member_templates', 'cc_templates', 'members', 'template_requests'];
for (const t of tables) {
  const { data, error } = await sb.from(t).select('id').limit(1);
  if (error) {
    console.log(t + ': NOT FOUND - ' + error.message);
  } else {
    console.log(t + ': FOUND (' + data.length + ' rows in sample)');
  }
}

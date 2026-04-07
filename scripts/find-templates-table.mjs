import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('template_requests').select('*').limit(5);
console.log('template_requests:', error ? error.message : JSON.stringify(data, null, 2));

for (const table of ['template', 'portal_templates', 'resources', 'library', 'documents', 'content', 'files']) {
  const { data: d, error: e } = await supabase.from(table).select('id').limit(1);
  if (!e) console.log('Found table:', table, '- rows:', d.length);
  else console.log('No table:', table);
}

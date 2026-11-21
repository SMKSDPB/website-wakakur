
const SUPABASE_URL = "https://ogjzxmujvytucwdhnxxw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_0GwjeJyvVPFFW3UcOvUZmA_799U8nZw";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

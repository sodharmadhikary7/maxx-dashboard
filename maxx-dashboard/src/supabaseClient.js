import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sqcthadkceuyfdxsunum.supabase.co";
const SUPABASE_KEY = "sb_publishable_GmeY14UBloE208QdhrIl2Q_D5wg46WS";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
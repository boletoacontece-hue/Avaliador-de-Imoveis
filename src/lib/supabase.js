import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseReady = Boolean(url && key);
if (!supabaseReady) console.warn("Supabase não configurado — copie .env.example para .env e preencha.");

// Todas as tabelas e RPCs do Avaliador ficam no schema "avaliador"
export const supabase = createClient(url || "http://localhost", key || "anon", {
  db: { schema: "avaliador" },
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "avaliador-acontece-auth" },
});

export const BUCKET = "property-thumbnails";

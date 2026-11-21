import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chave) {
    throw new Error("As configurações do Supabase não foram preenchidas.");
}

export const supabase = createClient(url, chave);
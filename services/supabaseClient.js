import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseEnabled =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_KEY);

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

console.log("Supabase enabled:", isSupabaseEnabled);

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnabled = Boolean(url && (serviceKey || anonKey));

// Client สำหรับ server-side เท่านั้น (service role — ข้ามผ่าน RLS)
export const supabaseAdmin: SupabaseClient | null = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

// Client สำหรับ browser (publishable key — ต้องมี RLS policy)
export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey)
  : null;

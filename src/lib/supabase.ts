import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ถ้ายังไม่ได้ตั้งค่า env → คืน null เพื่อให้ระบบ fallback ไปใช้ mock data
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!)
  : null;

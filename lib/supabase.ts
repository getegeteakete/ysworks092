import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!   // サーバー専用
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// サーバーサイド（全権限）
export const supabaseAdmin = createClient(url, key)

// クライアントサイド（読み取り専用相当）
export const supabase = createClient(url, anonKey)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 管理者初期設定用エンドポイント
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) throw error
    return NextResponse.json({ ok: true, user: data.user?.email })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

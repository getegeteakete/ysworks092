import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scoreAndAnalyzeLead, generateLeadEmail } from '@/lib/anthropic'
import { sendMail } from '@/lib/email'

// チャット履歴からリードを登録・スコアリング
export async function POST(req: NextRequest) {
  const { sessionId, messages, contactInfo } = await req.json()

  if (!sessionId || !messages?.length) {
    return NextResponse.json({ error: 'sessionId and messages required' }, { status: 400 })
  }

  try {
    // AIでスコアリング
    const analysis = await scoreAndAnalyzeLead({ messages, ...contactInfo })

    // チャットセッション保存/更新
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .upsert({
        session_id: sessionId,
        messages,
        lead_score: analysis.score,
        contact_info: contactInfo || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
      .select()
      .single()

    // スコア50以上＆メールがあればリードとして登録
    if (analysis.score >= 50 && contactInfo?.email) {
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('email', contactInfo.email)
        .single()

      if (!existingLead) {
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .insert({
            name: contactInfo.name || '未取得',
            email: contactInfo.email,
            phone: contactInfo.phone,
            company: contactInfo.company,
            source: 'chat',
            score: analysis.score,
            status: 'new',
            notes: `${analysis.summary} / 興味：${analysis.interest} / タイミング：${analysis.timing}`,
            chat_session_id: session?.id,
          })
          .select()
          .single()

        // スコア70以上なら自動でファーストメール送信
        if (lead && analysis.score >= 70 && analysis.recommended_action !== '対応不要') {
          const mail = await generateLeadEmail({
            name: contactInfo.name || 'お客様',
            interest: analysis.interest,
            summary: analysis.summary,
          })

          await sendMail({
            to: contactInfo.email,
            subject: mail.subject,
            body: mail.body,
            leadId: lead.id,
          })

          await supabaseAdmin.from('leads').update({ status: 'contacted' }).eq('id', lead.id)
        }
      }
    }

    return NextResponse.json({ ok: true, analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// リード一覧取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('leads')
    .select('*, email_logs(count)')
    .order('score', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data } = await query
  return NextResponse.json({ leads: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateLeadEmail } from '@/lib/anthropic'
import { sendMail, checkInboundReplies } from '@/lib/email'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []

  // ① 受信メールをチェックして返信があれば leads.status を更新
  try {
    const replies = await checkInboundReplies()
    for (const reply of replies) {
      if (reply.from) {
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('id, status')
          .eq('email', reply.from)
          .single()

        if (lead && lead.status === 'contacted') {
          await supabaseAdmin.from('leads').update({ status: 'replied' }).eq('id', lead.id)
          await supabaseAdmin.from('email_logs').insert({
            lead_id: lead.id,
            direction: 'inbound',
            subject: reply.subject,
            body: reply.body,
            from_email: reply.from,
            to_email: process.env.SMTP_USER,
            status: 'replied',
          })
          results.push(`reply from ${reply.from}`)
        }
      }
    }
  } catch (e: any) {
    results.push(`imap error: ${e.message}`)
  }

  // ② 3日以上経過してもまだ連絡していない高スコアリードにリマインドメール
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

  const { data: stalledLeads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .gte('score', 60)
    .lt('created_at', threeDaysAgo)
    .not('email', 'is', null)
    .limit(5)

  for (const lead of stalledLeads || []) {
    try {
      const mail = await generateLeadEmail({
        name: lead.name || 'お客様',
        interest: lead.notes?.match(/興味：(.+?) \//)?.[1] || 'AIシステム',
        summary: lead.notes || '',
      })

      await sendMail({ to: lead.email, subject: mail.subject, body: mail.body, leadId: lead.id })
      await supabaseAdmin.from('leads').update({ status: 'contacted' }).eq('id', lead.id)
      results.push(`followed up: ${lead.email}`)
    } catch (e: any) {
      results.push(`mail error ${lead.email}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, results })
}

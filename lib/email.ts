import nodemailer from 'nodemailer'
import { supabaseAdmin } from './supabase'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export async function sendMail({
  to, subject, body, leadId
}: { to: string; subject: string; body: string; leadId?: string }) {
  const info = await transporter.sendMail({
    from: `"Y'sworks合同会社" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: body,
  })

  // ログ保存
  if (leadId) {
    await supabaseAdmin.from('email_logs').insert({
      lead_id: leadId,
      direction: 'outbound',
      subject,
      body,
      from_email: process.env.SMTP_USER,
      to_email: to,
      status: 'sent',
    })
  }

  return info
}

// Xserverの受信メールをポーリングして返信を検知（Webhook未対応のため定期チェック）
export async function checkInboundReplies() {
  const Imap = (await import('imap')).default
  const { simpleParser } = await import('mailparser')

  return new Promise<{ subject: string; from: string; body: string }[]>((resolve) => {
    const imap = new Imap({
      user: process.env.SMTP_USER!,
      password: process.env.SMTP_PASS!,
      host: process.env.IMAP_HOST || process.env.SMTP_HOST!,
      port: Number(process.env.IMAP_PORT) || 993,
      tls: true,
    })

    const results: { subject: string; from: string; body: string }[] = []

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); resolve([]); return }

        // 未読メールのみ取得
        imap.search(['UNSEEN'], (err, uids) => {
          if (err || !uids.length) { imap.end(); resolve([]); return }

          const f = imap.fetch(uids, { bodies: '' })
          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (!err && parsed.text) {
                  results.push({
                    subject: parsed.subject || '',
                    from: (parsed.from?.value[0]?.address) || '',
                    body: parsed.text,
                  })
                }
              })
            })
          })
          f.once('end', () => { imap.end(); resolve(results) })
        })
      })
    })

    imap.once('error', () => resolve([]))
    imap.connect()
  })
}

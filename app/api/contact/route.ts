import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { name, email, phone, content } = await req.json()

  if (!name || !email || !content) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  const adminMail = {
    from: `"Y'sworks LP 問い合わせ" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
    subject: `【新規お問い合わせ】${name} 様より`,
    text: `Y'sworks LPからお問い合わせがありました。\n\n■ お名前：${name}\n■ メールアドレス：${email}\n■ 電話番号：${phone || '未入力'}\n■ お問い合わせ内容：\n${content}`.trim(),
  }

  const autoReply = {
    from: `"Y'sworks合同会社" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `【Y'sworks】お問い合わせありがとうございます`,
    text: `${name} 様\n\nお問い合わせいただきありがとうございます。\n担当者より通常1〜2営業日以内にご連絡いたします。\nお急ぎの場合は、お電話（090-4481-7463）にてご連絡ください。\n\n──────────────────\n【お問い合わせ内容】\n${content}\n──────────────────\n\nY'sworks合同会社\n〒813-0032 福岡市東区土井1-15-15 302\nTEL: 090-4481-7463`.trim(),
  }

  try {
    await transporter.sendMail(adminMail)
    await transporter.sendMail(autoReply)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 })
  }
}

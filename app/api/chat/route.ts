import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `あなたはY'sworks合同会社（福岡市東区）の親切なAI相談アシスタントです。
会社の担当者のように、気さくで分かりやすい言葉で対応してください。

【会社概要】
- 社名：Y'sworks合同会社
- 所在地：福岡市東区土井1-15-15 302
- 電話：090-4481-7463
- 創業：2024年
- 強み：実務10年以上のAIエンジニアと直接提携・補助金採択率9割超のコンサルが監修

【サービス一覧 ＝「すぐに始めれる！シリーズ」】
全サービス共通：初期費用 9万円（1回のみ）
1. AIマッチングシステム → 月額3万円
2. AI ECサイト（いちばん人気）→ 月額3万円
3. AI顧客管理システム → 月額2万円
4. LINE AIシステム → 月額3万円

【補助金AIサービス】
1. 小規模持続化補助金サポート → 1万円
2. 新事業進出補助金サポート → 3万円
3. IT導入補助金サポート → 1万円
4. 省エネ補助金サポート → 3万円

【対応ルール】
- 親しみやすく、でもプロとして回答する
- 専門用語は使わず、中学生でもわかる言葉で
- 最後は「まず無料で相談しませんか？」などCTAを自然に添える
- 回答は200文字以内にコンパクトに
- 絵文字は使わない
- Y'sworksのサービスと無関係な話題は「このチャットはY'sworksのサービスに関するご相談専用です。」とだけ返す`

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const { messages } = await req.json()

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const trimmed = messages.slice(-50).map((m: any) => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: String(m.content).slice(0, 2000),
  }))

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: SYSTEM,
      messages: trimmed,
    })

    const text = (response.content?.[0] as any)?.text ?? 'すみません、もう一度お試しください。'
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 })
  }
}

import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ============================================================
// SEO記事生成
// ============================================================
export async function generateArticle(keyword: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `
あなたはY'sworks合同会社（福岡・AI/WEB制作・補助金）のSEOライターです。
以下のキーワードで、Googleの検索上位を狙うブログ記事をMarkdownで書いてください。

【キーワード】${keyword}

【会社情報】
- 社名：Y'sworks合同会社（福岡市東区）
- 強み：実務10年以上のAIエンジニア提携・補助金採択率9割超
- 料金：初期費用9万円・月額2〜3万円のサブスク型AIシステム

【記事の要件】
- 文字数：2,000〜3,000文字
- 構成：H1(タイトル) → リード文 → H2×4〜6個 → まとめ → CTA
- 読者：AIやITに詳しくない中小企業・個人事業主の経営者
- トーン：親しみやすい、でも信頼感がある
- CTAは「まずは無料相談」に誘導
- キーワードを自然に3〜5回含める

【出力形式（JSON）】
\`\`\`json
{
  "title": "記事タイトル（50文字以内）",
  "slug": "url-friendly-slug",
  "meta_desc": "metaディスクリプション（120文字以内）",
  "keywords": ["keyword1", "keyword2"],
  "body": "Markdown本文"
}
\`\`\`
JSONのみ出力してください。前置きや説明は不要です。
      `.trim()
    }]
  })

  const raw = (msg.content[0] as any).text
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(json)
}

// ============================================================
// X投稿文生成（記事から）
// ============================================================
export async function generateTweet(article: { title: string; body: string; url?: string }) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `
以下の記事からX（旧Twitter）の投稿文を作成してください。

タイトル：${article.title}
本文（冒頭）：${article.body.slice(0, 300)}

【要件】
- 140文字以内
- 記事のポイントを1つだけ端的に
- 絵文字は使わない
- 最後にURL（${article.url ?? 'https://ysworks-hakata.com'}）を含める
- ハッシュタグ：#AI活用 #補助金 #福岡 のうち最大2つ
- 宣伝っぽくならず、有益な情報として読める文体

本文のみ出力。前置き不要。
      `.trim()
    }]
  })
  return (msg.content[0] as any).text.trim()
}

// ============================================================
// リードスコアリング＋分析
// ============================================================
export async function scoreAndAnalyzeLead(data: {
  messages: { role: string; content: string }[]
  name?: string
  email?: string
  company?: string
}) {
  const chatSummary = data.messages
    .map(m => `${m.role === 'user' ? '客' : 'AI'}: ${m.content}`)
    .join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `
以下のチャット履歴から、このユーザーの見込み客スコアを分析してください。

【チャット履歴】
${chatSummary}

【出力形式（JSON）】
{
  "score": 0-100の整数（100が最も見込みが高い）,
  "interest": "最も興味を持っているサービス名",
  "budget_hint": "予算感（不明/低/中/高）",
  "timing": "導入検討時期（不明/即時/1ヶ月以内/半年以内/検討中）",
  "summary": "50文字以内の一言まとめ",
  "recommended_action": "次のアクション（メール送信/電話フォロー/資料送付/ウォーミング/対応不要）"
}
JSONのみ出力。
      `.trim()
    }]
  })
  const raw = (msg.content[0] as any).text
  return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

// ============================================================
// 見込み客へのファーストメール生成
// ============================================================
export async function generateLeadEmail(lead: {
  name: string
  interest: string
  summary: string
}) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `
Y'sworks合同会社の担当者として、以下のリード情報をもとに最初のメールを書いてください。

名前：${lead.name}
興味サービス：${lead.interest}
状況：${lead.summary}

【ルール】
- 件名と本文を出力
- 親しみやすく、押しつけがましくない
- 「詳しいご説明の機会をいただけますか」に誘導
- 200文字以内でコンパクトに
- 署名：Y'sworks合同会社 / 090-4481-7463 / ysworks-hakata.com

【形式】
件名：〇〇
本文：〇〇
      `.trim()
    }]
  })
  const text = (msg.content[0] as any).text.trim()
  const [subjectLine, ...bodyLines] = text.split('\n')
  return {
    subject: subjectLine.replace('件名：', '').trim(),
    body: bodyLines.join('\n').replace('本文：', '').trim()
  }
}

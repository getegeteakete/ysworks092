import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Note.com 非公式APIを使用（セッションCookieで認証）
async function postToNote(article: { title: string; body: string; meta_desc: string }) {
  const sessionCookie = process.env.NOTE_SESSION_COOKIE
  if (!sessionCookie) throw new Error('NOTE_SESSION_COOKIE not set')

  // MarkdownをHTMLに簡易変換
  const htmlBody = article.body
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')

  // Note.com下書き作成API
  const createRes = await fetch('https://note.com/api/v2/text_notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-Note-Kind': 'text',
    },
    body: JSON.stringify({
      name: article.title,
      body: htmlBody,
      eyecatch: null,
      hashtag_notes_attributes: [],
      price: 0,
      publish_at: null,
      is_limited_access: false,
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Note API error: ${createRes.status} ${err}`)
  }

  const noteData = await createRes.json()
  const noteKey = noteData.data?.key
  if (!noteKey) throw new Error('Note key not returned')

  // 公開
  const publishRes = await fetch(`https://note.com/api/v2/text_notes/${noteKey}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  })

  if (!publishRes.ok) throw new Error('Note publish failed')

  const published = await publishRes.json()
  const noteUrl = published.data?.note_url || `https://note.com/${noteKey}`

  return { noteKey, noteUrl }
}

export async function POST(req: NextRequest) {
  const { articleId } = await req.json()
  if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single()

  if (!article) return NextResponse.json({ error: 'article not found' }, { status: 404 })

  try {
    const { noteKey, noteUrl } = await postToNote(article)

    // DB更新
    await supabaseAdmin.from('articles').update({
      status: 'published',
      note_url: noteUrl,
      published_at: new Date().toISOString(),
    }).eq('id', articleId)

    // SNS投稿ログ
    await supabaseAdmin.from('social_posts').insert({
      platform: 'note',
      content: article.title,
      article_id: articleId,
      post_id: noteKey,
      status: 'posted',
      posted_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, noteUrl })
  } catch (e: any) {
    // 失敗ログ
    await supabaseAdmin.from('social_posts').insert({
      platform: 'note',
      content: article.title,
      article_id: articleId,
      status: 'failed',
      error_msg: e.message,
    })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

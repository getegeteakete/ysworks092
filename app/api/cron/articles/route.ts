import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateArticle } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  // Vercel Cronの認証チェック
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 優先度の高い未使用キーワードを取得
  const { data: keywords } = await supabaseAdmin
    .from('seo_keywords')
    .select('*')
    .eq('active', true)
    .or('last_used.is.null,last_used.lt.' + new Date(Date.now() - 14 * 86400000).toISOString())
    .order('priority', { ascending: false })
    .limit(1)

  if (!keywords?.length) {
    return NextResponse.json({ message: 'No keywords available' })
  }

  const kw = keywords[0]

  try {
    const article = await generateArticle(kw.keyword)

    const { data: savedArticle } = await supabaseAdmin
      .from('articles')
      .insert({
        title: article.title,
        slug: article.slug,
        body: article.body,
        meta_desc: article.meta_desc,
        keywords: article.keywords,
        status: 'draft',
      })
      .select()
      .single()

    // キーワード使用日時を更新
    await supabaseAdmin
      .from('seo_keywords')
      .update({ last_used: new Date().toISOString(), article_count: kw.article_count + 1 })
      .eq('id', kw.id)

    // Note自動投稿（設定がある場合）
    if (process.env.NOTE_SESSION_COOKIE && savedArticle) {
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/articles/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: savedArticle.id }),
      })
    }

    return NextResponse.json({ ok: true, keyword: kw.keyword, articleId: savedArticle?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

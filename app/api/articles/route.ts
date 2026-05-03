import { NextRequest, NextResponse } from 'next/server'
import { generateArticle } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()
  if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 })

  try {
    const article = await generateArticle(keyword)

    const { data, error } = await supabaseAdmin
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

    if (error) throw error

    // キーワードの使用回数を更新
    await supabaseAdmin.rpc('increment_keyword_count', { kw: keyword }).catch(() => {})

    return NextResponse.json({ ok: true, article: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 記事一覧取得
export async function GET() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, status, keywords, published_at, note_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ articles: data })
}

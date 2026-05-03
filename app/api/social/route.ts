import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { generateTweet } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

const twitterClient = new TwitterApi({
  appKey:        process.env.TWITTER_API_KEY!,
  appSecret:     process.env.TWITTER_API_SECRET!,
  accessToken:   process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret:  process.env.TWITTER_ACCESS_SECRET!,
})

export async function POST(req: NextRequest) {
  const { articleId, customText } = await req.json()

  let tweetText = customText
  let articleRef: any = null

  // 記事IDが指定されていれば記事から自動生成
  if (articleId && !customText) {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('title, body, note_url')
      .eq('id', articleId)
      .single()

    if (!article) return NextResponse.json({ error: 'article not found' }, { status: 404 })
    articleRef = article
    tweetText = await generateTweet({
      title: article.title,
      body: article.body,
      url: article.note_url || 'https://ysworks-hakata.com',
    })
  }

  if (!tweetText) return NextResponse.json({ error: 'tweet content required' }, { status: 400 })

  try {
    const { data: tweet } = await twitterClient.v2.tweet(tweetText)

    await supabaseAdmin.from('social_posts').insert({
      platform: 'x',
      content: tweetText,
      article_id: articleId || null,
      post_id: tweet.id,
      status: 'posted',
      posted_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, tweetId: tweet.id, text: tweetText })
  } catch (e: any) {
    await supabaseAdmin.from('social_posts').insert({
      platform: 'x',
      content: tweetText,
      article_id: articleId || null,
      status: 'failed',
      error_msg: e.message,
    })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 投稿履歴取得
export async function GET() {
  const { data } = await supabaseAdmin
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ posts: data })
}

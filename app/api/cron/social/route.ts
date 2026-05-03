import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateTweet } from '@/lib/anthropic'
import { TwitterApi } from 'twitter-api-v2'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 公開済み記事で、まだX投稿していないものを取得
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('id, title, body, note_url')
    .eq('status', 'published')
    .not('id', 'in', `(
      select article_id from social_posts
      where platform = 'x' and status = 'posted' and article_id is not null
    )`)
    .order('published_at', { ascending: false })
    .limit(1)

  if (!articles?.length) {
    return NextResponse.json({ message: 'No new articles to post' })
  }

  const article = articles[0]

  try {
    const tweetText = await generateTweet({
      title: article.title,
      body: article.body,
      url: article.note_url || process.env.NEXT_PUBLIC_URL,
    })

    const twitterClient = new TwitterApi({
      appKey:       process.env.TWITTER_API_KEY!,
      appSecret:    process.env.TWITTER_API_SECRET!,
      accessToken:  process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    })

    const { data: tweet } = await twitterClient.v2.tweet(tweetText)

    await supabaseAdmin.from('social_posts').insert({
      platform: 'x',
      content: tweetText,
      article_id: article.id,
      post_id: tweet.id,
      status: 'posted',
      posted_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, tweetId: tweet.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
